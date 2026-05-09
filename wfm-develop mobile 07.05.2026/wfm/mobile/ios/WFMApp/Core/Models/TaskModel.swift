import Foundation

// MARK: - TaskType

/// Тип задачи
enum TaskType: String, Codable, CaseIterable {
    case planned = "PLANNED"        // Плановая задача
    case additional = "ADDITIONAL"  // Дополнительная задача

    var displayName: String {
        switch self {
        case .planned: return "Плановая"
        case .additional: return "Дополнительная"
        }
    }
}

// MARK: - TaskReviewState

/// Состояние проверки задачи управляющим
enum TaskReviewState: String, Codable, CaseIterable {
    case none = "NONE"              // Приёмка не актуальна
    case onReview = "ON_REVIEW"     // Ожидает проверки менеджером
    case accepted = "ACCEPTED"      // Принята
    case rejected = "REJECTED"      // Отклонена (task.state возвращается в PAUSED)
}

// MARK: - AcceptancePolicy

/// Политика приёмки задачи
enum AcceptancePolicy: String, Codable, CaseIterable {
    case auto = "AUTO"      // Автоматическая приёмка (по умолчанию)
    case manual = "MANUAL"  // Ручная проверка менеджером
}

// MARK: - LAMA интеграция (вложенные объекты)

// MARK: - Operation

/// Статус проверки операции
enum OperationReviewState: String, Codable, CaseIterable {
    case accepted = "ACCEPTED"  // Проверена, видна всем работникам
    case pending = "PENDING"    // Предложена работником, ждёт модерации
    case rejected = "REJECTED"  // Отклонена
}

/// Операция (шаг выполнения задачи)
struct Operation: Codable, Equatable, Hashable, Identifiable {
    let id: Int
    let name: String
    let reviewState: OperationReviewState?

    enum CodingKeys: String, CodingKey {
        case id
        case name
        case reviewState = "review_state"
    }
}

// MARK: - LAMA интеграция (вложенные объекты)

/// Тип работы (LAMA)
struct WorkType: Codable, Equatable, Hashable {
    let id: Int
    let name: String
    let allowNewOperations: Bool?

    init(id: Int, name: String, allowNewOperations: Bool? = nil) {
        self.id = id
        self.name = name
        self.allowNewOperations = allowNewOperations
    }

    enum CodingKeys: String, CodingKey {
        case id
        case name
        case allowNewOperations = "allow_new_operations"
    }
}

/// Зона магазина (LAMA)
struct Zone: Codable, Equatable, Hashable {
    let id: Int
    let name: String
    let priority: Int
}

/// Категория товаров (LAMA)
struct Category: Codable, Equatable, Hashable {
    let id: Int
    let name: String
}

/// Один промежуток времени, когда задача была в состоянии IN_PROGRESS
struct WorkInterval: Codable, Equatable, Hashable {
    let timeStart: Date             // Время начала интервала (START/RESUME)
    let timeEnd: Date?              // Время окончания (PAUSE/COMPLETE); nil если задача IN_PROGRESS

    enum CodingKeys: String, CodingKey {
        case timeStart = "time_start"
        case timeEnd = "time_end"
    }
}

/// История выполнения задачи
struct HistoryBrief: Codable, Equatable, Hashable {
    let duration: Int?              // Общее время в работе (секунды)
    let timeStart: Date?            // Время первого запуска
    let timeStateUpdated: Date?     // Время последнего изменения состояния
    let workIntervals: [WorkInterval]  // Промежутки фактической работы

    enum CodingKeys: String, CodingKey {
        case duration
        case timeStart = "time_start"
        case timeStateUpdated = "time_state_updated"
        case workIntervals = "work_intervals"
    }

