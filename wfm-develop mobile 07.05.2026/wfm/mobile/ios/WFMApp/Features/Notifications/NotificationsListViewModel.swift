import Foundation
import WFMUI

/// ViewModel для экрана списка уведомлений
///
/// Загружает уведомления пользователя, поддерживает фильтр "только сегодня"
/// и пометку уведомлений как прочитанных по тапу (оптимистичное обновление).
@MainActor
final class NotificationsListViewModel: ObservableObject {
    // MARK: - Published State

    @Published private(set) var notifications: [NotificationItem] = []
    @Published var isLoading = false
    @Published var filterTodayOnly = false

    // MARK: - Dependencies

    private let notificationsAPIService: NotificationsAPIService
    private let toastManager: ToastManager

    private var loadTask: _Concurrency.Task<Void, Never>?
    private var isRefreshing = false

    // MARK: - Init

    init(notificationsAPIService: NotificationsAPIService, toastManager: ToastManager) {
        self.notificationsAPIService = notificationsAPIService
        self.toastManager = toastManager
    }

    // MARK: - Public Methods

    /// Загрузить уведомления при появлении экрана.
    func loadNotifications() async {
        guard !isRefreshing else { return }

        loadTask?.cancel()
        isLoading = true
        await fetchNotifications()
        isLoading = false
    }

    /// Pull-to-Refresh — не переключает isLoading (иначе сбивается анимация SwiftUI).
    func refresh() async {
        guard !isRefreshing else { return }
        isRefreshing = true
        await fetchNotifications()
        isRefreshing = false
    }

    /// Пометить уведомление как прочитанное.
    ///
    /// Оптимистично обновляет UI сразу, затем отправляет запрос на сервер.
    func markAsRead(id: UUID) async {
        // Оптимистичное обновление
        if let index = notifications.firstIndex(where: { $0.id == id }),
           !notifications[index].isRead {
            notifications[index] = notifications[index].asRead()
        }

        do {
            _ = try await notificationsAPIService.markAsRead(notificationId: id)
        } catch is CancellationError {
            // игнорируем
        } catch {
            // При ошибке откатываем оптимистичное обновление
            if let index = notifications.firstIndex(where: { $0.id == id }) {
                notifications[index] = notifications[index].asUnread()
            }
            toastManager.show(message: "Не удалось обновить уведомление", state: .error)
        }
    }

    // MARK: - Private

    private func fetchNotifications() async {
        let dateFrom: Date? = filterTodayOnly ? Calendar.current.startOfDay(for: Date()) : nil
        do {
            let result = try await notificationsAPIService.fetchNotifications(dateFrom: dateFrom)
            notifications = result.notifications
        } catch is CancellationError {
            // игнорируем
        } catch {
            if notifications.isEmpty {
                toastManager.show(message: "Не удалось загрузить уведомления", state: .error)
            }
        }
    }
}
