import SwiftUI
import WFMAuth
import WFMUI
import FirebaseCore
import FirebaseMessaging
import UserNotifications

class AppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        FirebaseApp.configure()
        Messaging.messaging().delegate = self

        // Запрашиваем разрешение на push-уведомления (Phase 5.1)
        UNUserNotificationCenter.current().delegate = self
        UNUserNotificationCenter.current().requestAuthorization(
            options: [.alert, .badge, .sound]
        ) { granted, _ in
            guard granted else { return }
            DispatchQueue.main.async {
                UIApplication.shared.registerForRemoteNotifications()
            }
        }

        flushPendingPushEvents()
        return true
    }

    // Отправляем события накопленные Extension пока приложение было закрыто
    private func flushPendingPushEvents() {
        let events = PendingPushAnalyticsQueue.flushAll()
        guard !events.isEmpty else { return }
        let analytics = DependencyContainer.shared.analyticsService
        for event in events {
            analytics.track(.pushNotificationReceived(
                channel: event.channel,
                notificationId: event.notificationId,
                taskId: event.taskId
            ))
        }
    }

    // Передаём APNS-токен в Firebase — Firebase сам обменяет его на FCM-токен.
    // FCM-токен вернётся через MessagingDelegate.messaging(_:didReceiveRegistrationToken:)
    func application(
        _ application: UIApplication,
        didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
    ) {
        Messaging.messaging().apnsToken = deviceToken
    }

    // MARK: - UNUserNotificationCenterDelegate

    // Показываем banner даже когда приложение активно (foreground push)
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        let userInfo = notification.request.content.userInfo
        let channel = userInfo["channel"] as? String ?? "fcm"
        // WS-уведомления трекаются в MainFlowView при получении — здесь трекаем только FCM
        if channel == "fcm" {
            let notificationId = userInfo["notification_id"] as? String
            let taskId = userInfo["task_id"] as? String
            DependencyContainer.shared.analyticsService.track(
                .pushNotificationReceived(channel: "fcm", notificationId: notificationId, taskId: taskId)
            )
        }
        completionHandler([.banner, .badge, .sound])
    }

    // Нажатие на push → переход на экран задачи через NotificationCenter
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        let userInfo = response.notification.request.content.userInfo
        let taskId = userInfo["task_id"] as? String
        let notificationId = userInfo["notification_id"] as? String
        let channel = userInfo["channel"] as? String ?? "fcm"
        DependencyContainer.shared.analyticsService.track(
            .pushNotificationTapped(channel: channel, notificationId: notificationId, taskId: taskId)
        )
        if let taskId {
            NotificationCenter.default.post(
                name: .pushDeepLinkTask,
                object: nil,
                userInfo: ["task_id": taskId]
            )
        }
        completionHandler()
    }
}

extension Notification.Name {
    static let pushDeepLinkTask = Notification.Name("com.wfm.push.deeplink.task")
}

// MARK: - MessagingDelegate

extension AppDelegate: MessagingDelegate {
    // Firebase получил FCM-токен (или обновил) — сохраняем локально и пробуем зарегистрировать.
    // Если пользователь не авторизован — регистрация упадёт молча, но токен
    // сохранится и будет отправлен при входе в MainFlowView.
    func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
        guard let token = fcmToken else { return }
        UserDefaults.standard.set(token, forKey: "wfm_fcm_token")
        _Concurrency.Task {
            await DependencyContainer.shared.notificationsAPIService.registerDeviceToken(token)
        }
    }
}

@main
struct WFMApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var delegate
    @StateObject private var container = DependencyContainer.shared
    @StateObject private var router: AppRouter

    init() {
        // Создаем router с доступом к tokenStorage и userManager
        let container = DependencyContainer.shared
        _router = StateObject(wrappedValue: AppRouter(
            tokenStorage: container.tokenStorage,
            userManager: container.userManager,
            impersonationStorage: container.impersonationStorage
        ))
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .wfmTheme()
                .wfmToast(manager: container.toastManager)
                .environmentObject(container)
                .environmentObject(router)
                .onOpenURL { url in
                    // Обработка deep link для авторизации через Telegram
                    DeepLinkManager.shared.handleURL(url)
                }
        }
    }
}
