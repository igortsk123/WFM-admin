package com.beyondviolet.wfm.features.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.beyondviolet.wfm.core.analytics.AnalyticsEvent
import com.beyondviolet.wfm.core.analytics.AnalyticsService
import com.beyondviolet.wfm.core.managers.ImpersonationStorage
import com.beyondviolet.wfm.core.managers.UserManager
import com.beyondviolet.wfm.core.network.UserService
import com.beyondviolet.wfm.core.network.ApiResponse
import com.beyondviolet.wfm.core.models.Assignment
import com.beyondviolet.wfm.core.models.CurrentShift
import com.beyondviolet.wfm.core.models.ShiftStatus
import com.beyondviolet.wfm.core.models.UserMe
import com.beyondviolet.wfm.feature.auth.data.local.TokenStorage
import com.beyondviolet.wfm.ui.components.ToastManager
import com.beyondviolet.wfm.ui.components.WfmToastState
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

/**
 * ViewModel для экрана настроек (профиля пользователя)
 *
 * Управляет состоянием профиля:
 * - Данные текущего пользователя (ФИО, фото, должность)
 * - Загрузка данных
 * - Обновление данных (Pull-to-Refresh)
 * - Выход из аккаунта (logout)
 * - Переключение между назначениями
 * - Режим «Войти как» (impersonation, только для разработчиков с flags.dev в JWT)
 */
open class SettingsViewModel(
    private val userManager: UserManager,
    private val toastManager: ToastManager,
    private val tokenStorage: TokenStorage,
    private val impersonationStorage: ImpersonationStorage,
    private val analyticsService: AnalyticsService,
    private val userService: UserService
) : ViewModel() {

    /**
     * Текущий пользователь
     */
    open val currentUser: StateFlow<UserMe?> = userManager.currentUser
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = null
        )

    /**
     * Текущий выбранный assignment
     */
    open val currentAssignment: StateFlow<Assignment?> = userManager.currentAssignment
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = null
        )

    /**
     * Текущая смена
     */
    open val currentShift: StateFlow<CurrentShift?> = userManager.currentShift
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = null
        )

    /**
     * Индикатор загрузки
     */
    open val isLoading: StateFlow<Boolean> = userManager.isLoading
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = false
        )

    /**
     * Индикатор обновления (Pull-to-Refresh)
     */
    open val isRefreshing: StateFlow<Boolean> = userManager.isLoading
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = false
        )

    /**
     * Есть ли у текущего пользователя флаг flags.dev в JWT
     */
    private val _isDevUser = MutableStateFlow(false)
    val isDevUser: StateFlow<Boolean> = _isDevUser.asStateFlow()

    /**
     * Активный номер телефона для impersonation (null — режим выключен)
     */
    val impersonationPhone: StateFlow<String?> = impersonationStorage.phone

    /**
     * Индикатор загрузки при удалении аккаунта
     */
    private val _isDeleting = MutableStateFlow(false)
    open val isDeleting: StateFlow<Boolean> = _isDeleting.asStateFlow()

    init {
        viewModelScope.launch {
            val token = tokenStorage.getAccessToken()
            if (token != null) {
                _isDevUser.value = impersonationStorage.isDevUser(token)
            }
        }
    }

    /**
     * Задать номер телефона для impersonation («Войти как»).
     * Пустая строка или null — сбрасывает режим impersonation.
     */
    fun setImpersonationPhone(phone: String?) {
        impersonationStorage.setPhone(phone)
    }

    /**
     * Показывать ли кнопку "Назначения"
     */
    fun shouldShowAssignmentsButton(): Boolean {
        val user = currentUser.value ?: return false
        return user.assignments.size > 1
    }

    /**
     * Можно ли переключаться между назначениями (смена должна быть не открыта)
     */
    fun canSwitchAssignments(): Boolean {
        return currentShift.value?.status != ShiftStatus.OPENED
    }

    /**
     * Проверить возможность переключения назначений
     * Показывает тост если смена открыта
     */
    fun checkCanSwitchAssignments(): Boolean {
        if (!canSwitchAssignments()) {
            toastManager.show("Сначала закройте текущую смену.", state = WfmToastState.ERROR)
            return false
        }
        return true
    }

    /**
     * Переключить текущий assignment
     *
     * Сохраняет выбранный assignment ID и перезагружает данные
     */
    suspend fun switchAssignment(assignmentId: Int) {
        userManager.switchAssignment(assignmentId)
    }

    /**
     * Обновить данные пользователя (Pull-to-Refresh)
     */
    open fun refresh() {
        viewModelScope.launch {
            userManager.refresh()
            val error = userManager.error.value
            if (error != null) {
                toastManager.show(error, state = WfmToastState.ERROR)
            }
        }
    }

    /**
     * Вызывается при появлении экрана
     *
     * Трекает аналитику и обновляет данные пользователя
     */
    fun onAppear() {
        analyticsService.track(AnalyticsEvent.SettingsViewed)
        refresh()
    }

    /**
     * Удалить учётную запись текущего пользователя
     *
     * Вызывает svc_users DELETE /users/me → Beyond Violet Shopping API.
     * onSuccess вызывается после успешного удаления — навигация на экран авторизации.
     * onError вызывается с текстом ошибки при неудаче.
     */
    open fun deleteAccount(onSuccess: () -> Unit, onError: (String) -> Unit) {
        viewModelScope.launch {
            _isDeleting.value = true
            val result = userService.deleteAccount()
            _isDeleting.value = false
            when (result) {
                is ApiResponse.Success -> {
                    viewModelScope.launch { userManager.clear() }
                    onSuccess()
                }
                is ApiResponse.Error -> {
                    onError(result.message ?: "Не удалось удалить аккаунт. Попробуйте позже или обратитесь в поддержку.")
                }
            }
        }
    }

    /**
     * Выход из аккаунта
     *
     * Очищает данные пользователя.
     * Навигация к экрану авторизации выполняется в UI.
     */
    open fun logout() {
        analyticsService.track(AnalyticsEvent.LogoutTapped)
        analyticsService.resetUser()
        impersonationStorage.setPhone(null) // Очищаем режим "Войти как"
        viewModelScope.launch {
            userManager.clear()
        }
    }
}
