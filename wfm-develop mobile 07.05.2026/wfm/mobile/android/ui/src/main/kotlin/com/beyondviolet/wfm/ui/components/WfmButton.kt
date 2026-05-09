package com.beyondviolet.wfm.ui.components

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.beyondviolet.wfm.ui.theme.WfmRadius
import com.beyondviolet.wfm.ui.theme.WfmSpacing
import com.beyondviolet.wfm.ui.theme.WfmTheme
import com.beyondviolet.wfm.ui.theme.WfmTypography
import com.beyondviolet.wfm.ui.theme.*

/**
 * Основная кнопка дизайн-системы WFM
 *
 * @param text Текст кнопки
 * @param onClick Callback при нажатии
 * @param modifier Modifier
 * @param enabled Активна ли кнопка
 * @param isLoading Показывать ли индикатор загрузки
 */
@Composable
fun WfmPrimaryButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    isLoading: Boolean = false
) {
    val colors = WfmTheme.colors
    val backgroundColor = if (enabled) colors.buttonPrimaryBgDefault else colors.buttonPrimaryBgDisabled
    val textColor = if (enabled) colors.buttonPrimaryTextDefault else colors.buttonPrimaryTextDisabled

    Box(
        modifier = modifier
            .background(
                color = backgroundColor,
                shape = RoundedCornerShape(WfmRadius.L)
            )
            .clip(RoundedCornerShape(WfmRadius.L))
            .then(
                if (enabled && !isLoading) {
                    Modifier.clickable(onClick = onClick)
                } else {
                    Modifier
                }
            )
            .padding(horizontal = WfmSpacing.L, vertical = WfmSpacing.M),
        contentAlignment = Alignment.Center
    ) {
        if (isLoading) {
            CircularProgressIndicator(
                modifier = Modifier.size(20.dp),
                color = textColor,
                strokeWidth = 2.dp
            )
        } else {
            Text(
                text = text,
                style = WfmTypography.Headline16Bold,
                color = textColor,
                textAlign = TextAlign.Center
            )
        }
    }
}

/**
 * Вторичная кнопка дизайн-системы WFM
 *
 * @param text Текст кнопки
 * @param onClick Callback при нажатии
 * @param modifier Modifier
 * @param icon Опциональная иконка (drawable resource ID)
 * @param enabled Активна ли кнопка
 * @param isLoading Показывать ли индикатор загрузки
 * @param isNeutral Использовать нейтральный стиль
 * @param size Размер кнопки (big = 48dp, medium = 44dp)
 */
@Composable
fun WfmSecondaryButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    icon: Int? = null,
    enabled: Boolean = true,
    isLoading: Boolean = false,
    isNeutral: Boolean = false,
    size: WfmButtonSize = WfmButtonSize.Big
) {
    val colors = WfmTheme.colors
    val backgroundColor = if (isNeutral) {
        if (enabled) colors.buttonTertiaryBgDefault else colors.buttonTertiaryBgDisabled
    } else {
        if (enabled) colors.buttonSecondaryBgDefault else colors.buttonSecondaryBgDisabled
    }
    val textColor = if (isNeutral) {
        if (enabled) colors.buttonTertiaryTextDefault else colors.buttonTertiaryTextDisabled
    } else {
        if (enabled) colors.buttonSecondaryTextDefault else colors.buttonSecondaryTextDisabled
    }
    val textStyle = when (size) {
        WfmButtonSize.Big -> WfmTypography.Headline16Bold
        WfmButtonSize.Medium -> WfmTypography.Body14Bold
    }

    Box(
        modifier = modifier
            .background(
                color = backgroundColor,
                shape = RoundedCornerShape(WfmRadius.L)
            )
            .clip(RoundedCornerShape(WfmRadius.L))
            .then(
                if (enabled && !isLoading) {
                    Modifier.clickable(onClick = onClick)
                } else {
                    Modifier
                }
            )
            .padding(horizontal = WfmSpacing.L, vertical = WfmSpacing.M),
        contentAlignment = Alignment.Center
    ) {
        if (isLoading) {
            CircularProgressIndicator(
                modifier = Modifier.size(20.dp),
                color = textColor,
                strokeWidth = 2.dp
            )
        } else {
            Row(
                horizontalArrangement = Arrangement.spacedBy(4.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                if (icon != null) {
                    Image(
                        painter = painterResource(id = icon),
                        contentDescription = null,
                        modifier = Modifier.size(24.dp),
                        colorFilter = ColorFilter.tint(textColor)
                    )
                }

                Text(
                    text = text,
                    style = textStyle,
                    color = textColor,
                    textAlign = TextAlign.Center
                )
            }
        }
    }
}

/**
 * Размер кнопки
 */
enum class WfmButtonSize {
    Big,    // 48dp height, 16px font
    Medium  // 44dp height, 14px font
}

/**
 * Текстовая кнопка (ссылка) дизайн-системы WFM
 *
 * @param text Текст кнопки
 * @param onClick Callback при нажатии
 * @param modifier Modifier
 * @param enabled Активна ли кнопка
 * @param textAlign Выравнивание текста
 */
@Composable
fun WfmTextButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    textAlign: TextAlign = TextAlign.Center
) {
    val colors = WfmTheme.colors
    val textColor = if (enabled) colors.buttonLinkTextDefault else colors.buttonLinkTextDisabled

    Text(
        text = text,
        style = WfmTypography.Headline14Medium,
        color = textColor,
        textAlign = textAlign,
        modifier = modifier
            .clip(RoundedCornerShape(WfmRadius.L))
            .then(
                if (enabled) {
                    Modifier.clickable(onClick = onClick)
                } else {
                    Modifier
                }
            )
            .padding(vertical = WfmSpacing.M)
    )
}

