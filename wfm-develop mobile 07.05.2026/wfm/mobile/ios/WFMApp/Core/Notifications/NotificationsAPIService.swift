import Foundation
import os.log

// MARK: - Notification Models

/// Уведомление из сервера (svc_notifications)
struct NotificationItem: Decodable, Identifiable {
    let id: UUID
    let category: String
    let title: String
    let body: String
    let isRead: Bool
    let readAt: Date?
    let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id, category, title, body
        case isRead = "is_read"
        case readAt = "read_at"
        case createdAt = "created_at"
    }

    /// Вернуть копию уведомления с флагом прочитанного (для оптимистичного обновления)
    func asRead() -> NotificationItem {
        NotificationItem(id: id, category: category, title: title, body: body,
                         isRead: true, readAt: Date(), createdAt: createdAt)
    }

    /// Вернуть копию уведомления с флагом непрочитанного (откат оптимистичного обновления)
    func asUnread() -> NotificationItem {
        NotificationItem(id: id, category: category, title: title, body: body,
                         isRead: false, readAt: nil, createdAt: createdAt)
    }
}

struct NotificationListData: Decodable {
    let notifications: [NotificationItem]
    let total: Int
    let unreadCount: Int

    enum CodingKeys: String, CodingKey {
        case notifications, total
        case unreadCount = "unread_count"
    }
}

struct UnreadCountData: Decodable {
    let unreadCount: Int

    enum CodingKeys: String, CodingKey {
        case unreadCount = "unread_count"
    }
}

// MARK: - NotificationsAPIService

/// Клиент для API уведомлений (svc_notifications)
///
/// Отвечает за регистрацию FCM-токенов, управление предпочтениями и список уведомлений.
/// Работник и менеджер вызывают регистрацию токена при старте приложения.
actor NotificationsAPIService {
    private let apiClient: APIClient
    private let logger = Logger(subsystem: "com.wfm", category: "NotificationsAPI")

    private static let iso8601Formatter: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f
    }()

    init(apiClient: APIClient) {
        self.apiClient = apiClient
    }

    // MARK: - Notifications List

    /// Получить список уведомлений пользователя.
    ///
    /// - Parameters:
    ///   - isRead: фильтр по статусу прочтения (nil — все)
    ///   - dateFrom: фильтр по дате создания — не раньше этой даты (nil — без ограничения)
    ///   - limit: максимум записей (по умолчанию 50)
    ///   - offset: смещение для пагинации
    func fetchNotifications(
        isRead: Bool? = nil,
        dateFrom: Date? = nil,
        limit: Int = 50,
        offset: Int = 0
    ) async throws -> NotificationListData {
        var queryItems: [URLQueryItem] = [
            URLQueryItem(name: "limit", value: "\(limit)"),
            URLQueryItem(name: "offset", value: "\(offset)"),
        ]
        if let isRead {
            queryItems.append(URLQueryItem(name: "is_read", value: isRead ? "true" : "false"))
        }
        if let dateFrom {
            let dateString = Self.iso8601Formatter.string(from: dateFrom)
            queryItems.append(URLQueryItem(name: "date_from", value: dateString))
        }
        return try await apiClient.get(
            path: "/notifications/list",
            queryItems: queryItems
        )
    }

    /// Получить количество непрочитанных уведомлений.
    func fetchUnreadCount() async throws -> Int {
        let data: UnreadCountData = try await apiClient.get(
            path: "/notifications/unread-count"
        )
        return data.unreadCount
    }

    /// Пометить уведомление как прочитанное.
    func markAsRead(notificationId: UUID) async throws -> NotificationItem {
        return try await apiClient.post(
            path: "/notifications/\(notificationId)/read",
            body: EmptyBody()
        )
    }

    // MARK: - Device Tokens

    /// Зарегистрировать или обновить FCM-токен устройства.
    /// Вызывается при старте приложения и при обновлении токена Firebase.
    func registerDeviceToken(_ token: String) async {
        do {
            let _: EmptyResponse = try await apiClient.post(
                path: "/notifications/devices/tokens",
                body: DeviceTokenRequest(platform: "IOS", token: token, tokenType: "fcm")
            )
            logger.info("✅ FCM токен зарегистрирован")
        } catch {
            logger.warning("⚠️ Не удалось зарегистрировать FCM токен: \(error.localizedDescription)")
        }
    }

    /// Деактивировать FCM-токен при логауте.
    func deregisterDeviceToken(_ token: String) async {
        do {
            let _: EmptyResponse = try await apiClient.delete(
                path: "/notifications/devices/tokens/\(token)"
            )
            logger.info("✅ FCM токен деактивирован")
        } catch {
            logger.warning("⚠️ Не удалось деактивировать FCM токен: \(error.localizedDescription)")
        }
    }

    // MARK: - Request / Response Types

    private struct DeviceTokenRequest: Encodable {
        let platform: String
        let token: String
        let tokenType: String

        enum CodingKeys: String, CodingKey {
            case platform
            case token
            case tokenType = "token_type"
        }
    }

    private struct EmptyBody: Encodable {}
    private struct EmptyResponse: Decodable {}
}
