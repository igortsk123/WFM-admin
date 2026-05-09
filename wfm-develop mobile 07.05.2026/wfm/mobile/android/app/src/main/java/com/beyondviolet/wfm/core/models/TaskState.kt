package com.beyondviolet.wfm.core.models

import androidx.compose.ui.graphics.Color
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Enum состояния задачи на основе спецификации Memory Bank
 * Разрешенные переходы:
 * - NEW → IN_PROGRESS
 * - IN_PROGRESS → PAUSED
 * - PAUSED → IN_PROGRESS
 * - IN_PROGRESS → COMPLETED
 */
@Serializable
enum class TaskState {
    @SerialName("NEW")
    NEW,

    @SerialName("IN_PROGRESS")
    IN_PROGRESS,

    @SerialName("PAUSED")
    PAUSED,

    @SerialName("COMPLETED")
    COMPLETED;

    val displayName: String
        get() = when (this) {
            NEW -> "Новая"
            IN_PROGRESS -> "В работе"
            PAUSED -> "Приостановлена"
            COMPLETED -> "Завершена"
        }

    val color: Color
        get() = when (this) {
            NEW -> Color(0xFF2196F3) // Blue
            IN_PROGRESS -> Color(0xFF4CAF50) // Green
            PAUSED -> Color(0xFFFF9800) // Orange
            COMPLETED -> Color(0xFF9E9E9E) // Gray
        }

    /**
     * Возвращает разрешенные следующие состояния на основе текущего состояния
     */
    val allowedTransitions: List<TaskState>
        get() = when (this) {
            NEW -> listOf(IN_PROGRESS)
            IN_PROGRESS -> listOf(PAUSED, COMPLETED)
            PAUSED -> listOf(IN_PROGRESS)
            COMPLETED -> emptyList()
        }

    /**
     * Проверяет, допустим ли переход к другому состоянию
     */
    fun canTransitionTo(newState: TaskState): Boolean {
        return allowedTransitions.contains(newState)
    }
}
