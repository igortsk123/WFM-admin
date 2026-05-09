import Foundation
#if canImport(UIKit)
import UIKit
#endif

/// Утилиты для работы с Telegram
public enum TelegramUtils {
    /// Проверяет, установлен ли Telegram
    public static func isTelegramInstalled() -> Bool {
        #if !os(macOS)
        guard let telegramURL = URL(string: "tg://") else { return false }
        return UIApplication.shared.canOpenURL(telegramURL)
        #else
        return false
        #endif
    }

    /// Открывает Telegram, если он установлен
    /// - Returns: true, если Telegram установлен и был открыт
    @discardableResult
    public static func openTelegramIfNeeded() -> Bool {
        #if !os(macOS)
        guard isTelegramInstalled(), let telegramURL = URL(string: "tg://") else {
            return false
        }
        UIApplication.shared.open(telegramURL, options: [:], completionHandler: nil)
        return true
        #else
        return false
        #endif
    }

    /// Создает deep link для Telegram бота
    /// Формат: t.me/{bot_username}[?start={bot_start_payload}]
    public static func createTelegramDeepLink(botUsername: String, botStartPayload: String? = nil) -> String {
        var link = "https://t.me/\(botUsername)"
        if let payload = botStartPayload, !payload.isEmpty {
            link += "?start=\(payload)"
        }
        return link
    }

    /// Открывает Telegram бота если нужна авторизация в боте
    ///
    /// Логика:
    /// - Если `botStartPayload` НЕ пустой → пользователь НЕ авторизован в боте → открываем Telegram для авторизации
    /// - Если `botStartPayload` пустой/nil → пользователь УЖЕ авторизован в боте → НЕ открываем Telegram, код придет через пуш
    ///
    /// - Parameters:
    ///   - botUsername: Имя бота в Telegram
    ///   - botStartPayload: Payload для авторизации в боте
    public static func openIfNeeded(botUsername: String?, botStartPayload: String?) {
        guard let botUsername = botUsername, !botUsername.isEmpty,
              let payload = botStartPayload, !payload.isEmpty else {
            // Не открываем Telegram если:
            // - botUsername отсутствует или пустой
            // - botStartPayload отсутствует или пустой (пользователь уже авторизован, код придет через пуш)
            return
        }

        // Формируем deep link для авторизации в боте
        let deepLinkString = createTelegramDeepLink(botUsername: botUsername, botStartPayload: payload)
        MessengerUtils.openUrl(deepLinkString)
    }
}
