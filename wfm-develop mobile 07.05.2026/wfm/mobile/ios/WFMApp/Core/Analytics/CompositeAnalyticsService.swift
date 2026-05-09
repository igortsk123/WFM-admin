import Foundation

/// Fan-out аналитика: делегирует события всем подключённым сервисам.
final class CompositeAnalyticsService: AnalyticsService {

    private let services: [AnalyticsService]

    init(services: [AnalyticsService]) {
        self.services = services
    }

    func track(_ event: AnalyticsEvent) {
        services.forEach { $0.track(event) }
    }

    func setUser(userId: Int, role: String) {
        services.forEach { $0.setUser(userId: userId, role: role) }
    }

    func resetUser() {
        services.forEach { $0.resetUser() }
    }
}
