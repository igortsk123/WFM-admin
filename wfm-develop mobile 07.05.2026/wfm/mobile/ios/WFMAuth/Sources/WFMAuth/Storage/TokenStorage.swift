import Foundation
import Security

/// Хранилище токенов авторизации в iOS Keychain
/// Также хранит selectedAssignmentId в UserDefaults
public actor TokenStorage {
    private let service = "com.wfm.auth"
    private let accessTokenKey = "access_token"
    private let refreshTokenKey = "refresh_token"
    private let expiresInKey = "expires_in"
    private let timestampKey = "timestamp"
    private let selectedAssignmentIdKey = "selected_assignment_id"

    private let userDefaults = UserDefaults.standard

    public init() {}

    // MARK: - Public API

    /// Сохранить токены после успешной авторизации
    public func saveTokens(_ tokenResponse: TokenResponse) throws {
        try saveToKeychain(key: accessTokenKey, value: tokenResponse.accessToken)
        try saveToKeychain(key: refreshTokenKey, value: tokenResponse.refreshToken)
        try saveToKeychain(key: expiresInKey, value: String(tokenResponse.expiresIn))
        try saveToKeychain(key: timestampKey, value: String(Date().timeIntervalSince1970))
    }

    /// Получить сохраненные токены
    public func getTokens() throws -> StoredTokens? {
        guard let accessToken = try loadFromKeychain(key: accessTokenKey),
              let refreshToken = try loadFromKeychain(key: refreshTokenKey),
              let expiresInString = try loadFromKeychain(key: expiresInKey),
              let expiresIn = Int(expiresInString),
              let timestampString = try loadFromKeychain(key: timestampKey),
              let timestampInterval = Double(timestampString) else {
            return nil
        }

        let timestamp = Date(timeIntervalSince1970: timestampInterval)
        return StoredTokens(
            accessToken: accessToken,
            refreshToken: refreshToken,
            expiresIn: expiresIn,
            timestamp: timestamp
        )
    }

    /// Получить access token
    public func getAccessToken() throws -> String? {
        return try loadFromKeychain(key: accessTokenKey)
    }

    /// Получить refresh token
    public func getRefreshToken() throws -> String? {
        return try loadFromKeychain(key: refreshTokenKey)
    }

    /// Проверить, есть ли сохраненные токены
    public func hasTokens() -> Bool {
        do {
            let accessToken = try getAccessToken()
            let refreshToken = try getRefreshToken()
            return accessToken != nil && refreshToken != nil
        } catch {
            return false
        }
    }

    /// Сохранить выбранный assignment ID
    public func saveSelectedAssignmentId(_ assignmentId: Int) {
        userDefaults.set(assignmentId, forKey: selectedAssignmentIdKey)
    }

    /// Получить выбранный assignment ID
    public func getSelectedAssignmentId() -> Int? {
        let value = userDefaults.integer(forKey: selectedAssignmentIdKey)
        return value == 0 ? nil : value
    }

    /// Очистить выбранный assignment ID
    public func clearSelectedAssignmentId() {
        userDefaults.removeObject(forKey: selectedAssignmentIdKey)
    }

    /// Очистить все токены
    public func clearTokens() throws {
        try deleteFromKeychain(key: accessTokenKey)
        try deleteFromKeychain(key: refreshTokenKey)
        try deleteFromKeychain(key: expiresInKey)
        try deleteFromKeychain(key: timestampKey)
        clearSelectedAssignmentId()
    }

    /// Проверить, истек ли токен (с запасом 5 минут)
    public func isTokenExpired() throws -> Bool {
        guard let tokens = try getTokens() else {
            return true
        }
        return tokens.isExpired
    }

    // MARK: - Keychain Operations

    private func saveToKeychain(key: String, value: String) throws {
        guard let data = value.data(using: .utf8) else {
            throw KeychainError.encodingFailed
        }

        // Удаляем старое значение если есть
        try? deleteFromKeychain(key: key)

        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly
        ]

        let status = SecItemAdd(query as CFDictionary, nil)

        guard status == errSecSuccess else {
            throw KeychainError.saveFailed(status)
        }
    }

    private func loadFromKeychain(key: String) throws -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        if status == errSecItemNotFound {
            return nil
        }

        guard status == errSecSuccess,
              let data = result as? Data,
              let value = String(data: data, encoding: .utf8) else {
            throw KeychainError.loadFailed(status)
        }

        return value
    }

    private func deleteFromKeychain(key: String) throws {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key
        ]

        let status = SecItemDelete(query as CFDictionary)

        guard status == errSecSuccess || status == errSecItemNotFound else {
            throw KeychainError.deleteFailed(status)
        }
    }
}

// MARK: - Keychain Errors

public enum KeychainError: LocalizedError {
    case encodingFailed
    case saveFailed(OSStatus)
    case loadFailed(OSStatus)
    case deleteFailed(OSStatus)

    public var errorDescription: String? {
        switch self {
        case .encodingFailed:
            return "Failed to encode value"
        case .saveFailed(let status):
            return "Failed to save to Keychain (status: \(status))"
        case .loadFailed(let status):
            return "Failed to load from Keychain (status: \(status))"
        case .deleteFailed(let status):
            return "Failed to delete from Keychain (status: \(status))"
        }
    }
}
