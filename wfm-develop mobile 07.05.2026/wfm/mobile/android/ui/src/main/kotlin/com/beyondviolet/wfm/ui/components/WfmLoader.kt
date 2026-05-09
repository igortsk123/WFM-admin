package com.beyondviolet.wfm.ui.components

import androidx.compose.animation.animateColor
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.beyondviolet.wfm.ui.theme.WfmColors

/**
 * Лоадер с анимированными точками
 *
 * Компонент отображает три точки с циклической сменой цветов.
 * Используется для индикации загрузки данных.
 *
 * Анимация:
 * - 3 кружка меняют цвета циклически
 * - Создается эффект "волны" цветов
 *
 * Пример:
 * ```kotlin
 * WfmLoader()
 * ```
 */
@Composable
fun WfmLoader(
    modifier: Modifier = Modifier
) {
    // Цвета из дизайн-системы (Brand/500, Brand/200, Brand/100)
    val colors = listOf(
        WfmColors.Brand500, // Brand500 - темный фиолетовый
        WfmColors.Brand200, // Brand200 - средний фиолетовый
        WfmColors.Brand100  // Brand100 - светлый фиолетовый
    )

    Row(
        modifier = modifier,
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        AnimatedDot(colors = colors, offset = 0)
        AnimatedDot(colors = colors, offset = 1)
        AnimatedDot(colors = colors, offset = 2)
    }
}

@Composable
private fun AnimatedDot(
    colors: List<Color>,
    offset: Int
) {
    val infiniteTransition = rememberInfiniteTransition(label = "dot_color_animation")

    // Анимация смены цветов по циклу
    val animatedColor by infiniteTransition.animateColor(
        initialValue = colors[offset % colors.size],
        targetValue = colors[(offset + 1) % colors.size],
        animationSpec = infiniteRepeatable(
            animation = keyframes {
                durationMillis = 900 // Полный цикл 3 цветов по 600ms каждый
                colors[(offset + 0) % colors.size] at 0 using FastOutSlowInEasing
                colors[(offset + 1) % colors.size] at 300 using FastOutSlowInEasing
                colors[(offset + 2) % colors.size] at 600 using FastOutSlowInEasing
                colors[(offset + 0) % colors.size] at 900 using FastOutSlowInEasing
            },
            repeatMode = RepeatMode.Restart
        ),
        label = "color"
    )

    Box(
        modifier = Modifier
            .size(10.dp)
            .background(
                color = animatedColor,
                shape = CircleShape
            )
    )
}

// MARK: - Preview

@Preview(name = "WfmLoader - Light", showBackground = true)
@Composable
private fun WfmLoaderPreviewLight() {
    WfmLoader()
}

@Preview(name = "WfmLoader - Dark", showBackground = true, backgroundColor = 0xFF373742)
@Composable
private fun WfmLoaderPreviewDark() {
    WfmLoader()
}
