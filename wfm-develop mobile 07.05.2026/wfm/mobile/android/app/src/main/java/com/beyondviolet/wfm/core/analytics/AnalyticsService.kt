package com.beyondviolet.wfm.core.analytics

/**
 * Интерфейс сервиса аналитики.
 *
 * Абстракция над конкретным провайдером (Firebase, Amplitude и т.д.).
 * Позволяет сменить провайдер без изменений в бизнес-логике.
 *
 * Реализации:
 * - [NoOpAnalyticsService] — заглушка (до подключения Firebase)
 * - [FirebaseAnalyticsService] — отправка событий в Firebase Analytics
 */
interface AnalyticsService {
    /**
     * Трекинг события
     */
    fun track(event: AnalyticsEvent)

    /**
     * Установить идентификатор пользователя после входа.
     * userId = внутренний user_id из БД (integer).
     */
    fun setUser(userId: Int, role: String)

    /**
     * Сбросить идентификатор пользователя при выходе.
     */
    fun resetUser()
}

/**
 * Все события мобильного приложения.
 * Каталог событий: .memory_bank/analytics/mobile_events.md
 */
sealed class AnalyticsEvent {

    // ── Авторизация ──────────────────────────────────────────────────────────

    data object PhoneInputViewed : AnalyticsEvent()
    data object PhoneSubmitted : AnalyticsEvent()
    data object CodeInputViewed : AnalyticsEvent()
    data object CodeSubmitted : AnalyticsEvent()
    data class LoginCompleted(val role: String) : AnalyticsEvent()
    data object LogoutTapped : AnalyticsEvent()

    // ── Главная экран работника ───────────────────────────────────────────────

    data object HomeViewed : AnalyticsEvent()

    // ── Список задач работника ────────────────────────────────────────────────

    data class TasksListViewed(val tasksCount: Int) : AnalyticsEvent()
    data class TaskCardTapped(val taskState: String, val taskType: String) : AnalyticsEvent()

    // ── Подзадачи и подсказки (экран деталей задачи) ─────────────────────────

    /**
     * @param trigger "manual" — кнопка «Добавить подзадачу», "auto" — открылось при нажатии «Завершить» без выбора
     */
    data class SubtaskSelectSheetOpened(val trigger: String, val workType: String?, val operationsCount: Int) : AnalyticsEvent()
    data object SubtaskSearchUsed : AnalyticsEvent()
    data object SubtaskCreateSheetOpened : AnalyticsEvent()
    data object SubtaskCreated : AnalyticsEvent()
    data class HintsTabViewed(val workType: String?, val zone: String?, val hintsCount: Int) : AnalyticsEvent()

    // ── Детали задачи работника ───────────────────────────────────────────────

    data class TaskDetailViewed(
        val taskState: String,
        val taskReviewState: String,
        val taskType: String
    ) : AnalyticsEvent()

    data class TaskStartTapped(
        val taskId: String,
        val taskType: String,
        val workType: String?,
        val timeStart: String?,
        val timeEnd: String?
    ) : AnalyticsEvent()
    data object TaskPauseTapped : AnalyticsEvent()
    data object TaskResumeTapped : AnalyticsEvent()
    data class TaskCompleteSheetOpened(val requiresPhoto: Boolean) : AnalyticsEvent()
    data class TaskCompleteSubmitted(
        val hasPhoto: Boolean,
        val hasText: Boolean,
        val taskId: String,
        val taskType: String,
        val workType: String?,
        val timeStart: String?,
        val timeEnd: String?
    ) : AnalyticsEvent()

    // ── Главная менеджера ─────────────────────────────────────────────────────

    data class ManagerHomeViewed(val tasksOnReviewCount: Int) : AnalyticsEvent()
    data class TaskReviewSheetOpened(val taskReviewState: String) : AnalyticsEvent()
    data object TaskApprovedTapped : AnalyticsEvent()
    data class TaskRejectedTapped(val hasComment: Boolean) : AnalyticsEvent()

    // ── Контроль задач менеджера ──────────────────────────────────────────────

    data object ManagerTasksViewed : AnalyticsEvent()
    data object EmployeeFilterViewed : AnalyticsEvent()
    data class EmployeeFilterApplied(val selectedCount: Int) : AnalyticsEvent()

    // ── Создание задачи ───────────────────────────────────────────────────────

    data object TaskCreateSheetOpened : AnalyticsEvent()
    data class TaskCreateSubmitted(
        val hasAssignee: Boolean,
        val requiresPhoto: Boolean,
        val plannedMinutes: Int
    ) : AnalyticsEvent()

    data object TaskEditSheetOpened : AnalyticsEvent()

    // ── Смены ─────────────────────────────────────────────────────────────────

    data class ShiftOpenCompleted(val shiftId: Int, val role: String) : AnalyticsEvent()
    data class ShiftCloseCompleted(val shiftId: Int, val role: String) : AnalyticsEvent()

    // ── Настройки ─────────────────────────────────────────────────────────────

    data object SettingsViewed : AnalyticsEvent()
    data object NoAssignmentViewed : AnalyticsEvent()

    // ── Уведомления ───────────────────────────────────────────────────────────

    data class PushNotificationReceived(
        val channel: String,         // "fcm", "hms", "websocket"
        val notificationId: String?,
        val taskId: String?
    ) : AnalyticsEvent()

    data class PushNotificationTapped(
        val channel: String,         // "fcm", "hms", "websocket"
        val notificationId: String?,
        val taskId: String?
    ) : AnalyticsEvent()

    // ── Системные / ошибки ────────────────────────────────────────────────────

    data class ApiError(val httpStatus: Int) : AnalyticsEvent()

    // ── Телеметрия сети ───────────────────────────────────────────────────────

    data class ApiRequestCompleted(
        val path: String,
        val method: String,
        val httpStatus: Int,
        val durationMs: Int,
        val storeId: String,
        val isError: Boolean,
        val errorType: String?
    ) : AnalyticsEvent()
}
