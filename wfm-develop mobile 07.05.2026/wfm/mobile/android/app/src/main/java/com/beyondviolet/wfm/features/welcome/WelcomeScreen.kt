package com.beyondviolet.wfm.features.welcome

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.beyondviolet.wfm.R
import com.beyondviolet.wfm.ui.components.WfmPrimaryButton
import com.beyondviolet.wfm.ui.theme.WfmRadius
import com.beyondviolet.wfm.ui.theme.WfmSpacing
import com.beyondviolet.wfm.ui.theme.WfmTheme
import com.beyondviolet.wfm.ui.theme.WfmTypography
import com.beyondviolet.wfm.ui.theme.*
import com.beyondviolet.wfm.core.utils.rememberDebouncedClick

/**
 * Экран приветствия (Welcome)
 * Показывается при первом запуске или если пользователь не авторизован
 *
 * Дизайн из Figma: node-id=2868-8649
 */
@Composable
fun WelcomeScreen(
    onSignInClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val colors = WfmTheme.colors

    // Debounce для кнопки "Войти"
    val (signInButtonEnabled, debouncedSignIn) = rememberDebouncedClick(
        debounceTime = 500L,
        onClick = onSignInClick
    )

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(colors.surfaceBase)
            .statusBarsPadding()
            .navigationBarsPadding()
            .padding(horizontal = WfmSpacing.M)
            .padding(top = WfmSpacing.XL, bottom = WfmSpacing.XL),
        verticalArrangement = Arrangement.SpaceBetween
    ) {
        // Контент с логотипом, заголовком и описанием
        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(WfmSpacing.S)
        ) {
            // Логотип
            Image(
                painter = painterResource(id = R.drawable.ic_logo_splash),
                contentDescription = "WFM Logo",

                modifier = Modifier
                    .size(40.dp)
                    .background(colors.bg.brandDefault)
                    .clip(RoundedCornerShape(WfmRadius.S))
            )

            // Заголовок
            Text(
                text = "Умный сотрудник",
                style = WfmTypography.Headline24Bold,
                color = colors.textPrimary,
                textAlign = TextAlign.Start
            )

            // Описание
            Text(
                text = "Планируйте свои смены, берите дополнительные задачи и отслеживайте свою эффективность каждый день!",
                style = WfmTypography.Body16Regular,
                color = colors.textPrimary,
                textAlign = TextAlign.Start
            )
        }

        // Кнопка "Войти"
        WfmPrimaryButton(
            text = "Войти",
            onClick = debouncedSignIn,
            enabled = signInButtonEnabled,
            modifier = Modifier.fillMaxWidth()
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun WelcomeScreenPreview() {
    WfmTheme {
        WelcomeScreen(
            onSignInClick = {}
        )
    }
}
