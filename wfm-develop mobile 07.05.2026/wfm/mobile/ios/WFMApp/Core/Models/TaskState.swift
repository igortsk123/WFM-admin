import Foundation

/// Enum состояния задачи на основе спецификации Memory Bank
/// Разрешенные переходы:
/// - NEW → IN_PROGRESS
/// - IN_PROGRESS → PAUSED
/// - PAUSED → IN_PROGRESS
/// - IN_PROGRESS → COMPLETED
enum TaskState: String, Codable, CaseIterable {
    case new = "NEW"
    case inProgress = "IN_PROGRESS"
    case paused = "PAUSED"
    case completed = "COMPLETED"

    var displayName: String {
        switch self {
        case .new:
            return "Новая"
        case .inProgress:
            return "В работе"
        case .paused:
            return "Приостановлена"
        case .completed:
            return "Завершена"
        }
    }

    var color: String {
        switch self {
        case .new:
            return "blue"
        case .inProgress:
            return "green"
        case .paused:
            return "orange"
        case .completed:
            return "gray"
        }
    }

    /// Возвращает разрешенные следующие состояния на основе текущего состояния
    var allowedTransitions: [TaskState] {
        switch self {
        case .new:
            return [.inProgress]
        case .inProgress:
            return [.paused, .completed]
        case .paused:
            return [.inProgress]
        case .completed:
            return []
        }
    }

    /// Проверяет, допустим ли переход к другому состоянию
    func canTransition(to newState: TaskState) -> Bool {
        return allowedTransitions.contains(newState)
    }
}
