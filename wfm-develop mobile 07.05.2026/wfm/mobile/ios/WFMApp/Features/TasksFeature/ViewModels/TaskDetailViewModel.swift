import Foundation
import SwiftUI
import UIKit
import WFMUI
import Combine

/// ViewModel for task detail screen
@MainActor
class TaskDetailViewModel: ObservableObject {
    @Published var task: Task
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published private var timerTick = 0  // Триггер для обновления UI

    // Операции — приходят вместе с задачей из GET /{id}
    @Published var selectedOperationIds: Set<Int> = []
    @Published var newOperations: [String] = []
    private var isSelectionInitialized = false

    // Подсказки — загружаются отдельным запросом
    @Published var hints: [Hint] = []
    @Published var isLoadingHints = false

    private let tasksService: TasksService
    private let toastManager: ToastManager
    private let bottomSheetManager: BottomSheetManager
    private let analyticsService: AnalyticsService
    private let router: AppRouter
    private var timer: Timer?
    private var loadTaskTask: _Concurrency.Task<Void, Never>?

    init(task: Task, tasksService: TasksService, toastManager: ToastManager, bottomSheetManager: BottomSheetManager, analyticsService: AnalyticsService, router: AppRouter) {
        self.task = task
        self.tasksService = tasksService
        self.toastManager = toastManager
        self.bottomSheetManager = bottomSheetManager
        self.analyticsService = analyticsService
        self.router = router
        startTimerIfNeeded()
        // Восстанавливаем выбор операций из UserDefaults (приоритет над completedOperationIds)
        if let savedIds = Self.loadSavedOperationIds(for: task.safeId) {
            selectedOperationIds = Set(savedIds)
            isSelectionInitialized = true
        }
        newOperations = Self.loadSavedNewOperations(for: task.safeId)
    }

    deinit {
        timer?.invalidate()
    }

    /// Прогресс выполнения задачи (0.0 - 1.0)
    var progress: Double {
        _ = timerTick  // Зависимость от таймера для автообновления

        guard let historyBrief = task.historyBrief,
              let duration = historyBrief.duration else {
            return 0.0
        }

        let plannedMinutes = task.plannedMinutes ?? 0
        guard plannedMinutes > 0 else { return 0.0 }

        let plannedSeconds = Double(plannedMinutes * 60)
        var totalSeconds = Double(duration)

        // Только для IN_PROGRESS добавляем время с последнего обновления
        if task.safeState == .inProgress,
           let timeStateUpdated = historyBrief.timeStateUpdated {
            let elapsedSinceUpdate = Date().timeIntervalSince(timeStateUpdated)
            totalSeconds += elapsedSinceUpdate
        }

        let calculatedProgress = totalSeconds / plannedSeconds
        return min(calculatedProgress, 1.0)
    }

    /// Оставшееся время в минутах
    var remainingMinutes: Int {
        _ = timerTick  // Зависимость от таймера для автообновления

        let plannedMinutes = task.plannedMinutes ?? 0

        guard let historyBrief = task.historyBrief,
              let duration = historyBrief.duration else {
            return plannedMinutes
        }

        var totalSeconds = Double(duration)

        // Только для IN_PROGRESS добавляем время с последнего обновления
        if task.safeState == .inProgress,
           let timeStateUpdated = historyBrief.timeStateUpdated {
            let elapsedSinceUpdate = Date().timeIntervalSince(timeStateUpdated)
            totalSeconds += elapsedSinceUpdate
        }

        let elapsedMinutes = Int(totalSeconds / 60)
        return max(0, plannedMinutes - elapsedMinutes)
    }

    // MARK: - Timer

    /// Запустить таймер если задача в работе
    private func startTimerIfNeeded() {
        if task.safeState == .inProgress {
            startTimer()
        }
    }

