package com.beyondviolet.wfm.notifications

import android.content.Context
import android.util.Log
import com.beyondviolet.wfm.core.push.PushService
import com.google.firebase.messaging.FirebaseMessaging
import kotlinx.coroutines.tasks.await

/**
 * Реализация PushService для Firebase Cloud Messaging (GMS).
 */
class FirebasePushService : PushService {

    companion object {
        private const val TAG = "FirebasePushService"
        private const val PREFS_NAME = "wfm_fcm"
        private const val KEY_FCM_TOKEN = "fcm_token"
    }

    override suspend fun getToken(): String? {
        return try {
            val token = FirebaseMessaging.getInstance().token.await()
            Log.i(TAG, "Firebase токен получен")
            token
        } catch (e: Exception) {
            Log.e(TAG, "Ошибка получения Firebase токена", e)
            null
        }
    }

    override fun initialize(context: Context) {
        // Firebase инициализируется автоматически через google-services.json
        Log.i(TAG, "Firebase Push Service инициализирован")

        // Проактивно запрашиваем токен при старте приложения
        FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
            if (task.isSuccessful) {
                val token = task.result
                if (token != null && token.isNotEmpty()) {
                    Log.i(TAG, "Firebase токен получен при инициализации: ${token.take(20)}...")
                    // Сохраняем токен
                    context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                        .edit().putString(KEY_FCM_TOKEN, token).apply()
                } else {
                    Log.w(TAG, "Firebase токен пустой при инициализации")
                }
            } else {
                Log.e(TAG, "Ошибка получения Firebase токена при инициализации", task.exception)
            }
        }
    }

    override fun getSavedToken(context: Context): String? {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .getString(KEY_FCM_TOKEN, null)
    }
}
