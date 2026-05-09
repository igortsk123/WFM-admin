import Foundation
import Combine

/// Менеджер deep link для передачи данных между компонентами
@MainActor
public class DeepLinkManager: ObservableObject {
    public static let shared = DeepLinkManager()

    /// Публишер для кода авторизации, полученного через deep link
    @Published public var receivedAuthCode: String?

    private init() {}

    /// Обработать входящий URL
    public func handleURL(_ url: URL) {
        if let code = DeepLinkHandler.extractAuthCode(from: url) {
            receivedAuthCode = code
        }
    }

    /// Очистить полученный код (после использования)
    public func clearAuthCode() {
        receivedAuthCode = nil
    }
}
