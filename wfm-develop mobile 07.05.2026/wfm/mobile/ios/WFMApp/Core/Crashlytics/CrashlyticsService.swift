import Foundation
import FirebaseCrashlytics

/// Сервис для логирования ошибок в Firebase Crashlytics
///
/// Предоставляет единый интерфейс для записи нефатальных ошибок,
/// кастомных логов и метаданных пользователя.
final class CrashlyticsService {

    // MARK: - Singleton

    static let shared = CrashlyticsService()

    private init() {}

    // MARK: - Public Methods

    /// Залогировать нефатальную ошибку
    /// - Parameter error: Ошибка для записи в Crashlytics
    func record(error: Error) {
        Crashlytics.crashlytics().record(error: error)
        print("🔴 [Crashlytics] Error recorded: \(error.localizedDescription)")
    }

    /// Залогировать кастомное сообщение
    /// - Parameter message: Сообщение для записи
    func log(_ message: String) {
        Crashlytics.crashlytics().log(message)
        print("📝 [Crashlytics] \(message)")
    }

    /// Установить user ID для отслеживания
    /// - Parameter userId: ID пользователя
    func setUserId(_ userId: String) {
        Crashlytics.crashlytics().setUserID(userId)
        print("👤 [Crashlytics] User ID set: \(userId)")
    }

    /// Установить кастомный ключ
    /// - Parameters:
    ///   - value: Значение
    ///   - key: Ключ
    func setCustomValue(_ value: String, forKey key: String) {
        Crashlytics.crashlytics().setCustomValue(value, forKey: key)
        print("🔑 [Crashlytics] Custom key set: \(key) = \(value)")
    }

    /// Установить кастомный ключ с Int значением
    func setCustomValue(_ value: Int, forKey key: String) {
        Crashlytics.crashlytics().setCustomValue(value, forKey: key)
        print("🔑 [Crashlytics] Custom key set: \(key) = \(value)")
    }

    /// Установить кастомный ключ с Bool значением
    func setCustomValue(_ value: Bool, forKey key: String) {
        Crashlytics.crashlytics().setCustomValue(value, forKey: key)
        print("🔑 [Crashlytics] Custom key set: \(key) = \(value)")
    }
}

// MARK: - Convenience Extension

extension CrashlyticsService {
    /// Залогировать результат Result с ошибкой
    func record<T, E: Error>(result: Result<T, E>) {
        if case .failure(let error) = result {
            record(error: error)
        }
    }
}
