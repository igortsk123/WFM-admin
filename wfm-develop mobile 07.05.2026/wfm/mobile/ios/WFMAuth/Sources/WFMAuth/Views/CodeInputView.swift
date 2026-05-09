import SwiftUI
import WFMUI

// MARK: - AuthUiState Extension

extension AuthUiState {
    /// Возвращает true, если состояние - загрузка
    var isLoading: Bool {
        if case .loading = self {
            return true
        }
        return false
    }
}

// MARK: - CodeInputView

/// Экран ввода кода подтверждения
///
/// Логика:
/// 1. Пользователь вводит 4 цифры кода
/// 2. Для SMS/Telegram - автоотправка при вводе 4-й цифры (для удобства)
/// 3. Для всех каналов - кнопка "Подтвердить" (активна после ввода 4 цифр)
/// 4. Deep link из Telegram автоматически вставляет и отправляет код
/// 5. Таймер для повторной отправки кода
public struct CodeInputView: View {
    @ObservedObject var viewModel: AuthViewModel
    @ObservedObject private var deepLinkManager = DeepLinkManager.shared
    @Environment(\.dismiss) private var dismiss
    @Environment(\.wfmColors) private var colors
    @State private var code: String = ""
    @State private var remainingSeconds: Int = 0
    @State private var timer: Timer?
    @FocusState private var isCodeFocused: Bool

    public init(viewModel: AuthViewModel) {
        self.viewModel = viewModel
    }

    public var body: some View {
        VStack(spacing: 0) {
            // Nav bar
            HStack(spacing: 0) {
                Button { dismiss() } label: {
                    WFMIcons.arrowLeft
                        .frame(width: 24, height: 24)
                        .foregroundColor(colors.barsTextPrimary)
                }
                .padding(WFMSpacing.s)
                Spacer()
            }
            .frame(height: 48)
            .padding(.horizontal, WFMSpacing.xs)
            .overlay(alignment: .bottom) {
                Rectangle()
                    .fill(colors.barsBorder)
                    .frame(height: 1)
            }

            // Основной контент
            VStack(spacing: WFMSpacing.l) {
                // Заголовок и описание
                VStack(spacing: WFMSpacing.xxs) {
                    Text(titleText)
                        .wfmHeadline24Bold()
                        .foregroundColor(colors.textPrimary)
                        .multilineTextAlignment(.center)

                    descriptionView
                        .multilineTextAlignment(.center)
                }

                // Поле ввода кода - узкое, с дополнительными отступами
                VStack(alignment: .leading, spacing: WFMSpacing.xxs) {
                    codeInputField

                    // Ошибка валидации кода
                    if let message = viewModel.codeError {
                        Text(message)
                            .font(WFMTypography.caption12Regular)
                            .foregroundColor(colors.textError)
                    }
                }
                .padding(.horizontal, 52) // Дополнительный отступ для узкого поля (16 + 52 = 68 от края)

                // Кнопка открытия мессенджера (Telegram или MAX)
                if currentChannel == .telegram {
                    WFMSocialButton(
                        icon: WFMAuthAssets.icTelegram,
                        text: "В Telegram",
                        isEnabled: true,
                        errorMessage: nil
                    ) {
                        openTelegramBot()
                    }
                    .padding(.horizontal, 52) // Дополнительный отступ (16 + 52 = 68 от края)
                } else if currentChannel == .max {
                    WFMSocialButton(
                        icon: WFMAuthAssets.icMax,
                        text: "В MAX",
                        isEnabled: true,
                        errorMessage: nil
                    ) {
                        openMaxBot()
                    }
                    .padding(.horizontal, 52) // Дополнительный отступ (16 + 52 = 68 от края)
                }
            }
            .padding(.horizontal, WFMSpacing.m)
            .padding(.top, WFMSpacing.xxxl)

            Spacer()

            // Нижние кнопки
            VStack(spacing: WFMSpacing.m) {
                // Кнопка повторной отправки (с таймером) - сверху
                if ( currentChannel == .call || currentChannel == .sms ) {
                    resendButton
                }

                // Кнопка подтверждения (для всех каналов) - снизу
                WFMPrimaryButton(
                    text: "Подтвердить",
                    isEnabled: isConfirmEnabled
                ) {
                    Task {
                        await viewModel.verifyCode(code: code)
                    }
                }
            }
            .fixedSize(horizontal: false, vertical: true)
            .padding(.horizontal, WFMSpacing.m)
            .padding(.bottom, WFMSpacing.xxl)
        }
        .background(colors.surfaceBase.ignoresSafeArea())
        .navigationBarHidden(true)
        .onAppear {
            viewModel.onTrack?("code_input_viewed")
            startTimer()
            // Автофокус на поле ввода для SMS/Звонка (не для MAX и Telegram)
            if currentChannel == .sms || currentChannel == .call {
                isCodeFocused = true
            }
        }
        .onDisappear {
            timer?.invalidate()
        }
        .onChange(of: deepLinkManager.receivedAuthCode) { oldValue, newValue in
            // Обработка кода из deep link (Telegram)
            guard let deepLinkCode = newValue, deepLinkCode.count == 4 else { return }
            code = deepLinkCode
            deepLinkManager.clearAuthCode()
            Task {
                await viewModel.verifyCode(code: deepLinkCode)
            }
        }
        .overlay {
            // Индикатор загрузки
            if case .loading = viewModel.uiState {
                ZStack {
                    colors.surfaceOverlayModal.ignoresSafeArea()
                    ProgressView()
                        .progressViewStyle(.circular)
                        .tint(colors.iconBrand)
                }
            }
        }
    }

