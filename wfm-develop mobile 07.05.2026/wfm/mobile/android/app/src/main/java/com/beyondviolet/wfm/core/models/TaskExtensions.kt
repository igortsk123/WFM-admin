package com.beyondviolet.wfm.core.models

import com.beyondviolet.wfm.ui.components.BadgeColor
import kotlinx.datetime.toJavaInstant
import kotlin.math.ceil

/**
 * Extension функции для Task и утилиты форматирования времени/даты
 */

// ============================================================================
// MARK: - Configuration
// ============================================================================

/**
 * Work type IDs для которых показываем категорию после зоны
 */
private val workTypeIdsWithCategory: Set<Int> = setOf(4)

// ============================================================================
// MARK: - Task Extensions
// ============================================================================

/**
 * Текст для badge категории задачи (на основе workType)
 * @return Текст badge или null если workType не указан
 */
fun Task.categoryBadgeText(): String? {
    return workType?.name
}

/**
 * Цветовая схема badge категории (на основе workType.id)
 * Детерминированное назначение цвета через остаток от деления на количество цветов
 * @return Цвет для WfmBadge
 */
fun Task.categoryBadgeScheme(): BadgeColor {
    val workTypeId = workType?.id ?: return BadgeColor.BLUE // дефолт если workType не указан

    // 6 доступных цветов
    val colors = listOf(
        BadgeColor.VIOLET,
        BadgeColor.BLUE,
        BadgeColor.YELLOW,
        BadgeColor.PINK,
        BadgeColor.ORANGE,
        BadgeColor.GREEN
    )

    // Детерминированно выбираем цвет на основе остатка от деления
    return colors[workTypeId % colors.size]
}

/**
 * Название зоны для отображения в карточке задачи
 * @return Название зоны или "N/A" если зона не указана
 */
fun Task.zoneDisplayName(): String {
    return zone?.name ?: "N/A"
}

/**
 * Нужно ли показывать категорию после зоны
 * @return true если workType.id входит в список workTypeIdsWithCategory
 */
fun Task.shouldShowCategory(): Boolean {
    val workTypeId = workType?.id ?: return false
    return workTypeId in workTypeIdsWithCategory
}

/**
 * Название зоны с категорией (если применимо)
 * @return "Зона • Категория" если shouldShowCategory() == true, иначе просто название зоны
 */
fun Task.zoneWithCategoryDisplayName(): String {
    val zoneName = zone?.name ?: "N/A"

    if (!shouldShowCategory()) {
        return zoneName
    }

    val categoryName = category?.name ?: return zoneName
    return "$zoneName • $categoryName"
}

/**
 * Форматированное время для отображения в карточке задачи
 * @return Строка вида "8:00-9:00 (1 час)" или "120 мин" если timeStart/timeEnd не указаны
 */
fun Task.formattedTimeRange(): String {
    // Если есть timeStart и timeEnd — показываем диапазон с длительностью
    val start = timeStart
    val end = timeEnd
    if (start != null && end != null) {
        val startFormatted = formatTime(start)
        val endFormatted = formatTime(end)
        val duration = formatDuration(safePlannedMinutes())
        return "$startFormatted-$endFormatted ($duration)"
    }

    // Иначе показываем только длительность
    return formatDuration(safePlannedMinutes())
}

/**
 * Только длительность задачи без диапазона времени
 * @return Строка вида "30 мин", "1 час", "2 часа 15 мин"
 */
fun Task.durationOnly(): String {
    return formatDuration(safePlannedMinutes())
}

// ============================================================================
// MARK: - Time Formatting Functions
// ============================================================================

/**
 * Форматирует время из "HH:MM:SS" в "H:MM" (убирает ведущий ноль и секунды)
 * @param timeString Время в формате "HH:MM:SS"
 * @return Время в формате "H:MM"
 */
fun formatTime(timeString: String): String {
    val components = timeString.split(":")
    if (components.size < 2) return timeString

    val hour = components[0].toIntOrNull() ?: return timeString
    val minute = components[1].toIntOrNull() ?: return timeString

    return String.format("%d:%02d", hour, minute)
}

/**
 * Форматирует Instant в формат "HH:mm"
 * @param instant Instant для форматирования
 * @return Время в формате "14:30" или "--:--" если instant == null
 */
fun formatTime(instant: kotlinx.datetime.Instant?): String {
    return instant?.let {
        val date = java.util.Date.from(it.toJavaInstant())
        java.text.SimpleDateFormat("HH:mm", java.util.Locale("ru", "RU")).format(date)
    } ?: "--:--"
}

/**
 * Парсит время из "HH:MM:SS" в минуты от начала дня
 * @param timeString Время в формате "HH:MM:SS"
 * @return Количество минут от начала дня, или -1 если парсинг не удался
 */
