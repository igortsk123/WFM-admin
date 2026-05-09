package com.beyondviolet.wfm.ui.components

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/**
 * Менеджер тостов — управляет показом/скрытием всплывающих уведомлений.
 *
 * Регистрируется в Koin как single и внедряется в ViewModel:
 * ```kotlin
 * val appModule = module {
 *     single { ToastManager() }
 * }
 * ```
 *
 * Использование из ViewModel:
 * ```kotlin
 * class HomeViewModel(private val toastManager: ToastManager) : ViewModel() {
 *     fun openShift() {
 *         toastManager.show("Смена открыта")
 *         toastManager.show("Ошибка сети", state = WfmToastState.ERROR)
 *         toastManager.show(
 *             message = "Задача назначена",
 *             type = WfmToastType.TextWithButton("Перейти") { navigate() }
 *         )
 *     }
 * }
 * ```
 */
class ToastManager {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)

    private val _current = MutableStateFlow<WfmToastData?>(null)
    val current: StateFlow<WfmToastData?> = _current.asStateFlow()

    private val _isVisible = MutableStateFlow(false)
    val isVisible: StateFlow<Boolean> = _isVisible.asStateFlow()

    private var hideJob: Job? = null

    /** Показать тост. Если уже есть активный — заменяет его. */
    fun show(
        message: String,
        type: WfmToastType = WfmToastType.Text,
        state: WfmToastState = WfmToastState.DEFAULT
    ) {
        hideJob?.cancel()
        val data = WfmToastData(message = message, type = type, state = state)

        if (_isVisible.value) {
            // Скрываем текущий, затем показываем новый
            scope.launch {
                _isVisible.value = false
                delay(200)
                _current.value = data
                _isVisible.value = true
                scheduleHide()
            }
        } else {
            _current.value = data
            _isVisible.value = true
            scheduleHide()
        }
    }

    /** Скрыть тост вручную */
    fun hide() {
        hideJob?.cancel()
        _isVisible.value = false
    }

    private fun scheduleHide() {
        hideJob = scope.launch {
            delay(3_000)
            _isVisible.value = false
        }
    }
}
