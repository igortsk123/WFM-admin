import Foundation

/// Хранилище для режима impersonation («Войти как»).
///
/// Доступен только разработчикам с флагом `flags.dev = true` в JWT.
/// Номер телефона сохраняется в UserDefaults и отправляется
/// в хидере `X-Auth-By` при каждом запросе.
final class ImpersonationStorage {
    private let phoneKey = "impersonation_phone"

    /// Сохранённый номер телефона для impersonation.
    /// `nil` означает режим выключен.
    var phone: String? {
        get {
            let value = UserDefaults.standard.string(forKey: phoneKey)
            return value?.isEmpty == false ? value : nil
        }
        set {
            if let phone = newValue, !phone.isEmpty {
                UserDefaults.standard.set(phone, forKey: phoneKey)
            } else {
                UserDefaults.standard.removeObject(forKey: phoneKey)
            }
        }
    }

    /// Проверить наличие флага `flags.dev = true` в JWT.
    ///
    /// Декодирует только payload (Base64url), подпись не проверяется.
    /// Это безопасно: сервер всё равно проверяет подпись при каждом запросе.
    func isDevUser(accessToken: String) -> Bool {
        let segments = accessToken.split(separator: ".")
        guard segments.count >= 2 else { return false }

        var base64 = String(segments[1])
        let remainder = base64.count % 4
        if remainder != 0 {
            base64 += String(repeating: "=", count: 4 - remainder)
        }
        base64 = base64
            .replacingOccurrences(of: "-", with: "+")
            .replacingOccurrences(of: "_", with: "/")

        guard
            let data = Data(base64Encoded: base64),
            let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
            let flags = json["flags"] as? [String: Any]
        else {
            return false
        }
        return (flags["dev"] as? Bool) == true
    }
}
