package com.beyondviolet.wfm.feature.auth.presentation.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.beyondviolet.wfm.feature.auth.deeplink.DeepLinkEvent
import com.beyondviolet.wfm.feature.auth.presentation.viewmodels.AuthUiState
import com.beyondviolet.wfm.feature.auth.presentation.viewmodels.AuthViewModel
import com.beyondviolet.wfm.feature.auth.presentation.viewmodels.NavigationEvent
import com.beyondviolet.wfm.feature.auth.R
import com.beyondviolet.wfm.ui.components.WfmPrimaryButton
import com.beyondviolet.wfm.ui.components.WfmSocialButton
import com.beyondviolet.wfm.ui.components.WfmTextField
import com.beyondviolet.wfm.ui.components.WfmTextButton
import com.beyondviolet.wfm.ui.theme.WfmRadius
import com.beyondviolet.wfm.ui.theme.WfmSpacing
import com.beyondviolet.wfm.ui.theme.WfmTheme
import com.beyondviolet.wfm.ui.theme.WfmTypography
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.collectLatest
import org.koin.androidx.compose.koinViewModel
import kotlin.time.Duration.Companion.seconds
import com.beyondviolet.wfm.ui.theme.*

/**
 * Экран ввода кода подтверждения (SMS / Telegram / MAX / Call)
 */