    init(
        duration: Int? = nil,
        timeStart: Date? = nil,
        timeStateUpdated: Date? = nil,
        workIntervals: [WorkInterval] = []
    ) {
        self.duration = duration
        self.timeStart = timeStart
        self.timeStateUpdated = timeStateUpdated
        self.workIntervals = workIntervals
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        duration = try container.decodeIfPresent(Int.self, forKey: .duration)
        timeStart = try container.decodeIfPresent(Date.self, forKey: .timeStart)
        timeStateUpdated = try container.decodeIfPresent(Date.self, forKey: .timeStateUpdated)
        workIntervals = try container.decodeIfPresent([WorkInterval].self, forKey: .workIntervals) ?? []
    }
}

// MARK: - Task
// Note: PermissionType определён в User.swift

/// Task domain model based on Memory Bank specification
/// Все поля nullable для устойчивости к изменениям API
struct Task: Identifiable, Codable, Equatable, Hashable {
    let id: UUID?
    var title: String?
    var description: String?
    var type: TaskType?
    var plannedMinutes: Int?
    let creatorId: Int?
    var assigneeId: Int?
    var assignee: AssigneeBrief?  // Краткие данные исполнителя (GET /tasks/list)
    var state: TaskState?
    var reviewState: TaskReviewState?
    var acceptancePolicy: AcceptancePolicy?
    var requiresPhoto: Bool?
    var comment: String?
    var reportText: String?
    var reportImageUrl: String?
    let createdAt: Date?
    var updatedAt: Date?
    var reviewComment: String?

    // LAMA интеграция
    var externalId: Int?
    var shiftId: Int?
    var priority: Int?
    var workTypeId: Int?
    var workType: WorkType?
    var zoneId: Int?
    var zone: Zone?
    var categoryId: Int?
    var category: Category?
    var timeStart: String?
    var timeEnd: String?
    var source: String?
    var historyBrief: HistoryBrief?

    // Операции (только в GET /{id})
    var operations: [Operation]?
    var completedOperationIds: [Int]?

    enum CodingKeys: String, CodingKey {
        case id
        case title
        case description
        case type
        case plannedMinutes = "planned_minutes"
        case creatorId = "creator_id"
        case assigneeId = "assignee_id"
        case assignee
        case state
        case reviewState = "review_state"
        case acceptancePolicy = "acceptance_policy"
        case requiresPhoto = "requires_photo"
        case comment
        case reportText = "report_text"
        case reportImageUrl = "report_image_url"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case reviewComment = "review_comment"
        case externalId = "external_id"
        case shiftId = "shift_id"
        case priority
        case workTypeId = "work_type_id"
        case workType = "work_type"
        case zoneId = "zone_id"
        case zone
        case categoryId = "category_id"
        case category
        case timeStart = "time_start"
        case timeEnd = "time_end"
        case source
        case historyBrief = "history_brief"
        case operations
        case completedOperationIds = "completed_operation_ids"
    }

    init(
        id: UUID? = UUID(),
        title: String? = nil,
        description: String? = nil,
        type: TaskType? = nil,
        plannedMinutes: Int? = nil,
        creatorId: Int? = nil,
        assigneeId: Int? = nil,
        assignee: AssigneeBrief? = nil,
        state: TaskState? = nil,
        reviewState: TaskReviewState? = nil,
        acceptancePolicy: AcceptancePolicy? = nil,
        requiresPhoto: Bool? = nil,
        comment: String? = nil,
        reportText: String? = nil,
        reportImageUrl: String? = nil,
        createdAt: Date? = nil,
        updatedAt: Date? = nil,
        reviewComment: String? = nil,
        externalId: Int? = nil,
        shiftId: Int? = nil,
        priority: Int? = nil,
        workTypeId: Int? = nil,
        workType: WorkType? = nil,
        zoneId: Int? = nil,
        zone: Zone? = nil,
        categoryId: Int? = nil,
        category: Category? = nil,
        timeStart: String? = nil,
        timeEnd: String? = nil,
        source: String? = nil,
        historyBrief: HistoryBrief? = nil,
        operations: [Operation]? = nil,
        completedOperationIds: [Int]? = nil
    ) {
        self.id = id
        self.title = title
        self.description = description
        self.type = type
        self.plannedMinutes = plannedMinutes
        self.creatorId = creatorId
        self.assigneeId = assigneeId
        self.assignee = assignee
        self.state = state
        self.reviewState = reviewState
        self.acceptancePolicy = acceptancePolicy
        self.requiresPhoto = requiresPhoto
        self.comment = comment
        self.reportText = reportText
        self.reportImageUrl = reportImageUrl
        self.createdAt = createdAt
        self.updatedAt = updatedAt
        self.reviewComment = reviewComment
        self.externalId = externalId
        self.shiftId = shiftId
        self.priority = priority
        self.workTypeId = workTypeId
        self.workType = workType
        self.zoneId = zoneId
        self.zone = zone
        self.categoryId = categoryId
        self.category = category
        self.timeStart = timeStart
        self.timeEnd = timeEnd
        self.source = source
        self.historyBrief = historyBrief
        self.operations = operations
        self.completedOperationIds = completedOperationIds
    }

