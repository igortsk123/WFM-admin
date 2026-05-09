package com.beyondviolet.wfm.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.painter.Painter
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.beyondviolet.wfm.ui.R
import com.beyondviolet.wfm.ui.theme.WfmRadius
import com.beyondviolet.wfm.ui.theme.WfmSpacing
import com.beyondviolet.wfm.ui.theme.WfmTheme
import com.beyondviolet.wfm.ui.theme.WfmTypography
import com.beyondviolet.wfm.ui.theme.*

/**
 * Кнопка авторизации через социальную сеть
 *
 * Состояния:
 * - default: кнопка активна, без ошибки
 * - disabled: кнопка неактивна (серый текст)
 * - error: кнопка активна + текст ошибки снизу
 *
 * @param icon Иконка соцсети (многоцветная, без tint)
 * @param text Название соцсети
 * @param onClick Callback при нажатии
 * @param modifier Modifier
 * @param enabled Активна ли кнопка
 * @param errorMessage Сообщение об ошибке (если != null и кнопка активна — error state)
 */
@Composable
fun WfmSocialButton(
    icon: Painter,
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    errorMessage: String? = null
) {
    val colors = WfmTheme.colors
    val bgColor = if (enabled) colors.buttonTertiaryBgDefault else colors.buttonTertiaryBgDisabled
    val textColor = if (enabled) colors.textPrimary else colors.buttonTertiaryTextDisabled

    Column(
        modifier = modifier,
        verticalArrangement = Arrangement.spacedBy(WfmSpacing.XXS)
    ) {
        // Тело кнопки
        Box(
            contentAlignment = Alignment.Center,
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    color = bgColor,
                    shape = RoundedCornerShape(WfmRadius.L)
                )
                .clip(RoundedCornerShape(WfmRadius.L))
                .then(
                    if (enabled) Modifier.clickable(onClick = onClick) else Modifier
                )
                .padding(horizontal = WfmSpacing.L, vertical = WfmSpacing.L)
        ) {
            Row(
                horizontalArrangement = Arrangement.spacedBy(WfmSpacing.S),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    painter = icon,
                    contentDescription = text,
                    modifier = Modifier.size(24.dp),
                    tint = Color.Unspecified
                )
                Text(
                    text = text,
                    style = WfmTypography.Headline16Bold,
                    color = textColor
                )
            }
        }

        // Текст ошибки
        if (enabled && errorMessage != null) {
            Text(
                text = errorMessage,
                style = WfmTypography.Body12Medium,
                color = colors.textError
            )
        }
    }
}

// ═══════════════════════════════════════════════════════════════════
// PREVIEWS
// ═══════════════════════════════════════════════════════════════════

@Preview(name = "Social Button - Default", showBackground = true, backgroundColor = 0xFFF5F5FC)
@Composable
private fun WfmSocialButtonDefaultPreview() {
    WfmTheme {
        WfmSocialButton(
            icon = painterResource(R.drawable.ic_preview_social),
            text = "Вконтакте",
            onClick = {},
            modifier = Modifier.fillMaxWidth().padding(16.dp)
        )
    }
}

@Preview(name = "Social Button - Disabled", showBackground = true, backgroundColor = 0xFFF5F5FC)
@Composable
private fun WfmSocialButtonDisabledPreview() {
    WfmTheme {
        WfmSocialButton(
            icon = painterResource(R.drawable.ic_preview_social),
            text = "Вконтакте",
            onClick = {},
            enabled = false,
            modifier = Modifier.fillMaxWidth().padding(16.dp)
        )
    }
}

@Preview(name = "Social Button - Error", showBackground = true, backgroundColor = 0xFFF5F5FC)
@Composable
private fun WfmSocialButtonErrorPreview() {
    WfmTheme {
        WfmSocialButton(
            icon = painterResource(R.drawable.ic_preview_social),
            text = "Вконтакте",
            onClick = {},
            errorMessage = "Не удалось авторизоваться через Вконтакте. Попробуйте другой способ авторизации.",
            modifier = Modifier.fillMaxWidth().padding(16.dp)
        )
    }
}
