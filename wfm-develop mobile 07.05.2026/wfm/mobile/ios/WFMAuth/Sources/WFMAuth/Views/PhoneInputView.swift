import SwiftUI
import WFMUI

/// Экран ввода номера телефона
/// Дизайн из Figma: node-id=2734-5778
public struct PhoneInputView: View {
    @ObservedObject var viewModel: AuthViewModel
    @State private var selectedSegment: Int = 0  // 0 = Telegram, 1 = MAX, 2 = Звонок
    @State private var phoneNumber: String = ""
    @FocusState private var isPhoneFocused: Bool

    @Environment(\.wfmColors) private var colors

    private let onSupportClick: () -> Void

    public init(viewModel: AuthViewModel, onSupportClick: @escaping () -> Void = {}) {
        self.viewModel = viewModel
        self.onSupportClick = onSupportClick
    }

    public var body: some View {
        ZStack {
            // Фон
            colors.surfaceBase
                .ignoresSafeArea()

            VStack(spacing: 0) {
                // Top Bar с кнопкой "Поддержка"
                HStack {
                    Spacer()
                    WFMTextButton(text: "Поддержка") {
                        onSupportClick()
                    }
                }
                .padding(.horizontal, WFMSpacing.l)
                .padding(.vertical, WFMSpacing.xxxs)

                // Основной контент
                VStack(spacing: 0) {
                    Spacer()
                        .frame(height: WFMSpacing.xxxl)

                    // Заголовок и подзаголовок
                    VStack(spacing: WFMSpacing.xxs) {
                        Text("Добро пожаловать")
                            .font(WFMTypography.headline24Bold)
                            .foregroundColor(colors.textPrimary)
                            .multilineTextAlignment(.center)
                            .frame(maxWidth: .infinity)

                        Text("Введите номер телефона и мы отправим код, смс или перезвоним")
                            .font(WFMTypography.body16Regular)
                            .foregroundColor(colors.textSecondary)
                            .multilineTextAlignment(.center)
                            .frame(maxWidth: .infinity)
                    }

                    Spacer()
                        .frame(height: WFMSpacing.xxl)

                    // Segmented Control
                    WFMSegmentedControl(
                        options: ["Telegram", "MAX", "Звонок"],
                        selectedIndex: $selectedSegment
                    )

                    Spacer()
                        .frame(height: WFMSpacing.xxl)

                    // Поле ввода телефона
                    WFMPhoneTextField(
                        phoneNumber: $phoneNumber,
                        errorMessage: viewModel.phoneError,
                        isEnabled: !isLoading,
                        isFocused: $isPhoneFocused
                    )
                    .onChange(of: phoneNumber) { _, _ in
                        if viewModel.phoneError != nil {
                            viewModel.phoneError = nil
                        }
                    }

                    Spacer()

                    // Кнопка "Далее"
                    WFMPrimaryButton(
                        text: "Далее",
                        isEnabled: isPhoneValid && !isLoading,
                        isLoading: isLoading
                    ){
                        isPhoneFocused = false
                        requestCode()
                    }.fixedSize(horizontal: false, vertical: true)

                    Spacer()
                        .frame(height: WFMSpacing.xxl)
                }
                .padding(.horizontal, WFMSpacing.l)
            }
        }
        .onAppear {
            viewModel.onTrack?("phone_input_viewed")
            // Автовыбор Telegram -> MAX -> Звонок
            if isTelegramInstalled() {
                selectedSegment = 0
            } else if MaxUtils.isMaxInstalled() {
                selectedSegment = 1
            } else {
                selectedSegment = 2
            }
            // Автофокус на поле ввода телефона
            isPhoneFocused = true
        }
    }

    // MARK: - Computed Properties

    private var isPhoneValid: Bool {
        // Полный номер: +7 (XXX) XXX XX-XX = 18 символов
        phoneNumber.count >= 18
    }

    private var isLoading: Bool {
        if case .loading = viewModel.uiState {
            return true
        }
        return false
    }

    // MARK: - Actions

    private func requestCode() {
        // Извлекаем чистый номер из форматированного
        let cleanPhone = phoneNumber
            .replacingOccurrences(of: " ", with: "")
            .replacingOccurrences(of: "(", with: "")
            .replacingOccurrences(of: ")", with: "")
            .replacingOccurrences(of: "-", with: "")

        // 0 = Telegram, 1 = MAX, 2 = Звонок
        let notificationType: NotificationType = switch selectedSegment {
            case 1: .maxCode
            case 2: .phoneCode
            default: .telegramCode
        }

        _Concurrency.Task {
            await viewModel.requestCode(phone: cleanPhone, notificationType: notificationType)
        }
    }

    // MARK: - Helpers

    /// Проверка установки Telegram
    private func isTelegramInstalled() -> Bool {
        #if !os(macOS)
        guard let telegramURL = URL(string: "tg://") else { return false }
        return UIApplication.shared.canOpenURL(telegramURL)
        #else
        return false
        #endif
    }
}

#Preview {
    PhoneInputView(viewModel: AuthViewModel(
        authService: AuthService(),
        tokenStorage: TokenStorage()
    ))
}
