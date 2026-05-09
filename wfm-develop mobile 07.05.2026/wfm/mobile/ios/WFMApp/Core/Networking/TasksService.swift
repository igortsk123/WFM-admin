import Foundation
import UIKit

/// Service for Tasks API operations based on Memory Bank API specification
actor TasksService {
    private let apiClient: APIClient

    init(apiClient: APIClient) {
        self.apiClient = apiClient
    }

    // MARK: - Получение задач (с кэшированием stale-while-revalidate)

    /// GET /tasks/my - Get tasks with caching (returns stream: cached → fresh)
    ///
    /// Примечание: API возвращает TasksResponse (обёртку), но метод возвращает [Task].
    /// Распаковываем tasks из TasksResponse через switch/case.
    nonisolated func getMyTasks(
        assignmentId: Int
    ) -> AsyncStream<CachedResult<[Task]>> {
        let queryItems: [URLQueryItem] = [
            URLQueryItem(name: "assignment_id", value: String(assignmentId))
        ]

        return AsyncStream { continuation in
            _Concurrency.Task {
                let stream: AsyncStream<CachedResult<TasksResponse>> = await apiClient.getCached(
                    path: "/tasks/my",
                    queryItems: queryItems
                )

                for await result in stream {
                    switch result {
                    case .cached(let response):
                        continuation.yield(.cached(response.tasks))
                    case .fresh(let response):
                        continuation.yield(.fresh(response.tasks))
                    case .error(let error):
                        continuation.yield(.error(error))
                    }
                }

                continuation.finish()
            }
        }
    }

    /// GET /tasks/list - Get tasks list with caching (returns stream: cached → fresh)
    ///
    /// Примечание: API возвращает TasksResponse (обёртку), но метод возвращает [Task].
    /// Распаковываем tasks из TasksResponse через switch/case.
    nonisolated func getTasksList(
        assignmentId: Int,
        state: TaskState? = nil,
        reviewState: TaskReviewState? = nil,
        assigneeIds: [Int]? = nil,
        filters: [String: [Int]]? = nil
    ) -> AsyncStream<CachedResult<[Task]>> {
        var queryItems: [URLQueryItem] = [
            URLQueryItem(name: "assignment_id", value: String(assignmentId))
        ]

        if let state = state {
            queryItems.append(URLQueryItem(name: "state", value: state.rawValue))
        }

        if let reviewState = reviewState {
            queryItems.append(URLQueryItem(name: "review_state", value: reviewState.rawValue))
        }

        if let assigneeIds = assigneeIds, !assigneeIds.isEmpty {
            assigneeIds.forEach { id in
                queryItems.append(URLQueryItem(name: "assignee_ids", value: String(id)))
            }
        }

        if let filters = filters {
            for (filterKey, filterIds) in filters {
                guard !filterIds.isEmpty else { continue }
                filterIds.forEach { id in
                    queryItems.append(URLQueryItem(name: filterKey, value: String(id)))
                }
            }
        }

        return AsyncStream { continuation in
            _Concurrency.Task {
                let stream: AsyncStream<CachedResult<TasksResponse>> = await apiClient.getCached(
                    path: "/tasks/list",
                    queryItems: queryItems
                )

                for await result in stream {
                    switch result {
                    case .cached(let response):
                        continuation.yield(.cached(response.tasks))
                    case .fresh(let response):
                        continuation.yield(.fresh(response.tasks))
                    case .error(let error):
                        continuation.yield(.error(error))
                    }
                }

                continuation.finish()
            }
        }
    }

    /// GET /tasks/list/v2 - Get tasks list v2 with caching (returns stream: cached → fresh)
    ///
    /// Отличия от v1:
    /// - zone_ids и work_type_ids применяются как пересечение (AND)
    ///
    /// Примечание: API возвращает TasksResponse (обёртку), но метод возвращает [Task].
    /// Распаковываем tasks из TasksResponse через switch/case.
    nonisolated func getTasksListV2(
        assignmentId: Int,
        state: TaskState? = nil,
        reviewState: TaskReviewState? = nil,
        assigneeIds: [Int]? = nil,
        filters: [String: [Int]]? = nil
    ) -> AsyncStream<CachedResult<[Task]>> {
        var queryItems: [URLQueryItem] = [
            URLQueryItem(name: "assignment_id", value: String(assignmentId))
        ]

        if let state = state {
            queryItems.append(URLQueryItem(name: "state", value: state.rawValue))
        }

        if let reviewState = reviewState {
            queryItems.append(URLQueryItem(name: "review_state", value: reviewState.rawValue))
        }

        if let assigneeIds = assigneeIds, !assigneeIds.isEmpty {
            assigneeIds.forEach { id in
                queryItems.append(URLQueryItem(name: "assignee_ids", value: String(id)))
            }
        }

        if let filters = filters {
            for (filterKey, filterIds) in filters {
                guard !filterIds.isEmpty else { continue }
                filterIds.forEach { id in
                    queryItems.append(URLQueryItem(name: filterKey, value: String(id)))
                }
            }
        }

        return AsyncStream { continuation in
            _Concurrency.Task {
                let stream: AsyncStream<CachedResult<TasksResponse>> = await apiClient.getCached(
                    path: "/tasks/list/v2",
                    queryItems: queryItems
                )

                for await result in stream {
                    switch result {
                    case .cached(let response):
                        continuation.yield(.cached(response.tasks))
                    case .fresh(let response):
                        continuation.yield(.fresh(response.tasks))
                    case .error(let error):
                        continuation.yield(.error(error))
                    }
                }

                continuation.finish()
            }
        }
    }

    /// GET /tasks/{id} - Get task by ID with caching (returns stream: cached → fresh)
    nonisolated func getTask(id: UUID) async -> AsyncStream<CachedResult<Task>> {
        return await apiClient.getCached(path: "/tasks/\(id.uuidString)")
    }

    /// GET /tasks/list/filters - Get filters with caching (returns stream: cached → fresh)
    ///
    /// Примечание: API возвращает TaskListFiltersData, метод тоже возвращает TaskListFiltersData.
    /// Типы совпадают, распаковка НЕ нужна (в отличие от getMyTasks/getTasksList).
    nonisolated func getTaskListFilters(
        assignmentId: Int
    ) -> AsyncStream<CachedResult<TaskListFiltersData>> {
        return AsyncStream { continuation in
            _Concurrency.Task {
                let stream: AsyncStream<CachedResult<TaskListFiltersData>> = await apiClient.getCached(
                    path: "/tasks/list/filters",
                    queryItems: [URLQueryItem(name: "assignment_id", value: String(assignmentId))]
                )

                for await result in stream {
                    continuation.yield(result)
                }

                continuation.finish()
            }
        }
    }

    /// GET /tasks/list/filters/v2 - Get filters v2 with caching (returns stream: cached → fresh)
    ///
    /// Отличия от v1:
    /// - Порядок групп: «Тип работ» → «Сотрудники» → «Зона»
    /// - Добавлена группа «Сотрудники» (id: assignee_ids)
    /// - Возвращает taskFilterIndices для оптимизации фильтрации на клиенте
    nonisolated func getTaskListFiltersV2(
        assignmentId: Int
    ) -> AsyncStream<CachedResult<TaskListFiltersData>> {
        return AsyncStream { continuation in
            _Concurrency.Task {
                let stream: AsyncStream<CachedResult<TaskListFiltersData>> = await apiClient.getCached(
                    path: "/tasks/list/filters/v2",
                    queryItems: [URLQueryItem(name: "assignment_id", value: String(assignmentId))]
                )

                for await result in stream {
                    continuation.yield(result)
                }

                continuation.finish()
            }
        }
    }

    /// GET /tasks/list/users - Get users with caching (returns stream: cached → fresh)
    ///
    /// Примечание: API возвращает TaskListUsersData, метод тоже возвращает TaskListUsersData.
    /// Типы совпадают, распаковка НЕ нужна (в отличие от getMyTasks/getTasksList).
    nonisolated func getTaskListUsers(
        assignmentId: Int
    ) -> AsyncStream<CachedResult<TaskListUsersData>> {
        return AsyncStream { continuation in
            _Concurrency.Task {
                let stream: AsyncStream<CachedResult<TaskListUsersData>> = await apiClient.getCached(
                    path: "/tasks/list/users",
                    queryItems: [URLQueryItem(name: "assignment_id", value: String(assignmentId))]
                )

                for await result in stream {
                    continuation.yield(result)
                }

                continuation.finish()
            }
        }
    }

    // MARK: - Подсказки

    /// GET /tasks/hints?work_type_id=X&zone_id=Y — список подсказок с кэшированием
    nonisolated func getHints(
        workTypeId: Int?,
        zoneId: Int?
    ) -> AsyncStream<CachedResult<[Hint]>> {
        var queryItems: [URLQueryItem] = []
        if let workTypeId {
            queryItems.append(URLQueryItem(name: "work_type_id", value: String(workTypeId)))
        }
        if let zoneId {
            queryItems.append(URLQueryItem(name: "zone_id", value: String(zoneId)))
        }

        return AsyncStream { continuation in
            _Concurrency.Task {
                let stream: AsyncStream<CachedResult<HintsResponse>> = await apiClient.getCached(
                    path: "/tasks/hints",
                    queryItems: queryItems
                )

                for await result in stream {
                    switch result {
                    case .cached(let response):
                        continuation.yield(.cached(response.hints))
                    case .fresh(let response):
                        continuation.yield(.fresh(response.hints))
                    case .error(let error):
                        continuation.yield(.error(error))
                    }
                }

                continuation.finish()
            }
        }
    }

    // MARK: - Управление задачами (MANAGER)

    /// POST /tasks - Create new task
    func createTask(request: CreateTaskRequest) async throws -> Task {
        return try await apiClient.post(path: "/tasks/", body: request)
    }

    /// PATCH /tasks/{id} - Update task fields
    func updateTask(id: UUID, request: UpdateTaskRequest) async throws -> Task {
        return try await apiClient.patch(path: "/tasks/\(id.uuidString)", body: request)
    }

    // MARK: - Переходы состояний

    /// POST /tasks/{id}/start - Transition to IN_PROGRESS
    func startTask(id: UUID) async throws -> Task {
        let task: Task = try await apiClient.post(path: "/tasks/\(id.uuidString)/start")
        await apiClient.updateCache(path: "/tasks/\(id.uuidString)", value: task)
        return task
    }

    /// POST /tasks/{id}/pause - Transition to PAUSED
    func pauseTask(id: UUID) async throws -> Task {
        let task: Task = try await apiClient.post(path: "/tasks/\(id.uuidString)/pause")
        await apiClient.updateCache(path: "/tasks/\(id.uuidString)", value: task)
        return task
    }

    /// POST /tasks/{id}/resume - Return to IN_PROGRESS from PAUSED
    func resumeTask(id: UUID) async throws -> Task {
        let task: Task = try await apiClient.post(path: "/tasks/\(id.uuidString)/resume")
        await apiClient.updateCache(path: "/tasks/\(id.uuidString)", value: task)
        return task
    }

    /// POST /tasks/{id}/complete - Transition to COMPLETED (multipart/form-data)
    func completeTask(
        id: UUID,
        reportText: String? = nil,
        operationIds: [Int]? = nil,
        newOperations: [String]? = nil
    ) async throws -> Task {
        var fields: [String: String] = [:]
        if let reportText = reportText, !reportText.isEmpty {
            fields["report_text"] = reportText
        }
        if let operationIds = operationIds, !operationIds.isEmpty,
           let json = try? JSONSerialization.data(withJSONObject: operationIds),
           let jsonString = String(data: json, encoding: .utf8) {
            fields["operation_ids"] = jsonString
        }
        if let newOperations = newOperations, !newOperations.isEmpty,
           let json = try? JSONSerialization.data(withJSONObject: newOperations),
           let jsonString = String(data: json, encoding: .utf8) {
            fields["new_operations"] = jsonString
        }

        let task: Task = try await apiClient.postMultipart(
            path: "/tasks/\(id.uuidString)/complete",
            fields: fields,
            image: nil,
            imageFieldName: "report_image",
            imageFileName: "task_\(id.uuidString).jpg"
        )
        await apiClient.updateCache(path: "/tasks/\(id.uuidString)", value: task)
        return task
    }

    /// POST /tasks/{id}/complete - Transition to COMPLETED with photo (multipart/form-data)
    func completeTaskWithPhoto(
        id: UUID,
        image: UIImage,
        reportText: String? = nil,
        operationIds: [Int]? = nil,
        newOperations: [String]? = nil
    ) async throws -> Task {
        var fields: [String: String] = [:]
        if let reportText = reportText, !reportText.isEmpty {
            fields["report_text"] = reportText
        }
        if let operationIds = operationIds, !operationIds.isEmpty,
           let json = try? JSONSerialization.data(withJSONObject: operationIds),
           let jsonString = String(data: json, encoding: .utf8) {
            fields["operation_ids"] = jsonString
        }
        if let newOperations = newOperations, !newOperations.isEmpty,
           let json = try? JSONSerialization.data(withJSONObject: newOperations),
           let jsonString = String(data: json, encoding: .utf8) {
            fields["new_operations"] = jsonString
        }

        let task: Task = try await apiClient.postMultipart(
            path: "/tasks/\(id.uuidString)/complete",
            fields: fields,
            image: image,
            imageFieldName: "report_image",
            imageFileName: "task_\(id.uuidString).jpg"
        )
        await apiClient.updateCache(path: "/tasks/\(id.uuidString)", value: task)
        return task
    }

    // MARK: - Проверка задач (MANAGER)

    /// POST /tasks/{id}/approve - Approve completed task
    func approveTask(id: UUID) async throws -> Task {
        return try await apiClient.post(path: "/tasks/\(id.uuidString)/approve")
    }

    /// POST /tasks/{id}/reject - Reject completed task with reason
    func rejectTask(id: UUID, request: RejectTaskRequest) async throws -> Task {
        return try await apiClient.post(path: "/tasks/\(id.uuidString)/reject", body: request)
    }
}
