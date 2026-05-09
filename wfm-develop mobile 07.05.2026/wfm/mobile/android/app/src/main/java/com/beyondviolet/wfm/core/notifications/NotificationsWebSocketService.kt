package com.beyondviolet.wfm.core.notifications

import android.util.Log
import com.beyondviolet.wfm.core.analytics.AnalyticsEvent
import com.beyondviolet.wfm.core.analytics.AnalyticsService
import com.beyondviolet.wfm.feature.auth.data.local.TokenStorage
import io.ktor.client.*
import io.ktor.client.engine.okhttp.*
import io.ktor.client.plugins.websocket.*
import io.ktor.websocket.*
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import org.json.JSONObject

/**
 * WebSocket-клиент для получения уведомлений в реальном времени.
 *
 * Подключается к svc_notifications/ws после авторизации.
 * При разрыве соединения переподключается с экспоненциальной задержкой (1с → 2с → 4с → max 30с).
 * Отправляет ACK на каждое входящее NOTIFICATION-сообщение.
 */
class NotificationsWebSocketService(
    private val tokenStorage: TokenStorage,
    private val baseUrl: String,
    private val analyticsService: AnalyticsService
) {
    private val TAG = "NotificationsWS"

    private val _notifications = MutableSharedFlow<WsNotification>(extraBufferCapacity = 64)

    /** SharedFlow входящих уведомлений — collect в LaunchedEffect или ViewModel */
    val notifications: SharedFlow<WsNotification> = _notifications.asSharedFlow()

    private val serviceScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var connectJob: Job? = null
    private var isDisconnecting = false
    private var reconnectDelay = 1_000L  // мс

    private val wsClient = HttpClient(OkHttp) {
        install(WebSockets)
    }

    // MARK: - Public API

    /** Подключиться к WebSocket. Безопасно вызывать повторно. */
    fun connect() {
        if (connectJob?.isActive == true) return
        isDisconnecting = false
        connectJob = serviceScope.launch { connectLoop() }
    }

    /** Отключиться от WebSocket. Останавливает автоматическое переподключение. */
    fun disconnect() {
        isDisconnecting = true
        connectJob?.cancel()
        connectJob = null
        reconnectDelay = 1_000L
        Log.i(TAG, "🔌 WS отключён")
    }

    // MARK: - Private

    private suspend fun connectLoop() {
        while (!isDisconnecting) {
            try {
                val token = tokenStorage.getAccessToken()
                if (token == null) {
                    Log.w(TAG, "⚠️ WS: нет access token, подключение отложено")
                    return
                }

                val wsUrl = baseUrl
                    .replace("https://", "wss://")
                    .replace("http://", "ws://")
                    .trimEnd('/') + "/notifications/ws?token=$token"

                Log.i(TAG, "🔌 WS подключение...")

                wsClient.webSocket(urlString = wsUrl) {
                    Log.i(TAG, "🔌 WS подключён")
                    reconnectDelay = 1_000L

                    for (frame in incoming) {
                        when (frame) {
                            is Frame.Text -> handleMessage(frame.readText(), this)
                            else -> {}
                        }
                    }
                }

                Log.w(TAG, "⚠️ WS соединение закрыто")

            } catch (e: CancellationException) {
                Log.d(TAG, "🔌 WS задача отменена")
                break
            } catch (e: Exception) {
                Log.w(TAG, "⚠️ WS ошибка: ${e.message}")
            }

            if (isDisconnecting) break

            Log.i(TAG, "🔄 WS переподключение через ${reconnectDelay}мс...")
            delay(reconnectDelay)
            reconnectDelay = minOf(reconnectDelay * 2, 30_000L)
        }
    }

    private suspend fun handleMessage(text: String, session: DefaultClientWebSocketSession) {
        try {
            val json = JSONObject(text)
            val type = json.optString("type")
            if (type != "NOTIFICATION") return

            val notificationId = json.optString("notification_id").takeIf { it.isNotEmpty() } ?: return
            val category = json.optString("category").takeIf { it.isNotEmpty() } ?: return
            val title = json.optString("title").takeIf { it.isNotEmpty() } ?: return
            val body = json.optString("body").takeIf { it.isNotEmpty() } ?: return
            val visibility = json.optString("visibility", "USER")

            val data = mutableMapOf<String, String>()
            json.optJSONObject("data")?.let { dataObj ->
                dataObj.keys().forEach { key ->
                    data[key] = dataObj.opt(key)?.toString() ?: ""
                }
            }

            val notification = WsNotification(
                notificationId = notificationId,
                category = category,
                title = title,
                body = body,
                data = data,
                visibility = visibility
            )

            _notifications.emit(notification)
            analyticsService.track(AnalyticsEvent.PushNotificationReceived(
                channel = "websocket",
                notificationId = notificationId,
                taskId = data["task_id"]
            ))
            Log.i(TAG, "📬 WS уведомление: $category [$notificationId]")

            // Отправляем ACK
            val ack = """{"type":"ACK","notification_id":"$notificationId"}"""
            session.send(Frame.Text(ack))

        } catch (e: Exception) {
            Log.w(TAG, "⚠️ WS ошибка парсинга: ${e.message}")
        }
    }
}
