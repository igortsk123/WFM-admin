package com.beyondviolet.wfm.core.network

import com.beyondviolet.wfm.core.models.User
import com.beyondviolet.wfm.core.models.UserMe
import com.beyondviolet.wfm.core.models.UserUpdate
import com.beyondviolet.wfm.core.models.PermissionsUpdate

/**
 * Сервис для работы с пользователями, ролями и привилегиями
 * Согласно Memory Bank API спецификации (.memory_bank/backend/api_users.md)
 */
class UserService(private val apiClient: ApiClient) {

    /**
     * Получить полную информацию о текущем пользователе
     *
     * GET /users/me
     *
     * Возвращает локальные данные (роль, магазин, привилегии) + SSO данные (ФИО, email, телефон, фото)
     */
    suspend fun getMe(): ApiResponse<UserMe> {
        return apiClient.get("/users/me")
    }

    /**
     * Получить данные пользователя по ID (только MANAGER)
     *
     * GET /users/{user_id}
     *
     * Управляющий может просматривать только пользователей своего магазина.
     */
    suspend fun getUser(userId: String): ApiResponse<User> {
        return apiClient.get("/users/$userId")
    }

    /**
     * Обновить данные пользователя (только MANAGER)
     *
     * PATCH /users/{user_id}
     *
     * Управляющий может обновлять только пользователей своего магазина.
     * Все поля опциональны - обновляются только переданные.
     *
     * Для назначения роли: передать role_id (1 = manager, 2 = worker)
     * Для удаления роли: передать role_id = null
     */
    suspend fun updateUser(userId: String, update: UserUpdate): ApiResponse<User> {
        return apiClient.patch("/users/$userId", update)
    }

    /**
     * Удалить учётную запись текущего пользователя
     *
     * DELETE /users/me
     *
     * Вызывает Beyond Violet Shopping API через svc_users.
     * После успешного вызова необходимо выполнить logout.
     */
    suspend fun deleteAccount(): ApiResponse<Unit?> {
        return apiClient.delete("/users/me")
    }

    /**
     * Обновить список привилегий пользователя (только MANAGER)
     *
     * PATCH /users/{user_id}/permissions
     *
     * Управляющий отправляет полный список привилегий, которые должны быть у пользователя.
     * Система автоматически добавляет новые и отзывает (soft delete) старые.
     *
     * Workflow:
     * 1. GET /users/{user_id} → получить текущие привилегии
     * 2. Внести изменения в UI
     * 3. PATCH /users/{user_id}/permissions → отправить обновлённый список
     */
    suspend fun updatePermissions(userId: String, permissions: PermissionsUpdate): ApiResponse<User> {
        return apiClient.patch("/users/$userId/permissions", permissions)
    }
}