    /// Безопасный ID задачи
    var safeId: UUID {
        id ?? UUID()
    }

    /// Безопасный title задачи
    var safeTitle: String {
        workType?.name ?? "Задача"
    }

    /// Безопасное состояние задачи
    var safeState: TaskState {
        state ?? .new
    }

    /// Безопасное плановое время (минуты)
    var safePlannedMinutes: Int {
        plannedMinutes ?? 0
    }

    /// Подтверждена ли задача управляющим
    var isApproved: Bool {
        reviewState == .accepted
    }

    /// Была ли задача отклонена
    var isRejected: Bool {
        reviewState == .rejected
    }

    /// Безопасный review comment
    var safeReviewComment: String? {
        reviewComment
    }
}

// MARK: - Request модели

/// Request model for creating a new task
struct CreateTaskRequest: Codable {
    let title: String
    let description: String
    let type: TaskType?
    let plannedMinutes: Int
    let assigneeId: Int?
    let shiftId: Int?

    enum CodingKeys: String, CodingKey {
        case title
        case description
        case type
        case plannedMinutes = "planned_minutes"
        case assigneeId = "assignee_id"
        case shiftId = "shift_id"
    }

    init(
        title: String,
        description: String,
        type: TaskType? = .planned,
        plannedMinutes: Int,
        assigneeId: Int? = nil,
        shiftId: Int? = nil
    ) {
        self.title = title
        self.description = description
        self.type = type
        self.plannedMinutes = plannedMinutes
        self.assigneeId = assigneeId
        self.shiftId = shiftId
    }
}

/// Request model for updating task fields
struct UpdateTaskRequest: Codable {
    let title: String?
    let description: String?
    let plannedMinutes: Int?
    let assigneeId: Int?

    enum CodingKeys: String, CodingKey {
        case title
        case description
        case plannedMinutes = "planned_minutes"
        case assigneeId = "assignee_id"
    }

    init(
        title: String? = nil,
        description: String? = nil,
        plannedMinutes: Int? = nil,
        assigneeId: Int? = nil
    ) {
        self.title = title
        self.description = description
        self.plannedMinutes = plannedMinutes
        self.assigneeId = assigneeId
    }
}

/// Request для отклонения задачи
struct RejectTaskRequest: Codable {
    let reason: String

    enum CodingKeys: String, CodingKey {
        case reason
    }
}

// MARK: - Response модели

/// Response wrapper for list of tasks
struct TasksResponse: Codable {
    let tasks: [Task]
}

/// Краткие данные исполнителя задачи
struct AssigneeBrief: Codable, Equatable, Hashable {
    let id: Int
    let firstName: String?
    let lastName: String?
    let middleName: String?

    enum CodingKeys: String, CodingKey {
        case id
        case firstName = "first_name"
        case lastName = "last_name"
        case middleName = "middle_name"
    }

    /// Полное имя исполнителя
    var fullName: String {
        [lastName, firstName, middleName]
            .compactMap { $0 }
            .joined(separator: " ")
            .trimmingCharacters(in: .whitespaces)
            .isEmpty ? "Сотрудник" : [lastName, firstName, middleName]
                .compactMap { $0 }
                .joined(separator: " ")
    }

