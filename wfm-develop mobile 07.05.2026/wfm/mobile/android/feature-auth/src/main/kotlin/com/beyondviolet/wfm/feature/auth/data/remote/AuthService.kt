package com.beyondviolet.wfm.feature.auth.data.remote

import android.os.Build
import com.beyondviolet.wfm.feature.auth.domain.models.CodeSentResponse
import com.beyondviolet.wfm.feature.auth.domain.models.RegisterResponse
import com.beyondviolet.wfm.feature.auth.domain.models.TokenData
import io.ktor.http.*

/**
 * Сервис для работы с API авторизации BeyondViolet
 * Использует FormUrlEncoded запросы
 */
class AuthService(private val apiClient: AuthApiClient) {

    companion object {
        //DEV#@ //вум№"
        private const val AUTH_BASE_URL = "https://api.beyondviolet.com"
        private const val SHOPPING_BASE_URL = "https://shopping.beyondviolet.com"
        private const val APP_ID = "15"
        private const val APP_SECRET = "25f4db1436f767a9b1dc75c0e38a5bfb"
    }

    /**
     * Запросить отправку кода на номер телефона
     * POST https://api.beyondviolet.com/oauth/authorize/
     *
     * @param phone Номер телефона
     * @param notificationType Способ доставки ("telegram_code" | "phone_code")
     * @param forSignup Флаг регистрации (передать true если пользователь не существует)
     * @param captchaToken Токен hCaptcha (если требуется)
     */
    suspend fun requestCode(
        phone: String,
        notificationType: String = "telegram_code",
        forSignup: Boolean = false,
        captchaToken: String? = null
    ): ApiResponse<CodeSentResponse> {
        val parameters = Parameters.build {
            append("phone", phone)
            append("response_type", notificationType)
            if (forSignup) {
                append("signup", "1")
            }
            if (captchaToken != null) {
                append("captcha", captchaToken)
            }
        }
        return apiClient.postForm(
            url = "$AUTH_BASE_URL/oauth/authorize/",
            formParameters = parameters
        )
    }

    /**
     * Подтвердить SMS код и получить токены
     * POST https://api.beyondviolet.com/oauth/token/
     *
     * @param phone Номер телефона
     * @param code Код подтверждения
     * @param captchaToken Токен hCaptcha (если требуется)
     */
    suspend fun verifyCode(
        phone: String,
        code: String,
        captchaToken: String? = null
    ): ApiResponse<TokenData> {
        val parameters = Parameters.build {
            append("grant_type", "phone_code")
            append("phone", phone)
            append("app_secret", APP_SECRET)
            append("app_id", APP_ID)
            append("code", code)
            if (captchaToken != null) {
                append("captcha", captchaToken)
            }
        }
        return apiClient.postForm(
            url = "$AUTH_BASE_URL/oauth/token/",
            formParameters = parameters
        )
    }

    /**
     * Зарегистрировать нового пользователя
     * POST https://shopping.beyondviolet.com/api/account/register
     *
     * @param phone Номер телефона
     * @param code Код подтверждения
     * @param firstName Имя
     * @param lastName Фамилия
     * @param gender Пол (1 - мужской, 2 - женский)
     * @param birthDate Дата рождения (yyyy-MM-dd)
     * @param captchaToken Токен hCaptcha (если требуется)
     */
    suspend fun register(
        phone: String,
        code: String,
        firstName: String,
        lastName: String,
        gender: Int,
        birthDate: String,
        captchaToken: String? = null
    ): ApiResponse<RegisterResponse> {
        val deviceName = "${Build.MANUFACTURER} ${Build.MODEL} SDK:${Build.VERSION.SDK_INT}"

        val parameters = Parameters.build {
            append("app_id", APP_ID)
            append("phone", phone)
            append("code", code)
            append("first_name", firstName)
            append("last_name", lastName)
            append("gender", gender.toString())
            append("city_id", "1")
            append("birth_date", birthDate)
            append("device_name", deviceName)
            if (captchaToken != null) {
                append("captcha", captchaToken)
            }
        }

        // Регистрация возвращает данные напрямую, без обёртки BVResponse
        return apiClient.postFormDirect(
            url = "$SHOPPING_BASE_URL/api/account/register",
            formParameters = parameters
        )
    }
}
