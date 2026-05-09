import Foundation

/// Обработчик deep link для авторизации
public struct DeepLinkHandler {

    /// Извлечь код авторизации из deep link
    /// Формат: wfm://auth/code_reciver/{code}/
    ///
    /// - Parameter url: Deep link URL
    /// - Returns: 4-значный код или nil если формат неверный
    public static func extractAuthCode(from url: URL) -> String? {
        // Проверяем scheme
        guard url.scheme == "wfm" else { return nil }

        // Проверяем host
        guard url.host == "auth" else { return nil }

        // Получаем path segments: ["code_reciver", "1234"]
        let pathComponents = url.pathComponents.filter { $0 != "/" }

        guard pathComponents.count >= 2,
              pathComponents[0] == "code_reciver" else { return nil }

        let code = pathComponents[1]

        // Валидация: только 4 цифры
        guard code.count == 4,
              code.allSatisfy({ $0.isNumber }) else { return nil }

        return code
    }
}
