import Foundation
import SwiftUI
import WFMUI

/// Состояния UI авторизации
public enum AuthUiState: Equatable {
    case idle
    case loading
    case codeSent(CodeSentResponse)
    case requiresCaptcha(retryAction: CaptchaRetryAction)
    case authenticated
    case error(String)

    public static func == (lhs: AuthUiState, rhs: AuthUiState) -> Bool {
        switch (lhs, rhs) {
        case (.idle, .idle), (.loading, .loading), (.authenticated, .authenticated):
            return true
        case (.codeSent, .codeSent):
            return true
        case (.requiresCaptcha, .requiresCaptcha):
            return true
        case (.error(let lMsg), .error(let rMsg)):
            return lMsg == rMsg
        default:
            return false
        }
    }
}

/// Действие для повтора после решения капчи
public enum CaptchaRetryAction: Identifiable {
    case requestCode(phone: String, notificationType: NotificationType)
    case requestRegistrationCode(phone: String, notificationType: NotificationType)
    case verifyCode(phone: String, code: String)

    public var id: String {
        switch self {
        case .requestCode(let phone, let type):
            return "requestCode_\(phone)_\(type.rawValue)"
        case .requestRegistrationCode(let phone, let type):
            return "requestRegistrationCode_\(phone)_\(type.rawValue)"
        case .verifyCode(let phone, let code):
            return "verifyCode_\(phone)_\(code)"
        }
    }
}

/// ViewModel для управления процессом авторизации
@MainActor
public class AuthViewModel: ObservableObject {
    @Published public var uiState: AuthUiState = .idle {
        didSet {
            // Сохраняем последнее CodeSent для восстановления после ошибки
            if case .codeSent(let response) = uiState {
                lastCodeSentResponse = response
            }
        }
    }
    @Published public var phone: String = "+7"
    @Published public var code: String = ""
    @Published public var selectedNotificationType: NotificationType = .phoneCode
    /// Ошибка поля ввода телефона (отображается inline в поле, а не тостом)
    @Published public var phoneError: String? = nil
    /// Ошибка поля ввода кода (отображается inline в поле, а не тостом)
    @Published public var codeError: String? = nil

    // Данные регистрации (сохраняются для использования после ввода кода)
    private var pendingRegistrationData: (firstName: String, lastName: String, gender: Gender, birthDate: String)?
    // Последний CodeSentResponse (для восстановления состояния после ошибки)
    private var lastCodeSentResponse: CodeSentResponse?

    /// Коллбэк аналитики — устанавливается через AuthDependencyContainer.
    /// Вызывается с именем события: phone_submitted, code_submitted, login_completed.
    public var onTrack: ((String) -> Void)?

    private let authService: AuthService
    private let tokenStorage: TokenStorage
    private let toastManager: ToastManager

    public init(authService: AuthService, tokenStorage: TokenStorage, toastManager: ToastManager = ToastManager()) {
        self.authService = authService
        self.tokenStorage = tokenStorage
        self.toastManager = toastManager
    }

    // MARK: - Phone Input Actions

    /// Запросить код подтверждения
    public func requestCode(phone: String, notificationType: NotificationType) async {
        self.phone = phone
        self.selectedNotificationType = notificationType
        phoneError = nil
        uiState = .loading
        onTrack?("phone_submitted")

        do {
            let response = try await authService.requestCode(
                phone: phone,
                notificationType: notificationType
            )
            uiState = .codeSent(response)

            // Открываем мессенджер если нужно
            if response.channel == .telegram {
                TelegramUtils.openIfNeeded(botUsername: response.botUsername, botStartPayload: response.botStartPayload)
            } else if response.channel == .max {
                MaxUtils.openIfNeeded(botUsername: response.botUsername, botStartPayload: response.botStartPayload)
            }
        } catch AuthError.userNotExists {
            // Пользователь не существует — теневая регистрация с пустым шаблоном
            pendingRegistrationData = (firstName: "", lastName: "", gender: .male, birthDate: "1970-01-01")
            await requestRegistrationCode(phone: phone, notificationType: notificationType)
        } catch AuthError.validationError(let msg) {
            // Ошибка валидации — показываем inline в поле телефона
            phoneError = msg
            uiState = .idle
        } catch AuthError.unknown(let msg) {
            // Ошибка валидации номера — показываем inline в поле
            phoneError = msg
            uiState = .idle
        } catch let error as AuthError {
            handleAuthError(error, retryAction: .requestCode(phone: phone, notificationType: notificationType))
        } catch {
            toastManager.show(message: "Проверьте подключение к интернету", state: .error)
            uiState = .idle
        }
    }

    /// Повторить запрос кода
    public func resendCode() async {
        await requestCode(phone: phone, notificationType: selectedNotificationType)
    }

    // MARK: - Registration Actions

    /// Запросить код для регистрации
    private func requestRegistrationCode(phone: String, notificationType: NotificationType) async {
        self.phone = phone
        self.selectedNotificationType = notificationType
        uiState = .loading

        do {
            let response = try await authService.requestRegistrationCode(
                phone: phone,
                notificationType: notificationType
            )
            uiState = .codeSent(response)

            // Открываем мессенджер если нужно
            if response.channel == .telegram {
                TelegramUtils.openIfNeeded(botUsername: response.botUsername, botStartPayload: response.botStartPayload)
            } else if response.channel == .max {
                MaxUtils.openIfNeeded(botUsername: response.botUsername, botStartPayload: response.botStartPayload)
            }
        } catch AuthError.validationError(let msg) {
            phoneError = msg
            uiState = .idle
        } catch AuthError.unknown(let msg) {
            // Ошибка валидации номера — показываем inline в поле
            phoneError = msg
            uiState = .idle
        } catch let error as AuthError {
            handleAuthError(error, retryAction: .requestRegistrationCode(phone: phone, notificationType: notificationType))
        } catch {
            toastManager.show(message: "Проверьте подключение к интернету", state: .error)
            uiState = .idle
        }
    }

