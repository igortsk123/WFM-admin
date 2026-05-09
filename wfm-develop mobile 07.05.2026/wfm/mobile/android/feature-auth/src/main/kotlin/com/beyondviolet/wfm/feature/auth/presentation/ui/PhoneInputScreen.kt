package com.beyondviolet.wfm.feature.auth.presentation.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.tooling.preview.Preview
import com.beyondviolet.wfm.feature.auth.presentation.viewmodels.AuthUiState
import com.beyondviolet.wfm.feature.auth.presentation.viewmodels.AuthViewModel
import com.beyondviolet.wfm.feature.auth.presentation.viewmodels.NavigationEvent
import kotlinx.coroutines.delay
import com.beyondviolet.wfm.ui.components.WfmPhoneTextField
import com.beyondviolet.wfm.ui.components.WfmPrimaryButton
import com.beyondviolet.wfm.ui.components.WfmSegmentedControl
import com.beyondviolet.wfm.ui.components.WfmTextButton
import com.beyondviolet.wfm.ui.theme.WfmSpacing
import com.beyondviolet.wfm.ui.theme.WfmTheme
import com.beyondviolet.wfm.ui.theme.WfmTypography
import org.koin.androidx.compose.koinViewModel
import com.beyondviolet.wfm.ui.theme.*

/**
 * Экран ввода номера телефона
 */
@Composable
fun PhoneInputScreen(
    viewModel: AuthViewModel = koinViewModel(),
    onCodeSent: (channel: String, botUsername: String?, botStartPayload: String?) -> Unit = { _, _, _ -> },
    onSupportClick: () -> Unit = {}
) {
    val uiState by viewModel.uiState.collectAsState()
    val phone by viewModel.phone.collectAsState()
    val notificationType by viewModel.notificationType.collectAsState()
    val phoneFieldError by viewModel.phoneFieldError.collectAsState()

    // Трекинг просмотра экрана
    LaunchedEffect(Unit) {
        viewModel.onTrack?.invoke("phone_input_viewed")
    }

    // Навигация через одноразовые события (предотвращает повторную навигацию при recomposition)
    LaunchedEffect(Unit) {
        viewModel.navigationEvent.collect { event ->
            when (event) {
                is NavigationEvent.CodeSent -> {
                    onCodeSent(event.channel, event.botUsername, event.botStartPayload)
                }
                else -> {}
            }
        }
    }

    // Показываем hCaptcha диалог при необходимости
    if (uiState is AuthUiState.CaptchaRequired) {
        val action = (uiState as AuthUiState.CaptchaRequired).action
        HCaptchaDialog(
            onSuccess = { token ->
                viewModel.onCaptchaSuccess(token, action)
            },
            onDismiss = viewModel::onCaptchaDismiss
        )
    }

    PhoneInputContent(
        phone = phone,
        notificationType = notificationType,
        uiState = uiState,
        phoneFieldError = phoneFieldError,
        onPhoneChange = viewModel::onPhoneChanged,
        onNotificationTypeChange = viewModel::setNotificationType,
        onRequestCode = viewModel::requestCode,
        onSupportClick = onSupportClick
    )
}

