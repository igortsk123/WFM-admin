package com.beyondviolet.wfm.feature.auth.presentation.viewmodels

/**
 * Состояние UI для экранов авторизации
 */
sealed class AuthUiState {
    /** Начальное состояние - ожидание ввода номера */
    data object Idle : AuthUiState()

    /** Загрузка при запросе кода */
    data object LoadingCodeRequest : AuthUiState()

    /** Код отправлен, переходим на экран ввода кода */
    data class CodeSent(
        val phone: String,
        val expiresAt: Double,      // timestamp когда истечет код
        val channel: String,        // "telegram" | "max" | "sms" | "call"
        val botUsername: String? = null,
        val botStartPayload: String? = null
    ) : AuthUiState()

    /** Загрузка при проверке кода */
    data object LoadingVerification : AuthUiState()

    data object LoadingRegistration : AuthUiState()

    /** Требуется решение капчи */
    data class CaptchaRequired(
        val action: CaptchaAction
    ) : AuthUiState()

    /** Ошибка (при запросе или проверке кода) */
    data class Error(val message: String) : AuthUiState()

    /** Успешная авторизация */
    data object Authenticated : AuthUiState()

}

/**
 * Действие, для которого требуется капча
 */
enum class CaptchaAction {
    REQUEST_CODE,      // Запрос кода при вводе телефона
    REQUEST_CODE_SIGNUP, // Запрос кода при регистрации
    VERIFY_CODE,       // Подтверждение кода
    REGISTER           // Регистрация пользователя
}

/**
 * Одноразовые события навигации
 * Используется SharedFlow для предотвращения повторной навигации при recomposition
 */
sealed class NavigationEvent {
    /** Код отправлен — перейти на экран ввода кода */
    data class CodeSent(
        val channel: String,
        val botUsername: String?,
        val botStartPayload: String?
    ) : NavigationEvent()

    /** Авторизация успешна */
    data object AuthSuccess : NavigationEvent()
}
