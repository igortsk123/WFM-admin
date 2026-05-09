import Foundation
import Combine
import WFMUI

/// Роль пользователя для Home экрана
enum HomeUserRole {
    case worker
    case manager
}

/// ViewModel для экрана "Главная" (универсальный для worker и manager)
@MainActor
class HomeViewModel: ObservableObject, CloseShiftViewModel {
    let role: HomeUserRole
    @Published var state: LoadingState = .loading
    @Published private(set) var isShiftLoading = false
    @Published private(set) var closeShiftMessage: String? = nil
    @Published private(set) var closeShiftTitle: String? = nil
    @Published private(set) var closeShiftForce = false
    @Published private(set) var shiftClosedSuccessfully = false
    @Published private(set) var shiftOpenedSuccessfully = false

    // Поля для менеджера
    @Published var tasksForReview: [Task] = []

    // Поля для работника
    @Published var planTasks: [Task] = []
    @Published var isPlanTasksLoading = false

    // Локальные копии данных из UserManager (для минимизации objectWillChange)
    @Published private(set) var localCurrentShift: CurrentShift?
    @Published private(set) var localCurrentUser: UserMe?
    @Published private(set) var localCurrentAssignment: Assignment?

    /// Флаг загрузки данных (для предотвращения дублирующих запросов)
    @Published private var isRefreshing = false

    private let userManager: UserManager
    private let tasksService: TasksService?
    private let toastManager: ToastManager
    private let analyticsService: AnalyticsService
    // Тикер для живого пересчёта времени до начала смены / опоздания
    @Published private var currentTime: Date = Date()
    private var timer: Timer?
    private var cancellables = Set<AnyCancellable>()

    // Task для отмены конкурирующих запросов
    private var loadTasksForReviewTask: _Concurrency.Task<Void, Never>?
    private var loadPlanTasksTask: _Concurrency.Task<Void, Never>?
    private var loadUserTask: _Concurrency.Task<Void, Never>?

    enum LoadingState {
        case loading
        case success
        case error(String)
    }

    init(role: HomeUserRole, userManager: UserManager, tasksService: TasksService? = nil, toastManager: ToastManager, analyticsService: AnalyticsService) {
        self.role = role
        self.userManager = userManager
        self.tasksService = tasksService
        self.toastManager = toastManager
        self.analyticsService = analyticsService
        // Обновляем currentTime раз в минуту → SwiftUI пересчитает shiftCardState и statusText
        timer = Timer.scheduledTimer(withTimeInterval: 60, repeats: true) { [weak self] _ in
            DispatchQueue.main.async { [weak self] in
                self?.currentTime = Date()
            }
        }

        // Подписываемся на изменения данных из UserManager и обновляем локальные копии.
        // Используем .assign(to:) вместо форвардинга objectWillChange, чтобы избежать
        // отмены .task при ре-рендере родительского view (MainTabView).
        userManager.$currentShift
            .receive(on: DispatchQueue.main)
            .assign(to: &$localCurrentShift)

        userManager.$currentUser
            .receive(on: DispatchQueue.main)
            .assign(to: &$localCurrentUser)

        userManager.$currentAssignment
            .receive(on: DispatchQueue.main)
            .assign(to: &$localCurrentAssignment)
    }

    deinit {
        timer?.invalidate()
    }

    /// Загрузить данные при открытии экрана
    ///
    /// Использует HTTP кэширование: сначала показывает кэшированные данные, потом обновляет свежими.
    /// Для менеджера также загружает задачи на проверку.
    func loadData() async {
        // Аналитика в зависимости от роли
        switch role {
        case .worker:
            analyticsService.track(.homeViewed)
        case .manager:
            analyticsService.track(.managerHomeViewed(tasksOnReviewCount: tasksForReview.count))
        }

        // Отменяем предыдущую загрузку
        loadUserTask?.cancel()

        // Если данных нет - показываем loading
        if localCurrentUser == nil {
            state = .loading
        }

        // Устанавливаем флаг загрузки задач заранее, чтобы показать скелетоны
        if localCurrentShift != nil || localCurrentUser != nil {
            isPlanTasksLoading = true
        }

        loadUserTask = _Concurrency.Task {
            await userManager.refresh()

            if let error = userManager.error {
                if localCurrentUser == nil {
                    toastManager.show(message: error, state: .error)
                    state = .error(error)
                }
                isPlanTasksLoading = false
            } else {
                state = .success
            }

            // Загружаем задачи на проверку для менеджера
            if role == .manager {
                //await loadTasksForReview() //ВРЕМЕННО
            }

            // Загружаем задачи для карточки смены
            if let shift = localCurrentShift {
                await loadPlanTasks(assignmentId: shift.assignmentId)
            } else {
                isPlanTasksLoading = false
            }
        }

        await loadUserTask?.value
    }

    /// Получить имя пользователя для приветствия
    var greetingName: String {
        localCurrentUser?.firstName ?? "Пользователь"
    }

