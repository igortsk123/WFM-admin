package com.beyondviolet.wfm.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Fill
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.beyondviolet.wfm.ui.theme.WfmColors
import com.beyondviolet.wfm.ui.theme.WfmSpacing
import com.beyondviolet.wfm.ui.theme.WfmTheme
import com.beyondviolet.wfm.ui.theme.WfmTypography
import kotlin.math.cos
import kotlin.math.sin
import com.beyondviolet.wfm.ui.theme.*

// MARK: - Progress Type

/**
 * Тип прогресс-бара
 */
enum class WfmProgressType {
    SOLID,      // Сплошной индикатор
    DASHED      // Сегментированный индикатор
}

// MARK: - Progress State

/**
 * Состояние прогресса
 */
enum class WfmProgressState {
    NORMAL,     // Обычное состояние (фиолетовая полоска)
    PAUSED      // На паузе (заштрихованная полоска)
}

// MARK: - WfmProgressBar

/**
 * Компонент прогресс-бара из дизайн-системы WFM
 * Figma: node-id=1900-131030
 *
 * @param progress Прогресс от 0.0 до 1.0
 * @param type Тип прогресс-бара (SOLID/DASHED)
 * @param state Состояние прогресса (NORMAL/PAUSED)
 * @param segmentCount Количество сегментов для DASHED типа (по умолчанию 5)
 * @param showText Показывать ли текст под прогресс-баром
 * @param text Текст под прогресс-баром (по умолчанию "5 основных задач")
 * @param modifier Modifier для кастомизации компонента
 */
@Composable
fun WfmProgressBar(
    progress: Float,
    type: WfmProgressType = WfmProgressType.SOLID,
    state: WfmProgressState = WfmProgressState.NORMAL,
    segmentCount: Int = 5,
    showText: Boolean = true,
    text: String? = null,
    modifier: Modifier = Modifier
) {
    val colors = WfmTheme.colors
    val clampedProgress = progress.coerceIn(0f, 1f)

    Column(
        modifier = modifier,
        verticalArrangement = Arrangement.spacedBy(WfmSpacing.XS)
    ) {
        // Прогресс-бар
        when (type) {
            WfmProgressType.SOLID -> {
                SolidProgressBar(
                    progress = clampedProgress,
                    state = state,
                    colors = colors
                )
            }
            WfmProgressType.DASHED -> {
                DashedProgressBar(
                    progress = clampedProgress,
                    state = state,
                    segmentCount = segmentCount,
                    colors = colors
                )
            }
        }

        // Текст (опционально)
        if (showText) {
            Row(
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    text = text ?: "5 основных задач",
                    style = WfmTypography.Body14Regular,
                    color = colors.indicatorsText
                )
                Spacer(modifier = Modifier.weight(1f))
            }
        }
    }
}

// MARK: - Solid Progress Bar

@Composable
private fun SolidProgressBar(
    progress: Float,
    state: WfmProgressState,
    colors: com.beyondviolet.wfm.ui.theme.WfmSemanticColors,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(4.dp)
            .clip(RoundedCornerShape(10.dp))
            .background(colors.indicatorsBgEmpty)
    ) {
        // Заполненная часть
        if (state == WfmProgressState.PAUSED) {
            // Заштрихованная полоска для паузы
            StripedProgressView(
                color = colors.indicatorsPause,
                modifier = Modifier
                    .fillMaxWidth(progress)
                    .fillMaxHeight()
                    .clip(RoundedCornerShape(10.dp))
            )
        } else {
            // Обычная фиолетовая полоска
            Box(
                modifier = Modifier
                    .fillMaxWidth(progress)
                    .fillMaxHeight()
                    .clip(RoundedCornerShape(10.dp))
                    .background(colors.indicatorsBgFilled)
            )
        }
    }
}

// MARK: - Dashed Progress Bar

@Composable
private fun DashedProgressBar(
    progress: Float,
    state: WfmProgressState,
    segmentCount: Int,
    colors: com.beyondviolet.wfm.ui.theme.WfmSemanticColors,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .height(4.dp),
        horizontalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        repeat(segmentCount) { index ->
            val segmentProgress = (index + 1).toFloat() / segmentCount.toFloat()
            val isFilled = progress >= segmentProgress

            if (state == WfmProgressState.PAUSED && isFilled) {
                // Заштрихованный сегмент для паузы
                StripedProgressView(
                    color = colors.indicatorsPause,
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxHeight()
                        .clip(RoundedCornerShape(10.dp))
                )
            } else {
                // Обычный сегмент
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxHeight()
                        .clip(RoundedCornerShape(10.dp))
                        .background(if (isFilled) colors.indicatorsBgFilled else colors.indicatorsBgEmpty)
                )
            }
        }
    }
}

