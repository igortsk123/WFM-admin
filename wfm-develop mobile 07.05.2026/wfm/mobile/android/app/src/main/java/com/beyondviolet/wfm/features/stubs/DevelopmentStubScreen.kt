package com.beyondviolet.wfm.features.stubs

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Build
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.beyondviolet.wfm.ui.theme.WFMAppTheme
import com.beyondviolet.wfm.ui.theme.WfmTheme
import com.beyondviolet.wfm.ui.theme.*

/**
 * Универсальная заглушка для разделов в разработке
 *
 * @param title Название раздела (например, "Главная", "Настройки")
 */
@Composable
fun DevelopmentStubScreen(
    title: String,
    modifier: Modifier = Modifier
) {
    val colors = WfmTheme.colors
    val typography = WfmTheme.typography
    val spacing = WfmTheme.spacing

    Column(
        modifier = modifier.fillMaxSize(),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Icon(
            imageVector = Icons.Default.Build,
            contentDescription = null,
            modifier = Modifier.size(64.dp),
            tint = colors.iconSecondary
        )

        Spacer(modifier = Modifier.height(spacing.L))

        Text(
            text = "Раздел в разработке",
            style = typography.Headline16Bold,
            color = colors.textPrimary,
            textAlign = TextAlign.Center
        )

        Spacer(modifier = Modifier.height(spacing.S))

        Text(
            text = "Скоро здесь появится $title",
            style = typography.Body14Regular,
            color = colors.textSecondary,
            textAlign = TextAlign.Center
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun DevelopmentStubScreenPreview() {
    WFMAppTheme {
        DevelopmentStubScreen(title = "Главная")
    }
}
