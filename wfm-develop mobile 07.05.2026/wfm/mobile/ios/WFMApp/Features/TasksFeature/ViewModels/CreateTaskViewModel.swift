import Foundation
import SwiftUI
import WFMUI

/// ViewModel for create task screen
@MainActor
class CreateTaskViewModel: ObservableObject {
    @Published var title = ""
    @Published var description = ""
    @Published var type: TaskType = .planned
    @Published var plannedMinutes = 60
    @Published var assigneeIdText = ""  // Текстовое поле для ввода ID
    @Published var shiftId: Int? = nil

    /// Преобразовать текстовый ID в Int?
    private var assigneeId: Int? {
        assigneeIdText.isEmpty ? nil : Int(assigneeIdText)
    }

    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var createdTask: Task?

    private let tasksService: TasksService
    private let toastManager: ToastManager
    private let analyticsService: AnalyticsService

    init(tasksService: TasksService, toastManager: ToastManager, analyticsService: AnalyticsService) {
        self.tasksService = tasksService
        self.toastManager = toastManager
        self.analyticsService = analyticsService
    }

    /// Validate form inputs
    var isValid: Bool {
        !title.trimmingCharacters(in: .whitespaces).isEmpty &&
        !description.trimmingCharacters(in: .whitespaces).isEmpty &&
        plannedMinutes > 0
    }

    /// Create new task
    func createTask() async {
        guard isValid else {
            errorMessage = "Заполните все обязательные поля"
            return
        }

        isLoading = true
        errorMessage = nil

        // TODO: В будущем creatorId будет браться из системы аутентификации
        let defaultCreatorId = "550e8400-e29b-41d4-a716-446655440000"

        let request = CreateTaskRequest(
            title: title,
            description: description,
            type: type,
            plannedMinutes: plannedMinutes,
            assigneeId: assigneeId,
            shiftId: shiftId
        )

        analyticsService.track(.taskCreateSubmitted(
            hasAssignee: assigneeId != nil,
            requiresPhoto: false,
            plannedMinutes: plannedMinutes
        ))

        do {
            createdTask = try await tasksService.createTask(request: request)

            // Отправить событие о создании задачи для обновления списка
            if let task = createdTask {
                TaskEventBroadcaster.shared.taskCreated(task)
            }
        } catch is CancellationError {
            // Игнорируем отмену
        } catch {
            toastManager.show(message: error.localizedDescription, state: .error)
        }

        isLoading = false
    }

    /// Reset form
    func reset() {
        title = ""
        description = ""
        type = .planned
        plannedMinutes = 60
        assigneeIdText = ""
        shiftId = nil
        errorMessage = nil
        createdTask = nil
    }
}