    // MARK: - Subviews

    /// Поле ввода кода (4 цифры)
    private var codeInputField: some View {
        TextField("", text: $code, prompt: Text("XXXX").foregroundColor(colors.textPlaceholder))
            .font(WFMTypography.body14Regular)
            .foregroundColor(colors.textPrimary)
            .keyboardType(.numberPad)
            .textContentType(.oneTimeCode)
            .multilineTextAlignment(.center)
            .padding(WFMSpacing.m)
            .background(colors.inputBg)
            .cornerRadius(WFMRadius.l)
            .overlay(
                RoundedRectangle(cornerRadius: WFMRadius.l)
                    .stroke(viewModel.codeError != nil ? colors.inputBorderError : colors.inputBorder, lineWidth: 1)
            )
            .focused($isCodeFocused)
            .onChange(of: code) { oldValue, newValue in
                // Сбрасываем ошибку при вводе нового кода
                if viewModel.codeError != nil {
                    viewModel.codeError = nil
                }

                // Ограничение 4 цифры
                if newValue.count > 4 {
                    code = String(newValue.prefix(4))
                }

                // Автоотправка ОТКЛЮЧЕНА для ручного ввода
                // Telegram - только через deep link
                // SMS/Звонок - только через кнопку "Подтвердить"
            }
    }

    /// Описание с номером телефона (с жирным номером)
    private var descriptionView: some View {
        let baseText: String = {
            switch currentChannel {
            case .call:
                return "Введите последние 4 цифры номера с которого мы вам позвоним на номер "
            case .telegram:
                return "Введите код из телеграм бота отправленный на номер "
            case .max:
                return "Введите код из MAX бота отправленный на номер "
            case .sms, .none:
                return "Введите код из СМС отправленный на номер "
            }
        }()

        return (Text(baseText)
            .font(WFMTypography.body16Regular)
         + Text(viewModel.phone)
            .font(WFMTypography.headline16Bold))
        .foregroundColor(colors.textPrimary)
    }

    /// Кнопка повторной отправки с таймером
    private var resendButton: some View {
        WFMTextButton(
            text: remainingSeconds > 0 ? resendButtonTextWithTimer : resendButtonText,
            isEnabled: remainingSeconds == 0
        ) {
            Task {
                await viewModel.resendCode()
                // Перезапускаем таймер после повторной отправки
                startTimer()
            }
        }
    }

    // MARK: - Computed Properties

    private var codeSentResponse: CodeSentResponse? {
        if case .codeSent(let response) = viewModel.uiState {
            return response
        }
        return nil
    }

    /// Канал доставки кода
    private var currentChannel: DeliveryChannel? {
        codeSentResponse?.channel
    }

    /// Можно ли подтвердить код (активна когда введено 4 цифры)
    private var isConfirmEnabled: Bool {
        code.count == 4 && !viewModel.uiState.isLoading
    }

    /// Заголовок в зависимости от канала
    private var titleText: String {
        guard let channel = currentChannel else {
            return "Введите код"
        }

        switch channel {
        case .call:
            return "Мы сейчас вам перезвоним"
        case .telegram:
            return "Введите код из Telegram"
        case .max:
            return "Введите код из MAX"
        case .sms:
            return "Введите код из SMS"
        }
    }

