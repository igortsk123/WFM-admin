import Foundation

// MARK: - Статус смены

/// Статус смены
enum ShiftStatus: String, Codable, CaseIterable {
    case new = "NEW"              // Смена из shifts_plan (ещё не открыта)
    case opened = "OPENED"        // Смена открыта (shifts_fact, closed_at = NULL)
    case closed = "CLOSED"        // Смена закрыта (shifts_fact, closed_at IS NOT NULL)

    var displayName: String {
        switch self {
        case .new: return "Запланирована"
        case .opened: return "Открыта"
        case .closed: return "Закрыта"
        }
    }

    var isActive: Bool {
        self == .opened
    }
}

// MARK: - Магазин (для shifts API)

/// Магазин (из shifts API)
struct ShiftStore: Identifiable, Codable, Equatable, Hashable {
    let id: Int
    let name: String
    let address: String?
    let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id, name, address
        case createdAt = "created_at"
    }
}

// MARK: - Смена

/// Текущая смена (объединённый ответ из shifts_fact или shifts_plan)
struct CurrentShift: Identifiable, Codable, Equatable {
    let id: Int
    let planId: Int?
    let status: ShiftStatus
    let assignmentId: Int

    // Время для OPENED/CLOSED (из shifts_fact)
    let openedAt: Date?
    let closedAt: Date?

    // Время для NEW (из shifts_plan)
    let shiftDate: String?      // YYYY-MM-DD
    let startTime: String?      // HH:MM:SS
    let endTime: String?        // HH:MM:SS

    let externalId: Int?
    let duration: Int?          // Длительность в часах из LAMA
    let store: ShiftStore?

    enum CodingKeys: String, CodingKey {
        case id
        case planId = "plan_id"
        case status
        case assignmentId = "assignment_id"
        case openedAt = "opened_at"
        case closedAt = "closed_at"
        case shiftDate = "shift_date"
        case startTime = "start_time"
        case endTime = "end_time"
        case externalId = "external_id"
        case duration
        case store
    }

    /// Фактическая длительность смены (для закрытых смен)
    var elapsedDuration: TimeInterval? {
        guard let opened = openedAt, let closed = closedAt else { return nil }
        return closed.timeIntervalSince(opened)
    }

    /// Время работы (для открытых смен)
    var currentDuration: TimeInterval? {
        guard let opened = openedAt, closedAt == nil else { return nil }
        return Date().timeIntervalSince(opened)
    }

    /// Отформатированная фактическая длительность смены (HH:MM)
    var formattedElapsedDuration: String? {
        guard let elapsed = elapsedDuration else { return nil }
        let hours = Int(elapsed) / 3600
        let minutes = (Int(elapsed) % 3600) / 60
        return String(format: "%02d:%02d", hours, minutes)
    }

    /// Отформатированное текущее время работы (HH:MM)
    var formattedCurrentDuration: String? {
        guard let current = currentDuration else { return nil }
        let hours = Int(current) / 3600
        let minutes = (Int(current) % 3600) / 60
        return String(format: "%02d:%02d", hours, minutes)
    }
}

// MARK: - Request модели

/// Request для открытия смены
struct ShiftOpenRequest: Codable {
    let planId: Int

    enum CodingKeys: String, CodingKey {
        case planId = "plan_id"
    }
}

/// Request для закрытия смены
struct ShiftCloseRequest: Codable {
    let planId: Int
    let force: Bool

    enum CodingKeys: String, CodingKey {
        case planId = "plan_id"
        case force
    }
}

// MARK: - Response модели

/// Response со списком магазинов
struct StoresListResponse: Codable {
    let stores: [ShiftStore]
}

/// Request для создания магазина
struct StoreCreateRequest: Codable {
    let name: String
    let address: String?
}

/// Request для обновления магазина
struct StoreUpdateRequest: Codable {
    let name: String?
    let address: String?
}