    /// Форматированное имя: Фамилия И. О.
    /// Пример: "Елисеева А. М."
    var formattedName: String {
        var parts: [String] = []

        // Фамилия полностью
        if let lastName = lastName, !lastName.isEmpty {
            parts.append(lastName)
        }

        // Имя (первая буква и точка)
        if let firstName = firstName, !firstName.isEmpty {
            let initial = String(firstName.prefix(1)).uppercased()
            parts.append("\(initial).")
        }

        // Отчество (первая буква и точка)
        if let middleName = middleName, !middleName.isEmpty {
            let initial = String(middleName.prefix(1)).uppercased()
            parts.append("\(initial).")
        }

        return parts.isEmpty ? "Сотрудник" : parts.joined(separator: " ")
    }
}

/// Краткие данные должности для списка пользователей
struct PositionBriefResponse: Codable, Equatable, Hashable {
    let id: Int
    let code: String
    let name: String
}

/// Элемент фильтра
struct FilterItem: Codable, Equatable, Hashable, Identifiable {
    let id: Int
    let title: String
}

/// Группа фильтра с универсальным массивом элементов
struct FilterGroup: Codable, Equatable, Hashable, Identifiable {
    let id: String
    let title: String
    let array: [FilterItem]
}

/// Ответ endpoint'а /list/filters
///
/// taskFilterIndices (только в v2): для каждой задачи — тройка индексов
/// [work_type_idx, assignee_idx, zone_idx] в соответствующих массивах filters.
/// -1 если у задачи отсутствует соответствующий атрибут.
struct TaskListFiltersData: Codable {
    let filters: [FilterGroup]
    let taskFilterIndices: [[Int]]  // Только в /list/filters/v2. Пустой массив в v1.

    enum CodingKeys: String, CodingKey {
        case filters
        case taskFilterIndices = "task_filter_indices"
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        filters = try container.decode([FilterGroup].self, forKey: .filters)
        taskFilterIndices = try container.decodeIfPresent([[Int]].self, forKey: .taskFilterIndices) ?? []
    }
}

/// Сотрудник с плановой сменой сегодня
struct TaskListUserItem: Codable, Equatable, Hashable, Identifiable {
    let assignmentId: Int
    let userId: Int
    let firstName: String?
    let lastName: String?
    let middleName: String?
    let position: PositionBriefResponse?

    enum CodingKeys: String, CodingKey {
        case assignmentId = "assignment_id"
        case userId = "user_id"
        case firstName = "first_name"
        case lastName = "last_name"
        case middleName = "middle_name"
        case position
    }

    var id: Int { userId }

    /// Полное имя сотрудника
    var fullName: String {
        [lastName, firstName, middleName]
            .compactMap { $0 }
            .joined(separator: " ")
            .trimmingCharacters(in: .whitespaces)
            .isEmpty ? "Сотрудник" : [lastName, firstName, middleName]
                .compactMap { $0 }
                .joined(separator: " ")
    }

    /// Форматированное имя: Фамилия И. О.
    /// Пример: "Елисеева А. М."
    var formattedName: String {
        var parts: [String] = []

        // Фамилия полностью
        if let lastName = lastName, !lastName.isEmpty {
            parts.append(lastName)
        }

        // Имя (первая буква и точка)
        if let firstName = firstName, !firstName.isEmpty {
            let initial = String(firstName.prefix(1)).uppercased()
            parts.append("\(initial).")
        }

        // Отчество (первая буква и точка)
        if let middleName = middleName, !middleName.isEmpty {
            let initial = String(middleName.prefix(1)).uppercased()
            parts.append("\(initial).")
        }

        return parts.isEmpty ? "Сотрудник" : parts.joined(separator: " ")
    }
}

/// Ответ endpoint'а /list/users
struct TaskListUsersData: Codable {
    let users: [TaskListUserItem]
}

