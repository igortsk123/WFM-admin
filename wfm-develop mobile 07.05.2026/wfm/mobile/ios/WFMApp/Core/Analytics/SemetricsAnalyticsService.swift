import Foundation
import Semetrics

/// Semetrics реализация аналитики.
///
/// userId и deviceId хранятся в UserDefaults — Semetrics принимает их per-event (не глобально),
/// поэтому персистим вручную, чтобы события не теряли контекст после перезапуска приложения.
/// deviceId генерируется один раз при первом запуске и не меняется (anonymous_id в терминах SDK).
final class SemetricsAnalyticsService: AnalyticsService {

    private enum Keys {
        static let userId = "semetrics_user_id"
        static let deviceId = "semetrics_device_id"
    }

    /// Читает/пишет UserDefaults — переживает перезапуск приложения
    private var currentUserId: String? {
        get { UserDefaults.standard.string(forKey: Keys.userId) }
        set { UserDefaults.standard.set(newValue, forKey: Keys.userId) }
    }

    /// Генерируется один раз при первом запуске, далее читается из UserDefaults
    private var deviceId: String {
        if let stored = UserDefaults.standard.string(forKey: Keys.deviceId) {
            return stored
        }
        let newId = UUID().uuidString
        UserDefaults.standard.set(newId, forKey: Keys.deviceId)
        return newId
    }

    func track(_ event: AnalyticsEvent) {
        let (name, props) = event.semetricsRepresentation
        SemetricsClient.shared.track(
            eventName: name,
            userId: currentUserId,
            anonymousId: deviceId,
            properties: props.isEmpty ? nil : props
        )
    }

    func setUser(userId: Int, role: String) {
        currentUserId = String(userId)
    }

    func resetUser() {
        currentUserId = nil
    }
}

// MARK: - Semetrics mapping

private extension AnalyticsEvent {
    var semetricsRepresentation: (name: String, props: [String: Any]) {
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
            var props: [String: Any] = ["task_id": taskId, "task_type": taskType]
            if let workType = workType { props["work_type"] = workType }
            if let timeStart = timeStart { props["time_start"] = timeStart }
            if let timeEnd = timeEnd { props["time_end"] = timeEnd }
            return ("task_start_tapped", props)
        case .taskPauseTapped:
            return ("task_pause_tapped", [:])
        case .taskResumeTapped:
            return ("task_resume_tapped", [:])
        case .taskCompleteSheetOpened(let requires):
            return ("task_complete_sheet_opened", ["requires_photo": requires])
        case .taskCompleteSubmitted(let hasPhoto, let hasText, let taskId, let taskType, let workType, let timeStart, let timeEnd):
            var props: [String: Any] = ["has_photo": hasPhoto, "has_text": hasText, "task_id": taskId, "task_type": taskType]
            if let workType = workType { props["work_type"] = workType }
            if let timeStart = timeStart { props["time_start"] = timeStart }
            if let timeEnd = timeEnd { props["time_end"] = timeEnd }
            return ("task_complete_submitted", props)
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
            var props: [String: Any] = [
                "path": path,
                "method": method,
                "http_status": httpStatus,
                "duration_ms": durationMs,
                "store_id": storeId,
                "is_error": isError
            ]
            if let errorType = errorType {
                props["error_type"] = errorType
            }
            return ("api_request_completed", props)
        case .pushNotificationReceived(let channel, let notificationId, let taskId):
            var props: [String: Any] = ["channel": channel]
            if let notificationId { props["notification_id"] = notificationId }
            if let taskId { props["task_id"] = taskId }
            return ("push_notification_received", props)
        case .pushNotificationTapped(let channel, let notificationId, let taskId):
            var props: [String: Any] = ["channel": channel]
            if let notificationId { props["notification_id"] = notificationId }
            if let taskId { props["task_id"] = taskId }
            return ("push_notification_tapped", props)
        case .subtaskSelectSheetOpened(let trigger, let workType, let operationsCount):
            var props: [String: Any] = ["trigger": trigger, "operations_count": operationsCount]
            if let workType { props["work_type"] = workType }
            return ("subtask_select_sheet_opened", props)
        case .subtaskSearchUsed:
            return ("subtask_search_used", [:])
        case .subtaskCreateSheetOpened:
            return ("subtask_create_sheet_opened", [:])
        case .subtaskCreated:
            return ("subtask_created", [:])
        case .hintsTabViewed(let workType, let zone, let hintsCount):
            var props: [String: Any] = ["hints_count": hintsCount]
            if let workType { props["work_type"] = workType }
            if let zone { props["zone"] = zone }
            return ("hints_tab_viewed", props)
        }
    }
}