    /// Запустить таймер для обновления прогресса каждую секунду
    private func startTimer() {
        stopTimer()  // Остановить предыдущий таймер если есть
        timer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
            _Concurrency.Task { @MainActor [weak self] in
                self?.timerTick += 1
            }
        }
    }

    /// Остановить таймер
    private func stopTimer() {
        timer?.invalidate()
        timer = nil
    }

    /// Первая загрузка — трекаем просмотр экрана после получения актуальных данных
    func loadTask() async {
        isLoading = true
        errorMessage = nil
        await loadTaskInternal()
        isLoading = false
        analyticsService.track(.taskDetailViewed(
            taskState: task.safeState.rawValue,
            taskReviewState: task.reviewState?.rawValue ?? "NONE",
            taskType: task.type?.rawValue ?? "PLANNED"
        ))
    }

    /// Start task (NEW → IN_PROGRESS)
    func startTask() async {
        guard task.safeState.canTransition(to: .inProgress) else {
            errorMessage = "Невозможно начать задачу в текущем состоянии"
            return
        }

        isLoading = true
        errorMessage = nil

        analyticsService.track(.taskStartTapped(
            taskId: task.id?.uuidString ?? "",
            taskType: task.type?.rawValue ?? "",
            workType: task.workType?.name,
            timeStart: task.timeStart,
            timeEnd: task.timeEnd
        ))

        do {
            task = try await tasksService.startTask(id: task.safeId)
            TaskEventBroadcaster.shared.taskUpdated(task)
            updateTimerState()  // Обновляем состояние таймера
        } catch is CancellationError {
            // Игнорируем отмену
        } catch let error as ServerResponseError {
            // Проверяем, если ошибка CONFLICT - показываем bottom sheet вместо toast
            if error.isError(.conflict) {
                ActiveTaskConflictBottomSheet.show(
                    bottomSheetManager: bottomSheetManager,
                    activeTaskId: error.activeTaskId,
                    onNavigateToTask: { [weak self] taskId in
                        self?.router.navigateToTaskDetail(taskId: taskId)
                    }
                )
            } else {
                toastManager.show(message: error.localizedDescription, state: .error)
            }
        } catch {
            toastManager.show(message: error.localizedDescription, state: .error)
        }

        isLoading = false
    }

    /// Pause task (IN_PROGRESS → PAUSED)
    func pauseTask() async {
        guard task.safeState.canTransition(to: .paused) else {
            errorMessage = "Невозможно остановить задачу в текущем состоянии"
            return
        }

        isLoading = true
        errorMessage = nil

        analyticsService.track(.taskPauseTapped)

        do {
            task = try await tasksService.pauseTask(id: task.safeId)
            TaskEventBroadcaster.shared.taskUpdated(task)
            toastManager.show(message: "Вы приостановили задачу", state: .default)
            updateTimerState()  // Обновляем состояние таймера
        } catch is CancellationError {
            // Игнорируем отмену
        } catch {
            toastManager.show(message: error.localizedDescription, state: .error)
        }

        isLoading = false
    }

    /// Resume task (PAUSED → IN_PROGRESS)
    func resumeTask() async {
        guard task.safeState.canTransition(to: .inProgress) else {
            errorMessage = "Невозможно возобновить задачу в текущем состоянии"
            return
        }

        isLoading = true
        errorMessage = nil

        analyticsService.track(.taskResumeTapped)

        do {
            task = try await tasksService.resumeTask(id: task.safeId)
            TaskEventBroadcaster.shared.taskUpdated(task)
            updateTimerState()  // Обновляем состояние таймера
        } catch is CancellationError {
            // Игнорируем отмену
        } catch let error as ServerResponseError {
            // Проверяем, если ошибка CONFLICT - показываем bottom sheet вместо toast
            if error.isError(.conflict) {
                ActiveTaskConflictBottomSheet.show(
                    bottomSheetManager: bottomSheetManager,
                    activeTaskId: error.activeTaskId,
                    onNavigateToTask: { [weak self] taskId in
                        self?.router.navigateToTaskDetail(taskId: taskId)
                    }
                )
            } else {
                toastManager.show(message: error.localizedDescription, state: .error)
            }
        } catch {
            toastManager.show(message: error.localizedDescription, state: .error)
        }

        isLoading = false
    }

    /// Показать bottom sheet для подтверждения завершения
    func requestCompleteConfirmation(onDismiss: @escaping () -> Void) {
        analyticsService.track(.taskCompleteSheetOpened(requiresPhoto: task.requiresPhoto ?? false))

        CompleteConfirmationBottomSheet.show(
            bottomSheetManager: bottomSheetManager,
            requiresPhoto: task.requiresPhoto ?? false,
            onConfirm: { image in
                let success: Bool
                if let image = image {
                    success = await self.completeTaskWithPhoto(image)
                } else {
                    success = await self.completeTask()
                }

                if success {
                    onDismiss()
                }

                return success
            },
            onCancel: {}
        )
    }

    /// Complete task (IN_PROGRESS → COMPLETED)
    /// - Returns: true если задача успешно завершена, false если произошла ошибка
    func completeTask() async -> Bool {
        guard task.safeState.canTransition(to: .completed) else {
            errorMessage = "Невозможно завершить задачу в текущем состоянии"
            toastManager.show(message: "Невозможно завершить задачу в текущем состоянии", state: .error)
            return false
        }

        analyticsService.track(.taskCompleteSubmitted(
            hasPhoto: task.reportImageUrl != nil,
            hasText: !(task.reportText?.isEmpty ?? true),
            taskId: task.id?.uuidString ?? "",
            taskType: task.type?.rawValue ?? "",
            workType: task.workType?.name,
            timeStart: task.timeStart,
            timeEnd: task.timeEnd
        ))

        isLoading = true
        errorMessage = nil

        let opIds = selectedOperationIds.isEmpty ? [] : Array(selectedOperationIds)
        let newOps = newOperations.isEmpty ? [] : newOperations

        do {
            task = try await tasksService.completeTask(id: task.safeId, operationIds: opIds, newOperations: newOps)
            clearSavedOperationIds()
            TaskEventBroadcaster.shared.taskUpdated(task)
            updateTimerState()  // Обновляем состояние таймера
            isLoading = false
            return true
        } catch is CancellationError {
            // Игнорируем отмену
            isLoading = false
            return false
        } catch {
            toastManager.show(message: error.localizedDescription, state: .error)
            isLoading = false
            return false
        }
    }

    /// Complete task with photo (IN_PROGRESS → COMPLETED with multipart upload)
    /// - Returns: true если задача успешно завершена, false если произошла ошибка
    func completeTaskWithPhoto(_ image: UIImage) async -> Bool {
        guard task.safeState.canTransition(to: .completed) else {
            errorMessage = "Невозможно завершить задачу в текущем состоянии"
            toastManager.show(message: "Невозможно завершить задачу в текущем состоянии", state: .error)
            return false
        }

        analyticsService.track(.taskCompleteSubmitted(
            hasPhoto: true,
            hasText: false,
            taskId: task.id?.uuidString ?? "",
            taskType: task.type?.rawValue ?? "",
            workType: task.workType?.name,
            timeStart: task.timeStart,
            timeEnd: task.timeEnd
        ))

        isLoading = true
        errorMessage = nil

        let opIds = selectedOperationIds.isEmpty ? [] : Array(selectedOperationIds)
        let newOps = newOperations.isEmpty ? [] : newOperations

        do {
            task = try await tasksService.completeTaskWithPhoto(id: task.safeId, image: image, operationIds: opIds, newOperations: newOps)
            clearSavedOperationIds()
            TaskEventBroadcaster.shared.taskUpdated(task)
            updateTimerState()  // Обновляем состояние таймера
            isLoading = false
            return true
        } catch is CancellationError {
            // Игнорируем отмену
            isLoading = false
            return false
        } catch {
            toastManager.show(message: error.localizedDescription, state: .error)
            isLoading = false
            return false
        }
    }

    /// Pull-to-Refresh (НЕ меняет isLoading — индикатор показывает SwiftUI)
    func refresh() async {
        async let taskRefresh: Void = loadTaskInternal()
        async let hintsRefresh: Void = loadHints()
        _ = await (taskRefresh, hintsRefresh)
    }

    /// Внутренняя логика загрузки задачи
    private func loadTaskInternal() async {
        // Отменяем предыдущую загрузку если она еще активна
        loadTaskTask?.cancel()

        let stream = await tasksService.getTask(id: task.safeId)

        // Создаем Task для итерации по stream
        loadTaskTask = _Concurrency.Task {
            for await result in stream {
                switch result {
                case .cached(let cachedTask):
                    // Данные из кэша - обновляем сразу
                    task = cachedTask
                    isLoading = false
                    updateTimerState()

                case .fresh(let freshTask):
                    // Свежие данные с сервера - обновляем
                    task = freshTask
                    updateTimerState()
                    initializeSelectionFromServerIfNeeded()

                case .error(let error):
                    // Ошибка обновления (кэш уже показан если был)
                    if !(error is CancellationError) {
                        // Если isLoading == false, значит кэш был показан
                        if isLoading {
                            // Кэша не было - показываем ошибку всегда
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
        }

        // Ждем завершения загрузки
        await loadTaskTask?.value
    }

    /// Обновить состояние таймера в зависимости от состояния задачи
    private func updateTimerState() {
        if task.safeState == .inProgress {
            startTimer()
        } else {
            stopTimer()
        }
    }

    /// Операции задачи (только ACCEPTED + PENDING, приходят из GET /{id})
    var operations: [Operation] {
        task.operations ?? []
    }

    /// Переключить выбор операции и сохранить в UserDefaults
    func toggleOperation(id: Int) {
        if selectedOperationIds.contains(id) {
            selectedOperationIds.remove(id)
        } else {
            selectedOperationIds.insert(id)
        }
        saveOperationIds()
    }

    /// Добавить новую операцию и сохранить в UserDefaults
    func addNewOperation(_ name: String) {
        let trimmed = name.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty else { return }
        newOperations.append(trimmed)
        saveNewOperations()
    }

    /// Удалить новую операцию по индексу
    func removeNewOperation(at index: Int) {
        guard newOperations.indices.contains(index) else { return }
        newOperations.remove(at: index)
        saveNewOperations()
    }

    // MARK: - Operations Bottom Sheets

    /// Показать Bottom Sheet для выбора операций из списка
    /// - Parameter trigger: "manual" — кнопка «Добавить подзадачу», "auto" — при нажатии «Завершить» без выбора
    func showSelectOperationsSheet(trigger: String = "manual") {
        trackSubtaskSelectSheetOpened(trigger: trigger)
        SelectOperationsBottomSheet.show(
            bottomSheetManager: bottomSheetManager,
            operations: operations,
            initiallySelected: selectedOperationIds,
            onConfirm: { [weak self] newSelection in
                guard let self else { return }
                self.selectedOperationIds = newSelection
                self.saveOperationIds()
                self.bottomSheetManager.dismiss()
            },
            onCreateNew: { [weak self] in
                guard let self else { return }
                self.bottomSheetManager.dismiss()
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) { [weak self] in
                    self?.showCreateOperationSheet()
                }
            },
            onSearchUsed: { [weak self] in
                self?.trackSubtaskSearchUsed()
            }
        )
    }

    /// Показать Bottom Sheet для создания новой операции
    func showCreateOperationSheet() {
        trackSubtaskCreateSheetOpened()
        CreateOperationBottomSheet.show(
            bottomSheetManager: bottomSheetManager,
            onConfirm: { [weak self] name in
                guard let self else { return }
                self.trackSubtaskCreated()
                self.addNewOperation(name)
                self.bottomSheetManager.dismiss()
            }
        )
    }

    // MARK: - Analytics (подзадачи и подсказки)

    /// trigger: "manual" — кнопка «Добавить подзадачу», "auto" — при нажатии «Завершить» без выбора
    func trackSubtaskSelectSheetOpened(trigger: String) {
        analyticsService.track(.subtaskSelectSheetOpened(
            trigger: trigger,
            workType: task.workType?.name,
            operationsCount: operations.count
        ))
    }

    func trackSubtaskSearchUsed() {
        analyticsService.track(.subtaskSearchUsed)
    }

    func trackSubtaskCreateSheetOpened() {
        analyticsService.track(.subtaskCreateSheetOpened)
    }

    func trackSubtaskCreated() {
        analyticsService.track(.subtaskCreated)
    }

    func trackHintsTabViewed() {
        analyticsService.track(.hintsTabViewed(
            workType: task.workType?.name,
            zone: task.zone?.name,
            hintsCount: hints.count
        ))
    }

    // MARK: - Operation Selection Persistence

    private var operationSelectionKey: String { "wfm_op_sel_\(task.safeId.uuidString)" }
    private var newOperationsKey: String { "wfm_op_new_\(task.safeId.uuidString)" }

    private static func loadSavedOperationIds(for taskId: UUID) -> [Int]? {
        UserDefaults.standard.array(forKey: "wfm_op_sel_\(taskId.uuidString)") as? [Int]
    }

    private static func loadSavedNewOperations(for taskId: UUID) -> [String] {
        UserDefaults.standard.stringArray(forKey: "wfm_op_new_\(taskId.uuidString)") ?? []
    }

    private func saveOperationIds() {
        UserDefaults.standard.set(Array(selectedOperationIds), forKey: operationSelectionKey)
    }

    private func saveNewOperations() {
        UserDefaults.standard.set(newOperations, forKey: newOperationsKey)
    }

    private func clearSavedOperationIds() {
        UserDefaults.standard.removeObject(forKey: operationSelectionKey)
        UserDefaults.standard.removeObject(forKey: newOperationsKey)
    }

    private func initializeSelectionFromServerIfNeeded() {
        guard !isSelectionInitialized, let ops = task.operations else { return }
        if let completedIds = task.completedOperationIds, !completedIds.isEmpty {
            let validIds = Set(ops.map { $0.id })
            selectedOperationIds = Set(completedIds).intersection(validIds)
        }
        isSelectionInitialized = true
    }

    /// Загрузить подсказки по work_type_id и zone_id задачи (stale-while-revalidate)
    func loadHints() async {
        guard !isLoadingHints else { return }
        isLoadingHints = true
        defer { isLoadingHints = false }

        let stream = tasksService.getHints(
            workTypeId: task.workTypeId,
            zoneId: task.zoneId
        )

        for await result in stream {
            guard !_Concurrency.Task.isCancelled else { break }
            switch result {
            case .cached(let fetchedHints):
                hints = fetchedHints
            case .fresh(let fetchedHints):
                hints = fetchedHints
            case .error:
                break
            }
        }
    }

    /// Get available actions for current task state
    var availableActions: [TaskAction] {
        var actions: [TaskAction] = []

        if task.safeState.canTransition(to: .inProgress) {
            actions.append(task.safeState == .paused ? .resume : .start)
        }

        if task.safeState.canTransition(to: .paused) {
            actions.append(.pause)
        }

        if task.safeState.canTransition(to: .completed) {
            actions.append(.complete)
        }

        return actions
    }
}

/// Доступные действия с задачей
enum TaskAction: String, CaseIterable {
    case start = "Начать"
    case pause = "На паузу"
    case resume = "Возобновить"
    case complete = "Завершить"

    var icon: String {
        switch self {
        case .start:
            return "play.fill"
        case .pause:
            return "pause.fill"
        case .resume:
            return "play.fill"
        case .complete:
            return "checkmark.circle.fill"
        }
    }

    var color: Color {
        switch self {
        case .start, .resume:
            return .green
        case .pause:
            return .orange
        case .complete:
            return .blue
        }
    }
}
