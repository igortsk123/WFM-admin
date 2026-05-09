package com.beyondviolet.wfm.deeplink

import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.asSharedFlow

/**
 * Синглтон для передачи deep link из push-уведомления в навигацию.
 * Push Messaging Service → MainActivity → AppNavigation
 */
object PushDeepLink {
    private val _taskIdFlow = MutableSharedFlow<String>(extraBufferCapacity = 1)
    val taskIdFlow = _taskIdFlow.asSharedFlow()

    suspend fun emitTaskId(taskId: String) {
        _taskIdFlow.emit(taskId)
    }
}
