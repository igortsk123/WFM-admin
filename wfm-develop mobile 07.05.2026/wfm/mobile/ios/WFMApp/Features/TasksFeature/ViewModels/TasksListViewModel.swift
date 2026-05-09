import Foundation
import SwiftUI
import Combine
import WFMUI

/// ViewModel for tasks list screen
@MainActor
class TasksListViewModel: ObservableObject {
    @Published private(set) var tasks: [Task] = []
    @Published var isLoading = false
    @Published var filterState: TaskState?
    @Published var errorMessage: String? = nil

    private let tasksService: TasksService
    private let userManager: UserManager
    private let toastManager: ToastManager
    private let analyticsService: AnalyticsService
    private var cancellables = Set<AnyCancellable>()
    private var loadTasksTask: _Concurrency.Task<Bool, Never>?

    init(tasksService: TasksService, userManager: UserManager, toastManager: ToastManager, analyticsService: AnalyticsService) {
        self.tasksService = tasksService
        self.userManager = userManager
        self.toastManager = toastManager
        self.analyticsService = analyticsService
        setupEventSubscription()
    }

    /// Подписка на события задач
    private func setupEventSubscription() {
        TaskEventBroadcaster.shared.events
            .sink { [weak self] event in
                guard let self = self else { return }
                _Concurrency.Task {
                    await self.handleTaskEvent(event)
                }
            }
            .store(in: &cancellables)
    }

    /// Обработка события задачи
    private func handleTaskEvent(_ event: TaskEvent) async {
        switch event {
        case .taskCreated, .taskDeleted:
            // Обновить список задач при создании/удалении
            await loadTasks()

        case .taskUpdated(let updatedTask):
            // Обновить задачу локально без запроса на сервер
            if let index = tasks.firstIndex(where: { $0.id == updatedTask.id }) {
                tasks[index] = updatedTask
            }
        }
    }

    /// Вызывается при тапе на карточку задачи — трекает аналитику перед навигацией
    func onTaskCardTapped(_ task: Task) {
        analyticsService.track(.taskCardTapped(
            taskState: task.safeState.rawValue,
            taskType: task.type?.rawValue ?? "PLANNED"
        ))
    }

    /// Load tasks with optional filter
    /// Использует GET /my для получения задач текущей смены
    func loadTasks() async {
        isLoading = true
        await loadTasksInternal()
        isLoading = false
        analyticsService.track(.tasksListViewed(tasksCount: tasks.count))
    }

    /// Refresh tasks list
    ///
    /// Не переключает isLoading в true — это убивает задачу .refreshable в SwiftUI.
    /// Индикатор обновления показывает сам SwiftUI.
    func refresh() async {
        await loadTasksInternal()
    }

    /// Внутренняя логика загрузки задач (без управления isLoading)
    private func loadTasksInternal() async {
        // Отменяем предыдущую загрузку если она еще активна
        loadTasksTask?.cancel()

        // Шаг 1: Проверяем наличие данных
        if let currentUser = userManager.currentUser,
           let currentShift = userManager.currentShift,
           currentShift.status.isActive {
            // Все данные есть - загружаем задачи
            let assignmentId = currentShift.assignmentId
            let success = await loadTasksWithAssignment(assignmentId)

            if success {
                // Задачи загружены успешно
                return
            }

            // Была ошибка при загрузке задач - переходим к шагу 2 (перезапрос UserManager)
        }

        // Шаг 2: Синхронизация с UserManager
        if userManager.isLoading {
            // UserManager загружается - ждём его завершения
            while userManager.isLoading {
                try? await _Concurrency.Task.sleep(nanoseconds: 100_000_000) // 100ms
            }
        } else {
            // UserManager не загружается - сами перезапрашиваем
            await userManager.loadCurrentRole()
        }

        // Шаг 3: Проверяем данные снова
        guard userManager.currentUser != nil else {
            tasks = []
            return
        }

        guard let currentShift = userManager.currentShift,
              currentShift.status.isActive else {
            // Нет смены или смена не открыта — UI покажет EmptyState
            tasks = []
            return
        }

        // Загружаем задачи с полученными данными
        await loadTasksWithAssignment(currentShift.assignmentId)
    }

    /// Загрузка задач с указанным assignment_id
    /// Возвращает true если загрузка успешна, false если была критичная ошибка (нужен перезапрос UserManager)
    @discardableResult
    private func loadTasksWithAssignment(_ assignmentId: Int) async -> Bool {
        // Загружаем задачи с кэшированием (stale-while-revalidate)
        let stream = tasksService.getMyTasks(assignmentId: assignmentId)

        // Создаем Task для итерации по stream
        loadTasksTask = _Concurrency.Task {
            var hadCriticalError = false

            for await result in stream {
                switch result {
                case .cached(let loadedTasks):
                    // Данные из кэша - показываем сразу
                    tasks = loadedTasks
                    errorMessage = nil
                    isLoading = false

                case .fresh(let loadedTasks):
                    // Свежие данные с сервера - обновляем
                    tasks = loadedTasks
                    errorMessage = nil

                case .error(let error):
                    // Ошибка обновления (кэш уже показан если был)
                    if error is CancellationError {
                        // Игнорируем отмену
                        break
                    }

                    // При ошибке от сервера - критичная ошибка, требуется перезапрос UserManager
                    hadCriticalError = true

                    // Показываем сообщение об ошибке если кэша не было
                    if tasks.isEmpty {
                        errorMessage = error.localizedDescription
                    } else {
                        // Кэш был показан, но свежие данные не загрузились
                        if error.shouldShowToUser {
                            toastManager.show(message: error.localizedDescription, state: .error)
                        }
                    }
                }
            }

            return !hadCriticalError
        }

        // Ждем завершения загрузки и возвращаем результат
        return await loadTasksTask?.value ?? false
    }

    /// Get active task for current user (if any)
    var activeTask: Task? {
        tasks.first { $0.state == .inProgress }
    }

    /// Check if user can start a new task (no active tasks)
    var canStartNewTask: Bool {
        activeTask == nil
    }
}
