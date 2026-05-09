package com.beyondviolet.wfm.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.runtime.Composable
import com.beyondviolet.wfm.ui.theme.WfmTheme as UiWfmTheme

/**
 * Тема приложения WFM
 * Делегирует к теме из UI модуля
 */
@Composable
fun WFMAppTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    UiWfmTheme(
        darkTheme = darkTheme,
        content = content
    )
}
