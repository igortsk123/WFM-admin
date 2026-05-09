import Foundation
#if canImport(UIKit)
import UIKit
#endif

/// Утилиты для открытия мессенджеров по URL
public enum MessengerUtils {
    /// Открывает мессенджер по URL.
    /// Если приложение установлено — открывает напрямую через URL scheme приложения.
    /// Если не установлено — fallback на https (браузер).
    public static func openUrl(_ urlString: String) {
        guard let fallbackUrl = URL(string: urlString) else { return }
        #if !os(macOS)
        if let appUrl = appSchemeUrl(for: urlString),
           UIApplication.shared.canOpenURL(appUrl) {
            UIApplication.shared.open(appUrl)
        } else {
            UIApplication.shared.open(fallbackUrl)
        }
        #endif
    }

    /// Преобразует https-ссылку мессенджера в URL scheme приложения
    private static func appSchemeUrl(for urlString: String) -> URL? {
        guard let url = URL(string: urlString) else { return nil }
        let components = URLComponents(url: url, resolvingAgainstBaseURL: false)

        // Telegram: https://t.me/username[?start=payload] → tg://resolve?domain=username[&start=payload]
        if url.host?.contains("t.me") == true {
            let pathSegments = url.pathComponents.filter { $0 != "/" }
            guard let username = pathSegments.first else { return nil }
            var scheme = "tg://resolve?domain=\(username)"
            if let start = components?.queryItems?.first(where: { $0.name == "start" })?.value {
                scheme += "&start=\(start)"
            }
            return URL(string: scheme)
        }

        // MAX: https://max.ru/username[?start=payload] → max://resolve?domain=username[&start=payload]
        if url.host?.contains("max.ru") == true {
            return nil //resolve?domain у макса не работает, пусть идет по обычной ссылке через https
            let pathSegments = url.pathComponents.filter { $0 != "/" }
            guard let username = pathSegments.first else { return nil }
            var scheme = "max://resolve?domain=\(username)"
            if let start = components?.queryItems?.first(where: { $0.name == "start" })?.value {
                scheme += "&start=\(start)"
            }
            return URL(string: scheme)
        }

        return nil
    }
}
