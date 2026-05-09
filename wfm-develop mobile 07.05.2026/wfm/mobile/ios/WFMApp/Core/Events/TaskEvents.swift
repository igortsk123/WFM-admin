import Foundation
import Combine

/// События задач для broadcast между экранами
enum TaskEvent {
    case taskCreated(Task)
    case taskUpdated(Task)
    case taskDeleted(UUID)
}

/// Сервис для broadcast событий задач
@MainActor
class TaskEventBroadcaster: ObservableObject {
    static let shared = TaskEventBroadcaster()

    /// Publisher для событий задач
    private let eventSubject = PassthroughSubject<TaskEvent, Never>()

    /// Публичный publisher для подписки
    var events: AnyPublisher<TaskEvent, Never> {
        eventSubject.eraseToAnyPublisher()
    }

    private init() {}

    /// Отправить событие создания задачи
    func taskCreated(_ task: Task) {
        eventSubject.send(.taskCreated(task))
    }

    /// Отправить событие обновления задачи
    func taskUpdated(_ task: Task) {
        eventSubject.send(.taskUpdated(task))
    }

    /// Отправить событие удаления задачи
    func taskDeleted(_ taskId: UUID) {
        eventSubject.send(.taskDeleted(taskId))
    }
}
