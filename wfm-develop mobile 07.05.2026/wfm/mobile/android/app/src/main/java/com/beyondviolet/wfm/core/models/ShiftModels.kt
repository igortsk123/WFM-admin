package com.beyondviolet.wfm.core.models

import com.beyondviolet.wfm.core.serialization.InstantSerializer
import kotlinx.datetime.Instant
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

// MARK: - Статус смены

/**
 * Статус смены
 */
@Serializable
enum class ShiftStatus {
    @SerialName("NEW")
    NEW,        // Смена из shifts_plan (ещё не открыта)

    @SerialName("OPENED")
    OPENED,     // Смена открыта (shifts_fact, closed_at = NULL)

    @SerialName("CLOSED")
    CLOSED      // Смена закрыта (shifts_fact, closed_at IS NOT NULL)
}

/**
 * Получить отображаемое имя статуса
 */
fun ShiftStatus.displayName(): String = when (this) {
    ShiftStatus.NEW -> "Запланирована"
    ShiftStatus.OPENED -> "Открыта"
    ShiftStatus.CLOSED -> "Закрыта"
}

/**
 * Проверить, активна ли смена
 */
fun ShiftStatus.isActive(): Boolean = this == ShiftStatus.OPENED

// MARK: - Магазин (для shifts API)

/**
 * Магазин (из shifts API)
 */
@Serializable
data class ShiftStore(
    val id: Int,
    val name: String,
    val address: String? = null,
    @SerialName("created_at")
    @Serializable(with = InstantSerializer::class)
    val createdAt: Instant
)

// MARK: - Смена

/**
 * Текущая смена (объединённый ответ из shifts_fact или shifts_plan)
 */
@Serializable
data class CurrentShift(
    val id: Int,
    @SerialName("plan_id")
    val planId: Int? = null,
    val status: ShiftStatus,
    @SerialName("assignment_id")
    val assignmentId: Int,

    // Время для OPENED/CLOSED (из shifts_fact)
    @SerialName("opened_at")
    @Serializable(with = InstantSerializer::class)
    val openedAt: Instant? = null,
    @SerialName("closed_at")
    @Serializable(with = InstantSerializer::class)
    val closedAt: Instant? = null,

    // Время для NEW (из shifts_plan)
    @SerialName("shift_date")
    val shiftDate: String? = null,      // YYYY-MM-DD
    @SerialName("start_time")
    val startTime: String? = null,      // HH:MM:SS
    @SerialName("end_time")
    val endTime: String? = null,        // HH:MM:SS

    @SerialName("external_id")
    val externalId: Int? = null,
    val duration: Int? = null,          // Длительность в часах из LAMA
    val store: ShiftStore? = null
) {
    /**
     * Фактическая длительность смены в миллисекундах (для закрытых смен)
     */
    fun elapsedDuration(): Long? {
        val opened = openedAt ?: return null
        val closed = closedAt ?: return null
        return closed.toEpochMilliseconds() - opened.toEpochMilliseconds()
    }

    /**
     * Текущее время работы в миллисекундах (для открытых смен)
     */
    fun currentDuration(): Long? {
        val opened = openedAt ?: return null
        if (closedAt != null) return null
        return kotlinx.datetime.Clock.System.now().toEpochMilliseconds() - opened.toEpochMilliseconds()
    }

    /**
     * Отформатированная фактическая длительность смены (HH:MM)
     */
    fun formattedElapsedDuration(): String? {
        val elapsed = elapsedDuration() ?: return null
        val hours = (elapsed / (1000 * 60 * 60)).toInt()
        val minutes = ((elapsed / (1000 * 60)) % 60).toInt()
        return String.format("%02d:%02d", hours, minutes)
    }

    /**
     * Отформатированное текущее время работы (HH:MM)
     */
    fun formattedCurrentDuration(): String? {
        val current = currentDuration() ?: return null
        val hours = (current / (1000 * 60 * 60)).toInt()
        val minutes = ((current / (1000 * 60)) % 60).toInt()
        return String.format("%02d:%02d", hours, minutes)
    }
}

// MARK: - Request модели

/**
 * Request для открытия смены
 */
@Serializable
data class ShiftOpenRequest(
    @SerialName("plan_id")
    val planId: Int
)

/**
 * Request для закрытия смены
 */
@Serializable
data class ShiftCloseRequest(
    @SerialName("plan_id")
    val planId: Int,
    @SerialName("force")
    val force: Boolean = false
)

// MARK: - Response модели

/**
 * Response со списком магазинов
 */
@Serializable
data class StoresListResponse(
    val stores: List<ShiftStore>
)

/**
 * Request для создания магазина
 */
@Serializable
data class StoreCreateRequest(
    val name: String,
    val address: String? = null
)

/**
 * Request для обновления магазина
 */
@Serializable
data class StoreUpdateRequest(
    val name: String? = null,
    val address: String? = null
)
