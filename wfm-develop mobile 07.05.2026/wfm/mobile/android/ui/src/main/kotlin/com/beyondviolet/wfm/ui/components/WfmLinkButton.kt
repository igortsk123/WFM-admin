package com.beyondviolet.wfm.ui.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import com.beyondviolet.wfm.ui.theme.WfmSpacing
import com.beyondviolet.wfm.ui.theme.WfmTheme
import com.beyondviolet.wfm.ui.theme.WfmTypography
import com.beyondviolet.wfm.ui.theme.*

/**
 * Link кнопка дизайн-системы WFM
 *
 * Низкий приоритет, для менее важных действий.
 * Представляет собой текст без фона в цветах brand.
 *
 * Дизайн: https://www.figma.com/design/J9crsNS4wIszpILzWvnY2T/Smart-employee?node-id=900-12300
 *
 * @param text Текст кнопки
 * @param onClick Callback при нажатии
 * @param modifier Modifier
 * @param size Размер кнопки (big, medium, small, xsmall)
 * @param enabled Активна ли кнопка
 */
@Composable
fun WfmLinkButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    size: WfmLinkButtonSize = WfmLinkButtonSize.BIG,
    enabled: Boolean = true
) {
    val colors = WfmTheme.colors
    val textColor = if (enabled) colors.buttonLinkTextDefault else colors.buttonLinkTextDisabled

    val textStyle = when (size) {
        WfmLinkButtonSize.BIG -> WfmTypography.Headline16Medium
        WfmLinkButtonSize.MEDIUM -> WfmTypography.Headline14Medium
        WfmLinkButtonSize.SMALL, WfmLinkButtonSize.XSMALL -> WfmTypography.Headline12Medium
    }

    val (horizontalPadding, verticalPadding) = when (size) {
        WfmLinkButtonSize.BIG, WfmLinkButtonSize.MEDIUM -> WfmSpacing.L to WfmSpacing.M  // 16/12
        WfmLinkButtonSize.SMALL -> WfmSpacing.M to WfmSpacing.S  // 12/8
        WfmLinkButtonSize.XSMALL -> WfmSpacing.S to WfmSpacing.XXS  // 8/4
    }

    Box(
        modifier = modifier
            .then(
                if (enabled) {
                    Modifier.clickable(onClick = onClick)
                } else {
                    Modifier
                }
            )
            .padding(horizontal = horizontalPadding, vertical = verticalPadding),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = text,
            style = textStyle,
            color = textColor,
            textAlign = TextAlign.Center
        )
    }
}

/**
 * Размер Link кнопки
 */
enum class WfmLinkButtonSize {
    BIG,      // 16px font, 16/12 padding
    MEDIUM,   // 14px font, 16/12 padding
    SMALL,    // 12px font, 12/8 padding
    XSMALL    // 12px font, 8/4 padding
}

// MARK: - Preview

@Preview(name = "Link Button - All Sizes", showBackground = true)
@Composable
private fun WfmLinkButtonPreview() {
    WfmTheme {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            WfmLinkButton(
                text = "Отмена",
                size = WfmLinkButtonSize.BIG,
                onClick = {},
                modifier = Modifier.fillMaxWidth()
            )

            WfmLinkButton(
                text = "Отмена",
                size = WfmLinkButtonSize.MEDIUM,
                onClick = {},
                modifier = Modifier.fillMaxWidth()
            )

            WfmLinkButton(
                text = "Отмена",
                size = WfmLinkButtonSize.SMALL,
                onClick = {},
                modifier = Modifier.fillMaxWidth()
            )

            WfmLinkButton(
                text = "Отмена",
                size = WfmLinkButtonSize.XSMALL,
                onClick = {},
                modifier = Modifier.fillMaxWidth()
            )

            WfmLinkButton(
                text = "Отмена (Disabled)",
                enabled = false,
                onClick = {},
                modifier = Modifier.fillMaxWidth()
            )
        }
    }
}
