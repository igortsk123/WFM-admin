import SwiftUI
import WFMAuth
import Combine
import UserNotifications

// MARK: - Public Environment Keys

/// Environment key для переключения на таб "Главная"
public struct OpenShiftKey: EnvironmentKey {
    public static let defaultValue: () -> Void = {}
}

/// Environment key для переключения на таб "Задачи"
public struct SwitchToTasksTabKey: EnvironmentKey {
    public static let defaultValue: () -> Void = {}
}

/// Environment key для переключения на таб "Контроль" (только для менеджера)
public struct SwitchToControlTabKey: EnvironmentKey {
    public static let defaultValue: () -> Void = {}
}

public extension EnvironmentValues {
    var openShift: () -> Void {
        get { self[OpenShiftKey.self] }
        set { self[OpenShiftKey.self] = newValue }
    }

    var switchToTasksTab: () -> Void {
        get { self[SwitchToTasksTabKey.self] }
        set { self[SwitchToTasksTabKey.self] = newValue }
    }

    var switchToControlTab: () -> Void {
        get { self[SwitchToControlTabKey.self] }
        set { self[SwitchToControlTabKey.self] = newValue }
    }
}

// MARK: - MainFlowView

/// Main flow - основная часть приложения после авторизации
///
/// Выбирает между worker и manager флоу на основе роли:
/// - Worker: TabView с 3 табами (Главная, Задачи, Настройки)
/// - Manager: TabView с 3 табами (Главная, Контроль задач, Настройки)
struct MainFlowView: View {
    @EnvironmentObject private var container: DependencyContainer
    @EnvironmentObject private var router: AppRouter
    @ObservedObject private var userManager: UserManager

    init() {
        // Получаем userManager для подписки на изменения роли
        self.userManager = DependencyContainer.shared.userManager
    }

    var body: some View {
        // Определяем роль из текущего assignment (реактивно через @ObservedObject)
        let role = userManager.currentAssignment?.position?.role

        // Выбираем флоу на основе роли
        Group {
            switch role?.code {
            case "manager":
                ManagerTabView()
                    .id("manager-tab-view")  // Предотвращаем пересоздание при ре-рендере
            case "worker":
                MainTabView()
                    .id("worker-tab-view")  // Предотвращаем пересоздание при ре-рендере
            default:
                // Fallback на worker (для безопасности)
                MainTabView()
                    .id("worker-tab-view-default")  // Предотвращаем пересоздание при ре-рендере
            }
        }
        .onAppear {
            container.notificationsWebSocketService.connect()
            // Регистрируем сохранённый FCM-токен при входе в авторизованную зону.
            // didReceiveRegistrationToken сохраняет токен в UserDefaults при получении
            // (даже до авторизации), поэтому не делаем сетевой запрос к Firebase.
            if let token = UserDefaults.standard.string(forKey: "wfm_fcm_token") {
                _Concurrency.Task { await container.notificationsAPIService.registerDeviceToken(token) }
            }
        }
        .onDisappear {
            container.notificationsWebSocketService.disconnect()
        }
        .onReceive(container.notificationsWebSocketService.notifications) { notification in
            container.analyticsService.track(.pushNotificationReceived(
                channel: "websocket",
                notificationId: notification.notificationId,
                taskId: notification.data["task_id"]
            ))
            scheduleLocalNotification(from: notification)
        }
        .onReceive(NotificationCenter.default.publisher(for: .pushDeepLinkTask)) { notification in
            // Deep link из push-уведомления → открыть детали задачи
            guard let taskId = notification.userInfo?["task_id"] as? String else { return }
            router.navigateToTaskDetail(taskId: taskId)
        }
    }
}

// MARK: - Helpers

private extension MainFlowView {
    func scheduleLocalNotification(from wsNotification: WsNotification) {
        let content = UNMutableNotificationContent()
        content.title = wsNotification.title
        content.body = wsNotification.body
        content.sound = .default
        var userInfo: [String: String] = [
            "notification_id": wsNotification.notificationId,
            "channel": "websocket"
        ]
        if let taskId = wsNotification.data["task_id"] {
            userInfo["task_id"] = taskId
        }
        content.userInfo = userInfo
        let request = UNNotificationRequest(
            identifier: wsNotification.notificationId,
            content: content,
            trigger: nil  // показать немедленно
        )
        UNUserNotificationCenter.current().add(request)
    }
}

#Preview {
    let container = DependencyContainer.shared
    MainFlowView()
        .environmentObject(container)
        .environmentObject(AppRouter(
            tokenStorage: container.tokenStorage,
            userManager: container.userManager,
            impersonationStorage: container.impersonationStorage
        ))
}
