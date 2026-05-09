package com.beyondviolet.wfm.core.models

import com.beyondviolet.wfm.core.serialization.InstantSerializer
import kotlinx.datetime.Instant
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

// MARK: - TaskType

/**
 * Тип задачи
 */
@Serializable
enum class TaskType {
    @SerialName("PLANNED")
    PLANNED,        // Плановая задача

    @SerialName("ADDITIONAL")
    ADDITIONAL      // Дополнительная задача
}

/**
 * Получить отображаемое имя типа задачи
 */
fun TaskType.displayName(): String = when (this) {
    TaskType.PLANNED -> "Плановая"
    TaskType.ADDITIONAL -> "Дополнительная"
}

// MARK: - TaskReviewState

/**
 * Состояние проверки задачи управляющим
 */
@Serializable
enum class TaskReviewState {
    @SerialName("NONE")
    NONE,           // Приёмка не актуальна

    @SerialName("ON_REVIEW")
    ON_REVIEW,      // Ожидает проверки менеджером

    @SerialName("ACCEPTED")
    ACCEPTED,       // Принята

    @SerialName("REJECTED")
    REJECTED        // Отклонена (task.state возвращается в PAUSED)
}

// MARK: - AcceptancePolicy

/**
 * Политика приёмки задачи
 */
@Serializable
enum class AcceptancePolicy {
    @SerialName("AUTO")
    AUTO,           // Автоматическая приёмка (по умолчанию)

    @SerialName("MANUAL")
    MANUAL          // Ручная проверка менеджером
}

// MARK: - Operation

/**
 * Статус проверки операции
 */
@Serializable
enum class OperationReviewState {
    @SerialName("ACCEPTED") ACCEPTED,  // Проверена, видна всем работникам
    @SerialName("PENDING") PENDING,    // Предложена работником, ждёт модерации
    @SerialName("REJECTED") REJECTED   // Отклонена
}

/**
 * Операция — шаг выполнения задачи
 */
@Serializable
data class Operation(
    val id: Int,
    val name: String,
    @SerialName("review_state")
    val reviewState: OperationReviewState? = null
)

// MARK: - LAMA интеграция (вложенные объекты)

/**
 * Тип работы (LAMA)
 */
@Serializable
data class WorkType(
    val id: Int,
    val name: String,
    @SerialName("allow_new_operations")
    val allowNewOperations: Boolean? = null
)

/**
 * Зона магазина (LAMA)
 */
@Serializable
data class Zone(
    val id: Int,
    val name: String,
    val priority: Int
)

/**
 * Категория товаров (LAMA)
 */
@Serializable
data class Category(
    val id: Int,
    val name: String
)

/**
 * Один промежуток времени, когда задача была в состоянии IN_PROGRESS
 */
@Serializable
data class WorkInterval(
    @SerialName("time_start")
    @Serializable(with = InstantSerializer::class)
    val timeStart: Instant,                         // Время начала интервала (START/RESUME)
    @SerialName("time_end")
    @Serializable(with = InstantSerializer::class)
    val timeEnd: Instant? = null                    // Время окончания (PAUSE/COMPLETE); null если задача IN_PROGRESS
)

/**
 * История выполнения задачи
 */
@Serializable
data class HistoryBrief(
    val duration: Int? = null,                      // Общее время в работе (секунды)
    @SerialName("time_start")
    @Serializable(with = InstantSerializer::class)
    val timeStart: Instant? = null,                 // Время первого запуска
    @SerialName("time_state_updated")
    @Serializable(with = InstantSerializer::class)
    val timeStateUpdated: Instant? = null,          // Время последнего изменения состояния
    @SerialName("work_intervals")
    val workIntervals: List<WorkInterval> = emptyList()  // Промежутки фактической работы
)

// MARK: - Task
// Note: PermissionType определён в User.kt

/**
 * Task domain model based on Memory Bank specification
 * Все поля nullable для устойчивости к изменениям API
 */
