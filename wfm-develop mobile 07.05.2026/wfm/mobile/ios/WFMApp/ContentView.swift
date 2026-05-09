import SwiftUI
import WFMAuth
import WFMUI

/// Главный экран приложения - переключатель между Splash, Auth и Tasks
///
/// Простая логика:
/// 1. При запуске показываем Splash экран на 2 секунды
/// 2. После Splash проверяем токены:
///    - Если есть токены → загружаем роль → показываем Tasks
///    - Если нет токенов → показываем экран авторизации
/// 3. После успешной авторизации router.login() загружает роль и переключит на Tasks
struct ContentView: View {
    @EnvironmentObject private var router: AppRouter
    @EnvironmentObject private var container: DependencyContainer
    @ObservedObject private var userManager: UserManager
    @State private var showAuthFlow = false
    @State private var showSplash = true

    init() {
        // Получаем userManager из singleton контейнера
        self.userManager = DependencyContainer.shared.userManager
    }

    var body: some View {
        if showSplash {
            SplashView {
                showSplash = false
            }
        } else {
            content
                .task {
                    // Проверяем наличие токенов при запуске приложения
                    await router.checkAuthentication()
                    // Если нет токенов - сразу показываем авторизацию
                    if !router.isAuthenticated {
                        showAuthFlow = true
                    }
                }
                .fullScreenCover(isPresented: $showAuthFlow) {
                    AuthFlowView(
                        container: container.authContainer,
                        onAuthenticationCompleted: {
                            // После успешной авторизации загружаем роль и переключаем на основной экран
                            showAuthFlow = false
                            // Используем _Concurrency.Task чтобы не путать с моделью Task из проекта
                            _Concurrency.Task {
                                await router.login()
                                // Трекаем login_completed и устанавливаем userId после загрузки пользователя
                                if let user = container.userManager.currentUser {
                                    let role = container.userManager.isManager() ? "manager" : "worker"
                                    container.analyticsService.setUser(userId: user.id, role: role)
                                    container.analyticsService.track(.loginCompleted(role: role))
                                }
                            }
                        }
                    )
                }
        }
    }

    @ViewBuilder
    private var content: some View {
        if router.isCheckingAuth || router.isLoadingRole {
            // 🔄 Проверяем токены при старте или загружаем роль после авторизации
            loadingView
        } else if !router.isAuthenticated {
            // ❌ Нет токенов → показываем экран загрузки (AuthFlowView откроется через .task)
            loadingView
                .onAppear {
                    // Открываем AuthFlow если еще не открыт
                    if !showAuthFlow {
                        showAuthFlow = true
                    }
                }
        } else {
            // Есть токены - проверяем состояние роли
            authenticatedContent
        }
    }

    /// Контент для авторизованного пользователя (зависит от состояния роли)
    @ViewBuilder
    private var authenticatedContent: some View {
        // Подписываемся на изменения currentUser через @ObservedObject userManager
        if let user = userManager.currentUser {
            // Проверяем наличие assignments
            if user.assignments.isEmpty {
                // Нет назначений - показываем NoAssignmentsView
                NoAssignmentsView(isError: false)
            } else {
                // ✅ Роль успешно загружена → показываем основной экран
                MainFlowView()
            }
        } else if userManager.error != nil {
            // Ошибка загрузки - показываем NoAssignmentsView в режиме ошибки
            NoAssignmentsView(isError: true)
        } else {
            // Fallback: токены есть, но роль в неизвестном состоянии
            loadingView
        }
    }

    /// Экран загрузки (проверка токенов / загрузка роли)
    private var loadingView: some View {
        LoadingStateView()
    }
}

/// Экран загрузки с доступом к цветам дизайн-системы
private struct LoadingStateView: View {
    @Environment(\.wfmColors) var colors

    var body: some View {
        GeometryReader { _ in
            WFMLoader()
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .background(colors.surfaceBase)
        .ignoresSafeArea()
    }
}

#Preview {
    let container = DependencyContainer.shared
    ContentView()
        .environmentObject(container)
        .environmentObject(AppRouter(
            tokenStorage: container.tokenStorage,
            userManager: container.userManager,
            impersonationStorage: container.impersonationStorage
        ))
}