    /// Получить URL аватара пользователя
    var avatarUrl: String? {
        localCurrentUser?.photoUrl
    }

    /// Получить отформатированную дату
    var formattedDate: String {
        return DateFormatters.formatCurrentDate()
    }

    // MARK: - Shift Card

    /// Получить текущую смену
    var currentShift: CurrentShift? {
        localCurrentShift
    }

    /// Должность пользователя для бейджа на карточке смены
    var positionName: String? {
        localCurrentAssignment?.position?.name
    }

    /// Название магазина из текущего назначения
    var storeName: String? {
        localCurrentAssignment?.storeName
    }

    /// Определить состояние карточки смены
    var shiftCardState: ShiftCardState {
        if case .error = state { return .noData }
        guard let shift = currentShift else { return .noData }

        // Если смена NEW или OPENED, задачи загружены и список пустой → Empty
        if (shift.status == .closed || shift.status == .opened)
            && !isPlanTasksLoading
            && planTasks.isEmpty {
            return .empty
        }

        switch shift.status {
        case .new:
            return ShiftTimeCalculator.isShiftLate(shift, currentTime: currentTime) ? .delay : .new
        case .opened:
            return .inProgress
        case .closed:
            return .done
        }
    }

    /// Текст статуса смены ("Начнется через X мин" / "Опаздываете на X мин" / "До конца смены X ч")
    var statusText: String {
        switch shiftCardState {
        case .new:
            guard let start = ShiftTimeCalculator.shiftStartDate(currentShift) else { return "Скоро начнется" }
            let diffMin = Int(max(0, start.timeIntervalSince(currentTime) / 60))
            return ShiftTimeCalculator.formatMinutesUntil(diffMin)
        case .delay:
            guard let start = ShiftTimeCalculator.shiftStartDate(currentShift) else { return "Вы опаздываете" }
            let diffMin = Int(max(0, currentTime.timeIntervalSince(start) / 60))
            return ShiftTimeCalculator.formatMinutesLate(diffMin)
        case .inProgress:
            guard let end = ShiftTimeCalculator.shiftEndDate(currentShift) else { return "" }
            let diffMin = Int(max(0, end.timeIntervalSince(currentTime) / 60))
            return ShiftTimeCalculator.formatMinutesLeft(diffMin)
        case .done:
            return "Смена закрыта"
        default:
            return ""
        }
    }

    /// Открыть или закрыть смену в зависимости от текущего статуса
    func openShift(force: Bool = false) {
        guard let shift = currentShift else { return }
        isShiftLoading = true
        _Concurrency.Task { @MainActor in
            defer { isShiftLoading = false }
            do {
                switch shift.status {
                case .new, .closed:
                    // Для NEW используем shift.id (это id плана), для CLOSED — shift.planId
                    let planId = shift.status == .new ? shift.id : (shift.planId ?? shift.id)
                    try await userManager.openShift(planId: planId)
                    toastManager.show(message: "Смена открыта")
                    shiftOpenedSuccessfully = true
                    let openedShiftId = userManager.currentShift?.id ?? planId
                    analyticsService.track(.shiftOpenCompleted(shiftId: openedShiftId, role: role == .worker ? "worker" : "manager"))
                case .opened:
                    let planId = shift.planId ?? shift.id
                    let closedShiftId = shift.id
                    try await userManager.closeShift(planId: planId, force: force)
                    closeShiftMessage = nil
                    shiftClosedSuccessfully = true
                    toastManager.show(message: "Смена закрыта")
                    analyticsService.track(.shiftCloseCompleted(shiftId: closedShiftId, role: role == .worker ? "worker" : "manager"))
                    // Обновляем список задач после закрытия смены
                    await loadPlanTasks(assignmentId: shift.assignmentId)
                }
            } catch let error as ServerResponseError {
                // Проверяем код ошибки - fallback если локальные данные не совпадают с серверными
                if error.code == "TASKS_PAUSED" {
                    // На сервере есть задачи на паузе (локальные данные устарели)
                    closeShiftTitle = "Закрыть смену?"
                    closeShiftMessage = "У вас есть незавершённые задачи"
                    closeShiftForce = true
                    // БШ остаётся открытым
                } else if error.code == "TASKS_IN_PROGRESS" {
                    // На сервере есть задача в работе (локальные данные устарели)
                    closeShiftTitle = "Приостановить задачу и закрыть смену?"
                    closeShiftMessage = nil
                    closeShiftForce = true
                    // БШ остаётся открытым
                } else {
                    // Другая ошибка - закрываем БШ и показываем Toast
                    shiftClosedSuccessfully = true
                    toastManager.show(message: error.localizedDescription, state: .error)
                }
            } catch {
                // Неизвестная ошибка - закрываем БШ и показываем Toast
                shiftClosedSuccessfully = true
                toastManager.show(message: error.localizedDescription, state: .error)
            }
        }
    }

