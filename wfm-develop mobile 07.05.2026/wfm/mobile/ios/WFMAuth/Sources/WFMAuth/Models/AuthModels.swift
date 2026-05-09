import Foundation

// MARK: - API Response Wrapper

/// Обёртка для всех ответов Beyond Violet API
public struct BVResponse<T: Decodable>: Decodable {
    public let status: BVStatus
    public let data: T?

    enum CodingKeys: String, CodingKey {
        case status, data
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        status = try container.decode(BVStatus.self, forKey: .status)
        // При ошибке сервер возвращает data с неожиданной структурой — декодируем мягко
        data = try? container.decode(T.self, forKey: .data)
    }
}

/// Статус ответа от Beyond Violet API
public struct BVStatus: Decodable {
    public let code: String      // пустая строка = успех
    public let message: String?
}

// MARK: - Auth Models

/// Ответ при запросе кода подтверждения
public struct CodeSentResponse: Decodable {
    public let channel: DeliveryChannel?
    public let botUsername: String?
    public let botStartPayload: String?
    public let expiresAt: Double?

    public enum CodingKeys: String, CodingKey {
        case channel
        case botUsername = "bot_username"
        case botStartPayload = "bot_start_payload"
        case expiresAt = "expires_at"
    }
}

/// Канал доставки кода
public enum DeliveryChannel: String, Decodable {
    case telegram
    case max
    case sms
    case call
}

/// Тип уведомления (предпочтение пользователя)
public enum NotificationType: String {
    case telegramCode = "telegram_code"
    case maxCode = "max_code"
    case phoneCode = "phone_code"
}

/// Ответ при успешной авторизации
public struct TokenResponse: Decodable {
    public let accessToken: String
    public let tokenType: String
    public let refreshToken: String
    public let expiresIn: Int

    public enum CodingKeys: String, CodingKey {
        case accessToken = "access_token"
        case tokenType = "token_type"
        case refreshToken = "refresh_token"
        case expiresIn = "expires_in"
    }
}

/// Ответ при регистрации
public struct RegistrationResponse: Decodable {
    public let id: Int
    public let deviceSecret: String
    public let oauth: TokenResponse

    public enum CodingKeys: String, CodingKey {
        case id
        case deviceSecret = "device_secret"
        case oauth
        case status
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        // Сначала проверяем ошибку: registration endpoint возвращает {"status": {"code": "7", ...}}
        if let status = try? container.decode(BVStatus.self, forKey: .status),
           !status.code.isEmpty {
            throw AuthError(code: status.code, message: status.message ?? "")
        }
        id = try container.decode(Int.self, forKey: .id)
        deviceSecret = try container.decode(String.self, forKey: .deviceSecret)
        oauth = try container.decode(TokenResponse.self, forKey: .oauth)
    }
}

/// Данные для регистрации нового пользователя
public struct RegistrationData: Encodable {
    public let appId: String
    public let phone: String
    public let code: String
    public let firstName: String
    public let lastName: String
    public let gender: Int
    public let cityId: Int
    public let birthDate: String
    public let deviceName: String

    public init(appId: String, phone: String, code: String, firstName: String, lastName: String, gender: Int, cityId: Int, birthDate: String, deviceName: String) {
        self.appId = appId
        self.phone = phone
        self.code = code
        self.firstName = firstName
        self.lastName = lastName
        self.gender = gender
        self.cityId = cityId
        self.birthDate = birthDate
        self.deviceName = deviceName
    }

    public enum CodingKeys: String, CodingKey {
        case appId = "app_id"
        case phone
        case code
        case firstName = "first_name"
        case lastName = "last_name"
        case gender
        case cityId = "city_id"
        case birthDate = "birth_date"
        case deviceName = "device_name"
    }
}

/// Пол пользователя
public enum Gender: String, CaseIterable, Identifiable {
    case male
    case female

    public var id: String { rawValue }

    public var displayName: String {
        switch self {
        case .male: return "Мужской"
        case .female: return "Женский"
        }
    }

    /// Числовое значение для API (1 - мужской, 2 - женский)
    public var apiValue: Int {
        switch self {
        case .male: return 1
        case .female: return 2
        }
    }
}

// MARK: - Auth Errors

/// Коды ошибок авторизации от Beyond Violet API
public enum AuthErrorCode: String {
    case captchaRequired = "AUTH_CAPTCHA_REQUIRED"
    case userNotExists = "AUTH_USER_NOT_EXISTS"
    case invalidCode = "invalid_grant"       // oauth/token endpoint
    case invalidCodeRegistration = "7"       // registration endpoint (status.code)
    case validation = "validation"           // ошибка валидации номера телефона
    case tokenExpired = "token_expired"
    case invalidToken = "invalid_token"
}

/// Ошибки авторизации
public enum AuthError: LocalizedError {
    case captchaRequired
    case userNotExists
    case invalidCode(String)      // серверное сообщение о неверном коде
    case validationError(String)  // серверное сообщение о неверном номере телефона
    case tokenExpired(String)     // серверное сообщение
    case invalidToken(String)     // серверное сообщение
    case networkError
    case unknown(String)

    public init(code: String, message: String = "") {
        if let authCode = AuthErrorCode(rawValue: code) {
            switch authCode {
            case .captchaRequired:
                self = .captchaRequired
            case .userNotExists:
                self = .userNotExists
            case .invalidCode, .invalidCodeRegistration:
                self = .invalidCode(message.isEmpty ? "Неверный код. Попробуйте еще раз" : message)
            case .validation:
                self = .validationError(message.isEmpty ? "Неверный номер телефона" : message)
            case .tokenExpired:
                self = .tokenExpired(message.isEmpty ? "Токен истёк" : message)
            case .invalidToken:
                self = .invalidToken(message.isEmpty ? "Невалидный токен" : message)
            }
        } else {
            self = .unknown(message.isEmpty ? code : message)
        }
    }

    public var errorDescription: String? {
        switch self {
        case .captchaRequired:
            return "Требуется ввод captcha"
        case .userNotExists:
            return "Пользователь не найден"
        case .invalidCode(let msg):
            return msg
        case .validationError(let msg):
            return msg
        case .tokenExpired(let msg):
            return msg
        case .invalidToken(let msg):
            return msg
        case .networkError:
            return "Проверьте подключение к интернету"
        case .unknown(let msg):
            return msg
        }
    }
}

// MARK: - Stored Tokens

/// Токены для хранения в Keychain
public struct StoredTokens {
    public let accessToken: String
    public let refreshToken: String
    public let expiresIn: Int
    public let timestamp: Date

    public init(accessToken: String, refreshToken: String, expiresIn: Int, timestamp: Date) {
        self.accessToken = accessToken
        self.refreshToken = refreshToken
        self.expiresIn = expiresIn
        self.timestamp = timestamp
    }

    /// Проверяет, истек ли токен (с запасом 5 минут)
    public var isExpired: Bool {
        let elapsed = Date().timeIntervalSince(timestamp)
        let expiresInSeconds = TimeInterval(expiresIn)
        return elapsed > (expiresInSeconds - 300)  // 5 минут запас
    }
}
