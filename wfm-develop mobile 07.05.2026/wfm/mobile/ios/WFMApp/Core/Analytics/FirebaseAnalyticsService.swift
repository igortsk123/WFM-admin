import Foundation
import FirebaseAnalytics

/// Firebase реализация аналитики.
///
/// Подключение:
/// 1. Добавить пакет Firebase через Xcode: File → Add Package Dependencies →
///    https://github.com/firebase/firebase-ios-sdk
///    Выбрать только FirebaseAnalytics.
/// 2. Добавить GoogleService-Info.plist в таргет WFMApp.
/// 3. В DependencyContainer заменить NoOpAnalyticsService на FirebaseAnalyticsService.
/// 4. В WFMApp.swift добавить FirebaseApp.configure() до создания DependencyContainer.
final class FirebaseAnalyticsService: AnalyticsService {

    func track(_ event: AnalyticsEvent) {
        let (name, params) = event.firebaseRepresentation
        Analytics.logEvent(name, parameters: params.isEmpty ? nil : params)
    }

    func setUser(userId: Int, role: String) {
        Analytics.setUserID(String(userId))
        Analytics.setUserProperty(role, forName: "user_role")
    }

    func resetUser() {
        Analytics.setUserID(nil)
        Analytics.setUserProperty(nil, forName: "user_role")
    }
}

// MARK: - Firebase mapping

private extension AnalyticsEvent {
    var firebaseRepresentation: (name: String, params: [String: Any]) {
        switch self {
        case .phoneInputViewed:
            return ("phone_input_viewed", [:])
        case .phoneSubmitted:
            return ("phone_submitted", [:])
        case .codeInputViewed:
            return ("code_input_viewed", [:])
        case .codeSubmitted:
            return ("code_submitted", [:])
        case .loginCompleted(let role):
            return ("login_completed", ["role": role])
        case .logoutTapped:
            return ("logout_tapped", [:])
        case .homeViewed:
            return ("home_viewed", [:])
        case .tasksListViewed(let count):
            return ("tasks_list_viewed", ["tasks_count": count])
        case .taskCardTapped(let state, let type):
            return ("task_card_tapped", ["task_state": state, "task_type": type])
        case .taskDetailViewed(let state, let review, let type):
            return ("task_detail_viewed", ["task_state": state, "task_review_state": review, "task_type": type])
        case .taskStartTapped(let taskId, let taskType, let workType, let timeStart, let timeEnd):
            var params: [String: Any] = ["task_id": taskId, "task_type": taskType]
            if let workType = workType { params["work_type"] = workType }
            if let timeStart = timeStart { params["time_start"] = timeStart }
            if let timeEnd = timeEnd { params["time_end"] = timeEnd }
            return ("task_start_tapped", params)
        case .taskPauseTapped:
            return ("task_pause_tapped", [:])
        case .taskResumeTapped:
            return ("task_resume_tapped", [:])
        case .taskCompleteSheetOpened(let requires):
            return ("task_complete_sheet_opened", ["requires_photo": requires])
        case .taskCompleteSubmitted(let hasPhoto, let hasText, let taskId, let taskType, let workType, let timeStart, let timeEnd):
            var params: [String: Any] = ["has_photo": hasPhoto, "has_text": hasText, "task_id": taskId, "task_type": taskType]
            if let workType = workType { params["work_type"] = workType }
            if let timeStart = timeStart { params["time_start"] = timeStart }
            if let timeEnd = timeEnd { params["time_end"] = timeEnd }
            return ("task_complete_submitted", params)
        case .managerHomeViewed(let count):
            return ("manager_home_viewed", ["tasks_on_review_count": count])
        case .taskReviewSheetOpened(let reviewState):
            return ("task_review_sheet_opened", ["task_review_state": reviewState])
        case .taskApprovedTapped:
            return ("task_approved_tapped", [:])
        case .taskRejectedTapped(let hasComment):
            return ("task_rejected_tapped", ["has_comment": hasComment])
        case .managerTasksViewed:
            return ("manager_tasks_viewed", [:])
        case .employeeFilterViewed:
            return ("employee_filter_viewed", [:])
        case .employeeFilterApplied(let count):
            return ("employee_filter_applied", ["selected_count": count])
        case .taskCreateSheetOpened:
            return ("task_create_sheet_opened", [:])
        case .taskCreateSubmitted(let hasAssignee, let requiresPhoto, let minutes):
            return ("task_create_submitted", ["has_assignee": hasAssignee, "requires_photo": requiresPhoto, "planned_minutes": minutes])
        case .taskEditSheetOpened:
            return ("task_edit_sheet_opened", [:])
        case .shiftOpenCompleted(let shiftId, let role):
            return ("shift_open_completed", ["shift_id": shiftId, "role": role])
        case .shiftCloseCompleted(let shiftId, let role):
            return ("shift_close_completed", ["shift_id": shiftId, "role": role])
        case .settingsViewed:
            return ("settings_viewed", [:])
        case .noAssignmentViewed:
            return ("no_assignment_viewed", [:])
        case .apiError(let status):
            return ("api_error", ["http_status": status])
        case .apiRequestCompleted(let path, let method, let httpStatus, let durationMs, let storeId, let isError, let errorType):
            var params: [String: Any] = [
                "path": path,
                "method": method,
                "http_status": httpStatus,
                "duration_ms": durationMs,
                "store_id": storeId,
                "is_error": isError
            ]
            if let errorType = errorType {
                params["error_type"] = errorType
            }
            return ("api_request_completed", params)
        case .pushNotificationReceived(let channel, let notificationId, let taskId):
            var params: [String: Any] = ["channel": channel]
            if let notificationId { params["notification_id"] = notificationId }
            if let taskId { params["task_id"] = taskId }
            return ("push_notification_received", params)
        case .pushNotificationTapped(let channel, let notificationId, let taskId):
            var params: [String: Any] = ["channel": channel]
            if let notificationId { params["notification_id"] = notificationId }
            if let taskId { params["task_id"] = taskId }
            return ("push_notification_tapped", params)
        case .subtaskSelectSheetOpened(let trigger, let workType, let operationsCount):
            var params: [String: Any] = ["trigger": trigger, "operations_count": operationsCount]
            if let workType { params["work_type"] = workType }
            return ("subtask_select_sheet_opened", params)
        case .subtaskSearchUsed:
            return ("subtask_search_used", [:])
        case .subtaskCreateSheetOpened:
            return ("subtask_create_sheet_opened", [:])
        case .subtaskCreated:
            return ("subtask_created", [:])
        case .hintsTabViewed(let workType, let zone, let hintsCount):
            var params: [String: Any] = ["hints_count": hintsCount]
            if let workType { params["work_type"] = workType }
            if let zone { params["zone"] = zone }
            return ("hints_tab_viewed", params)
        }
    }
}