    /// Текст кнопки повторной отправки
    private var resendButtonText: String {
        guard let channel = currentChannel else {
            return "Отправить код повторно"
        }

        switch channel {
        case .call:
            return "Перезвонить повторно"
        case .telegram, .max, .sms:
            return "Отправить код повторно"
        }
    }

    /// Текст кнопки с таймером
    private var resendButtonTextWithTimer: String {
        guard let channel = currentChannel else {
            return "Отправить код повторно через \(formattedTime)"
        }

        switch channel {
        case .call:
            return "Перезвонить повторно через \(formattedTime)"
        case .telegram, .max, .sms:
            return "Отправить код повторно через \(formattedTime)"
        }
    }

    private var formattedTime: String {
        return "\(remainingSeconds) сек"
    }

    // MARK: - Timer

    private func startTimer() {
        guard let response = codeSentResponse,
              let expiresAt = response.expiresAt else { return }

        // Вычисляем оставшееся время
        let now = Date().timeIntervalSince1970
        let remaining = Int(expiresAt - now)

        remainingSeconds = max(0, remaining)

        // Запускаем таймер
        timer?.invalidate()
        timer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { _ in
            if remainingSeconds > 0 {
                remainingSeconds -= 1
            } else {
                timer?.invalidate()
            }
        }
    }

    // MARK: - Messenger Deep Links

    /// Открывает Telegram бота с deep link
    private func openTelegramBot() {
        guard let response = codeSentResponse,
              let botUsername = response.botUsername else { return }
        let url = TelegramUtils.createTelegramDeepLink(botUsername: botUsername, botStartPayload: response.botStartPayload)
        MessengerUtils.openUrl(url)
    }

    /// Открывает MAX бота с deep link
    private func openMaxBot() {
        guard let response = codeSentResponse,
              let botUsername = response.botUsername else { return }
        let url = MaxUtils.createMaxDeepLink(botUsername: botUsername, botStartPayload: response.botStartPayload)
        MessengerUtils.openUrl(url)
    }
}

#Preview("SMS Channel") {
    struct PreviewWrapper: View {
        @StateObject var viewModel = AuthViewModel(
            authService: AuthService(),
            tokenStorage: TokenStorage()
        )

        var body: some View {
            NavigationStack {
                CodeInputView(viewModel: viewModel)
                    .wfmTheme()
                    .onAppear {
                        viewModel.phone = "+7 (999) 123 45-67"
                        viewModel.uiState = .codeSent(CodeSentResponse(
                            channel: .sms,
                            botUsername: nil,
                            botStartPayload: nil,
                            expiresAt: Date().addingTimeInterval(60).timeIntervalSince1970
                        ))
                    }
            }
        }
    }

    return PreviewWrapper()
}

#Preview("Call Channel") {
    struct PreviewWrapper: View {
        @StateObject var viewModel = AuthViewModel(
            authService: AuthService(),
            tokenStorage: TokenStorage()
        )

        var body: some View {
            NavigationStack {
                CodeInputView(viewModel: viewModel)
                    .wfmTheme()
                    .onAppear {
                        viewModel.phone = "+7 (023) 123 45 32"
                        viewModel.uiState = .codeSent(CodeSentResponse(
                            channel: .call,
                            botUsername: nil,
                            botStartPayload: nil,
                            expiresAt: Date().addingTimeInterval(60).timeIntervalSince1970
                        ))
                    }
            }
        }
    }

    return PreviewWrapper()
}

#Preview("Telegram Channel") {
    struct PreviewWrapper: View {
        @StateObject var viewModel = AuthViewModel(
            authService: AuthService(),
            tokenStorage: TokenStorage()
        )

        var body: some View {
            NavigationStack {
                CodeInputView(viewModel: viewModel)
                    .wfmTheme()
                    .onAppear {
                        viewModel.phone = "+7 (999) 123 45-67"
                        viewModel.uiState = .codeSent(CodeSentResponse(
                            channel: .telegram,
                            botUsername: "wfm_bot",
                            botStartPayload: "auth123",
                            expiresAt: Date().addingTimeInterval(60).timeIntervalSince1970
                        ))
                    }
            }
        }
    }

    return PreviewWrapper()
}
