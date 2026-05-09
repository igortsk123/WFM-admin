package com.beyondviolet.wfm.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.beyondviolet.wfm.ui.theme.WfmTheme
import com.beyondviolet.wfm.ui.theme.*

/**
 * Радиокнопка для единичного выбора
 * Используется в группах выбора (radio groups)
 *
 * @param isSelected Выбрана ли радиокнопка
 * @param isDisabled Неактивна ли радиокнопка
 * @param modifier Модификатор
 */
@Composable
fun WfmRadioButton(
    isSelected: Boolean,
    modifier: Modifier = Modifier,
    isDisabled: Boolean = false
) {
    val colors = WfmTheme.colors

    val outerCircleColor = when {
        isDisabled -> colors.selectionBgDisabled
        isSelected -> colors.selectionBgChecked
        else -> colors.selectionBgDefault
    }

    val innerCircleColor = if (isDisabled) {
        colors.selectionBgDisabled
    } else {
        colors.selectionIconChecked
    }

    Box(
        modifier = modifier
            .size(24.dp)
            .clip(CircleShape)
            .background(outerCircleColor)
            .then(
                // Бордер для не выбранного состояния
                if (!isSelected) {
                    Modifier.border(
                        width = 1.dp,
                        color = colors.selectionBorderDefault,
                        shape = CircleShape
                    )
                } else {
                    Modifier
                }
            ),
        contentAlignment = Alignment.Center
    ) {
        // Внутренний круг для selected состояния
        if (isSelected) {
            Box(
                modifier = Modifier
                    .size(10.dp)
                    .clip(CircleShape)
                    .background(innerCircleColor)
            )
        }
    }
}

@Preview(showBackground = true)
@Composable
private fun WfmRadioButtonPreview() {
    WfmTheme {
        androidx.compose.foundation.layout.Row(
            horizontalArrangement = androidx.compose.foundation.layout.Arrangement.spacedBy(16.dp),
            modifier = Modifier.background(Color.White)
        ) {
            androidx.compose.foundation.layout.Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = androidx.compose.foundation.layout.Arrangement.spacedBy(4.dp)
            ) {
                WfmRadioButton(isSelected = false)
                androidx.compose.material3.Text("Not Selected")
            }

            androidx.compose.foundation.layout.Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = androidx.compose.foundation.layout.Arrangement.spacedBy(4.dp)
            ) {
                WfmRadioButton(isSelected = true)
                androidx.compose.material3.Text("Selected")
            }

            androidx.compose.foundation.layout.Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = androidx.compose.foundation.layout.Arrangement.spacedBy(4.dp)
            ) {
                WfmRadioButton(isSelected = false, isDisabled = true)
                androidx.compose.material3.Text("Disabled")
            }

            androidx.compose.foundation.layout.Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = androidx.compose.foundation.layout.Arrangement.spacedBy(4.dp)
            ) {
                WfmRadioButton(isSelected = true, isDisabled = true)
                androidx.compose.material3.Text("Selected Disabled")
            }
        }
    }
}
