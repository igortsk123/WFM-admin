package com.beyondviolet.wfm.feature.auth.deeplink

import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow

/**
 * Singleton для передачи deep link событий между компонентами
 *
 * Используется для передачи кода авторизации из MainActivity в CodeInputScreen
 */
object DeepLinkEvent {
    private val _authCodeReceived = MutableSharedFlow<String>(replay = 1)

    /**
     * Flow для подписки на получение кода авторизации
     */
    val authCodeReceived: SharedFlow<String> = _authCodeReceived.asSharedFlow()

    /**
     * Отправить код авторизации (suspend версия)
     */
    suspend fun emitAuthCode(code: String) {
        _authCodeReceived.emit(code)
    }

    /**
     * Отправить код авторизации (non-blocking версия)
     */
    fun tryEmitAuthCode(code: String): Boolean {
        return _authCodeReceived.tryEmit(code)
    }
}