@Preview(showBackground = true, backgroundColor = 0xFFF5F5FC)
@Composable
private fun WfmPrimaryButtonEnabledPreview() {
    WfmTheme {
        WfmPrimaryButton(
            text = "Далее",
            onClick = {},
            enabled = true,
            modifier = Modifier.fillMaxWidth()
        )
    }
}

@Preview(showBackground = true, backgroundColor = 0xFFF5F5FC)
@Composable
private fun WfmPrimaryButtonLoadingPreview() {
    WfmTheme {
        WfmPrimaryButton(
            text = "Далее",
            isLoading = true,
            onClick = {},
            enabled = true,
            modifier = Modifier.fillMaxWidth()
        )
    }
}

@Preview(showBackground = true, backgroundColor = 0xFFF5F5FC)
@Composable
private fun WfmPrimaryButtonDisabledPreview() {
    WfmTheme {
        WfmPrimaryButton(
            text = "Далее",
            onClick = {},
            enabled = false,
            modifier = Modifier.fillMaxWidth()
        )
    }
}

@Preview(showBackground = true, backgroundColor = 0xFFF5F5FC)
@Composable
private fun WfmTextButtonEnabledPreview() {
    WfmTheme {
        WfmTextButton(
            text = "Перезвонить повторно",
            onClick = {},
            enabled = true
        )
    }
}

@Preview(showBackground = true, backgroundColor = 0xFFF5F5FC)
@Composable
private fun WfmTextButtonDisabledPreview() {
    WfmTheme {
        WfmTextButton(
            text = "Перезвонить повторно через 60 сек",
            onClick = {},
            enabled = false
        )
    }
}

@Preview(name = "Text Button - Centered", showBackground = true, backgroundColor = 0xFFF5F5FC)
@Composable
private fun WfmTextButtonCenteredPreview() {
    WfmTheme {
        WfmTextButton(
            text = "Перезвонить повторно",
            onClick = {},
            enabled = true,
            textAlign = TextAlign.Center,
            modifier = Modifier.fillMaxWidth()
        )
    }
}

@Preview(showBackground = true, backgroundColor = 0xFFF5F5FC)
@Composable
private fun WfmSecondaryButtonEnabledPreview() {
    WfmTheme {
        WfmSecondaryButton(
            text = "Отмена",
            onClick = {},
            enabled = true,
            modifier = Modifier.fillMaxWidth()
        )
    }
}

@Preview(showBackground = true, backgroundColor = 0xFFF5F5FC)
@Composable
private fun WfmSecondaryButtonNeutralPreview() {
    WfmTheme {
        WfmSecondaryButton(
            text = "Отмена",
            onClick = {},
            enabled = true,
            isNeutral = true,
            modifier = Modifier.fillMaxWidth()
        )
    }
}
