import Foundation

/// Заглушка аналитики — используется до подключения Firebase SDK.
/// Переключить на FirebaseAnalyticsService в DependencyContainer после добавления Firebase через SPM.
final class NoOpAnalyticsService: AnalyticsService {
    func track(_ event: AnalyticsEvent) {}
    func setUser(userId: Int, role: String) {}
    func resetUser() {}
}
