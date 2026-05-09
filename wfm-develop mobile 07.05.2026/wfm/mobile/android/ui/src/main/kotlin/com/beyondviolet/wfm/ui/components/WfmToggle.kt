package com.beyondviolet.wfm.ui.components

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.beyondviolet.wfm.ui.theme.WfmTheme
import com.beyondviolet.wfm.ui.theme.*

/**
 * Переключатель (Toggle Switch) для включения/выключения опций
 * Используется для настроек и переключения состояний
 *
 * @param isOn Включен ли переключатель
 * @param isDisabled Неактивен ли переключатель
 * @param modifier Модификатор
 */
@Composable
fun WfmToggle(
    isOn: Boolean,
    modifier: Modifier = Modifier,
    isDisabled: Boolean = false
) {
    val colors = WfmTheme.colors

    val trackColor = if (isOn) {
        colors.selectionBgChecked
    } else {
        colors.selectionBgDefault
    }

    val thumbColor = if (isDisabled) {
        colors.selectionBgDisabled
    } else {
        colors.selectionBgThumb
    }

    val borderWidth = if (isOn) 0.dp else 1.dp
    val borderColor = if (isOn) Color.Transparent else colors.selectionBorderDefault

    // Анимация движения кнопки (thumb)
    val thumbOffset by animateFloatAsState(
        targetValue = if (isOn) 10f else -10f,
        label = "thumb_offset"
    )

    Box(
        modifier = modifier
            .width(51.dp)
            .height(31.dp)
            .clip(RoundedCornerShape(100.dp))
            .background(trackColor)
            .border(
                width = borderWidth,
                color = borderColor,
                shape = RoundedCornerShape(100.dp)
            ),
        contentAlignment = Alignment.Center
    ) {
        // Кнопка (thumb)
        Box(
            modifier = Modifier
                .size(27.dp)
                .offset(x = thumbOffset.dp)
                .clip(CircleShape)
                .background(thumbColor)
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun WfmTogglePreview() {
    WfmTheme {
        androidx.compose.foundation.layout.Row(
            horizontalArrangement = androidx.compose.foundation.layout.Arrangement.spacedBy(16.dp),
            modifier = Modifier.background(Color.White)
        ) {
            androidx.compose.foundation.layout.Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = androidx.compose.foundation.layout.Arrangement.spacedBy(4.dp)
            ) {
                WfmToggle(isOn = false)
                androidx.compose.material3.Text("Off")
            }

            androidx.compose.foundation.layout.Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = androidx.compose.foundation.layout.Arrangement.spacedBy(4.dp)
            ) {
                WfmToggle(isOn = true)
                androidx.compose.material3.Text("On")
            }

            androidx.compose.foundation.layout.Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = androidx.compose.foundation.layout.Arrangement.spacedBy(4.dp)
            ) {
                WfmToggle(isOn = false, isDisabled = true)
                androidx.compose.material3.Text("Disabled Off")
            }

            androidx.compose.foundation.layout.Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = androidx.compose.foundation.layout.Arrangement.spacedBy(4.dp)
            ) {
                WfmToggle(isOn = true, isDisabled = true)
                androidx.compose.material3.Text("Disabled On")
            }
        }
    }
}
