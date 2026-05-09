package com.beyondviolet.wfm.notifications

import android.content.Context
import android.util.Log
import com.beyondviolet.wfm.core.push.PushService
import com.huawei.agconnect.AGConnectOptions
import com.huawei.agconnect.AGConnectOptionsBuilder
import com.huawei.hms.aaid.HmsInstanceId
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * Реализация PushService для Huawei Push Kit (HMS).
 */
class HmsPushService : PushService {

    companion object {
        private const val TAG = "HmsPushService"
        private const val PREFS_NAME = "wfm_hms"
        private const val KEY_HMS_TOKEN = "hms_token"
    }

    override suspend fun getToken(): String? {
        return withContext(Dispatchers.IO) {
            try {
                // HMS требует APP_ID из agconnect-services.json
                val appId = AGConnectOptionsBuilder().build(null).getString("client/app_id")
                val token = HmsInstanceId.getInstance(null).getToken(appId, "HCM")
                Log.i(TAG, "HMS токен получен")
                token
            } catch (e: Exception) {
                Log.e(TAG, "Ошибка получения HMS токена", e)
                null
            }
        }
    }

    override fun initialize(context: Context) {
        // HMS инициализируется автоматически через agconnect-services.json
        Log.i(TAG, "HMS Push Service инициализирован")

        // Проактивно запрашиваем токен при старте приложения
        try {
            Thread {
                try {
                    val appId = AGConnectOptionsBuilder().build(context).getString("client/app_id")
                    val token = HmsInstanceId.getInstance(context).getToken(appId, "HCM")
                    if (token != null && token.isNotEmpty()) {
                        Log.i(TAG, "HMS токен получен при инициализации: ${token.take(20)}...")
                        // Сохраняем токен
                        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                            .edit().putString(KEY_HMS_TOKEN, token).apply()
                    } else {
                        Log.w(TAG, "HMS токен пустой при инициализации")
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Ошибка получения HMS токена при инициализации", e)
                }
            }.start()
        } catch (e: Exception) {
            Log.e(TAG, "Ошибка запуска запроса HMS токена", e)
        }
    }

    override fun getSavedToken(context: Context): String? {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .getString(KEY_HMS_TOKEN, null)
    }
}
