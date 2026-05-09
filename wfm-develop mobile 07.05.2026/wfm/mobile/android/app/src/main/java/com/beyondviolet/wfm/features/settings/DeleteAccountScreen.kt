package com.beyondviolet.wfm.features.settings

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.core.view.WindowCompat
import com.beyondviolet.wfm.core.utils.rememberDebouncedClick
import com.beyondviolet.wfm.ui.components.ToastManager
import com.beyondviolet.wfm.ui.components.WfmPrimaryButton
import com.beyondviolet.wfm.ui.components.WfmSecondaryButton
import com.beyondviolet.wfm.ui.components.WfmTextField
import com.beyondviolet.wfm.ui.theme.*
import kotlinx.coroutines.launch

/**
 * Экран подтверждения удаления учётной записи
 *
 * Отображает предупреждение, случайный 4-значный код и поле ввода.
 * Кнопка "Удалить" становится активной только при совпадении кодов.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DeleteAccountScreen(
    viewModel: SettingsViewModel,
    onSuccess: () -> Unit,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier
) {
    val colors = WfmTheme.colors
    val view = LocalView.current
    val scope = rememberCoroutineScope()

    val confirmCode = remember { (1000..9999).random().toString() }
    var enteredCode by remember { mutableStateOf(TextFieldValue("")) }
    var isLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    val codeMatches = enteredCode.text == confirmCode

    // Debounce для кнопки назад
    val (backButtonEnabled, debouncedDismiss) = rememberDebouncedClick(
        debounceTime = 500L,
        onClick = onDismiss
    )

    // Устанавливаем цвет navigation bar и восстанавливаем при уходе с экрана
    DisposableEffect(Unit) {
        val window = (view.context as? android.app.Activity)?.window
        val originalNavigationBarColor = window?.navigationBarColor
        val insetsController = window?.let { WindowCompat.getInsetsController(it, view) }
        val originalAppearanceLightNavigationBars = insetsController?.isAppearanceLightNavigationBars

        window?.let {
            insetsController?.isAppearanceLightNavigationBars = true
            it.navigationBarColor = colors.surfaceBase.toArgb()
        }

        onDispose {
            window?.let {
                originalNavigationBarColor?.let { color -> it.navigationBarColor = color }
                originalAppearanceLightNavigationBars?.let { appearance ->
                    insetsController?.isAppearanceLightNavigationBars = appearance
                }
            }
        }
    }

    // Обработка системной кнопки "Назад"
    BackHandler {
        onDismiss()
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .statusBarsPadding()
            .background(colors.surfaceBase)
    ) {
        // Заголовок с кнопкой назад
        Surface(
            modifier = Modifier.fillMaxWidth(),
            color = colors.surfaceBase
        ) {
            Column {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp)
                        .padding(horizontal = WfmSpacing.M, vertical = WfmSpacing.XXS),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(
                        onClick = debouncedDismiss,
                        enabled = backButtonEnabled,
                        modifier = Modifier.size(44.dp)
                    ) {
                        Icon(
                            painter = painterResource(id = com.beyondviolet.wfm.ui.R.drawable.ic_back),
                            contentDescription = "Назад",
                            tint = colors.iconPrimary,
                            modifier = Modifier.size(44.dp)
                        )
                    }

                    Text(
                        text = "Удалить учётную запись",
                        style = WfmTypography.Headline16Bold,
                        color = colors.textPrimary
                    )
                }

                HorizontalDivider(
                    thickness = 1.dp,
                    color = colors.barsBorder
                )
            }
        }

        // Контент
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(WfmSpacing.XL),
            verticalArrangement = Arrangement.spacedBy(WfmSpacing.XL)
        ) {
            // Предупреждение
            Text(
                text = "Это действие нельзя отменить. Все ваши данные будут безвозвратно удалены.",
                style = WfmTypography.Body14Regular,
                color = colors.textSecondary
            )

            // Блок с кодом
            Column(verticalArrangement = Arrangement.spacedBy(WfmSpacing.S)) {
                Text(
                    text = "Для подтверждения введите код:",
                    style = WfmTypography.Body14Regular,
                    color = colors.textSecondary
                )

                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .border(1.dp, colors.borderSecondary, RoundedCornerShape(WfmRadius.L))
                        .background(colors.surfaceSecondary, RoundedCornerShape(WfmRadius.L))
                        .padding(vertical = WfmSpacing.M),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = confirmCode,
                        style = WfmTypography.Headline20Bold,
                        color = colors.textPrimary
                    )
                }
            }

            // Поле ввода кода
            WfmTextField(
                value = enteredCode,
                onValueChange = { enteredCode = it },
                placeholder = "Введите код",
                isError = (enteredCode.text.isNotEmpty() && !codeMatches) || errorMessage != null,
                errorMessage = errorMessage,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                modifier = Modifier.fillMaxWidth()
            )

            // Кнопки
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(WfmSpacing.S)
            ) {
                WfmSecondaryButton(
                    text = "Отменить",
                    onClick = onDismiss,
                    modifier = Modifier.weight(1f)
                )

                WfmPrimaryButton(
                    text = "Удалить",
                    onClick = {
                        isLoading = true
                        errorMessage = null
                        viewModel.deleteAccount(
                            onSuccess = {
                                isLoading = false
                                onSuccess()
                            },
                            onError = { message ->
                                isLoading = false
                                errorMessage = message
                            }
                        )
                    },
                    enabled = codeMatches,
                    isLoading = isLoading,
                    modifier = Modifier.weight(1f)
                )
            }
        }
    }
}

// ─────────────────────────────────────────────────────────────────
// PREVIEW
// ─────────────────────────────────────────────────────────────────

@Preview(name = "Delete Account Screen - Light", showBackground = true)
@Composable
private fun DeleteAccountScreenPreview() {
    WFMAppTheme(darkTheme = false) {
        DeleteAccountScreen(
            viewModel = PreviewDeleteAccountViewModel(),
            onSuccess = {},
            onDismiss = {}
        )
    }
}

private class PreviewDeleteAccountViewModel : SettingsViewModel(
    userManager = null!!,
    toastManager = ToastManager(),
    tokenStorage = null!!,
    impersonationStorage = null!!,
    analyticsService = com.beyondviolet.wfm.core.analytics.NoOpAnalyticsService(),
    userService = null!!
)
