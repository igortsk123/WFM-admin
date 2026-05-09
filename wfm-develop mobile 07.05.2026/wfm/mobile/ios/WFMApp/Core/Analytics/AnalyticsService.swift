import Foundation

// MARK: - Protocol

protocol AnalyticsService: AnyObject {
    func track(_ event: AnalyticsEvent)
    func setUser(userId: Int, role: String)
    func resetUser()
}

// MARK: - Events

enum AnalyticsEvent {
    // MARK: Auth
    case phoneInputViewed
    case phoneSubmitted
    case codeInputViewed
    case codeSubmitted
    case loginCompleted(role: String)
    case logoutTapped

    // MARK: Worker — Home
    case homeViewed

    // MARK: Subtasks & Hints (task detail screen)
    /// trigger: "manual" — кнопка «Добавить подзадачу», "auto" — открылось при нажатии «Завершить» без выбора
    case subtaskSelectSheetOpened(trigger: String, workType: String?, operationsCount: Int)
    case subtaskSearchUsed
    case subtaskCreateSheetOpened
    case subtaskCreated
    case hintsTabViewed(workType: String?, zone: String?, hintsCount: Int)

    // MARK: Worker — Tasks
    case tasksListViewed(tasksCount: Int)
    case taskCardTapped(taskState: String, taskType: String)
    case taskDetailViewed(taskState: String, taskReviewState: String, taskType: String)
    case taskStartTapped(taskId: String, taskType: String, workType: String?, timeStart: String?, timeEnd: String?)
    case taskPauseTapped
    case taskResumeTapped
    case taskCompleteSheetOpened(requiresPhoto: Bool)
    case taskCompleteSubmitted(hasPhoto: Bool, hasText: Bool, taskId: String, taskType: String, workType: String?, timeStart: String?, timeEnd: String?)

    // MARK: Manager — Home
    case managerHomeViewed(tasksOnReviewCount: Int)
    case taskReviewSheetOpened(taskReviewState: String)
    case taskApprovedTapped
    case taskRejectedTapped(hasComment: Bool)

    // MARK: Manager — Tasks
    case managerTasksViewed
    case employeeFilterViewed
    case employeeFilterApplied(selectedCount: Int)
    case taskCreateSheetOpened
    case taskCreateSubmitted(hasAssignee: Bool, requiresPhoto: Bool, plannedMinutes: Int)
    case taskEditSheetOpened

    // MARK: Shifts
    case shiftOpenCompleted(shiftId: Int, role: String)
    case shiftCloseCompleted(shiftId: Int, role: String)

    // MARK: Settings
    case settingsViewed

    // MARK: Notifications
    case pushNotificationReceived(channel: String, notificationId: String?, taskId: String?)
    case pushNotificationTapped(channel: String, notificationId: String?, taskId: String?)

    // MARK: System
    case noAssignmentViewed
    case apiError(httpStatus: Int)

    // MARK: Network Telemetry
    case apiRequestCompleted(path: String, method: String, httpStatus: Int, durationMs: Int, storeId: String, isError: Bool, errorType: String?)
}
