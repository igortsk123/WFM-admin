package com.beyondviolet.wfm.feature.auth.presentation.viewmodels

import android.content.Context
import android.util.Log
import androidx.compose.ui.text.TextRange
import androidx.compose.ui.text.input.TextFieldValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.beyondviolet.wfm.feature.auth.data.remote.ApiResponse
import com.beyondviolet.wfm.feature.auth.data.remote.AuthService
import com.beyondviolet.wfm.feature.auth.data.local.TokenStorage
import com.beyondviolet.wfm.feature.auth.util.TelegramUtils
import com.beyondviolet.wfm.feature.auth.util.MaxUtils
import com.beyondviolet.wfm.ui.components.ToastManager
import com.beyondviolet.wfm.ui.components.WfmToastState
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/**
 * ViewModel для управления процессом авторизации
 */
class AuthViewModel(
    private val authService: AuthService,
    private val tokenStorage: TokenStorage,
    private val context: Context,
    private val toastManager: ToastManager
) : ViewModel() {

    /**
     * Callback для передачи событий аналитики в основное приложение.
     * feature-auth не зависит от app модуля, поэтому аналитика прокидывается через callback.
     * Устанавливается в AuthDependencyContainer или authNavGraph.
     */
    var onTrack: ((String) -> Unit)? = null

    private val _uiState = MutableStateFlow<AuthUiState>(AuthUiState.Idle)
    val uiState: StateFlow<AuthUiState> = _uiState.asStateFlow()

    // Ошибка поля ввода телефона (отображается inline в поле, а не тостом)
    private val _phoneFieldError = MutableStateFlow<String?>(null)
    val phoneFieldError: StateFlow<String?> = _phoneFieldError.asStateFlow()

    // Ошибка поля ввода кода (отображается inline в поле, а не тостом)
    private val _codeFieldError = MutableStateFlow<String?>(null)
    val codeFieldError: StateFlow<String?> = _codeFieldError.asStateFlow()

    // Последнее состояние CodeSent (для восстановления после ошибки)
    private var lastCodeSentState: AuthUiState.CodeSent? = null

    // Одноразовые события навигации (SharedFlow не повторяет события при recomposition)
    private val _navigationEvent = MutableSharedFlow<NavigationEvent>()
    val navigationEvent: SharedFlow<NavigationEvent> = _navigationEvent.asSharedFlow()

    // Хранит сырой ввод пользователя (цифры и +)
    private val _phone = MutableStateFlow(TextFieldValue(""))
    val phone: StateFlow<TextFieldValue> = _phone.asStateFlow()

    // Автоопределение канала доставки на основе наличия Telegram -> MAX -> Звонок
    private val _notificationType = MutableStateFlow(
        when {
            TelegramUtils.getInstalledTelegramPackage(context) != null -> "telegram_code"
            MaxUtils.getInstalledMaxPackage(context) != null -> "max_code"
            else -> "phone_code"
        }
    )
    val notificationType: StateFlow<String> = _notificationType.asStateFlow()

    private var currentCode: String = ""
    private var currentCaptchaToken: String? = null

    // Данные регистрации (сохраняются для использования после ввода кода)
    private var registrationData: RegistrationData? = null

    // Данные для deep link мессенджера (Telegram/MAX)
    private var messengerBotUsername: String? = null
    private var messengerBotStartPayload: String? = null

    data class RegistrationData(
        val firstName: String,
        val lastName: String,
        val gender: String,
        val birthDate: String
    )

    /**
     * Обновить номер телефона
     * Умная логика:
     * - Ввод "7" первой цифрой → становится "+7"
     * - Ввод "8" первой цифрой → становится "+7"
     * - Ввод "+" → игнорируется
     * - Ввод любой другой цифры → добавляется "+7" + цифра
     */
    fun onPhoneChanged(newValue: TextFieldValue) {
        // Сбрасываем ошибку при вводе
        if (_phoneFieldError.value != null) {
            _phoneFieldError.value = null
        }

        // Оставляем только цифры
        val input = newValue.text.filter { it.isDigit() }

        // Если пусто - очищаем
        if (input.isEmpty()) {
            _phone.value = TextFieldValue(text = "", selection = TextRange(0))
            return
        }

        val result = when {
            input.startsWith("8") -> "+7" + input.removePrefix("8")
            input.startsWith("7") -> "+7" + input.removePrefix("7")
            else -> "+7" + input
        }.take(12)

        _phone.value = TextFieldValue(
            text = result,
            selection = TextRange(result.length)
        )
    }

    /**
     * Проверить валидность номера телефона (+7 и 10 цифр = 12 символов)
     */
    fun isPhoneValid(): Boolean {
        return _phone.value.text.length == 12 && _phone.value.text.startsWith("+7")
    }

    /**
     * Получить полный номер телефона для отправки на сервер
     */
    fun getFullPhoneNumber(): String {
        return _phone.value.text
    }

    /**
     * Изменить способ доставки кода
     */
    fun setNotificationType(type: String) {
        _notificationType.value = type
    }

    /**
     * Запросить отправку кода
     * @param forSignup Флаг регистрации (true если пользователь не существует)
     * @param captchaToken Токен капчи (если был получен)
     */
    fun requestCode(forSignup: Boolean = false, captchaToken: String? = null) {
        if (!isPhoneValid()) {
            toastManager.show("Неверный формат номера телефона", state = WfmToastState.ERROR)
            return
        }

        onTrack?.invoke("phone_submitted")
        viewModelScope.launch {
            _phoneFieldError.value = null
            _uiState.value = AuthUiState.LoadingCodeRequest

            when (val response = authService.requestCode(
                phone = getFullPhoneNumber(),
                notificationType = _notificationType.value,
                forSignup = forSignup,
                captchaToken = captchaToken
            )) {
                is ApiResponse.Success -> {
                    // Очищаем токен капчи после успешного использования
                    currentCaptchaToken = null
                    // expires_at приходит в секундах Unix timestamp
                    val expiresAt = (response.data.expires_at ?: 0.0) * 1000
                    val channel = response.data.channel ?: "sms"

                    // Сохраняем данные мессенджера для deep link (Telegram/MAX)
                    messengerBotUsername = response.data.bot_username
                    messengerBotStartPayload = response.data.bot_start_payload

                    val codeSentState = AuthUiState.CodeSent(
                        phone = getFullPhoneNumber(),
                        expiresAt = expiresAt,
                        channel = channel,
                        botUsername = messengerBotUsername,
                        botStartPayload = messengerBotStartPayload
                    )
                    lastCodeSentState = codeSentState
                    _uiState.value = codeSentState

                    _navigationEvent.emit(NavigationEvent.CodeSent(
                        channel = channel,
                        botUsername = messengerBotUsername,
                        botStartPayload = messengerBotStartPayload
                    ))
                }
                is ApiResponse.Error -> {
                    if (response.code == "AUTH_USER_NOT_EXISTS") {
                        // Пользователь не существует - теневая регистрация с пустым шаблоном
                        Log.d(TAG, "User not exists, starting shadow registration")
                        registrationData = RegistrationData(
                            firstName = "",
                            lastName = "",
                            gender = "male",
                            birthDate = "1970-01-01"
                        )
                        requestCode(forSignup = true)
                    } else if (response.code == "AUTH_CAPTCHA_REQUIRED") {
                        // Требуется капча
                        Log.d(TAG, "Captcha required for request code")
                        val action = if (forSignup) CaptchaAction.REQUEST_CODE_SIGNUP else CaptchaAction.REQUEST_CODE
                        _uiState.value = AuthUiState.CaptchaRequired(action)
                    } else if (response.code == "validation") {
                        // Ошибка валидации номера — показываем inline в поле
                        _phoneFieldError.value = response.message
                        _uiState.value = AuthUiState.Idle
                    } else if (response.code == "unknown") {
                        // Ошибка валидации номера — показываем inline в поле
                        _phoneFieldError.value = response.message
                        _uiState.value = AuthUiState.Idle
                    } else {
                        toastManager.show(response.message, state = WfmToastState.ERROR)
                        _uiState.value = AuthUiState.Idle
                    }
                }
            }
        }
    }

    /**
     * Подтвердить SMS код
     * @param code Код подтверждения
     * @param captchaToken Токен капчи (если был получен)
     */
    fun verifyCode(code: String, captchaToken: String? = null) {
        Log.d(TAG, "verifyCode called with code: $code")
        Log.d(TAG, "Current phone value: '${getFullPhoneNumber()}'")

        if (code.length != 4) {
            _codeFieldError.value = "Код должен содержать 4 цифры"
            return
        }

        // Сохраняем код
        currentCode = code
        // Сбрасываем ошибку поля перед новым запросом
        _codeFieldError.value = null
        onTrack?.invoke("code_submitted")

        viewModelScope.launch {
            _uiState.value = AuthUiState.LoadingVerification

            // Если есть данные регистрации, завершаем регистрацию
            if (registrationData != null) {
                Log.d(TAG, "Registration data found, completing registration")
                completeRegistration(captchaToken)
            } else {
                // Иначе проверяем код для существующего пользователя
                Log.d(TAG, "Calling authService.verifyCode with phone='${getFullPhoneNumber()}', code='$code'")
                when (val response = authService.verifyCode(getFullPhoneNumber(), code, captchaToken)) {
                    is ApiResponse.Success -> {
                        Log.d(TAG, "verifyCode success, saving tokens")
                        // Очищаем токен капчи после успешного использования
                        currentCaptchaToken = null
                        // Сохраняем токены
                        tokenStorage.saveTokens(
                            response.data.access_token,
                            response.data.refresh_token,
                            response.data.expires_in
                        )
                        _uiState.value = AuthUiState.Authenticated
                        _navigationEvent.emit(NavigationEvent.AuthSuccess)
                    }
                    is ApiResponse.Error -> {
                        Log.e(TAG, "verifyCode error: ${response.code} - ${response.message}")
                        if (response.code == "AUTH_CAPTCHA_REQUIRED") {
                            Log.d(TAG, "Captcha required for verify code")
                            _uiState.value = AuthUiState.CaptchaRequired(CaptchaAction.VERIFY_CODE)
                        } else if (response.code == "invalid_grant" || response.code == "7") {
                            // Неверный код — показываем ошибку inline в поле
                            _codeFieldError.value = response.message
                            _uiState.value = lastCodeSentState ?: AuthUiState.Idle
                        } else {
                            toastManager.show(response.message, state = WfmToastState.ERROR)
                            _uiState.value = lastCodeSentState ?: AuthUiState.Idle
                        }
                    }
                }
            }
        }
    }

    /**
     * Завершить регистрацию после ввода кода
     * Вызывается автоматически после успешного ввода кода
     * @param captchaToken Токен капчи (если был получен)
     */
    private suspend fun completeRegistration(captchaToken: String? = null) {
        val regData = registrationData
        if (regData == null) {
            Log.e(TAG, "completeRegistration called but registrationData is null")
            toastManager.show("Данные регистрации не найдены", state = WfmToastState.ERROR)
            _uiState.value = lastCodeSentState ?: AuthUiState.Idle
            return
        }

        if (currentCode.isEmpty()) {
            Log.e(TAG, "completeRegistration called but currentCode is empty")
            toastManager.show("Код не найден", state = WfmToastState.ERROR)
            _uiState.value = lastCodeSentState ?: AuthUiState.Idle
            return
        }

        _uiState.value = AuthUiState.LoadingRegistration

        // Конвертация gender string -> int (male=1, female=2)
        val genderInt = when (regData.gender.lowercase()) {
            "male" -> 1
            "female" -> 2
            else -> 1
        }

        Log.d(TAG, "Calling authService.register with phone='${getFullPhoneNumber()}', code='$currentCode'")
        when (val response = authService.register(
            phone = getFullPhoneNumber(),
            code = currentCode,
            firstName = regData.firstName,
            lastName = regData.lastName,
            gender = genderInt,
            birthDate = regData.birthDate,
            captchaToken = captchaToken
        )) {
            is ApiResponse.Success -> {
                Log.d(TAG, "register success, saving tokens")
                // Очищаем токен капчи после успешного использования
                currentCaptchaToken = null
                // Сохраняем токены из ответа регистрации
                tokenStorage.saveTokens(
                    response.data.oauth.access_token,
                    response.data.oauth.refresh_token,
                    response.data.oauth.expires_in
                )
                // Очищаем данные регистрации
                registrationData = null
                currentCode = ""
                _uiState.value = AuthUiState.Authenticated
                _navigationEvent.emit(NavigationEvent.AuthSuccess)
            }
            is ApiResponse.Error -> {
                Log.e(TAG, "register error: ${response.code} - ${response.message}")
                if (response.code == "AUTH_CAPTCHA_REQUIRED") {
                    Log.d(TAG, "Captcha required for registration")
                    _uiState.value = AuthUiState.CaptchaRequired(CaptchaAction.REGISTER)
                } else if (response.code == "invalid_grant" || response.code == "7") {
                    // Неверный код при регистрации — показываем ошибку inline в поле
                    _codeFieldError.value = response.message
                    _uiState.value = lastCodeSentState ?: AuthUiState.Idle
                } else {
                    toastManager.show(response.message, state = WfmToastState.ERROR)
                    _uiState.value = lastCodeSentState ?: AuthUiState.Idle
                }
            }
        }
    }

    companion object {
        private const val TAG = "AuthViewModel"
    }

    /**
     * Вернуться к вводу номера телефона
     */
    fun resetToPhoneInput() {
        _uiState.value = AuthUiState.Idle
        _phoneFieldError.value = null
        _codeFieldError.value = null
    }

    /**
     * Сбросить ошибку поля ввода кода (вызывается когда пользователь начинает вводить код)
     */
    fun clearCodeFieldError() {
        _codeFieldError.value = null
    }

    /**
     * Обработать результат решения капчи
     * @param token Токен полученный от hCaptcha
     * @param action Действие для которого требовалась капча
     */
    fun onCaptchaSuccess(token: String, action: CaptchaAction) {
        Log.d(TAG, "Captcha solved successfully for action: $action")
        currentCaptchaToken = token

        when (action) {
            CaptchaAction.REQUEST_CODE -> {
                requestCode(forSignup = false, captchaToken = token)
            }
            CaptchaAction.REQUEST_CODE_SIGNUP -> {
                requestCode(forSignup = true, captchaToken = token)
            }
            CaptchaAction.VERIFY_CODE -> {
                verifyCode(currentCode, captchaToken = token)
            }
            CaptchaAction.REGISTER -> {
                viewModelScope.launch {
                    completeRegistration(captchaToken = token)
                }
            }
        }
    }

    /**
     * Отменить решение капчи
     */
    fun onCaptchaDismiss() {
        Log.d(TAG, "Captcha dismissed by user")
        _uiState.value = AuthUiState.Idle
    }
}