@Composable
private fun PhoneInputContent(
    phone: TextFieldValue,
    notificationType: String,
    uiState: AuthUiState,
    phoneFieldError: String? = null,
    onPhoneChange: (TextFieldValue) -> Unit,
    onNotificationTypeChange: (String) -> Unit,
    onRequestCode: () -> Unit,
    onSupportClick: () -> Unit = {}
) {
    val colors = WfmTheme.colors
    val isLoading = uiState is AuthUiState.LoadingCodeRequest
    val isPhoneValid = phone.text.length == 12

    // FocusRequester для автофокуса на поле ввода телефона
    val phoneFocusRequester = remember { FocusRequester() }
    val view = LocalView.current

    // Автофокус на поле ввода при входе на экран
    // Ждем полной отрисовки View перед показом клавиатуры
    LaunchedEffect(Unit) {
        view.post {
            // Дополнительная задержка для гарантии отрисовки
            view.postDelayed({
                phoneFocusRequester.requestFocus()
            }, 150)
        }
    }

    // Локальное состояние для выбранного сегмента
    // Telegram (0) -> telegram_code, MAX (1) -> max_code, Звонок (2) -> phone_code
    var selectedSegmentIndex by remember(notificationType) {
        mutableIntStateOf(
            when (notificationType) {
                "phone_code" -> 2
                "max_code" -> 1
                else -> 0 // telegram_code
            }
        )
    }

    Scaffold(
        containerColor = colors.surfaceBase
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            // Scrollable контент
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
            ) {
                // Top Bar с кнопкой "Поддержка"
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = WfmSpacing.L, vertical = WfmSpacing.XXXS),
                    horizontalArrangement = Arrangement.End,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    WfmTextButton(
                        text = "Поддержка",
                        onClick = onSupportClick
                    )
                }

                // Контент с полями
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = WfmSpacing.L),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Spacer(modifier = Modifier.height(WfmSpacing.XXXL))

                    // Заголовок и подзаголовок
                    Text(
                        text = "Добро пожаловать",
                        style = WfmTypography.Headline24Bold,
                        color = colors.textPrimary,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.fillMaxWidth()
                    )

                    Spacer(modifier = Modifier.height(WfmSpacing.XXS))

                    Text(
                        text = "Введите номер телефона и мы отправим код, смс или перезвоним",
                        style = WfmTypography.Body16Regular,
                        color = colors.textSecondary,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.fillMaxWidth()
                    )

                    Spacer(modifier = Modifier.height(WfmSpacing.L))

                    // Segmented Control
                    // Telegram (0) -> telegram_code, MAX (1) -> max_code, Звонок (2) -> phone_code
                    WfmSegmentedControl(
                        selectedIndex = selectedSegmentIndex,
                        options = listOf("Telegram", "MAX", "Звонок"),
                        onSelectionChange = { index ->
                            if (!isLoading) {
                                selectedSegmentIndex = index
                                val type = when (index) {
                                    0 -> "telegram_code"
                                    1 -> "max_code"
                                    2 -> "phone_code"
                                    else -> "telegram_code"
                                }
                                onNotificationTypeChange(type)
                            }
                        },
                        modifier = Modifier.fillMaxWidth()
                    )

                    Spacer(modifier = Modifier.height(WfmSpacing.L))

                    // Поле ввода телефона
                    WfmPhoneTextField(
                        value = phone,
                        onValueChange = onPhoneChange,
                        enabled = !isLoading,
                        isError = phoneFieldError != null,
                        errorMessage = phoneFieldError,
                        focusRequester = phoneFocusRequester,
                        modifier = Modifier.fillMaxWidth()
                    )

                    // Отступ для кнопки (высота кнопки + padding + место для клавиатуры)
                    Spacer(modifier = Modifier.height(120.dp))
                }
            }

            // Кнопка "Далее" прикреплена к низу и поднимается с клавиатурой
            WfmPrimaryButton(
                text = "Далее",
                onClick = onRequestCode,
                enabled = isPhoneValid && !isLoading,
                isLoading = isLoading,
                modifier = Modifier
                    .fillMaxWidth()
                    .align(Alignment.BottomCenter)
                    .padding(horizontal = WfmSpacing.L)
                    .padding(bottom = WfmSpacing.XXL)
                    .imePadding() // Поднимается вместе с клавиатурой
            )
        }
    }
}

@Preview(showBackground = true, backgroundColor = 0xFFF5F5FC)
@Composable
fun PhoneInputScreenPreview() {
    WfmTheme {
        PhoneInputContent(
            phone = TextFieldValue(""),
            notificationType = "telegram_code",
            uiState = AuthUiState.Idle,
            onPhoneChange = {},
            onNotificationTypeChange = {},
            onRequestCode = {},
            onSupportClick = {}
        )
    }
}

@Preview(showBackground = true, backgroundColor = 0xFFF5F5FC)
@Composable
fun PhoneInputScreenFilledPreview() {
    WfmTheme {
        PhoneInputContent(
            phone = TextFieldValue("9996678899"),
            notificationType = "telegram_code",
            uiState = AuthUiState.Idle,
            onPhoneChange = {},
            onNotificationTypeChange = {},
            onRequestCode = {},
            onSupportClick = {}
        )
    }
}
