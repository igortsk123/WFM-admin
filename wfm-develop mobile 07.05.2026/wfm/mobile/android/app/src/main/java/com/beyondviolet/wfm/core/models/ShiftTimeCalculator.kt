package com.beyondviolet.wfm.core.models

import kotlinx.datetime.toJavaInstant
import java.text.SimpleDateFormat
import java.util.Locale

/**
 * Утилита для расчета времени смен
 *
 * Содержит все функции для форматирования и расчета времени:
 * - Определение опоздания на смену
 * - Парсинг времени начала/конца смены
 * - Форматирование сообщений о времени
 */
object ShiftTimeCalculator {

    /**
     * Определить, опаздывает ли пользователь на смену
     */
    fun isShiftLate(shift: CurrentShift, now: Long = System.currentTimeMillis()): Boolean {
        return (shiftStartMillis(shift) ?: return false) < now
    }

    /**
     * Получить время начала смены в миллисекундах
     */
    fun shiftStartMillis(shift: CurrentShift): Long? {
        val dateStr = shift.shiftDate ?: return null
        val timeStr = shift.startTime ?: return null
        return try {
            SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault())
                .parse("$dateStr ${timeStr.take(8)}")?.time
        } catch (e: Exception) {
            null
        }
    }

    /**
     * Получить время конца смены в миллисекундах
     */
    fun shiftEndMillis(shift: CurrentShift): Long? {
        val timeStr = shift.endTime ?: return null
        val dateStr = shift.shiftDate
            ?: shift.openedAt?.toJavaInstant()
                ?.atZone(java.time.ZoneId.systemDefault())
                ?.toLocalDate()
                ?.toString()
            ?: return null
        return try {
            SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault())
                .parse("$dateStr ${timeStr.take(8)}")?.time
        } catch (e: Exception) {
            null
        }
    }

    /**
     * Форматировать количество минут до начала смены
     *
     * Примеры:
     * - 0 мин → "Начинается сейчас"
     * - 30 мин → "Начнется через 30 мин"
     * - 90 мин → "Начнется через 1 ч 30 мин"
     */
    fun formatMinutesUntil(minutes: Int): String {
        if (minutes == 0) return "Начинается сейчас"
        val h = minutes / 60
        val m = minutes % 60
        return when {
            h == 0 -> "Начнется через $m мин"
            m == 0 -> "Начнется через $h ч"
            else -> "Начнется через $h ч $m мин"
        }
    }

    /**
     * Форматировать количество минут опоздания
     *
     * Примеры:
     * - 0 мин → "Вы опаздываете"
     * - 15 мин → "Вы опаздываете на 15 мин"
     * - 75 мин → "Вы опаздываете на 1 ч 15 мин"
     */
    fun formatMinutesLate(minutes: Int): String {
        if (minutes == 0) return "Вы опаздываете"
        val h = minutes / 60
        val m = minutes % 60
        return when {
            h == 0 -> "Вы опаздываете на $m мин"
            m == 0 -> "Вы опаздываете на $h ч"
            else -> "Вы опаздываете на $h ч $m мин"
        }
    }

    /**
     * Форматировать оставшееся время до конца смены
     *
     * Примеры:
     * - 0 мин → "Смена заканчивается"
     * - 45 мин → "До конца смены 45 мин"
     * - 120 мин → "До конца смены 2 ч"
     */
    fun formatMinutesLeft(minutes: Int): String {
        if (minutes == 0) return "Смена заканчивается"
        val h = minutes / 60
        val m = minutes % 60
        return when {
            h == 0 -> "До конца смены $m мин"
            m == 0 -> "До конца смены $h ч"
            else -> "До конца смены $h ч $m мин"
        }
    }
}