@Composable
fun CodeInputScreen(
    viewModel: AuthViewModel = koinViewModel(),
    onAuthSuccess: () -> Unit = {},
    onBackToPhone: () -> Unit = {},
    onOpenMessenger: (channel: String, botUsername: String?, botStartPayload: String?) -> Unit = { _, _, _ -> }
) {
    val uiState by viewModel.uiState.collectAsState()
    val phone by viewModel.phone.collectAsState()
    val codeFieldError by viewModel.codeFieldError.collectAsState()

    // Трекинг просмотра экрана
    LaunchedEffect(Unit) {
        viewModel.onTrack?.invoke("code_input_viewed")
    }

    // Навигация через одноразовые события
    LaunchedEffect(Unit) {
        viewModel.navigationEvent.collect { event ->
            when (event) {
                is NavigationEvent.AuthSuccess -> onAuthSuccess()
                is NavigationEvent.CodeSent -> {
                    // При повторной отправке кода открываем мессенджер (Telegram или MAX)
                    onOpenMessenger(event.channel, event.botUsername, event.botStartPayload)
                }
                else -> {}
            }
        }
    }

    // Подписка на deep link код авторизации из Telegram
    LaunchedEffect(Unit) {
        DeepLinkEvent.authCodeReceived.collectLatest { deepLinkCode ->
            if (deepLinkCode.length == 4) {
                viewModel.verifyCode(deepLinkCode)
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

    val codeSentState = uiState as? AuthUiState.CodeSent

    CodeInputContent(
        phone = phone.text,
        uiState = uiState,
        codeFieldError = codeFieldError,
        messengerBotUsername = codeSentState?.botUsername,
        messengerBotStartPayload = codeSentState?.botStartPayload,
        onCodeChange = { code ->
            // Сбрасываем ошибку поля при вводе нового кода
            viewModel.clearCodeFieldError()
        },
        onVerifyCode = { code ->
            viewModel.verifyCode(code)
        },
        onResendCode = viewModel::requestCode,
        onBackToPhone = {
            viewModel.resetToPhoneInput()
            onBackToPhone()
        },
        onOpenMessenger = { channel, botUsername, botStartPayload ->
            onOpenMessenger(channel, botUsername, botStartPayload)
        }
    )
}

@Composable
private fun CodeInputContent(
    phone: String,
    uiState: AuthUiState,
    codeFieldError: String? = null,
    messengerBotUsername: String? = null,
    messengerBotStartPayload: String? = null,
    onCodeChange: (String) -> Unit,
    onVerifyCode: (String) -> Unit,
    onResendCode: () -> Unit,
    onBackToPhone: () -> Unit,
    onOpenMessenger: (channel: String, botUsername: String?, botStartPayload: String?) -> Unit = { _, _, _ -> }
) {
    val colors = WfmTheme.colors
    var codeValue by remember { mutableStateOf(TextFieldValue("")) }
    val isLoading = uiState is AuthUiState.LoadingVerification || uiState is AuthUiState.LoadingCodeRequest
    val focusRequester = remember { FocusRequester() }
    val view = LocalView.current

    // Получаем expiresAt и channel из состояния CodeSent
    val codeSentState = uiState as? AuthUiState.CodeSent
    val expiresAt = codeSentState?.expiresAt ?: 0.0
    val channel = codeSentState?.channel ?: "sms"

    // Вычисляем оставшееся время
    var timeLeft by remember { mutableStateOf(0) }

    LaunchedEffect(expiresAt) {
        while (true) {
            val now = System.currentTimeMillis()
            val remaining = ((expiresAt - now) / 1000).toInt()
            timeLeft = remaining.coerceAtLeast(0)

            if (timeLeft <= 0) break

            delay(1.seconds)
        }
    }

    // Автофокус при открытии экрана для SMS/Звонка (не для MAX и Telegram)
    // Ждем полной отрисовки View перед показом клавиатуры
    LaunchedEffect(Unit) {
        if (channel == "sms" || channel == "phone_code") {
            view.post {
                // Дополнительная задержка для гарантии отрисовки
                view.postDelayed({
                    focusRequester.requestFocus()
                }, 150)
            }
        }
    }

    Scaffold(
        containerColor = colors.surfacePrimary
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .imePadding() // Автоматический padding при появлении клавиатуры
        ) {
            // Top Bar с кнопкой назад
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = WfmSpacing.M, vertical = WfmSpacing.XXXS),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(WfmRadius.L))
                        .clickable(onClick = onBackToPhone)
                        .padding(WfmSpacing.S)
                ) {
                    Icon(
                        painter = painterResource(com.beyondviolet.wfm.ui.R.drawable.ic_back),
                        contentDescription = "Назад",
                        tint = colors.iconPrimary,
                        modifier = Modifier.size(40.dp)
                    )
                }
            }

            // Content с текстом, полем ввода и кнопками
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState()) // Прокрутка при необходимости
                    .padding(horizontal = WfmSpacing.M, vertical = WfmSpacing.XXXL),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // Основной контент (заголовок, описание, поле ввода)
                Column(
                    modifier = Modifier
                        .fillMaxWidth(),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    // Заголовок и описание в зависимости от канала
                    val (title, description) = when (channel) {
                        "call" -> {
                            val title = "Мы сейчас вам перезвоним"
                            val description = buildAnnotatedString {
                                append("Введите последние 4 цифры номера с которого мы вам позвоним на номер ")
                                withStyle(style = SpanStyle(fontWeight = FontWeight.Bold)) {
                                    append(phone)
                                }
                            }
                            title to description
                        }
                        "telegram" -> {
                            val title = "Введите код из Telegram"
                            val description = buildAnnotatedString {
                                append("Введите код из телеграм бота отправленный на номер ")
                                withStyle(style = SpanStyle(fontWeight = FontWeight.Bold)) {
                                    append(phone)
                                }
                            }
                            title to description
                        }
                        "max" -> {
                            val title = "Введите код из MAX"
                            val description = buildAnnotatedString {
                                append("Введите код из MAX бота отправленный на номер ")
                                withStyle(style = SpanStyle(fontWeight = FontWeight.Bold)) {
                                    append(phone)
                                }
                            }
                            title to description
                        }
                        else -> {
                            val title = "Введите код и СМС"
                            val description = buildAnnotatedString {
                                append("Введите код из СМС отправленный на номер ")
                                withStyle(style = SpanStyle(fontWeight = FontWeight.Bold)) {
                                    append(phone)
                                }
                            }
                            title to description
                        }
                    }

                    Text(
                        text = title,
                        style = WfmTypography.Headline24Bold,
                        color = colors.textPrimary,
                        textAlign = TextAlign.Center,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(bottom = WfmSpacing.S)
                    )

                    Text(
                        text = description,
                        style = WfmTypography.Body16Regular,
                        color = colors.textPrimary,
                        textAlign = TextAlign.Center,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(bottom = WfmSpacing.L)
                    )

                    // Column с дополнительным padding для узких элементов (поле ввода + кнопка Telegram)
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 52.dp), // Дополнительный отступ 52dp (итого 16+52=68dp от края)
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        // Поле ввода кода (4 цифры)
                        WfmTextField(
                            value = codeValue,
                            onValueChange = { newValue ->
                                // Только цифры, максимум 4
                                val filtered = newValue.text.filter { it.isDigit() }.take(4)
                                codeValue = TextFieldValue(
                                    text = filtered,
                                    selection = androidx.compose.ui.text.TextRange(filtered.length)
                                )
                                onCodeChange(filtered)
                            },
                            placeholder = "XXXX",
                            isError = codeFieldError != null,
                            errorMessage = codeFieldError,
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            enabled = !isLoading,
                            textAlign = TextAlign.Center,
                            modifier = Modifier
                                .fillMaxWidth()
                                .focusRequester(focusRequester)
                        )

                        // Кнопка перехода в мессенджер (Telegram или MAX)
                        if (channel == "telegram") {
                            WfmSocialButton(
                                icon = painterResource(R.drawable.ic_telegram),
                                text = "В Telegram",
                                onClick = { onOpenMessenger(channel, messengerBotUsername, messengerBotStartPayload) },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(top = WfmSpacing.L)
                            )
                        } else if (channel == "max") {
                            WfmSocialButton(
                                icon = painterResource(R.drawable.ic_max),
                                text = "В MAX",
                                onClick = { onOpenMessenger(channel, messengerBotUsername, messengerBotStartPayload) },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(top = WfmSpacing.L)
                            )
                        }
                    }
                }

                // Spacer для "прижимания" кнопок вниз
                Spacer(modifier = Modifier.weight(1f))

                // Кнопки внизу (с таймером и подтверждением)
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = WfmSpacing.M),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    // Кнопка повторной отправки (с таймером)
                    val resendButtonText = when {
                        timeLeft > 0 -> when (channel) {
                            "call" -> "Перезвонить повторно через $timeLeft сек"
                            "telegram" -> "Отправить код в Telegram через $timeLeft сек"
                            "max" -> "Отправить код в MAX через $timeLeft сек"
                            else -> "Отправить код повторно через $timeLeft сек"
                        }
                        else -> when (channel) {
                            "call" -> "Перезвонить повторно"
                            "telegram" -> "Отправить код в Telegram"
                            "max" -> "Отправить код в MAX"
                            else -> "Отправить код повторно"
                        }
                    }

                    if ( channel == "call" || channel == "sms" ) {
                        WfmTextButton(
                            text = resendButtonText,
                            onClick = {
                                codeValue = TextFieldValue("")
                                onResendCode()
                            },
                            enabled = timeLeft <= 0 && !isLoading,
                            textAlign = TextAlign.Center,
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(bottom = WfmSpacing.S)
                        )
                    }

                    // Кнопка подтверждения
                    WfmPrimaryButton(
                        text = "Подтвердить",
                        onClick = { onVerifyCode(codeValue.text) },
                        enabled = codeValue.text.length == 4 && !isLoading,
                        isLoading = isLoading,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            }
        }
    }
}

