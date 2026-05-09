package com.beyondviolet.wfm.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.beyondviolet.wfm.ui.theme.WfmRadius
import com.beyondviolet.wfm.ui.theme.WfmSpacing
import com.beyondviolet.wfm.ui.theme.WfmTheme
import com.beyondviolet.wfm.ui.theme.WfmTypography
import com.beyondviolet.wfm.ui.theme.*

/**
 * Состояния чипа
 */
enum class WfmChipState {
    DEFAULT,  // Не выбран (бордер фиолетовый, фон белый, текст фиолетовый)
    ACTIVE,   // Выбран (фон фиолетовый, текст белый)
    DISABLED  // Неактивен (бордер светлый, текст светлый)
}

/**
 * Чип для фильтрации (компактная кнопка выбора опций)
 */
@Composable
fun WfmChip(
    text: String,
    state: WfmChipState = WfmChipState.DEFAULT,
    onClick: (() -> Unit)? = null
) {
    val colors = WfmTheme.colors

    val textColor = when (state) {
        WfmChipState.DEFAULT -> colors.buttonTertiaryTextDefault
        WfmChipState.ACTIVE -> colors.buttonPrimaryTextDefault
        WfmChipState.DISABLED -> colors.buttonPrimaryTextDisabled
    }

    val backgroundColor = when (state) {
        WfmChipState.DEFAULT, WfmChipState.DISABLED -> Color.Transparent
        WfmChipState.ACTIVE -> colors.badgeBrandBgBright
    }

    val borderColor = when (state) {
        WfmChipState.DEFAULT -> colors.iconImgEmptyState
        WfmChipState.ACTIVE -> Color.Transparent
        WfmChipState.DISABLED -> colors.buttonSecondaryTextDisabled
    }

    val textStyle = when (state) {
        WfmChipState.ACTIVE -> WfmTypography.Headline14Medium
        WfmChipState.DEFAULT, WfmChipState.DISABLED -> WfmTypography.Body14Regular
    }

    TextButton(
        onClick = onClick ?: {},
        modifier = Modifier.height(32.dp),
        enabled = state != WfmChipState.DISABLED && onClick != null,
        shape = RoundedCornerShape(WfmRadius.M),
        colors = ButtonDefaults.textButtonColors(
            containerColor = backgroundColor,
            contentColor = textColor,
            disabledContainerColor = backgroundColor,
            disabledContentColor = textColor
        ),
        border = if (state != WfmChipState.ACTIVE) BorderStroke(1.dp, borderColor) else null,
        contentPadding = androidx.compose.foundation.layout.PaddingValues(
            horizontal = WfmSpacing.M,
            vertical = WfmSpacing.XS
        )
    ) {
        Text(
            text = text,
            style = textStyle,
            color = textColor
        )
    }
}
