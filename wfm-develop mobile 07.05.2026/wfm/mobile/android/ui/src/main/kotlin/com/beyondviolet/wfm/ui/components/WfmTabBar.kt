package com.beyondviolet.wfm.ui.components

import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.beyondviolet.wfm.ui.theme.*

/**
 * Таб-бар с нижним индикатором активной вкладки (bottom-line style)
 *
 * Используется там, где нужно переключение между несколькими разделами.
 * Активная вкладка выделяется фиолетовой полосой снизу с плавной анимацией.
 *
 * @param selectedIndex Индекс активной вкладки
 * @param options Список заголовков вкладок
 * @param onSelectionChange Callback при переключении вкладки
 * @param modifier Modifier
 */
@Composable
fun WfmTabBar(
    selectedIndex: Int,
    options: List<String>,
    onSelectionChange: (Int) -> Unit,
    modifier: Modifier = Modifier
) {
    val colors = WfmTheme.colors
    val density = LocalDensity.current
    var containerSize by remember { mutableStateOf(IntSize.Zero) }

    val tabWidth = if (containerSize.width > 0 && options.isNotEmpty()) {
        containerSize.width / options.size
    } else 0

    val indicatorOffset by animateDpAsState(
        targetValue = with(density) { (tabWidth * selectedIndex).toDp() },
        animationSpec = tween(durationMillis = 200),
        label = "tabIndicatorOffset"
    )

    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(46.dp)
            .onSizeChanged { containerSize = it }
    ) {
        // Фоновая линия на всю ширину
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(2.dp)
                .background(colors.borderSecondary)
                .align(Alignment.BottomStart)
        )

        // Активный индикатор скользит между вкладками
        if (tabWidth > 0) {
            Box(
                modifier = Modifier
                    .offset(x = indicatorOffset)
                    .width(with(density) { tabWidth.toDp() })
                    .height(2.dp)
                    .background(colors.borderBrand)
                    .align(Alignment.BottomStart)
            )
        }

        // Текст вкладок
        Row(modifier = Modifier.fillMaxWidth().fillMaxHeight()) {
            options.forEachIndexed { index, option ->
                val isActive = index == selectedIndex

                Column(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxHeight()
                        .clickable(
                            interactionSource = remember { MutableInteractionSource() },
                            indication = null
                        ) { onSelectionChange(index) },
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Spacer(modifier = Modifier.weight(1f))

                    Text(
                        text = option,
                        style = TextStyle(
                            fontFamily = InterFontFamily,
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 15.sp,
                            lineHeight = 18.sp,
                            letterSpacing = 0.06.sp
                        ),
                        color = if (isActive) colors.textPrimary else colors.textTertiary,
                        textAlign = TextAlign.Center,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(bottom = 14.dp)
                    )
                }
            }
        }
    }
}

@Preview(showBackground = true, backgroundColor = 0xFFFFFFFF)
@Composable
private fun WfmTabBarPreview() {
    WfmTheme {
        Column {
            WfmTabBar(
                selectedIndex = 0,
                options = listOf("Подзадачи", "Подсказки"),
                onSelectionChange = {}
            )
            WfmTabBar(
                selectedIndex = 1,
                options = listOf("Подзадачи", "Подсказки"),
                onSelectionChange = {}
            )
        }
    }
}
