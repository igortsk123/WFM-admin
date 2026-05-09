package com.beyondviolet.wfm.feature.auth.data.local

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "auth_tokens")

/**
 * Хранилище токенов авторизации
 * Использует DataStore для безопасного хранения токенов
 */
class TokenStorage(private val context: Context) {

    private val dataStore get() = context.dataStore

    /**
     * Сохранить токены после успешной авторизации
     */
    suspend fun saveTokens(accessToken: String, refreshToken: String, expiresIn: Long) {
        val timestamp = System.currentTimeMillis() / 1000
        dataStore.edit { prefs ->
            prefs[Keys.ACCESS_TOKEN] = accessToken
            prefs[Keys.REFRESH_TOKEN] = refreshToken
            prefs[Keys.EXPIRES_IN] = expiresIn
            prefs[Keys.TOKEN_TIMESTAMP] = timestamp
        }
    }

    /**
     * Получить access token
     */
    suspend fun getAccessToken(): String? {
        return dataStore.data.map { prefs ->
            prefs[Keys.ACCESS_TOKEN]
        }.first()
    }

    /**
     * Получить refresh token
     */
    suspend fun getRefreshToken(): String? {
        return dataStore.data.map { prefs ->
            prefs[Keys.REFRESH_TOKEN]
        }.first()
    }

    /**
     * Проверить, истек ли токен
     * Токен считается истекшим за 5 минут до фактического истечения
     */
    suspend fun isTokenExpired(): Boolean {
        val timestamp = dataStore.data.map { prefs ->
            prefs[Keys.TOKEN_TIMESTAMP]
        }.first() ?: return true

        val expiresIn = dataStore.data.map { prefs ->
            prefs[Keys.EXPIRES_IN]
        }.first() ?: return true

        val now = System.currentTimeMillis() / 1000
        // Проверяем за 5 минут (300 секунд) до истечения
        return (now - timestamp) > (expiresIn - 300)
    }

    /**
     * Проверить, есть ли сохраненные токены
     */
    suspend fun hasTokens(): Boolean {
        return getAccessToken() != null && getRefreshToken() != null
    }

    /**
     * Сохранить выбранный assignment ID
     */
    suspend fun saveSelectedAssignmentId(assignmentId: Int) {
        dataStore.edit { prefs ->
            prefs[Keys.SELECTED_ASSIGNMENT_ID] = assignmentId
        }
    }

    /**
     * Получить выбранный assignment ID
     */
    suspend fun getSelectedAssignmentId(): Int? {
        return dataStore.data.map { prefs ->
            prefs[Keys.SELECTED_ASSIGNMENT_ID]
        }.first()
    }

    /**
     * Очистить выбранный assignment ID
     */
    suspend fun clearSelectedAssignmentId() {
        dataStore.edit { prefs ->
            prefs.remove(Keys.SELECTED_ASSIGNMENT_ID)
        }
    }

    /**
     * Очистить все токены (при logout)
     */
    suspend fun clearTokens() {
        dataStore.edit { prefs ->
            prefs.clear()
        }
    }

    private object Keys {
        val ACCESS_TOKEN = stringPreferencesKey("access_token")
        val REFRESH_TOKEN = stringPreferencesKey("refresh_token")
        val EXPIRES_IN = longPreferencesKey("expires_in")
        val TOKEN_TIMESTAMP = longPreferencesKey("token_timestamp")
        val SELECTED_ASSIGNMENT_ID = intPreferencesKey("selected_assignment_id")
    }
}
