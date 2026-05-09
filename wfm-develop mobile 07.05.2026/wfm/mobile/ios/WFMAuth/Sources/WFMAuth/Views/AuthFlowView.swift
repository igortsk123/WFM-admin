import SwiftUI
import WFMUI

/// Auth flow - авторизация
///
/// Навигация:
/// PhoneInput → CodeInput
/// После успешной авторизации вызывается onAuthenticationCompleted
public struct AuthFlowView: View {
    @StateObject private var viewModel: AuthViewModel
    @State private var navigationPath = NavigationPath()

    @State private var captchaRetryAction: CaptchaRetryAction?
    @State private var navigationHandled = false
    /// Флаг: капча уже обработана (успех или отмена) — предотвращает двойной вызов
    @State private var captchaHandled = false

    private let toastManager: ToastManager

    /// Callback при успешной авторизации
    public var onAuthenticationCompleted: () -> Void

    /// Инициализация с DI контейнером (рекомендуется)
    public init(
        container: AuthDependencyContainer,
        onAuthenticationCompleted: @escaping () -> Void
    ) {
        _viewModel = StateObject(wrappedValue: container.makeAuthViewModel())
        self.toastManager = container.toastManager
        self.onAuthenticationCompleted = onAuthenticationCompleted
    }

    /// Инициализация с отдельными зависимостями (для совместимости)
    public init(
        authService: AuthService,
        tokenStorage: TokenStorage,
        onAuthenticationCompleted: @escaping () -> Void
    ) {
        let manager = ToastManager()
        _viewModel = StateObject(wrappedValue: AuthViewModel(
            authService: authService,
            tokenStorage: tokenStorage,
            toastManager: manager
        ))
        self.toastManager = manager
        self.onAuthenticationCompleted = onAuthenticationCompleted
    }

    public var body: some View {
        ZStack {
            // Основной контент
            NavigationStack(path: $navigationPath) {
                // Root экран Auth flow - всегда PhoneInput
                PhoneInputView(viewModel: viewModel) {
                    navigationPath.append(AuthRoute.support)
                }
                .navigationDestination(for: AuthRoute.self) { route in
                        // Маршрутизация внутри Auth flow
                        destinationView(for: route)
                    }
            }
            .onChange(of: viewModel.uiState) { oldState, newState in
                handleStateChange(newState: newState)
            }
            .onChange(of: navigationPath) { oldPath, newPath in
                // Пользователь вернулся на PhoneInput (свайп назад с CodeInput)
                if newPath.isEmpty && !oldPath.isEmpty {
                    viewModel.onNavigatedBackToPhoneInput()
                }
            }

            // Overlay с капчей (если нужна)
            if let action = captchaRetryAction {
                HCaptchaView(
                    onSuccess: { token in
                        // guard — капча может вернуть токен и после нажатия крестика
                        guard !captchaHandled else { return }
                        captchaHandled = true
                        print("✅ Captcha success")
                        captchaRetryAction = nil
                        _Concurrency.Task {
                            await viewModel.retryAfterCaptcha(captchaToken: token, action: action)
                        }
                    },
                    onCancel: {
                        // guard — не сбрасываем состояние если капча уже решена
                        guard !captchaHandled else { return }
                        captchaHandled = true
                        print("❌ Captcha cancelled")
                        captchaRetryAction = nil
                        viewModel.uiState = .idle
                    }
                )
                .transition(.opacity)
                .zIndex(999)  // Поверх всего
                .onAppear {
                    print("✅ Captcha overlay shown with action: \(action)")
                }
            }
        }
        .wfmToast(manager: toastManager)
    }

    @ViewBuilder
    private func destinationView(for route: AuthRoute) -> some View {
        switch route {
        case .codeInput:
            CodeInputView(viewModel: viewModel)
        case .support:
            SupportView()
        }
    }

    /// Централизованная обработка изменений состояния и навигации
    private func handleStateChange(newState: AuthUiState) {
        switch newState {
        case .idle, .loading, .error:
            // Сбрасываем флаг навигации при возврате в начальные состояния
            navigationHandled = false

        case .codeSent:
            // ✅ Код отправлен → переходим на экран ввода кода (только если ещё не там)
            // Проверяем, не находимся ли мы уже на CodeInput экране
            let isAlreadyOnCodeInput = !navigationPath.isEmpty

            if !isAlreadyOnCodeInput {
                print("📱 AuthFlow: Код отправлен, переход на CodeInput")
                navigationPath.append(AuthRoute.codeInput)
            } else {
                print("📱 AuthFlow: Уже на CodeInput, обновление данных без навигации")
                // Просто обновляем данные через uiState, не добавляем новый маршрут
            }
            // Сбрасываем флаг после обработки
            navigationHandled = false

        case .requiresCaptcha(let retryAction):
            // 🤖 Показываем капчу (только один раз)
            if !navigationHandled {
                print("🤖 AuthFlow: Требуется капча")
                print("   retryAction: \(retryAction)")
                navigationHandled = true
                captchaHandled = false  // Сбрасываем флаг для новой капчи
                captchaRetryAction = retryAction
                print("   captchaRetryAction установлен: \(String(describing: captchaRetryAction))")
            }

        case .authenticated:
            // ✅ Авторизация успешна → вызываем callback
            if !navigationHandled {
                print("🎉 AuthFlow: Авторизация успешна!")
                navigationHandled = true
                onAuthenticationCompleted()
            }
        }
    }
}

#Preview {
    AuthFlowView(
        container: AuthDependencyContainer(),
        onAuthenticationCompleted: {
            print("Authentication completed in preview")
        }
    )
}