    /// Подготовить данные для CloseShiftBottomSheet на основе локального списка задач
    func prepareCloseShiftBottomSheet() {
        // Проверяем есть ли задачи в работе
        let hasInProgress = planTasks.contains { $0.state == .inProgress }
        // Проверяем есть ли задачи на паузе
        let hasPaused = planTasks.contains { $0.state == .paused }

        if hasInProgress {
            // Есть задача в работе → показываем БШ с предложением приостановить
            closeShiftTitle = "Приостановить задачу и закрыть смену?"
            closeShiftMessage = nil
            closeShiftForce = true
        } else if hasPaused {
            // Есть задачи на паузе → показываем БШ с предупреждением
            closeShiftTitle = "Закрыть смену?"
            closeShiftMessage = "У вас есть незавершённые задачи"
            closeShiftForce = true
        } else {
            // Все задачи завершены или новые → обычный БШ
            closeShiftTitle = "Закрыть смену?"
            closeShiftMessage = nil
            closeShiftForce = false
        }
    }

    /// Очистить сообщение при закрытии смены (для dismiss BottomSheet)
    func clearCloseShiftMessage() {
        closeShiftMessage = nil
        closeShiftTitle = nil
        closeShiftForce = false
    }

    /// Сбросить флаг успешного закрытия смены
    func resetShiftClosedFlag() {
        shiftClosedSuccessfully = false
    }

    /// Сбросить флаг успешного открытия смены
    func resetShiftOpenedFlag() {
        shiftOpenedSuccessfully = false
    }

    /// Взять новую задачу
    func takeNewTask() {
        // TODO: Перейти к экрану списка задач
        print("Взять новую задачу...")
    }

    /// Обновить данные (Pull-to-Refresh)
    func refreshData() async {
        await loadData()
    }

    // MARK: - Manager-specific Methods

    /// Загрузить задачи на проверку (review_state = ON_REVIEW)
    /// Только для менеджера
    func loadTasksForReview() async {
        guard role == .manager, let tasksService = tasksService else { return }

        // Отменяем предыдущую загрузку если она еще активна
        loadTasksForReviewTask?.cancel()

        guard let assignmentId = userManager.currentAssignment?.id else { return }

        let stream = tasksService.getTasksList(assignmentId: assignmentId, reviewState: .onReview)

        loadTasksForReviewTask = _Concurrency.Task {
            for await result in stream {
                switch result {
                case .cached(let tasks):
                    // Данные из кэша - показываем сразу (последние 4)
                    tasksForReview = Array(tasks.suffix(4))

                case .fresh(let tasks):
                    // Свежие данные с сервера - обновляем (последние 4)
                    tasksForReview = Array(tasks.suffix(4))

                case .error(let error):
                    // Ошибка обновления (кэш уже показан если был)
                    if tasksForReview.isEmpty {
                        // Кэша не было - показываем ошибку всегда
                        tasksForReview = []
                        toastManager.show(message: error.localizedDescription, state: .error)
                    } else {
                        // Кэш был показан - показываем только критичные ошибки
                        if error.shouldShowToUser {
                            toastManager.show(message: error.localizedDescription, state: .error)
                        }
                    }
                }
            }
        }

        // Ждем завершения загрузки
        await loadTasksForReviewTask?.value
    }

    // MARK: - Worker-specific Methods

    /// Загрузить задачи для карточки смены (первые 6)
    func loadPlanTasks(assignmentId: Int) async {
        guard let tasksService = tasksService else { return }

        // Отменяем предыдущую загрузку если она еще активна
        loadPlanTasksTask?.cancel()

        isPlanTasksLoading = true

        let stream = tasksService.getMyTasks(assignmentId: assignmentId)

        loadPlanTasksTask = _Concurrency.Task {
            for await result in stream {
                switch result {
                case .cached(let tasks):
                    // Данные из кэша - показываем сразу (первые 6)
                    planTasks = Array(tasks.prefix(6))
                    isPlanTasksLoading = false

                case .fresh(let tasks):
                    // Свежие данные с сервера - обновляем (первые 6)
                    planTasks = Array(tasks.prefix(6))
                    isPlanTasksLoading = false

                case .error(let error):
                    // Игнорируем отмену
                    if error is CancellationError { break }

                    isPlanTasksLoading = false

                    // Ошибка обновления (кэш уже показан если был)
                    if planTasks.isEmpty {
                        // Кэша не было - показываем ошибку всегда
                        planTasks = []
                        //toastManager.show(message: error.localizedDescription, state: .error)
                    } else {
                        // Кэш был показан - показываем только критичные ошибки
                        if error.shouldShowToUser {
                            //toastManager.show(message: error.localizedDescription, state: .error)
                        }
                    }
                }
            }
        }

        // Ждем завершения загрузки
        await loadPlanTasksTask?.value
    }
}
