package com.beyondviolet.wfm.features.splash

import androidx.activity.ComponentActivity
import androidx.activity.SystemBarStyle
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.beyondviolet.wfm.R
import com.beyondviolet.wfm.ui.theme.WfmColors
import com.beyondviolet.wfm.ui.theme.WfmTheme
import kotlinx.coroutines.delay

/**
 * Splash Screen экран
 * Показывается при запуске приложения
 *
 * Дизайн из Figma: node-id=2868-8658
 */
@Composable
fun SplashScreen(
    onSplashFinished: () -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val splashColor = WfmColors.Brand500.toArgb()

    // Устанавливаем фиолетовый цвет системных баров для splash screen
    DisposableEffect(Unit) {
        val activity = context as? ComponentActivity
        activity?.enableEdgeToEdge(
            statusBarStyle = SystemBarStyle.dark(splashColor),
            navigationBarStyle = SystemBarStyle.dark(splashColor)
        )

        onDispose {
            // Очистка при выходе из composable
        }
    }

    // Автоматически завершаем splash screen через 2 секунды
    LaunchedEffect(Unit) {
        delay(2000)
        onSplashFinished()
    }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(WfmColors.Brand500) // Фиолетовый фон #6738DD
            .systemBarsPadding(),
        contentAlignment = Alignment.Center
    ) {
        // Логотип по центру
        Image(
            painter = painterResource(id = R.drawable.ic_logo_splash),
            contentDescription = "WFM Logo",
            modifier = Modifier.size(150.dp)
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun SplashScreenPreview() {
    WfmTheme {
        SplashScreen(
            onSplashFinished = {}
        )
    }
}