@Preview(showBackground = true, backgroundColor = 0xFFF5F5FC)
@Composable
fun CodeInputScreenCallPreview() {
    WfmTheme {
        CodeInputContent(
            phone = "+7 (023) 123 45 32",
            uiState = AuthUiState.CodeSent(
                phone = "+7 (023) 123 45 32",
                expiresAt = System.currentTimeMillis() + 60000.0,
                channel = "call"
            ),
            onCodeChange = {},
            onVerifyCode = {},
            onResendCode = {},
            onBackToPhone = {}
        )
    }
}

@Preview(showBackground = true, backgroundColor = 0xFFF5F5FC)
@Composable
fun CodeInputScreenSmsPreview() {
    WfmTheme {
        CodeInputContent(
            phone = "+79991234567",
            uiState = AuthUiState.CodeSent(
                phone = "+79991234567",
                expiresAt = System.currentTimeMillis() + 300000.0,
                channel = "sms"
            ),
            onCodeChange = {},
            onVerifyCode = {},
            onResendCode = {},
            onBackToPhone = {}
        )
    }
}

@Preview(showBackground = true, backgroundColor = 0xFFF5F5FC)
@Composable
fun CodeInputScreenTelegramPreview() {
    WfmTheme {
        CodeInputContent(
            phone = "+79991234567",
            uiState = AuthUiState.CodeSent(
                phone = "+79991234567",
                expiresAt = System.currentTimeMillis() + 300000.0,
                channel = "telegram"
            ),
            messengerBotUsername = "Test_hv_bot",
            messengerBotStartPayload = "12345",
            onCodeChange = {},
            onVerifyCode = {},
            onResendCode = {},
            onBackToPhone = {}
        )
    }
}