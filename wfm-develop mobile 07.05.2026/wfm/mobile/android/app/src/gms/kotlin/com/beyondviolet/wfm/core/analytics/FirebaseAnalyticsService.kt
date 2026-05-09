package com.beyondviolet.wfm.core.analytics

import com.google.firebase.Firebase
import com.google.firebase.analytics.FirebaseAnalytics
import com.google.firebase.analytics.analytics
import com.google.firebase.analytics.logEvent

/**
 * Реализация аналитики через Firebase Analytics.
 */
class FirebaseAnalyticsService : AnalyticsService {

    private val firebaseAnalytics: FirebaseAnalytics = Firebase.analytics

    override fun track(event: AnalyticsEvent) {
        firebaseAnalytics.logEvent(event.name()) {
            event.params().forEach { (key, value) -> param(key, value) }
        }
    }

    override fun setUser(userId: Int, role: String) {
        firebaseAnalytics.setUserId(userId.toString())
        firebaseAnalytics.setUserProperty("user_role", role)
    }

    override fun resetUser() {
        firebaseAnalytics.setUserId(null)
        firebaseAnalytics.setUserProperty("user_role", null)
    }

    private fun AnalyticsEvent.name(): String = when (this) {
        is AnalyticsEvent.PhoneInputViewed -> "phone_input_viewed"
        is AnalyticsEvent.PhoneSubmitted -> "phone_submitted"
        is AnalyticsEvent.CodeInputViewed -> "code_input_viewed"
        is AnalyticsEvent.CodeSubmitted -> "code_submitted"
        is AnalyticsEvent.LoginCompleted -> "login_completed"
        is AnalyticsEvent.LogoutTapped -> "logout_tapped"
        is AnalyticsEvent.HomeViewed -> "home_viewed"
        is AnalyticsEvent.TasksListViewed -> "tasks_list_viewed"
        is AnalyticsEvent.TaskCardTapped -> "task_card_tapped"
        is AnalyticsEvent.TaskDetailViewed -> "task_detail_viewed"
        is AnalyticsEvent.TaskStartTapped -> "task_start_tapped"
        is AnalyticsEvent.TaskPauseTapped -> "task_pause_tapped"
        is AnalyticsEvent.TaskResumeTapped -> "task_resume_tapped"
        is AnalyticsEvent.TaskCompleteSheetOpened -> "task_complete_sheet_opened"
        is AnalyticsEvent.TaskCompleteSubmitted -> "task_complete_submitted"
        is AnalyticsEvent.ManagerHomeViewed -> "manager_home_viewed"
        is AnalyticsEvent.TaskReviewSheetOpened -> "task_review_sheet_opened"
        is AnalyticsEvent.TaskApprovedTapped -> "task_approved_tapped"
        is AnalyticsEvent.TaskRejectedTapped -> "task_rejected_tapped"
        is AnalyticsEvent.ManagerTasksViewed -> "manager_tasks_viewed"
        is AnalyticsEvent.EmployeeFilterViewed -> "employee_filter_viewed"
        is AnalyticsEvent.EmployeeFilterApplied -> "employee_filter_applied"
        is AnalyticsEvent.TaskCreateSheetOpened -> "task_create_sheet_opened"
        is AnalyticsEvent.TaskCreateSubmitted -> "task_create_submitted"
        is AnalyticsEvent.TaskEditSheetOpened -> "task_edit_sheet_opened"
        is AnalyticsEvent.ShiftOpenCompleted -> "shift_open_completed"
        is AnalyticsEvent.ShiftCloseCompleted -> "shift_close_completed"
        is AnalyticsEvent.SettingsViewed -> "settings_viewed"
        is AnalyticsEvent.NoAssignmentViewed -> "no_assignment_viewed"
        is AnalyticsEvent.ApiError -> "api_error"
        is AnalyticsEvent.ApiRequestCompleted -> "api_request_completed"
        is AnalyticsEvent.PushNotificationReceived -> "push_notification_received"
        is AnalyticsEvent.PushNotificationTapped -> "push_notification_tapped"
        is AnalyticsEvent.SubtaskSelectSheetOpened -> "subtask_select_sheet_opened"
        is AnalyticsEvent.SubtaskSearchUsed -> "subtask_search_used"
        is AnalyticsEvent.SubtaskCreateSheetOpened -> "subtask_create_sheet_opened"
        is AnalyticsEvent.SubtaskCreated -> "subtask_created"
        is AnalyticsEvent.HintsTabViewed -> "hints_tab_viewed"
    }

