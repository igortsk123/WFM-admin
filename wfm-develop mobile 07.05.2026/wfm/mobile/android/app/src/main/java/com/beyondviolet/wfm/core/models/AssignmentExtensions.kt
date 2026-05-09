package com.beyondviolet.wfm.core.models

import com.beyondviolet.wfm.ui.components.BadgeColor

/**
 * Extension функции для Assignment
 */

/**
 * Определяет цвет badge для должности
 * Детерминированный выбор на основе position.id
 */
fun Assignment.badgeColor(): BadgeColor {
    val positionId = position?.id ?: return BadgeColor.VIOLET
    val colors = listOf(
        BadgeColor.VIOLET,
        BadgeColor.BLUE,
        BadgeColor.YELLOW,
        BadgeColor.PINK,
        BadgeColor.ORANGE,
        BadgeColor.GREEN
    )
    return colors[positionId % colors.size]
}
