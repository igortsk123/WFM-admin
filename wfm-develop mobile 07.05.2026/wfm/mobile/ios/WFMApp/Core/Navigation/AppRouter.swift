import SwiftUI
import WFMAuth

/// Централизованное управление навигацией
///
/// Простая логика:
/// 1. isAuthenticated = false → показываем Auth экраны
/// 2. isAuthenticated = true + isLoadingRole = true → показываем Loading
/// 3. isAuthenticated = true + isLoadingRole = false → показываем Main экраны (Tasks)
/// 4. После успешной авторизации вызываем login() → загружает роль и переключает на Tasks
/// 5. При logout вызываем logout() → очищает роль и переключает на Auth
@MainActor
final class AppRouter: ObservableObject {
    // MARK: - Состояние авторизации

    /// Авторизован ли пользователь?
    /// false → показываем Auth экраны
    /// true → показываем Tasks экраны (после загрузки роли)
    @Published var isAuthenticated = false

    /// Проверка токенов при старте приложения
    @Published var isCheckingAuth = true

    /// Загрузка роли пользователя после авторизации
    @Published var isLoadingRole = false

    // MARK: - Навигационные стеки

    /// Стек навигации для Main экранов (TasksList → TaskDetail / CreateTask)
    ///
    /// Примечание: Auth flow управляет своей навигацией самостоятельно через AuthFlowView
    @Published var mainPath = NavigationPath()

    // MARK: - Dependencies

    private let tokenStorage: TokenStorage
    private let userManager: UserManager
    private let impersonationStorage: ImpersonationStorage

    init(tokenStorage: TokenStorage, userManager: UserManager, impersonationStorage: ImpersonationStorage) {
        self.tokenStorage = tokenStorage
        self.userManager = userManager
        self.impersonationStorage = impersonationStorage
    }

    // MARK: - Публичные методы

    /// Проверить токены при старте приложения и загрузить роль если авторизован
    func checkAuthentication() async {
        let hasTokens = await tokenStorage.hasTokens()

        if hasTokens {
            // Токены есть — загружаем роль
            isLoadingRole = true
            defer { isLoadingRole = false }

            await userManager.loadCurrentRole()
        }

        isAuthenticated = hasTokens
        isCheckingAuth = false
    }

    /// Успешная авторизация - загружаем роль и переключаем на Tasks экран
    ///
    /// Вызывается когда:
    /// - Пользователь ввел код и получил токены
    /// - Пользователь завершил регистрацию и получил токены
    func login() async {
        print("🔐 AppRouter: Успешная авторизация - загружаем роль")
        isLoadingRole = true
        defer { isLoadingRole = false }

        await userManager.loadCurrentRole()

        print("🔐 AppRouter: Роль загружена - переключаем на Tasks")
        isAuthenticated = true
    }

    /// Выход из аккаунта - очищаем роль и переключаем на Auth экран
    func logout() async {
        print("🚪 AppRouter: Выход из аккаунта - очищаем роль и переключаем на Auth")
        await userManager.clear()
        try? await tokenStorage.clearTokens()
        impersonationStorage.phone = nil // Очищаем режим "Войти как"
        isAuthenticated = false
        mainPath = NavigationPath() // Очищаем стек Main экранов
    }

    // MARK: - Навигация внутри Main flow

    /// Переход на детали задачи
    func navigateToTaskDetail(taskId: String) {
        print("📋 AppRouter: Переход на TaskDetail(\(taskId))")
        mainPath.append(Route.taskDetail(taskId: taskId))
    }

    /// Переход на создание задачи
    func navigateToCreateTask() {
        print("➕ AppRouter: Переход на CreateTask")
        mainPath.append(Route.createTask)
    }

    /// Вернуться назад в Main flow
    func pop() {
        guard !mainPath.isEmpty else { return }
        mainPath.removeLast()
    }
}
