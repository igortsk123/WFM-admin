# WebSocket — уведомления в реальном времени

Мобильное приложение подключается к svc_notifications по WebSocket для получения уведомлений без задержки. При разрыве соединения — автоматическое переподключение.

**Связанные документы:**
- `.memory_bank/backend/services/svc_notifications.md` — протокол и стратегии
- `.memory_bank/mobile/feature_notifications/push_notifications.md` — FCM fallback
- `.memory_bank/mobile/architecture/networking.md` — APIClient, TokenStorage

---

## Назначение

WebSocket-соединение служит основным каналом доставки уведомлений. Если приложение активно — уведомления приходят мгновенно и не требуют push. Если соединение разорвано — svc_notifications fallback-ает на FCM push (для стратегии `WEBSOCKET_THEN_PUSH`).

## Архитектура

**Файлы:**
- iOS: `WFMApp/Core/Notifications/NotificationsWebSocketService.swift`
- Android: `app/.../core/notifications/NotificationsWebSocketService.kt`

**Паттерн:** Singleton-сервис, инициализируется после авторизации и живёт на протяжении всей сессии. ViewModel-и подписываются на события через Combine (iOS) / SharedFlow (Android).

## Ключевые особенности

**Авторизация:** JWT передаётся как query param `?token={jwt}` при подключении.

**ACK-механизм:** На каждое входящее NOTIFICATION-сообщение клиент обязан отправить ACK в течение 5 секунд. Без ACK сервер считает доставку неудавшейся и может инициировать push fallback.

**Автопереподключение:** При разрыве соединения (сеть пропала, приложение вышло из фона) — повторное подключение с экспоненциальной задержкой.

**Heartbeat:** Стандартные WebSocket ping/pong для поддержания соединения.

## Поведение при получении уведомления

По типу категории приложение выбирает действие:

| Категория | Действие |
|-----------|----------|
| `TASK_STATE_CHANGED` | Обновить список задач (refresh) |
| `TASK_REJECTED` | Показать toast + обновить задачу |
| `TASK_REVIEW` | Обновить список задач на проверке (для менеджера) |

Для `SYSTEM`-уведомлений: не показывать пользователю, только обновлять данные.
Для `USER`-уведомлений: показывать toast и обновить счётчик непрочитанных.

## Жизненный цикл

- **Подключение:** сразу после успешной авторизации (в `MainTabView`/`MainTabScreen`)
- **Отключение:** при логауте, в AppDelegate/Application `applicationWillTerminate`
- **Фон:** iOS/Android могут разрывать WS при уходе в фон — нормально, FCM push обеспечит доставку
