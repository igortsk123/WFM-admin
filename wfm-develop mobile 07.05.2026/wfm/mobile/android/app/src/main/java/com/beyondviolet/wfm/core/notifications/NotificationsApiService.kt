package com.beyondviolet.wfm.core.notifications

import android.util.Log
import com.beyondviolet.wfm.core.network.ApiClient
import com.beyondviolet.wfm.core.platform.PlatformInfo
import io.ktor.client.request.*
import io.ktor.http.*
import kotlinx.serialization.Serializable

/**
 * Клиент для API уведомлений (svc_notifications)
 *
 * Отвечает за регистрацию push-токенов (FCM/HMS) при старте и деактивацию при логауте.
 */
class NotificationsApiService(private val apiClient: ApiClient) {
    private val TAG = "NotificationsAPI"

    /**
     * Зарегистрировать или обновить push-токен устройства (FCM/HMS).
     * Вызывается при старте приложения и при обновлении токена.
     */
    suspend fun registerDeviceToken(token: String) {
        try {
            val accessToken = apiClient.tokenStorage.getAccessToken() ?: run {
                Log.w(TAG, "⚠️ Нет access token для регистрации push токена")
                return
            }
            apiClient.httpClient.post("${apiClient.baseUrl}/notifications/devices/tokens") {
                header(HttpHeaders.Authorization, "Bearer $accessToken")
                contentType(ContentType.Application.Json)
                setBody(
                    DeviceTokenRequest(
                        platform = PlatformInfo.PLATFORM_CODE,
                        token = token,
                        token_type = PlatformInfo.TOKEN_TYPE
                    )
                )
            }
            Log.i(TAG, "✅ Push токен зарегистрирован (${PlatformInfo.PLATFORM_CODE}/${PlatformInfo.TOKEN_TYPE})")
        } catch (e: Exception) {
            Log.w(TAG, "⚠️ Не удалось зарегистрировать push токен: ${e.message}")
        }
    }

    /**
     * Деактивировать push-токен при логауте.
     */
    suspend fun deregisterDeviceToken(token: String) {
        try {
            val accessToken = apiClient.tokenStorage.getAccessToken() ?: return
            apiClient.httpClient.delete("${apiClient.baseUrl}/notifications/devices/tokens/$token") {
                header(HttpHeaders.Authorization, "Bearer $accessToken")
            }
            Log.i(TAG, "✅ Push токен деактивирован")
        } catch (e: Exception) {
            Log.w(TAG, "⚠️ Не удалось деактивировать push токен: ${e.message}")
        }
    }

    @Serializable
    private data class DeviceTokenRequest(
        val platform: String,
        val token: String,
        val token_type: String
    )
}
