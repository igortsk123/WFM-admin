package com.beyondviolet.wfm.ui.components

import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.IntSize
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.beyondviolet.wfm.ui.theme.WfmRadius
import com.beyondviolet.wfm.ui.theme.WfmSpacing
import com.beyondviolet.wfm.ui.theme.WfmTheme
import com.beyondviolet.wfm.ui.theme.WfmTypography
import com.beyondviolet.wfm.ui.theme.*

/**
 * Segmented Control дизайн-системы WFM
 *
 * @param selectedIndex Индекс выбранного сегмента
 * @param options Список опций
 * @param onSelectionChange Callback при изменении выбора
 * @param modifier Modifier
 * @param height Опциональная высота компонента в dp (если null - используется стандартный padding)
 */
@Composable
fun WfmSegmentedControl(
    selectedIndex: Int,
    options: List<String>,
    onSelectionChange: (Int) -> Unit,
    modifier: Modifier = Modifier,
    height: androidx.compose.ui.unit.Dp? = null
) {
    val colors = WfmTheme.colors
    val density = LocalDensity.current
    var containerSize by remember { mutableStateOf(IntSize.Zero) }

    val segmentWidth = with(density) { (containerSize.width / options.size).toDp() }
    val offsetX by animateDpAsState(
        targetValue = segmentWidth * selectedIndex,
        animationSpec = tween(durationMillis = 200),
        label = "offsetX"
    )

    Box(
        modifier = modifier
            .then(height?.let { Modifier.height(it) } ?: Modifier)
            .background(
                color = colors.segmentedControlBg,
                shape = RoundedCornerShape(WfmRadius.M)
            )
            .border(
                width = 1.dp,
                color = colors.segmentedControlBorder,
                shape = RoundedCornerShape(WfmRadius.M)
            )
            .padding(horizontal = WfmSpacing.XXXS)
            .onSizeChanged { containerSize = it }
    ) {
        // Анимированный индикатор (позади текста)
        if (containerSize.width > 0) {
            Box(
                modifier = Modifier
                    .size(width = segmentWidth, height = with(density) { containerSize.height.toDp() })
                    .offset(x = offsetX)
            ) {
                Box(
                    modifier = Modifier
                        .matchParentSize()
                        .background(
                            color = colors.segmentedControlBgControlActive,
                            shape = RoundedCornerShape(WfmRadius.S)
                        )
                )
            }
        }

        // Текст сегментов (впереди)
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            options.forEachIndexed { index, option ->
                val isSelected = index == selectedIndex

                Box(
                    modifier = Modifier
                        .weight(1f)
                        .then(height?.let { Modifier.fillMaxHeight() } ?: Modifier)
                        .clip(RoundedCornerShape(WfmRadius.S))
                        .clickable(
                            interactionSource = remember { MutableInteractionSource() },
                            indication = null
                        ) { onSelectionChange(index) }
                        .padding(
                            horizontal = WfmSpacing.M,
                            vertical = WfmSpacing.XS
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = option,
                        style = WfmTypography.Body14Regular,
                        color = if (isSelected) colors.segmentedControlTextActive else colors.segmentedControlTextDefault,
                        textAlign = TextAlign.Center
                    )
                }
            }
        }
    }
}

@Preview(showBackground = true, backgroundColor = 0xFFF5F5FC)
@Composable
private fun WfmSegmentedControlPreview() {
    WfmTheme {
        WfmSegmentedControl(
            selectedIndex = 0,
            options = listOf("Telegram", "MAX", "Звонок"),
            onSelectionChange = {}
        )
    }
}