fun parseTimeToMinutes(timeString: String): Int {
    val parts = timeString.split(":")
    val h = parts.getOrNull(0)?.toIntOrNull() ?: return -1
    val m = parts.getOrNull(1)?.toIntOrNull() ?: 0
    return h * 60 + m
}

/**
 * Форматирует время смены с длительностью
 * @param start Время начала в формате "HH:MM:SS"
 * @param end Время окончания в формате "HH:MM:SS"
 * @return Строка вида "8:00-20:00 (12 часов)"
 */
fun formatShiftTime(start: String, end: String): String {
    if (start.isEmpty() || end.isEmpty()) return ""

    val startFormatted = formatTime(start)
    val endFormatted = formatTime(end)

    // Вычисляем длительность
    val startMin = parseTimeToMinutes(start)
    val endMin = parseTimeToMinutes(end)

    if (startMin == -1 || endMin == -1) {
        return "$startFormatted-$endFormatted"
    }

    val durationMin = if (endMin >= startMin) {
        endMin - startMin
    } else {
        24 * 60 - startMin + endMin
    }

    val duration = formatDuration(durationMin)

    return "$startFormatted-$endFormatted ($duration)"
}

/**
 * Вычисляет и форматирует длительность смены
 * @param shift Текущая смена
 * @return Длительность в формате "12 часов", "8 часов 30 мин" или пустая строка
 */
fun formatShiftDuration(shift: CurrentShift?): String {
    val start = shift?.startTime ?: return ""
    val end = shift.endTime ?: return ""
    val startMin = parseTimeToMinutes(start)
    val endMin = parseTimeToMinutes(end)

    if (startMin == -1 || endMin == -1) return ""

    val diff = if (endMin >= startMin) endMin - startMin else (24 * 60 - startMin + endMin)
    return formatDuration(diff)
}

// ============================================================================
// MARK: - Duration Formatting Functions
// ============================================================================

/**
 * Форматирует длительность в минутах в читаемый вид
 * @param minutes Длительность в минутах
 * @return "2 часа", "1 час 30 мин", "45 мин"
 */
fun formatDuration(minutes: Int): String {
    if (minutes < 60) {
        return "$minutes мин"
    }

    val hours = minutes / 60
    val remainingMinutes = minutes % 60

    return if (remainingMinutes == 0) {
        pluralizeHours(hours)
    } else {
        "${pluralizeHours(hours)} $remainingMinutes мин"
    }
}

/**
 * Форматирует длительность из секунд в читаемый вид
 * @param seconds Длительность в секундах
 * @return "2 ч 30 мин", "1 ч", "45 мин" или "0 мин" если seconds == null
 */
fun formatDurationFromSeconds(seconds: Int?): String {
    if (seconds == null || seconds <= 0) return "0 мин"

    // Округляем минуты вверх
    val totalMinutes = ceil(seconds / 60.0).toInt()
    val hours = totalMinutes / 60
    val minutes = totalMinutes % 60

    return when {
        hours > 0 && minutes > 0 -> "$hours ч $minutes мин"
        hours > 0 -> "$hours ч"
        else -> "$minutes мин"
    }
}

// ============================================================================
// MARK: - Date Formatting Functions
// ============================================================================

/**
 * Форматирует текущую дату в формат "EE, d MMMM yyyy" (например, "Пн, 30 марта 2026")
 * @return Отформатированная текущая дата
 */
fun formatCurrentDate(): String {
    val dateFormat = java.text.SimpleDateFormat("EE, d MMMM yyyy", java.util.Locale("ru", "RU"))
    return dateFormat.format(java.util.Date())
}

// ============================================================================
// MARK: - Private Helpers
// ============================================================================

/**
 * Плюрализация для часов (1 час, 2 часа, 5 часов)
 */
private fun pluralizeHours(hours: Int): String {
    val lastDigit = hours % 10
    val lastTwoDigits = hours % 100

    if (lastTwoDigits in 11..14) {
        return "$hours часов"
    }

    return when (lastDigit) {
        1 -> "$hours час"
        in 2..4 -> "$hours часа"
        else -> "$hours часов"
    }
}

// ============================================================================
// MARK: - PermissionType Extension
// ============================================================================

/**
 * Текст для отображения в badge (краткая форма для категории задачи)
 */
fun PermissionType.badgeText(): String {
    return when (this) {
        PermissionType.CASHIER -> "Касса"
        PermissionType.SALES_FLOOR -> "Торговый зал"
        PermissionType.SELF_CHECKOUT -> "Касса самообслуживания"
        PermissionType.WAREHOUSE -> "Склад"
    }
}