// MARK: - Striped Progress View

/**
 * Заштрихованная полоска для состояния паузы
 */
@Composable
private fun StripedProgressView(
    color: Color,
    modifier: Modifier = Modifier
) {
    Canvas(modifier = modifier) {
        val width = size.width
        val height = size.height

        // Рисуем фон с прозрачностью
        drawRect(
            color = color.copy(alpha = 0.3f),
            size = size
        )

        // Параметры полосок
        val stripeWidth = 3.dp.toPx()
        val stripeSpacing = 3.dp.toPx()

        // Рисуем диагональные полоски
        val totalWidth = width + height
        var x = -height

        while (x < totalWidth) {
            val path = Path().apply {
                moveTo(x, 0f)
                lineTo(x + height, height)
                lineTo(x + height + stripeWidth, height)
                lineTo(x + stripeWidth, 0f)
                close()
            }
            drawPath(
                path = path,
                color = color,
                style = Fill
            )
            x += stripeWidth + stripeSpacing
        }
    }
}

// MARK: - Previews

@Preview(name = "Solid - Empty", showBackground = true)
@Composable
private fun PreviewSolidEmpty() {
    WfmTheme {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(WfmColors.Neutral100)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(24.dp)
        ) {
            WfmProgressBar(progress = 0f, type = WfmProgressType.SOLID, showText = true)
            WfmProgressBar(progress = 0f, type = WfmProgressType.SOLID, showText = false)
        }
    }
}

@Preview(name = "Solid - Partial", showBackground = true)
@Composable
private fun PreviewSolidPartial() {
    WfmTheme {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(WfmColors.Neutral100)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(24.dp)
        ) {
            WfmProgressBar(progress = 0.2f, type = WfmProgressType.SOLID, showText = true)
            WfmProgressBar(progress = 0.5f, type = WfmProgressType.SOLID, showText = true)
            WfmProgressBar(progress = 0.8f, type = WfmProgressType.SOLID, showText = true)
        }
    }
}

@Preview(name = "Solid - Complete", showBackground = true)
@Composable
private fun PreviewSolidComplete() {
    WfmTheme {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(WfmColors.Neutral100)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(24.dp)
        ) {
            WfmProgressBar(progress = 1.0f, type = WfmProgressType.SOLID, showText = true)
            WfmProgressBar(progress = 1.0f, type = WfmProgressType.SOLID, showText = false)
        }
    }
}

@Preview(name = "Dashed", showBackground = true)
@Composable
private fun PreviewDashed() {
    WfmTheme {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(WfmColors.Neutral100)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(24.dp)
        ) {
            WfmProgressBar(progress = 0f, type = WfmProgressType.DASHED, showText = true)
            WfmProgressBar(progress = 0.2f, type = WfmProgressType.DASHED, showText = true)
            WfmProgressBar(progress = 0.5f, type = WfmProgressType.DASHED, showText = true)
            WfmProgressBar(progress = 0.8f, type = WfmProgressType.DASHED, showText = true)
            WfmProgressBar(progress = 1.0f, type = WfmProgressType.DASHED, showText = true)
            WfmProgressBar(progress = 0.4f, type = WfmProgressType.DASHED, segmentCount = 10, showText = true, text = "4 из 10 задач")
        }
    }
}

@Preview(name = "Paused State", showBackground = true)
@Composable
private fun PreviewPausedState() {
    WfmTheme {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(WfmColors.Neutral100)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(24.dp)
        ) {
            WfmProgressBar(
                progress = 0.3f,
                type = WfmProgressType.SOLID,
                state = WfmProgressState.PAUSED,
                showText = true,
                text = "Выполнено 1 из 5 основных задач"
            )
            WfmProgressBar(
                progress = 0.5f,
                type = WfmProgressType.SOLID,
                state = WfmProgressState.PAUSED,
                showText = true,
                text = "Выполнено 1 из 5 основных задач"
            )
            WfmProgressBar(
                progress = 0.6f,
                type = WfmProgressType.DASHED,
                state = WfmProgressState.PAUSED,
                showText = true,
                text = "Выполнено 1 из 5 основных задач"
            )
        }
    }
}