    /// Зарегистрировать нового пользователя (вызывается после ввода кода)
    private func registerWithCode(code: String) async {
        guard let regData = pendingRegistrationData else {
            toastManager.show(message: "Данные регистрации не найдены", state: .error)
            restoreToLastValidState()
            return
        }

        uiState = .loading

        let registrationData = RegistrationData(
            appId: "5",
            phone: phone,
            code: code,
            firstName: regData.firstName,
            lastName: regData.lastName,
            gender: regData.gender.apiValue,
            cityId: 1,  // Временно всегда 1
            birthDate: regData.birthDate,
            deviceName: await AuthService.getDeviceName()
        )

        do {
            let response = try await authService.register(data: registrationData)
            try await tokenStorage.saveTokens(response.oauth)
            pendingRegistrationData = nil  // Очищаем данные
            uiState = .authenticated
        } catch AuthError.invalidCode(let msg) {
            // Неверный код при регистрации — показываем inline в поле
            codeError = msg
            restoreToLastValidState()
        } catch let error as AuthError {
            handleAuthError(error, retryAction: .verifyCode(phone: phone, code: code))
        } catch {
            toastManager.show(message: "Ошибка регистрации: \(error.localizedDescription)", state: .error)
            restoreToLastValidState()
        }
    }

    // MARK: - Code Verification Actions

    /// Подтвердить код
    public func verifyCode(code: String) async {
        self.code = code
        codeError = nil  // Сбрасываем ошибку поля перед новым запросом
        uiState = .loading
        onTrack?("code_submitted")

        // Проверяем, это регистрация или обычная авторизация
        if pendingRegistrationData != nil {
            // Регистрация - вызываем register
            await registerWithCode(code: code)
        } else {
            // Обычная авторизация
            do {
                let tokens = try await authService.verifyCode(phone: phone, code: code)
                try await tokenStorage.saveTokens(tokens)
                uiState = .authenticated
            } catch AuthError.captchaRequired {
                handleAuthError(AuthError.captchaRequired, retryAction: .verifyCode(phone: phone, code: code))
            } catch AuthError.invalidCode(let msg) {
                // Неверный код — показываем серверное сообщение inline в поле
                codeError = msg
                restoreToLastValidState()
            } catch let error as AuthError {
                handleAuthError(error, retryAction: .verifyCode(phone: phone, code: code))
            } catch {
                toastManager.show(message: "Ошибка подтверждения: \(error.localizedDescription)", state: .error)
                restoreToLastValidState()
            }
        }
    }

    // MARK: - Captcha Handling

    /// Повторить действие после решения капчи
    public func retryAfterCaptcha(captchaToken: String, action: CaptchaRetryAction) async {
        uiState = .loading

        do {
            switch action {
            case .requestCode(let phone, let notificationType):
                let response = try await authService.requestCode(
                    phone: phone,
                    notificationType: notificationType,
                    captcha: captchaToken
                )
                uiState = .codeSent(response)

            case .requestRegistrationCode(let phone, let notificationType):
                let response = try await authService.requestRegistrationCode(
                    phone: phone,
                    notificationType: notificationType,
                    captcha: captchaToken
                )
                uiState = .codeSent(response)

            case .verifyCode(let phone, let code):
                let tokens = try await authService.verifyCode(phone: phone, code: code)
                try await tokenStorage.saveTokens(tokens)
                uiState = .authenticated
            }
        } catch let error as AuthError {
            handleAuthError(error, retryAction: action)
        } catch {
            toastManager.show(message: "Проверьте подключение к интернету", state: .error)
            restoreToLastValidState()
        }
    }

    // MARK: - State Management

    /// Сбросить состояние до ввода телефона
    public func resetToPhoneInput() {
        code = ""
        codeError = nil
        phoneError = nil
        lastCodeSentResponse = nil
        uiState = .idle
    }

    /// Вызывается когда пользователь вернулся на PhoneInput (свайп назад с CodeInput)
    /// Сбрасывает сохранённый CodeSent чтобы ошибки не открывали CodeInput повторно
    public func onNavigatedBackToPhoneInput() {
        lastCodeSentResponse = nil
        codeError = nil
        code = ""
        uiState = .idle
    }

    /// Установить код из deep link и автоматически проверить
    /// Используется для автоматической вставки кода из Telegram
    public func setCodeFromDeepLink(_ code: String) {
        guard code.count == 4 else { return }
        self.code = code
        Task {
            await verifyCode(code: code)
        }
    }

    // MARK: - Private Helpers

    private func handleAuthError(_ error: AuthError, retryAction: CaptchaRetryAction) {
        switch error {
        case .captchaRequired:
            uiState = .requiresCaptcha(retryAction: retryAction)
        case .networkError:
            toastManager.show(message: "Проверьте подключение к интернету", state: .error)
            restoreToLastValidState()
        case .unknown(let message):
            toastManager.show(message: message, state: .error)
            restoreToLastValidState()
        default:
            let message = error.localizedDescription ?? "Неизвестная ошибка"
            toastManager.show(message: message, state: .error)
            restoreToLastValidState()
        }
    }

    /// Восстановить состояние: если есть последний CodeSent — вернуться к нему, иначе — к idle
    private func restoreToLastValidState() {
        if let response = lastCodeSentResponse {
            uiState = .codeSent(response)
        } else {
            uiState = .idle
        }
    }

}
