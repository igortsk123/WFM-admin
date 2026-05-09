package com.beyondviolet.wfm.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.beyondviolet.wfm.ui.R
import com.beyondviolet.wfm.ui.theme.WfmRadius
import com.beyondviolet.wfm.ui.theme.WfmTheme
import com.beyondviolet.wfm.ui.theme.*

/**
 * Чекбокс для множественного выбора
 * Используется в фильтрах и списках выбора
 *
 * @param isChecked Выбран ли чекбокс
 * @param isDisabled Неактивен ли чекбокс
 * @param modifier Модификатор
 */
@Composable
fun WfmCheckbox(
    isChecked: Boolean,
    modifier: Modifier = Modifier,
    isDisabled: Boolean = false
) {
    val colors = WfmTheme.colors

    val backgroundColor = when {
        isDisabled -> colors.selectionBgDisabled // серый
        isChecked -> colors.selectionBgChecked // синий brand500
        else -> colors.selectionBgDefault // для passive состояния
    }

    val shape = RoundedCornerShape(WfmRadius.XS)

    Box(
        modifier = modifier
            .size(24.dp)
            .clip(shape)
            .background(backgroundColor)
            .then(
                // Бордер для passive состояния
                if (!isChecked && !isDisabled) {
                    Modifier.border(
                        width = 1.dp,
                        color = colors.selectionBorderDefault,
                        shape = shape
                    )
                } else {
                    Modifier
                }
            ),
        contentAlignment = Alignment.Center
    ) {
        // Галочка для checked состояния
        if (isChecked && !isDisabled) {
            Icon(
                painter = painterResource(id = R.drawable.ic_check),
                contentDescription = null,
                modifier = Modifier.size(12.dp),
                tint = colors.selectionIconChecked
            )
        }
    }
}

@Preview(showBackground = true)
@Composable
private fun WfmCheckboxPreview() {
    WfmTheme {
        androidx.compose.foundation.layout.Row(
            horizontalArrangement = androidx.compose.foundation.layout.Arrangement.spacedBy(16.dp),
            modifier = Modifier.background(Color.White)
        ) {
            androidx.compose.foundation.layout.Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = androidx.compose.foundation.layout.Arrangement.spacedBy(4.dp)
            ) {
                WfmCheckbox(isChecked = false)
                androidx.compose.material3.Text("Passive")
            }

            androidx.compose.foundation.layout.Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = androidx.compose.foundation.layout.Arrangement.spacedBy(4.dp)
            ) {
                WfmCheckbox(isChecked = true)
                androidx.compose.material3.Text("Checked")
            }

            androidx.compose.foundation.layout.Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = androidx.compose.foundation.layout.Arrangement.spacedBy(4.dp)
            ) {
                WfmCheckbox(isChecked = false, isDisabled = true)
                androidx.compose.material3.Text("Disabled")
            }
        }
    }
}
