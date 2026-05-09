import Foundation

/// Очередь pending событий push_notification_received для Notification Service Extension.
///
/// Extension не имеет доступа к DependencyContainer, поэтому записывает события
/// в shared UserDefaults (App Group). При следующем запуске основного приложения
/// события читаются, отправляются в аналитику и удаляются.
///
/// App Group: group.com.beyondviolet.wfm (настраивается в Xcode → Signing & Capabilities)
enum PendingPushAnalyticsQueue {

    static let appGroupID = "group.com.beyondviolet.wfm"
    private static let key = "pending_push_received_events"

    struct Event: Codable {
        let channel: String
        let notificationId: String?
        let taskId: String?
        let receivedAt: Date
    }

    // MARK: - Write (вызывается из Extension)

    static func append(channel: String, notificationId: String?, taskId: String?) {
        guard let defaults = UserDefaults(suiteName: appGroupID) else { return }
        var events = load(from: defaults)
        events.append(Event(channel: channel, notificationId: notificationId, taskId: taskId, receivedAt: Date()))
        save(events, to: defaults)
    }

    // MARK: - Read & Clear (вызывается из основного приложения)

    static func flushAll() -> [Event] {
        guard let defaults = UserDefaults(suiteName: appGroupID) else { return [] }
        let events = load(from: defaults)
        defaults.removeObject(forKey: key)
        return events
    }

    // MARK: - Private

    private static func load(from defaults: UserDefaults) -> [Event] {
        guard let data = defaults.data(forKey: key),
              let events = try? JSONDecoder().decode([Event].self, from: data) else { return [] }
        return events
    }

    private static func save(_ events: [Event], to defaults: UserDefaults) {
        guard let data = try? JSONEncoder().encode(events) else { return }
        defaults.set(data, forKey: key)
    }
}