    private fun AnalyticsEvent.params(): Map<String, String> = when (this) {
        is AnalyticsEvent.LoginCompleted -> mapOf("role" to role)
        is AnalyticsEvent.TasksListViewed -> mapOf("tasks_count" to tasksCount.toString())
        is AnalyticsEvent.TaskCardTapped -> mapOf("task_state" to taskState, "task_type" to taskType)
        is AnalyticsEvent.TaskDetailViewed -> mapOf(
            "task_state" to taskState,
            "task_review_state" to taskReviewState,
            "task_type" to taskType
        )
        is AnalyticsEvent.TaskCompleteSheetOpened -> mapOf("requires_photo" to requiresPhoto.toString())
        is AnalyticsEvent.TaskStartTapped -> buildMap {
            put("task_id", taskId)
            put("task_type", taskType)
            if (workType != null) put("work_type", workType)
            if (timeStart != null) put("time_start", timeStart)
            if (timeEnd != null) put("time_end", timeEnd)
        }
        is AnalyticsEvent.TaskCompleteSubmitted -> buildMap {
            put("has_photo", hasPhoto.toString())
            put("has_text", hasText.toString())
            put("task_id", taskId)
            put("task_type", taskType)
            if (workType != null) put("work_type", workType)
            if (timeStart != null) put("time_start", timeStart)
            if (timeEnd != null) put("time_end", timeEnd)
        }
        is AnalyticsEvent.ManagerHomeViewed -> mapOf("tasks_on_review_count" to tasksOnReviewCount.toString())
        is AnalyticsEvent.TaskReviewSheetOpened -> mapOf("task_review_state" to taskReviewState)
        is AnalyticsEvent.TaskRejectedTapped -> mapOf("has_comment" to hasComment.toString())
        is AnalyticsEvent.EmployeeFilterApplied -> mapOf("selected_count" to selectedCount.toString())
        is AnalyticsEvent.TaskCreateSubmitted -> mapOf(
            "has_assignee" to hasAssignee.toString(),
            "requires_photo" to requiresPhoto.toString(),
            "planned_minutes" to plannedMinutes.toString()
        )
        is AnalyticsEvent.ShiftOpenCompleted -> mapOf("shift_id" to shiftId.toString(), "role" to role)
        is AnalyticsEvent.ShiftCloseCompleted -> mapOf("shift_id" to shiftId.toString(), "role" to role)
        is AnalyticsEvent.ApiError -> mapOf("http_status" to httpStatus.toString())
        is AnalyticsEvent.ApiRequestCompleted -> buildMap {
            put("path", path)
            put("method", method)
            put("http_status", httpStatus.toString())
            put("duration_ms", durationMs.toString())
            put("store_id", storeId)
            put("is_error", isError.toString())
            if (errorType != null) put("error_type", errorType)
        }
        is AnalyticsEvent.PushNotificationReceived -> buildMap {
            put("channel", channel)
            if (notificationId != null) put("notification_id", notificationId)
            if (taskId != null) put("task_id", taskId)
        }
        is AnalyticsEvent.PushNotificationTapped -> buildMap {
            put("channel", channel)
            if (notificationId != null) put("notification_id", notificationId)
            if (taskId != null) put("task_id", taskId)
        }
        is AnalyticsEvent.SubtaskSelectSheetOpened -> buildMap {
            put("trigger", trigger)
            put("operations_count", operationsCount.toString())
            if (workType != null) put("work_type", workType)
        }
        is AnalyticsEvent.HintsTabViewed -> buildMap {
            put("hints_count", hintsCount.toString())
            if (workType != null) put("work_type", workType)
            if (zone != null) put("zone", zone)
        }
        else -> emptyMap()
    }
}
