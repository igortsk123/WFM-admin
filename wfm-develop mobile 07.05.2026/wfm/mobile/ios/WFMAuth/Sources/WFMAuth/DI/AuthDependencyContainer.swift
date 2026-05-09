import Foundation
import WFMUI

/// DI контейнер для модуля авторизации
///
/// Инкапсулирует все зависимости Auth модуля:
/// - AuthService (работа с API)
/// - TokenStorage (хранение токенов)
/// - ToastManager (всплывающие уведомления)
/// - AuthViewModel (бизнес-логика)
@MainActor
public class AuthDependencyContainer {
    // MARK: - Services

    /// Сервис авторизации
    public let authService: AuthService

    /// Хранилище токенов
    public let tokenStorage: TokenStorage

    /// Менеджер тостов (для показа системных ошибок)
    public let toastManager: ToastManager

    /// Коллбэк аналитики — вызывается с именем события при ключевых действиях авторизации.
    /// Устанавливается из основного приложения через DependencyContainer.
    public var analyticsCallback: ((String) -> Void)?

    // MARK: - Initialization

    /// Создать контейнер с дефолтными зависимостями
    public init(toastManager: ToastManager = ToastManager()) {
        self.tokenStorage = TokenStorage()
        self.authService = AuthService()
        self.toastManager = toastManager
    }

    /// Создать контейнер с кастомными зависимостями (для тестов)
    public init(authService: AuthService, tokenStorage: TokenStorage, toastManager: ToastManager = ToastManager()) {
        self.authService = authService
        self.tokenStorage = tokenStorage
        self.toastManager = toastManager
    }

    // MARK: - Factory Methods

    /// Создать AuthViewModel
    public func makeAuthViewModel() -> AuthViewModel {
        let viewModel = AuthViewModel(
            authService: authService,
            tokenStorage: tokenStorage,
            toastManager: toastManager
        )
        viewModel.onTrack = analyticsCallback
        return viewModel
    }
}
