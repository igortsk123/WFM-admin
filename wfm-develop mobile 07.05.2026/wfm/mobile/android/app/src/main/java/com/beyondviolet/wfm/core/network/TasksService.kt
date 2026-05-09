package com.beyondviolet.wfm.core.network

import com.beyondviolet.wfm.core.models.Hint
import com.beyondviolet.wfm.core.models.HintsResponse
import com.beyondviolet.wfm.core.models.CreateTaskRequest
import com.beyondviolet.wfm.core.models.RejectTaskRequest
import com.beyondviolet.wfm.core.models.Task
import com.beyondviolet.wfm.core.models.TaskListFiltersData
import com.beyondviolet.wfm.core.models.TaskListUsersData
import com.beyondviolet.wfm.core.models.TaskReviewState
import com.beyondviolet.wfm.core.models.TaskState
import com.beyondviolet.wfm.core.models.TasksResponse
import com.beyondviolet.wfm.core.models.UpdateTaskRequest
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

/**
 * Service for Tasks API operations based on Memory Bank API specification
 */
class TasksService(private val apiClient: ApiClient) {

    // MARK: - Получение задач (с кэшированием stale-while-revalidate)

    /**
     * GET /tasks/my - Get tasks with caching (returns flow: cached → fresh)
     *
     * Примечание: API возвращает TasksResponse (обёртку), но метод возвращает List<Task>.
     * Используем .map для распаковки tasks из TasksResponse.
     */
    fun getMyTasks(
        assignmentId: Int
    ): Flow<ApiResponse<List<Task>>> {
        val queryParams = mapOf("assignment_id" to assignmentId.toString())

        return apiClient.getCached<TasksResponse>("/tasks/my", queryParams)
            .map { response ->
                when (response) {
                    is ApiResponse.Success -> ApiResponse.Success(response.data.tasks, response.isCached)
                    is ApiResponse.Error -> response
                }
            }
    }

    /**
     * GET /tasks/list - Get tasks list with caching (returns flow: cached → fresh)
     *
     * Примечание: API возвращает TasksResponse (обёртку), но метод возвращает List<Task>.
     * Используем .map для распаковки tasks из TasksResponse.
     */
    fun getTasksList(
        assignmentId: Int,
        state: TaskState? = null,
        reviewState: TaskReviewState? = null,
        assigneeIds: List<Int>? = null,
        filters: Map<String, List<Int>>? = null
    ): Flow<ApiResponse<List<Task>>> {
        // Формируем список всех query параметров (включая повторяющиеся ключи для массивов)
        val allParams = mutableListOf<Pair<String, String>>()
        allParams.add("assignment_id" to assignmentId.toString())
        state?.let { allParams.add("state" to it.name) }
        reviewState?.let { allParams.add("review_state" to it.name) }
        assigneeIds?.forEach { allParams.add("assignee_ids" to it.toString()) }

        // Динамические фильтры из FilterGroup
        filters?.forEach { (filterKey, filterIds) ->
            if (filterIds.isNotEmpty()) {
                filterIds.forEach { id ->
                    allParams.add(filterKey to id.toString())
                }
            }
        }

        // Формируем query string вручную для поддержки массивов
        val queryString = allParams.joinToString("&") { "${it.first}=${it.second}" }

        return apiClient.getCached<TasksResponse>("/tasks/list?$queryString")
            .map { response ->
                when (response) {
                    is ApiResponse.Success -> ApiResponse.Success(response.data.tasks, response.isCached)
                    is ApiResponse.Error -> response
                }
            }
    }

