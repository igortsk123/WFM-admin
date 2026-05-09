package com.beyondviolet.wfm.core.managers

import android.content.Context
import android.util.Base64
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import org.json.JSONObject

/**
 * Хранилище для режима impersonation («Войти как»).
 *
 * Доступен только разработчикам с флагом `flags.dev = true` в JWT.
 * Номер телефона сохраняется в SharedPreferences и отправляется
 * в хидере `X-Auth-By` при каждом запросе.
 */
class ImpersonationStorage(private val context: Context) {

    private val prefs get() = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    private val _phone = MutableStateFlow(loadPhone())
    val phone: StateFlow<String?> = _phone.asStateFlow()

    /** Текущий номер телефона для impersonation (null — режим выключен). */
    val currentPhone: String? get() = _phone.value

    /** Сохранить номер телефона. Пустая строка / null — очистить. */
    fun setPhone(phone: String?) {
        if (phone.isNullOrBlank()) {
            prefs.edit().remove(KEY_PHONE).apply()
            _phone.value = null
        } else {
            prefs.edit().putString(KEY_PHONE, phone).apply()
            _phone.value = phone
        }
    }

    private fun loadPhone(): String? {
        val value = prefs.getString(KEY_PHONE, null)
        return if (value.isNullOrBlank()) null else value
    }

    /**
     * Проверить наличие флага `flags.dev = true` в JWT.
     *
     * Декодирует только payload (Base64url), подпись не проверяется.
     * Это безопасно: сервер всё равно проверяет подпись при каждом запросе.
     */
    fun isDevUser(accessToken: String): Boolean {
        return try {
            val segments = accessToken.split(".")
            if (segments.size < 2) return false

            var base64 = segments[1]
            // Дополняем до кратного 4 (Base64 padding)
            val remainder = base64.length % 4
            if (remainder != 0) {
                base64 += "=".repeat(4 - remainder)
            }

            val bytes = Base64.decode(base64, Base64.URL_SAFE or Base64.NO_WRAP)
            val json = JSONObject(String(bytes))
            val flags = json.optJSONObject("flags") ?: return false
            flags.optBoolean("dev", false)
        } catch (_: Exception) {
            false
        }
    }

    companion object {
        private const val PREFS_NAME = "impersonation_prefs"
        private const val KEY_PHONE = "impersonation_phone"
    }
}