@Serializable
data class Task(
    val id: String? = null,
    val title: String? = null,
    val description: String? = null,
    val type: TaskType? = null,
    @SerialName("planned_minutes")
    val plannedMinutes: Int? = null,
    @SerialName("creator_id")
    val creatorId: Int? = null,
    @SerialName("assignee_id")
    val assigneeId: Int? = null,
    val assignee: AssigneeBrief? = null,  // Краткие данные исполнителя (GET /tasks/list)
    val state: TaskState? = null,
    @SerialName("review_state")
    val reviewState: TaskReviewState? = null,
    @SerialName("acceptance_policy")
    val acceptancePolicy: AcceptancePolicy? = null,
    @SerialName("requires_photo")
    val requiresPhoto: Boolean? = null,
    val comment: String? = null,
    @SerialName("report_text")
    val reportText: String? = null,
    @SerialName("report_image_url")
    val reportImageUrl: String? = null,
    @SerialName("created_at")
    @Serializable(with = InstantSerializer::class)
    val createdAt: Instant? = null,
    @SerialName("updated_at")
    @Serializable(with = InstantSerializer::class)
    val updatedAt: Instant? = null,
    @SerialName("review_comment")
    val reviewComment: String? = null,

    // LAMA интеграция
    @SerialName("external_id")
    val externalId: Int? = null,
    @SerialName("shift_id")
    val shiftId: Int? = null,
    val priority: Int? = null,
    @SerialName("work_type_id")
    val workTypeId: Int? = null,
    @SerialName("work_type")
    val workType: WorkType? = null,
    @SerialName("zone_id")
    val zoneId: Int? = null,
    val zone: Zone? = null,
    @SerialName("category_id")
    val categoryId: Int? = null,
    val category: Category? = null,
    @SerialName("time_start")
    val timeStart: String? = null,
    @SerialName("time_end")
    val timeEnd: String? = null,
    val source: String? = null,
    @SerialName("history_brief")
    val historyBrief: HistoryBrief? = null,

    // Операции (только в GET /{id})
    val operations: List<Operation>? = null,
    @SerialName("completed_operation_ids")
    val completedOperationIds: List<Int>? = null
) {
    /**
     * Безопасный ID задачи
     */
    fun safeId(): String = id ?: "unknown"

    /**
     * Безопасный title задачи
     */
    fun safeTitle(): String = workType?.name ?: "Задача"

    /**
     * Безопасное состояние задачи
     */
    fun safeState(): TaskState = state ?: TaskState.NEW

    /**
     * Безопасное плановое время (минуты)
     */
    fun safePlannedMinutes(): Int = plannedMinutes ?: 0

    /**
     * Подтверждена ли задача управляющим
     */
    fun isApproved(): Boolean = reviewState == TaskReviewState.ACCEPTED

    /**
     * Была ли задача отклонена
     */
    fun isRejected(): Boolean = reviewState == TaskReviewState.REJECTED

    /**
     * Безопасный review comment
     */
    fun safeReviewComment(): String? = reviewComment
}

// MARK: - Request модели

/**
 * Request model for creating a new task
 */
@Serializable
data class CreateTaskRequest(
    val title: String,
    val description: String,
    val type: TaskType? = TaskType.PLANNED,
    @SerialName("planned_minutes")
    val plannedMinutes: Int,
    @SerialName("assignee_id")
    val assigneeId: Int? = null,
    @SerialName("shift_id")
    val shiftId: Int? = null
)

/**
 * Request model for updating task fields
 */
@Serializable
data class UpdateTaskRequest(
    val title: String? = null,
    val description: String? = null,
    @SerialName("planned_minutes")
    val plannedMinutes: Int? = null,
    @SerialName("assignee_id")
    val assigneeId: Int? = null
)

/**
 * Request для отклонения задачи
 */
@Serializable
data class RejectTaskRequest(
    val reason: String
)

// MARK: - Response модели

/**
 * Response wrapper for list of tasks
 */
@Serializable
data class TasksResponse(
    val tasks: List<Task>
)

