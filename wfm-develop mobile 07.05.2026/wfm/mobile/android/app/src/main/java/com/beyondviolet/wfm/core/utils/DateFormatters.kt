package com.beyondviolet.wfm.core.utils

import java.text.SimpleDateFormat
import java.util.Locale

/**
 * Форматтеры для работы с датами смен
 */
object DateFormatters {
    /**
     * Форматирует дату смены из ISO формата в русский формат
     * @param dateString Дата в формате "YYYY-MM-DD" (например, "2025-02-12")
     * @return Дата в формате "12 февраля 2025"
     */
    fun formatShiftDate(dateString: String): String {
        if (dateString.isEmpty()) return ""

        return try {
            val inputFormatter = SimpleDateFormat("yyyy-MM-dd", Locale("ru", "RU"))
            val date = inputFormatter.parse(dateString) ?: return dateString

            val outputFormatter = SimpleDateFormat("d MMMM yyyy", Locale("ru", "RU"))
            outputFormatter.format(date)
        } catch (e: Exception) {
            dateString
        }
    }
}
