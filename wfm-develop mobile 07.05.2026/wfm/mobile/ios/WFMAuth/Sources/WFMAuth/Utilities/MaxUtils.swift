import Foundation
#if canImport(UIKit)
import UIKit
#endif

/// Утилиты для работы с MAX мессенджером
public enum MaxUtils {
    /// Проверяет, установлен ли MAX
    public static func isMaxInstalled() -> Bool {
        #if !os(macOS)
        // URL scheme для MAX (предполагаемый, может потребоваться уточнение)
        guard let maxURL = URL(string: "max://") else { return false }
        return UIApplication.shared.canOpenURL(maxURL)
        #else
        return false
        #endif
    }

    /// Создает deep link для MAX бота
    /// Формат: max.ru/{bot_username}[?start={bot_start_payload}]
    public static func createMaxDeepLink(botUsername: String, botStartPayload: String? = nil) -> String {
        var link = "https://max.ru/\(botUsername)"
        if let payload = botStartPayload, !payload.isEmpty {
            link += "?start=\(payload)"
        }
        return link
    }

    /// Открывает MAX бота если нужна авторизация в боте
    ///
    /// Логика:
    /// - Если `botStartPayload` НЕ пустой → пользователь НЕ авторизован в боте → открываем MAX для авторизации
    /// - Если `botStartPayload` пустой/nil → пользователь УЖЕ авторизован в боте → НЕ открываем MAX, код придет через пуш
    ///
    /// - Parameters:
    ///   - botUsername: Имя бота в MAX
    ///   - botStartPayload: Payload для авторизации в боте
    public static func openIfNeeded(botUsername: String?, botStartPayload: String?) {
        guard let botUsername = botUsername, !botUsername.isEmpty,
              let payload = botStartPayload, !payload.isEmpty else {
            // Не открываем MAX если:
            // - botUsername отсутствует или пустой
            // - botStartPayload отсутствует или пустой (пользователь уже авторизован, код придет через пуш)
            return
        }

        // Формируем deep link для авторизации в боте
        let deepLinkString = createMaxDeepLink(botUsername: botUsername, botStartPayload: payload)
        MessengerUtils.openUrl(deepLinkString)
    }
}
