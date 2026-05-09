import Foundation

/// Сервис для работы с пользователями, ролями и привилегиями
/// Согласно Memory Bank API спецификации (.memory_bank/backend/api_users.md)
actor UserService {
    private let apiClient: APIClient

    init(apiClient: APIClient) {
        self.apiClient = apiClient
    }

    // MARK: - Пользователи

    /// GET /users/me - Получить полную информацию о текущем пользователе
    ///
    /// Возвращает локальные данные (роль, магазин, привилегии) + SSO данные (ФИО, email, телефон, фото).
    func getMe() async throws -> UserMe {
        return try await apiClient.get(path: "/users/me")
    }

    /// GET /users/{user_id} - Получить данные пользователя по ID (только MANAGER)
    ///
    /// Доступ: только MANAGER
    /// Управляющий может просматривать только пользователей своего магазина.
    /// - Parameter userId: ID пользователя
    func getUser(userId: String) async throws -> User {
        return try await apiClient.get(path: "/users/\(userId)")
    }

    /// PATCH /users/{user_id} - Обновить данные пользователя (только MANAGER)
    ///
    /// Доступ: только MANAGER
    /// Управляющий может обновлять только пользователей своего магазина.
    /// Все поля опциональны - обновляются только переданные.
    ///
    /// Для назначения роли: передать roleId (1 = manager, 2 = worker)
    /// Для удаления роли: передать roleId = nil
    ///
    /// - Parameters:
    ///   - userId: ID пользователя
    ///   - update: Данные для обновления
    func updateUser(userId: String, update: UserUpdate) async throws -> User {
        return try await apiClient.patch(path: "/users/\(userId)", body: update)
    }

    // MARK: - Аккаунт

    /// DELETE /users/me - Удалить учётную запись текущего пользователя
    ///
    /// Вызывает Beyond Violet Shopping API через svc_users.
    /// После успешного вызова необходимо выполнить logout.
    func deleteAccount() async throws {
        let _: Empty? = try await apiClient.delete(path: "/users/me")
    }

    // MARK: - Привилегии

    /// PATCH /users/{user_id}/permissions - Обновить список привилегий пользователя (только MANAGER)
    ///
    /// Управляющий отправляет полный список привилегий, которые должны быть у пользователя.
    /// Система автоматически добавляет новые и отзывает (soft delete) старые.
    ///
    /// Workflow:
    /// 1. GET /users/{user_id} → получить текущие привилегии
    /// 2. Внести изменения в UI
    /// 3. PATCH /users/{user_id}/permissions → отправить обновлённый список
    ///
    /// Доступ: только MANAGER
    /// - Parameters:
    ///   - userId: ID пользователя
    ///   - permissions: Полный список привилегий
    func updatePermissions(userId: String, permissions: PermissionsUpdate) async throws -> User {
        return try await apiClient.patch(path: "/users/\(userId)/permissions", body: permissions)
    }
}
