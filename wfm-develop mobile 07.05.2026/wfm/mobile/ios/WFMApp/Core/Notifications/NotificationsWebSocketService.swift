import Foundation
import Combine
import os.log
import WFMAuth

// MARK: - WsNotification

/// Входящее уведомление, полученное по WebSocket от svc_notifications
struct WsNotification {
    let notificationId: String
    let category: String        // TASK_REVIEW | TASK_REJECTED | TASK_STATE_CHANGED
    let title: String
    let body: String
    let data: [String: String]  // task_id, worker_id, new_state и т.д.
    let visibility: String      // USER | SYSTEM
}

// MARK: - NotificationsWebSocketService

/// WebSocket-клиент для получения уведомлений в реальном времени.
///
/// Подключается к svc_notifications/ws после авторизации.
/// При разрыве соединения переподключается с экспоненциальной задержкой (1s → 2s → 4s → max 30s).
/// Отправляет ACK на каждое входящее NOTIFICATION-сообщение.
@MainActor
final class NotificationsWebSocketService: ObservableObject {

    // MARK: - Published

    @Published private(set) var isConnected = false

    // MARK: - Events

    private let subject = PassthroughSubject<WsNotification, Never>()

    /// Поток входящих уведомлений — подписывайтесь через .onReceive или .sink
    var notifications: AnyPublisher<WsNotification, Never> {
        subject.eraseToAnyPublisher()
    }

    // MARK: - Dependencies

    private let tokenStorage: TokenStorage
    private let baseURL: URL
    private let logger = Logger(subsystem: "com.wfm", category: "NotificationsWS")

    // MARK: - State

    private var webSocketTask: URLSessionWebSocketTask?
    private var listenTask: _Concurrency.Task<Void, Never>?
    private var reconnectTask: _Concurrency.Task<Void, Never>?
    private var reconnectDelay: Double = 1.0
    private var isDisconnecting = false

    // MARK: - Init

    init(tokenStorage: TokenStorage, baseURL: URL) {
        self.tokenStorage = tokenStorage
        self.baseURL = baseURL
    }

    // MARK: - Public API

    /// Подключиться к WebSocket. Безопасно вызывать повторно — повторное подключение игнорируется.
    func connect() {
        guard webSocketTask == nil else { return }
        isDisconnecting = false
        _Concurrency.Task { await connectInternal() }
    }

    /// Отключиться от WebSocket. Останавливает автоматическое переподключение.
    func disconnect() {
        isDisconnecting = true
        reconnectTask?.cancel()
        reconnectTask = nil
        listenTask?.cancel()
        listenTask = nil
        webSocketTask?.cancel(with: .goingAway, reason: nil)
        webSocketTask = nil
        isConnected = false
        reconnectDelay = 1.0
        logger.info("🔌 WS отключён")
    }

    // MARK: - Private: Connect

    private func connectInternal() async {
        guard !isDisconnecting else { return }

        guard let token = try? await tokenStorage.getAccessToken() else {
            logger.warning("⚠️ WS: нет access token, подключение отложено")
            return
        }

        guard var components = URLComponents(url: baseURL, resolvingAgainstBaseURL: false) else {
            logger.error("❌ WS: не удалось разобрать базовый URL")
            return
        }
        components.scheme = components.scheme == "https" ? "wss" : "ws"
        components.path = "/notifications/ws"
        components.queryItems = [URLQueryItem(name: "token", value: token)]

        guard let wsURL = components.url else {
            logger.error("❌ WS: не удалось построить URL")
            return
        }

        let task = URLSession.shared.webSocketTask(with: wsURL)
        webSocketTask = task
        task.resume()

        isConnected = true
        reconnectDelay = 1.0
        logger.info("🔌 WS подключён: \(wsURL.host ?? "")")

        startListening(task: task)
    }

    // MARK: - Private: Listen

    private func startListening(task: URLSessionWebSocketTask) {
        listenTask?.cancel()
        listenTask = _Concurrency.Task { [weak self] in
            guard let self else { return }

            while !_Concurrency.Task.isCancelled {
                do {
                    let message = try await task.receive()
                    await self.handleMessage(message)
                } catch {
                    guard !_Concurrency.Task.isCancelled else { break }
                    self.logger.warning("⚠️ WS ошибка получения: \(error.localizedDescription)")
                    break
                }
            }

            // Соединение разорвано — планируем переподключение если не logout
            guard !self.isDisconnecting else { return }
            self.isConnected = false
            self.webSocketTask = nil
            await self.scheduleReconnect()
        }
    }

    // MARK: - Private: Message Handling

    private func handleMessage(_ message: URLSessionWebSocketTask.Message) async {
        let text: String
        switch message {
        case .string(let s): text = s
        case .data(let d): text = String(data: d, encoding: .utf8) ?? ""
        @unknown default: return
        }

        guard
            let data = text.data(using: .utf8),
            let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
            let type = json["type"] as? String
        else { return }

        if type == "NOTIFICATION" {
            processNotification(json: json)
        }
    }

    private func processNotification(json: [String: Any]) {
        guard
            let notificationId = json["notification_id"] as? String,
            let category = json["category"] as? String,
            let title = json["title"] as? String,
            let body = json["body"] as? String
        else { return }

        let visibility = json["visibility"] as? String ?? "USER"
        var data: [String: String] = [:]
        if let rawData = json["data"] as? [String: Any] {
            for (k, v) in rawData { data[k] = "\(v)" }
        }

        let notification = WsNotification(
            notificationId: notificationId,
            category: category,
            title: title,
            body: body,
            data: data,
            visibility: visibility
        )

        subject.send(notification)
        logger.info("📬 WS уведомление: \(category) [\(notificationId)]")

        sendAck(notificationId: notificationId)
    }

    // MARK: - Private: ACK

    private func sendAck(notificationId: String) {
        guard let task = webSocketTask else { return }
        let ack = #"{"type":"ACK","notification_id":"\#(notificationId)"}"#
        task.send(.string(ack)) { [weak self] error in
            if let error = error {
                self?.logger.warning("⚠️ WS ACK ошибка: \(error.localizedDescription)")
            }
        }
    }

    // MARK: - Private: Reconnect

    private func scheduleReconnect() async {
        guard !isDisconnecting else { return }

        let delay = reconnectDelay
        reconnectDelay = min(reconnectDelay * 2, 30.0)
        logger.info("🔄 WS переподключение через \(delay)с...")

        reconnectTask = _Concurrency.Task { [weak self] in
            guard let self else { return }
            try? await _Concurrency.Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
            guard !_Concurrency.Task.isCancelled, !self.isDisconnecting else { return }
            await self.connectInternal()
        }
    }
}