/**
 * Краткие данные исполнителя задачи
 */
@Serializable
data class AssigneeBrief(
    val id: Int,
    @SerialName("first_name")
    val firstName: String? = null,
    @SerialName("last_name")
    val lastName: String? = null,
    @SerialName("middle_name")
    val middleName: String? = null
) {
    /**
     * Полное имя исполнителя
     */
    fun fullName(): String {
        val parts = listOfNotNull(lastName, firstName, middleName)
        return if (parts.isEmpty()) "Сотрудник" else parts.joinToString(" ")
    }

    /**
     * Форматированное имя: Фамилия И. О.
     * Пример: "Елисеева А. М."
     */
    fun formattedName(): String {
        val parts = mutableListOf<String>()

        // Фамилия полностью
        lastName?.takeIf { it.isNotEmpty() }?.let {
            parts.add(it)
        }

        // Имя (первая буква и точка)
        firstName?.takeIf { it.isNotEmpty() }?.let {
            val initial = it.first().uppercaseChar()
            parts.add("$initial.")
        }

        // Отчество (первая буква и точка)
        middleName?.takeIf { it.isNotEmpty() }?.let {
            val initial = it.first().uppercaseChar()
            parts.add("$initial.")
        }

        return if (parts.isEmpty()) "Сотрудник" else parts.joinToString(" ")
    }
}

/**
 * Краткие данные должности для списка пользователей
 */
@Serializable
data class PositionBriefResponse(
    val id: Int,
    val code: String,
    val name: String
)

/**
 * Элемент фильтра
 */
@Serializable
data class FilterItem(
    val id: Int,
    val title: String
)

/**
 * Группа фильтра с универсальным массивом элементов
 */
@Serializable
data class FilterGroup(
    val id: String,
    val title: String,
    val array: List<FilterItem>
)

/**
 * Ответ endpoint'а /list/filters
 *
 * task_filter_indices (только в v2): для каждой задачи — тройка индексов
 * [work_type_idx, assignee_idx, zone_idx] в соответствующих массивах filters.
 * -1 если у задачи отсутствует соответствующий атрибут.
 */
@Serializable
data class TaskListFiltersData(
    val filters: List<FilterGroup>,
    @SerialName("task_filter_indices")
    val taskFilterIndices: List<List<Int>> = emptyList()  // Только в /list/filters/v2. Пустой список в v1.
)

/**
 * Сотрудник с плановой сменой сегодня
 */
@Serializable
data class TaskListUserItem(
    @SerialName("assignment_id")
    val assignmentId: Int,
    @SerialName("user_id")
    val userId: Int,
    @SerialName("first_name")
    val firstName: String? = null,
    @SerialName("last_name")
    val lastName: String? = null,
    @SerialName("middle_name")
    val middleName: String? = null,
    val position: PositionBriefResponse? = null
) {
    /**
     * Полное имя сотрудника
     */
    fun fullName(): String {
        val parts = listOfNotNull(lastName, firstName, middleName)
        return if (parts.isEmpty()) "Сотрудник" else parts.joinToString(" ")
    }

    /**
     * Форматированное имя: Фамилия И. О.
     * Пример: "Елисеева А. М."
     */
    fun formattedName(): String {
        val parts = mutableListOf<String>()

        // Фамилия полностью
        lastName?.takeIf { it.isNotEmpty() }?.let {
            parts.add(it)
        }

        // Имя (первая буква и точка)
        firstName?.takeIf { it.isNotEmpty() }?.let {
            val initial = it.first().uppercaseChar()
            parts.add("$initial.")
        }

        // Отчество (первая буква и точка)
        middleName?.takeIf { it.isNotEmpty() }?.let {
            val initial = it.first().uppercaseChar()
            parts.add("$initial.")
        }

        return if (parts.isEmpty()) "Сотрудник" else parts.joinToString(" ")
    }
}

/**
 * Ответ endpoint'а /list/users
 */
@Serializable
data class TaskListUsersData(
    val users: List<TaskListUserItem>
)
