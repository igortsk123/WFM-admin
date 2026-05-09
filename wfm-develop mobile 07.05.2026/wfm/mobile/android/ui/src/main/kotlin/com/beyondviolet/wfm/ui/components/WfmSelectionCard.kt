package com.beyondviolet.wfm.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.beyondviolet.wfm.ui.R
import com.beyondviolet.wfm.ui.theme.WfmRadius
import com.beyondviolet.wfm.ui.theme.WfmSpacing
import com.beyondviolet.wfm.ui.theme.WfmStroke
import com.beyondviolet.wfm.ui.theme.WfmTheme
import com.beyondviolet.wfm.ui.theme.WfmTypography
import com.beyondviolet.wfm.ui.theme.*

/**
 * Тип карточки выбора
 */
enum class WfmSelectionCardType {
    /** С чекбоксом для множественного выбора */
    SELECT,
    /** Со стрелкой для перехода на следующий экран */
    OPEN
}

/**
 * Карточка для списков выбора (сотрудники, фильтры и т.д.)
 *
 * @param title Текст карточки
 * @param type Тип карточки (SELECT или OPEN)
 * @param isChecked Выбрана ли карточка (только для type = SELECT)
 * @param showBorder Показывать ли бордер и скругление (по умолчанию true)
 * @param onTap Действие при нажатии
 * @param modifier Модификатор
 */
@Composable
fun WfmSelectionCard(
    title: String,
    modifier: Modifier = Modifier,
    type: WfmSelectionCardType = WfmSelectionCardType.SELECT,
    isChecked: Boolean = false,
    showBorder: Boolean = true,
    contentPadding: PaddingValues = PaddingValues(WfmSpacing.M),
    onTap: (() -> Unit)? = null
) {
    val colors = WfmTheme.colors

    Box(
        modifier = modifier
            .fillMaxWidth()
            .then(
                if (showBorder) {
                    Modifier
                        .clip(RoundedCornerShape(WfmRadius.XL))
                        .background(colors.cardSurfaceSecondary)
                        .border(
                            width = WfmStroke.S,
                            color = colors.cardBorderSecondary,
                            shape = RoundedCornerShape(WfmRadius.XL)
                        )
                } else {
                    Modifier.background(colors.cardSurfaceSecondary)
                }
            )
            .clickable(enabled = onTap != null) { onTap?.invoke() }
            .padding(contentPadding)
    ) {
        Row(
            horizontalArrangement = Arrangement.spacedBy(WfmSpacing.S),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Текст
            Text(
                text = title,
                style = WfmTypography.Headline14Medium,
                color = colors.cardTextPrimary,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.weight(1f)
            )

            // Чекбокс или стрелка
            when (type) {
                WfmSelectionCardType.SELECT -> {
                    WfmCheckbox(isChecked = isChecked)
                }
                WfmSelectionCardType.OPEN -> {
                    Icon(
                        painter = painterResource(id = R.drawable.ic_chevron_right),
                        contentDescription = null,
                        modifier = Modifier.size(24.dp),
                        tint = colors.cardIconPrimary
                    )
                }
            }
        }
    }
}

@Preview(showBackground = true)
@Composable
private fun WfmSelectionCardPreview() {
    WfmTheme {
        val colors = WfmTheme.colors
        Column(
            verticalArrangement = Arrangement.spacedBy(16.dp),
            modifier = Modifier
                .background(colors.surfaceBase)
                .padding(16.dp)
        ) {
            // Select type
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                WfmSelectionCard(
                    title = "Все",
                    type = WfmSelectionCardType.SELECT,
                    isChecked = true
                )

                WfmSelectionCard(
                    title = "Григорьев П.С.",
                    type = WfmSelectionCardType.SELECT,
                    isChecked = false
                )
            }

            // Open type
            WfmSelectionCard(
                title = "Вино",
                type = WfmSelectionCardType.OPEN
            )
        }
    }
}
