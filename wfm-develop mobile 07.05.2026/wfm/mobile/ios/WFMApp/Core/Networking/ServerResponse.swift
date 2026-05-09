import Foundation

// MARK: - Beyond Violet API Response Format

/// Обёртка для всех ответов Beyond Violet API
///
/// Все HTTP ответы имеют статус 200, логические ошибки передаются через `status.code`:
/// - Успех: `status.code = ""` (пустая строка)
/// - Ошибка: `status.code` содержит код (NOT_FOUND, CONFLICT, FORBIDDEN и т.д.)
///
/// Пример успешного ответа:
/// ```json
/// {
///   "status": {
///     "code": "",
///     "message": null
///   },
///   "data": {
///     "id": "123",
///     "name": "John"
///   }
/// }
/// ```
///
/// Пример ответа с ошибкой:
/// ```json
/// {
///   "status": {
///     "code": "NOT_FOUND",
///     "message": "User not found"
///   },
///   "data": null
/// }
/// ```
public struct BVResponse<T: Decodable>: Decodable {
    public let status: BVStatus
    public let data: T?

    /// Проверка успешности запроса
    public var isSuccess: Bool {
        return status.code.isEmpty
    }
}

/// Статус ответа от Beyond Violet API
public struct BVStatus: Decodable {
    /// Код статуса (пустая строка = успех)
    public let code: String

    /// Опциональное сообщение об ошибке
    public let message: String?

    /// Проверка успешности
    public var isSuccess: Bool {
        return code.isEmpty
    }
}

// MARK: - Server Error Codes

/// Коды ошибок Beyond Violet API
public enum BVErrorCode: String {
    /// Ресурс не найден
    case notFound = "NOT_FOUND"

    /// Конфликт (например, недопустимый переход состояния)
    case conflict = "CONFLICT"

    /// Доступ запрещён
    case forbidden = "FORBIDDEN"

    /// Требуется авторизация
    case unauthorized = "UNAUTHORIZED"

    /// Ошибка валидации данных
    case validationError = "VALIDATION_ERROR"

    /// Неизвестная ошибка
    case unknown = "UNKNOWN"
}

// MARK: - Server Response Error

/// Ошибка от сервера Beyond Violet API
public struct ServerResponseError: LocalizedError {
    public let code: String
    public let message: String?

    public var errorDescription: String? {
        return message ?? "Ошибка сервера (\(code))"
    }

    /// Создать ошибку из BVStatus
    public init(status: BVStatus) {
        self.code = status.code
        self.message = status.message
    }

    /// Создать ошибку из кода и сообщения
    public init(code: String, message: String?) {
        self.code = code
        self.message = message
    }

    /// Проверка на конкретный тип ошибки
    public func isError(_ errorCode: BVErrorCode) -> Bool {
        return code == errorCode.rawValue
    }

    /// Извлечь UUID активной задачи из сообщения CONFLICT
    ///
    /// Парсит сообщение вида "У сотрудника уже есть активная задача: 2715499b-d174-43ab-a8c4-ffc078f02f3d"
    /// и возвращает UUID активной задачи
    public var activeTaskId: String? {
        guard isError(.conflict), let message = message else { return nil }

        // Ищем UUID в формате "активная задача: {uuid}"
        let pattern = "[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}"
        guard let regex = try? NSRegularExpression(pattern: pattern),
              let match = regex.firstMatch(in: message, range: NSRange(message.startIndex..., in: message)),
              let range = Range(match.range, in: message) else {
            return nil
        }

        return String(message[range])
    }
}
