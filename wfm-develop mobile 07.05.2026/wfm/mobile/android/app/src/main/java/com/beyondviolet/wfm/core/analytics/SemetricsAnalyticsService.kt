package com.beyondviolet.wfm.core.analytics

import android.content.Context
import ru.semetrics.sdk.Semetrics
import java.util.UUID

/**
 * Semetrics реализация аналитики.
 *
 * userId и deviceId хранятся в SharedPreferences — Semetrics принимает их per-event (не глобально),
 * поэтому персистим вручную, чтобы события не теряли контекст после перезапуска приложения.
 * deviceId генерируется один раз при первом запуске и не меняется (anonymous_id в терминах SDK).
 */
class SemetricsAnalyticsService(context: Context) : AnalyticsService {

    private val prefs = context.getSharedPreferences("semetrics_prefs", Context.MODE_PRIVATE)

    private var currentUserId: String?
        get() = prefs.getString("user_id", null)
        set(value) {
            if (value != null) prefs.edit().putString("user_id", value).apply()
            else prefs.edit().remove("user_id").apply()
        }

    /** Генерируется один раз при первом запуске, далее читается из SharedPreferences. */
    private val deviceId: String by lazy {
        prefs.getString("device_id", null) ?: UUID.randomUUID().toString().also {
            prefs.edit().putString("device_id", it).apply()
        }
    }

    override fun track(event: AnalyticsEvent) {
        val (name, props) = event.toSemetrics()
        Semetrics.track(eventName = name, userId = currentUserId, anonymousId = deviceId, properties = props)
    }

    override fun setUser(userId: Int, role: String) {
        currentUserId = userId.toString()
    }

    override fun resetUser() {
        currentUserId = null
    }
}

// MARK: - Semetrics mapping

private fun AnalyticsEvent.toSemetrics(): Pair<String, Map<String, Any>?> = when (this) {
    is AnalyticsEvent.PhoneInputViewed -> "phone_input_viewed" to null
    is AnalyticsEvent.PhoneSubmitted -> "phone_submitted" to null
    is AnalyticsEvent.CodeInputViewed -> "code_input_viewed" to null
    is AnalyticsEvent.CodeSubmitted -> "code_submitted" to null
    is AnalyticsEvent.LoginCompleted -> "login_completed" to mapOf("role" to role)
    is AnalyticsEvent.LogoutTapped -> "logout_tapped" to null
    is AnalyticsEvent.HomeViewed -> "home_viewed" to null
    is AnalyticsEvent.TasksListViewed -> "tasks_list_viewed" to mapOf("tasks_count" to tasksCount)
    is AnalyticsEvent.TaskCardTapped -> "task_card_tapped" to mapOf("task_state" to taskState, "task_type" to taskType)
    is AnalyticsEvent.TaskDetailViewed -> "task_detail_viewed" to mapOf(
        "task_state" to taskState,
        "task_review_state" to taskReviewState,
        "task_type" to taskType
    )
    is AnalyticsEvent.TaskStartTapped -> "task_start_tapped" to buildMap<String, Any> {
        put("task_id", taskId)
        put("task_type", taskType)
        if (workType != null) put("work_type", workType)
        if (timeStart != null) put("time_start", timeStart)
        if (timeEnd != null) put("time_end", timeEnd)
    }
    is AnalyticsEvent.TaskPauseTapped -> "task_pause_tapped" to null
    is AnalyticsEvent.TaskResumeTapped -> "task_resume_tapped" to null
    is AnalyticsEvent.TaskCompleteSheetOpened -> "task_complete_sheet_opened" to mapOf("requires_photo" to requiresPhoto)
    is AnalyticsEvent.TaskCompleteSubmitted -> "task_complete_submitted" to buildMap<String, Any> {
        put("has_photo", hasPhoto)
        put("has_text", hasText)
        put("task_id", taskId)
        put("task_type", taskType)
        if (workType != null) put("work_type", workType)
        if (timeStart != null) put("time_start", timeStart)
        if (timeEnd != null) put("time_end", timeEnd)
    }
    is AnalyticsEvent.ManagerHomeViewed -> "manager_home_viewed" to mapOf("tasks_on_review_count" to tasksOnReviewCount)
    is AnalyticsEvent.TaskReviewSheetOpened -> "task_review_sheet_opened" to mapOf("task_review_state" to taskReviewState)
    is AnalyticsEvent.TaskApprovedTapped -> "task_approved_tapped" to null
    is AnalyticsEvent.TaskRejectedTapped -> "task_rejected_tapped" to mapOf("has_comment" to hasComment)
    is AnalyticsEvent.ManagerTasksViewed -> "manager_tasks_viewed" to null
    is AnalyticsEvent.EmployeeFilterViewed -> "employee_filter_viewed" to null
    is AnalyticsEvent.EmployeeFilterApplied -> "employee_filter_applied" to mapOf("selected_count" to selectedCount)
    is AnalyticsEvent.TaskCreateSheetOpened -> "task_create_sheet_opened" to null
    is AnalyticsEvent.TaskCreateSubmitted -> "task_create_submitted" to mapOf(
        "has_assignee" to hasAssignee,
        "requires_photo" to requiresPhoto,
        "planned_minutes" to plannedMinutes
    )
    is AnalyticsEvent.TaskEditSheetOpened -> "task_edit_sheet_opened" to null
    is AnalyticsEvent.ShiftOpenCompleted -> "shift_open_completed" to mapOf("shift_id" to shiftId, "role" to role)
    is AnalyticsEvent.ShiftCloseCompleted -> "shift_close_completed" to mapOf("shift_id" to shiftId, "role" to role)
    is AnalyticsEvent.SettingsViewed -> "settings_viewed" to null
    is AnalyticsEvent.NoAssignmentViewed -> "no_assignment_viewed" to null
    is AnalyticsEvent.ApiError -> "api_error" to mapOf("http_status" to httpStatus)
    is AnalyticsEvent.ApiRequestCompleted -> "api_request_completed" to buildMap {
        put("path", path)
        put("method", method)
        put("http_status", httpStatus)
        put("duration_ms", durationMs)
        put("store_id", storeId)
        put("is_error", isError)
        if (errorType != null) put("error_type", errorType)
    }
    is AnalyticsEvent.PushNotificationReceived -> "push_notification_received" to buildMap<String, Any> {
        put("channel", channel)
        if (notificationId != null) put("notification_id", notificationId)
        if (taskId != null) put("task_id", taskId)
    }
    is AnalyticsEvent.PushNotificationTapped -> "push_notification_tapped" to buildMap<String, Any> {
        put("channel", channel)
        if (notificationId != null) put("notification_id", notificationId)
        if (taskId != null) put("task_id", taskId)
    }
    is AnalyticsEvent.SubtaskSelectSheetOpened -> "subtask_select_sheet_opened" to buildMap<String, Any> {
        put("trigger", trigger)
        put("operations_count", operationsCount)
        if (workType != null) put("work_type", workType)
    }
    is AnalyticsEvent.SubtaskSearchUsed -> "subtask_search_used" to null
    is AnalyticsEvent.SubtaskCreateSheetOpened -> "subtask_create_sheet_opened" to null
    is AnalyticsEvent.SubtaskCreated -> "subtask_created" to null
    is AnalyticsEvent.HintsTabViewed -> "hints_tab_viewed" to buildMap<String, Any> {
        put("hints_count", hintsCount)
        if (workType != null) put("work_type", workType)
        if (zone != null) put("zone", zone)
    }
}