    /**
     * GET /tasks/list/v2 - Get tasks list v2 with caching (returns flow: cached → fresh)
     *
     * Отличия от v1:
     * - zone_ids и work_type_ids применяются как пересечение (AND)
     *
     * Примечание: API возвращает TasksResponse (обёртку), но метод возвращает List<Task>.
     * Используем .map для распаковки tasks из TasksResponse.
     */
    fun getTasksListV2(
        assignmentId: Int,
        state: TaskState? = null,
        reviewState: TaskReviewState? = null,
        assigneeIds: List<Int>? = null,
        filters: Map<String, List<Int>>? = null
    ): Flow<ApiResponse<List<Task>>> {
        // Формируем список всех query параметров (включая повторяющиеся ключи для массивов)
        val allParams = mutableListOf<Pair<String, String>>()
        allParams.add("assignment_id" to assignmentId.toString())
        state?.let { allParams.add("state" to it.name) }
        reviewState?.let { allParams.add("review_state" to it.name) }
        assigneeIds?.forEach { allParams.add("assignee_ids" to it.toString()) }

        // Динамические фильтры из FilterGroup
        filters?.forEach { (filterKey, filterIds) ->
            if (filterIds.isNotEmpty()) {
                filterIds.forEach { id ->
                    allParams.add(filterKey to id.toString())
                }
            }
        }

        // Формируем query string вручную для поддержки массивов
        val queryString = allParams.joinToString("&") { "${it.first}=${it.second}" }

        return apiClient.getCached<TasksResponse>("/tasks/list/v2?$queryString")
            .map { response ->
                when (response) {
                    is ApiResponse.Success -> ApiResponse.Success(response.data.tasks, response.isCached)
                    is ApiResponse.Error -> response
                }
            }
    }

    /**
     * GET /tasks/{id} - Get task by ID with caching (returns flow: cached → fresh)
     */
    fun getTask(id: String): Flow<ApiResponse<Task>> {
        return apiClient.getCached("/tasks/$id")
    }

    /**
     * GET /tasks/list/filters - Get filters with caching (returns flow: cached → fresh)
     *
     * Примечание: API возвращает TaskListFiltersData, метод тоже возвращает TaskListFiltersData.
     * Типы совпадают, поэтому .map НЕ нужен (в отличие от getMyTasks/getTasksList).
     */
    fun getTaskListFilters(
        assignmentId: Int
    ): Flow<ApiResponse<TaskListFiltersData>> {
        val queryParams = mapOf("assignment_id" to assignmentId.toString())
        return apiClient.getCached("/tasks/list/filters", queryParams)
    }

    /**
     * GET /tasks/list/filters/v2 - Get filters v2 with caching (returns flow: cached → fresh)
     *
     * Отличия от v1:
     * - Порядок групп: «Тип работ» → «Сотрудники» → «Зона»
     * - Добавлена группа «Сотрудники» (id: assignee_ids)
     * - Возвращает task_filter_indices для оптимизации фильтрации на клиенте
     */
    fun getTaskListFiltersV2(
        assignmentId: Int
    ): Flow<ApiResponse<TaskListFiltersData>> {
        val queryParams = mapOf("assignment_id" to assignmentId.toString())
        return apiClient.getCached("/tasks/list/filters/v2", queryParams)
    }

    /**
     * GET /tasks/list/users - Get users with caching (returns flow: cached → fresh)
     *
     * Примечание: API возвращает TaskListUsersData, метод тоже возвращает TaskListUsersData.
     * Типы совпадают, поэтому .map НЕ нужен (в отличие от getMyTasks/getTasksList).
     */
    fun getTaskListUsers(
        assignmentId: Int
    ): Flow<ApiResponse<TaskListUsersData>> {
        val queryParams = mapOf("assignment_id" to assignmentId.toString())
        return apiClient.getCached("/tasks/list/users", queryParams)
    }

    // MARK: - Подсказки

    /**
     * GET /tasks/hints?work_type_id=X&zone_id=Y — список подсказок с кэшированием
     */
    fun getHints(
        workTypeId: Int?,
        zoneId: Int?
    ): Flow<ApiResponse<List<Hint>>> {
        val params = buildMap {
            workTypeId?.let { put("work_type_id", it.toString()) }
            zoneId?.let { put("zone_id", it.toString()) }
        }

        return apiClient.getCached<HintsResponse>("/tasks/hints", params)
            .map { response ->
                when (response) {
                    is ApiResponse.Success -> ApiResponse.Success(response.data.hints, response.isCached)
                    is ApiResponse.Error -> response
                }
            }
    }

    // MARK: - Управление задачами (MANAGER)

    /**
     * POST /tasks - Create new task
     */
    suspend fun createTask(request: CreateTaskRequest): ApiResponse<Task> {
        return apiClient.post("/tasks", request)
    }

