package com.beyondviolet.wfm.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.beyondviolet.wfm.ui.theme.WfmColors
import com.beyondviolet.wfm.ui.theme.WfmRadius
import com.beyondviolet.wfm.ui.theme.WfmSpacing
import com.beyondviolet.wfm.ui.theme.WfmTheme
import com.beyondviolet.wfm.ui.theme.WfmTypography
import com.beyondviolet.wfm.ui.theme.*

/**
 * Цвета бейджа
 */
enum class BadgeColor {
    VIOLET,
    BLUE,
    YELLOW,
    PINK,
    ORANGE,
    GREEN;

    fun backgroundColor(colors: com.beyondviolet.wfm.ui.theme.WfmSemanticColors): Color = when (this) {
        VIOLET -> colors.badgeBrandBgLight
        BLUE -> colors.badgeBlueBgLight
        YELLOW -> colors.badgeYellowBgLight
        PINK -> colors.badgePinkBgLight
        ORANGE -> colors.badgeOrangeBgLight
        GREEN -> colors.badgeGreenBgLight
    }

    fun textColor(colors: com.beyondviolet.wfm.ui.theme.WfmSemanticColors): Color = when (this) {
        VIOLET -> colors.badgeBrandTextBright
        BLUE -> colors.badgeBlueTextBright
        YELLOW -> colors.badgeYellowTextBright
        PINK -> colors.badgePinkTextBright
        ORANGE -> colors.badgeOrangeTextBright
        GREEN -> colors.badgeGreenTextBright
    }
}

/**
 * Тип иконки в бейдже
 */
enum class BadgeIcon {
    NONE,      // Без иконки
    DOT,       // Точка слева
    THUNDER    // Иконка молнии слева (для бонусов)
}

/**
 * Компонент Badge дизайн-системы WFM
 *
 * Используется для отображения статусов, категорий, бонусов и других меток.
 *
 * @param text Текст бейджа
 * @param color Цвет бейджа (определяет фон и цвет текста)
 * @param modifier Modifier
 * @param icon Тип иконки (NONE, DOT, THUNDER)
 */
@Composable
fun WfmBadge(
    text: String,
    color: BadgeColor,
    modifier: Modifier = Modifier,
    icon: BadgeIcon = BadgeIcon.NONE
) {
    val colors = WfmTheme.colors

    Row(
        modifier = modifier
            .background(
                color = color.backgroundColor(colors),
                shape = RoundedCornerShape(WfmRadius.S)
            )
            .padding(
                horizontal = WfmSpacing.XS,
                vertical = WfmSpacing.XXXS
            ),
        horizontalArrangement = Arrangement.spacedBy(
            if (icon == BadgeIcon.NONE) 0.dp else WfmSpacing.XXXS
        ),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Иконка (если есть)
        when (icon) {
            BadgeIcon.DOT -> {
                Box(
                    modifier = Modifier
                        .size(4.dp)
                        .background(
                            color = color.textColor(colors),
                            shape = CircleShape
                        )
                )
            }
            BadgeIcon.THUNDER -> {
                // TODO: Добавить иконку молнии (нужно экспортировать из Figma)
                // Временно используем заглушку
                Box(
                    modifier = Modifier
                        .size(16.dp)
                        .background(
                            color = color.textColor(colors),
                            shape = CircleShape
                        )
                )
            }
            BadgeIcon.NONE -> {
                // Без иконки
            }
        }

        // Текст
        Text(
            text = text,
            style = WfmTypography.Headline12Medium,
            color = color.textColor(colors),
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// PREVIEWS
// ═══════════════════════════════════════════════════════════════════════════

@Preview(name = "Badge - Violet (Выкладка)", showBackground = true, backgroundColor = 0xFFF5F5FC)
@Composable
private fun WfmBadgeVioletPreview() {
    WfmTheme {
        WfmBadge(
            text = "Выкладка",
            color = BadgeColor.VIOLET
        )
    }
}

@Preview(name = "Badge - Blue (Работа на кассе)", showBackground = true, backgroundColor = 0xFFF5F5FC)
@Composable
private fun WfmBadgeCashierPreview() {
    WfmTheme {
        WfmBadge(
            text = "Работа на кассе",
            color = BadgeColor.BLUE
        )
    }
}

@Preview(name = "Badge - Yellow (Смена ценников)", showBackground = true, backgroundColor = 0xFFF5F5FC)
@Composable
private fun WfmBadgeYellowPreview() {
    WfmTheme {
        WfmBadge(
            text = "Смена ценников",
            color = BadgeColor.YELLOW
        )
    }
}

@Preview(name = "Badge - Pink (Другие работы)", showBackground = true, backgroundColor = 0xFFF5F5FC)
@Composable
private fun WfmBadgePinkPreview() {
    WfmTheme {
        WfmBadge(
            text = "Другие работы",
            color = BadgeColor.PINK
        )
    }
}

@Preview(name = "Badge - Orange (Другие работы)", showBackground = true, backgroundColor = 0xFFF5F5FC)
@Composable
private fun WfmBadgeOrangePreview() {
    WfmTheme {
        WfmBadge(
            text = "Другие работы",
            color = BadgeColor.ORANGE
        )
    }
}

@Preview(name = "Badge - Green (Другие работы)", showBackground = true, backgroundColor = 0xFFF5F5FC)
@Composable
private fun WfmBadgeGreenPreview() {
    WfmTheme {
        WfmBadge(
            text = "Другие работы",
            color = BadgeColor.GREEN
        )
    }
}

@Preview(name = "Badge - Orange + Thunder (Бонус)", showBackground = true, backgroundColor = 0xFFF5F5FC)
@Composable
private fun WfmBadgeBonusPreview() {
    WfmTheme {
        WfmBadge(
            text = "Бонус 300 ₽",
            color = BadgeColor.ORANGE,
            icon = BadgeIcon.THUNDER
        )
    }
}

@Preview(name = "Badge - Blue + Dot (Создано)", showBackground = true, backgroundColor = 0xFFF5F5FC)
@Composable
private fun WfmBadgeCreatedPreview() {
    WfmTheme {
        WfmBadge(
            text = "Создано",
            color = BadgeColor.BLUE,
            icon = BadgeIcon.DOT
        )
    }
}