    /**
     * PATCH /tasks/{id} - Update task fields
     */
    suspend fun updateTask(id: String, request: UpdateTaskRequest): ApiResponse<Task> {
        return apiClient.patch("/tasks/$id", request)
    }

    // MARK: - Переходы состояний

    /**
     * POST /tasks/{id}/start - Transition to IN_PROGRESS
     */
    suspend fun startTask(id: String): ApiResponse<Task> {
        return apiClient.post<Unit, Task>("/tasks/$id/start").also { response ->
            if (response is ApiResponse.Success) apiClient.updateCache("/tasks/$id", response.data)
        }
    }

    /**
     * POST /tasks/{id}/pause - Transition to PAUSED
     */
    suspend fun pauseTask(id: String): ApiResponse<Task> {
        return apiClient.post<Unit, Task>("/tasks/$id/pause").also { response ->
            if (response is ApiResponse.Success) apiClient.updateCache("/tasks/$id", response.data)
        }
    }

    /**
     * POST /tasks/{id}/resume - Return to IN_PROGRESS from PAUSED
     */
    suspend fun resumeTask(id: String): ApiResponse<Task> {
        return apiClient.post<Unit, Task>("/tasks/$id/resume").also { response ->
            if (response is ApiResponse.Success) apiClient.updateCache("/tasks/$id", response.data)
        }
    }

    /**
     * POST /tasks/{id}/complete - Transition to COMPLETED (multipart/form-data)
     */
    suspend fun completeTask(
        id: String,
        reportText: String? = null,
        operationIds: List<Int>? = null,
        newOperations: List<String>? = null
    ): ApiResponse<Task> {
        val fields = mutableMapOf<String, String>()
        reportText?.takeIf { it.isNotEmpty() }?.let { fields["report_text"] = it }
        operationIds?.takeIf { it.isNotEmpty() }?.let {
            fields["operation_ids"] = "[${it.joinToString(",")}]"
        }
        newOperations?.takeIf { it.isNotEmpty() }?.let {
            val escaped = it.joinToString(",") { s -> "\"${s.replace("\"", "\\\"")}\"" }
            fields["new_operations"] = "[$escaped]"
        }

        return apiClient.postMultipart<Task>(
            path = "/tasks/$id/complete",
            fields = fields,
            imageData = null,
            imageFieldName = "report_image",
            imageFileName = "task_$id.jpg"
        ).also { response ->
            if (response is ApiResponse.Success) apiClient.updateCache("/tasks/$id", response.data)
        }
    }

    /**
     * POST /tasks/{id}/complete - Transition to COMPLETED with photo (multipart/form-data)
     */
    suspend fun completeTaskWithPhoto(
        id: String,
        imageData: ByteArray,
        reportText: String? = null,
        operationIds: List<Int>? = null,
        newOperations: List<String>? = null
    ): ApiResponse<Task> {
        val fields = mutableMapOf<String, String>()
        reportText?.takeIf { it.isNotEmpty() }?.let { fields["report_text"] = it }
        operationIds?.takeIf { it.isNotEmpty() }?.let {
            fields["operation_ids"] = "[${it.joinToString(",")}]"
        }
        newOperations?.takeIf { it.isNotEmpty() }?.let {
            val escaped = it.joinToString(",") { s -> "\"${s.replace("\"", "\\\"")}\"" }
            fields["new_operations"] = "[$escaped]"
        }

        return apiClient.postMultipart<Task>(
            path = "/tasks/$id/complete",
            fields = fields,
            imageData = imageData,
            imageFieldName = "report_image",
            imageFileName = "task_$id.jpg"
        ).also { response ->
            if (response is ApiResponse.Success) apiClient.updateCache("/tasks/$id", response.data)
        }
    }

    // MARK: - Проверка задач (MANAGER)

    /**
     * POST /tasks/{id}/approve - Approve completed task
     */
    suspend fun approveTask(id: String): ApiResponse<Task> {
        return apiClient.post<Unit, Task>("/tasks/$id/approve")
    }

    /**
     * POST /tasks/{id}/reject - Reject completed task with reason
     */
    suspend fun rejectTask(id: String, request: RejectTaskRequest): ApiResponse<Task> {
        return apiClient.post("/tasks/$id/reject", request)
    }
}
