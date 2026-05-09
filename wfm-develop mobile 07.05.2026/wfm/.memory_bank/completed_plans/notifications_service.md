# План: Сервис доставки уведомлений

**Статус:** Выполнено
**Создан:** 2026-03-18
**Последнее обновление:** 2026-03-19 (Фазы 1, 2, 3, 4, 5, 6 выполнены — план завершён)

## Цель

Реализовать `svc_notifications` — сервис доставки сообщений через разные каналы (WebSocket, Push, Email) с поддержкой стратегий доставки. Подключить его к мобильным приложениям (WebSocket-клиент + FCM пуш-уведомления). Задокументировать в Memory Bank.

---

## Архитектурные решения (зафиксированные до старта)

**Стратегии доставки:**
- `EMERGENCY` — все каналы одновременно (только при ЧП)
- `WEBSOCKET_ONLY` — только WebSocket; не вышло — ничего не делать
- `WEBSOCKET_THEN_PUSH` — WebSocket, нет ACK за 5с → пуш на все активные устройства
- `EMAIL_ONLY` — только email (для будущих задач)

**Подтверждение WebSocket-доставки (ACK):**
Клиент отвечает `{"type": "ACK", "notification_id": "uuid"}` после получения сообщения. Если ACK не пришёл за 5 секунд (или соединение разорвано) — доставка считается неудачной.

**Видимость уведомлений:**
- `USER` — попадает в раздел «Уведомления» приложения
- `SYSTEM` — служебное, пользователю не показывается

**Категории уведомлений (первые 3):**
- `TASK_REVIEW` — менеджеру: задача отправлена на проверку → стратегия `WEBSOCKET_THEN_PUSH`
- `TASK_REJECTED` — работнику: задача отклонена → стратегия `WEBSOCKET_THEN_PUSH`
- `TASK_STATE_CHANGED` — работнику: любое изменение состояния его задачи → стратегия `WEBSOCKET_ONLY`

**Устройства пользователя:**
- Каждое устройство регистрирует FCM-токен при старте
- Один пользователь может иметь несколько устройств
- При логине нового пользователя на устройстве → токен переназначается
- При логауте → токен деактивируется (soft delete / is_active = false)

**Nginx:**
- `/notifications/` → `http://localhost:8003/notifications/`
- WebSocket: `/notifications/ws` проксируется с `Upgrade` header

**Порт:** svc_notifications → 8003

---

## Задачи

### Фаза 1: Backend — svc_notifications

- [ ] 1.1. Создать структуру сервиса `backend/svc_notifications/` по образцу svc_tasks (FastAPI, alembic, Dockerfile, requirements.txt)
- [ ] 1.2. Написать Alembic-миграцию: таблицы `notifications`, `notification_deliveries`, `device_tokens`, `user_notification_preferences`
- [ ] 1.3. Реализовать WebSocket-сервер с in-memory менеджером соединений (`ConnectionManager`): хранит `user_id → [WebSocket]`, поддерживает send + broadcast
- [ ] 1.4. Реализовать механизм ACK: сервер ждёт 5с после отправки через WS, если нет ACK — помечает доставку как FAILED
- [x] 1.5. Реализовать FCM push-клиент (firebase-admin SDK): `send_push(tokens, title, body, data)` — 2026-03-18
- [x] 1.6. Реализовать движок стратегий доставки (`DeliveryEngine`) — 2026-03-18
- [x] 1.7. Реализовать обработку 3 категорий уведомлений (message_builder.py) — 2026-03-18
- [x] 1.8. Создать internal API (`/internal/send`, `/internal/test`) — 2026-03-18
- [x] 1.9. Создать public API (список, unread-count, read, read-all, preferences) — 2026-03-18
- [x] 1.10. Создать API управления токенами устройств (`/devices/tokens`) — 2026-03-18
- [x] 1.11. Добавить nginx-конфиг: `backend/nginx/services/notifications.conf` (с WS upgrade) — 2026-03-18
- [x] 1.12. Добавить сервис в `docker-compose.yml` + БД в `01-create-dbs.sh` — 2026-03-18

### Фаза 2: Интеграция svc_tasks → svc_notifications

- [x] 2.1. Добавить `NotificationsServiceClient` в svc_tasks (`app/services/notifications_client.py`) — 2026-03-18
- [x] 2.2. Добавить конфигурацию: `NOTIFICATIONS_SERVICE_URL`, `NOTIFICATIONS_SERVICE_TIMEOUT` в svc_tasks `config.py` — 2026-03-18
- [x] 2.3. В `POST /{id}/complete` (svc_tasks): уведомление менеджеру (`TASK_REVIEW`) при MANUAL policy — 2026-03-18
- [x] 2.4. В `POST /{id}/reject` (svc_tasks): уведомление работнику (`TASK_REJECTED`) — 2026-03-18
- [x] 2.5. В `POST /{id}/start`, `/pause`, `/resume`, `/approve`: уведомление работнику (`TASK_STATE_CHANGED`) — 2026-03-18
- [x] 2.6. Обновить `docker-compose.yml`: svc_tasks `depends_on` → svc_notifications — 2026-03-18

### Фаза 3: Firebase setup

- [x] 3.1. Создать Firebase-проект WFM (или использовать существующий) → добавить iOS app + Android app — 2026-03-19
- [x] 3.2. iOS: скачать `GoogleService-Info.plist`, добавить в Xcode-проект, подключить Firebase SDK (SPM) — 2026-03-19
- [x] 3.3. Android: скачать `google-services.json`, добавить в `app/`, подключить Firebase/FCM зависимости в `build.gradle.kts` — 2026-03-19
- [x] 3.4. Получить `serviceAccountKey.json` (Firebase Admin SDK) → добавить в svc_notifications через env `FIREBASE_CREDENTIALS_JSON` — 2026-03-19

### Фаза 4: Mobile — WebSocket клиент

- [x] 4.1. iOS: реализовать `NotificationsWebSocketService` — подключается по `wss://domain/notifications/ws?token={jwt}`, переподключается при разрыве, отправляет ACK на входящие сообщения — 2026-03-18
- [x] 4.2. Android: реализовать `NotificationsWebSocketService` (Ktor WebSocket client) — аналогично iOS — 2026-03-18
- [x] 4.3. iOS: подписаться на WS-сообщения в `MainFlowView` — при получении уведомлений обновлять задачи через `tasksListViewModel.refresh()` — 2026-03-18
- [x] 4.4. Android: аналогично через `LaunchedEffect` + `notificationsWsService.notifications.collect` в AppNavigation — 2026-03-18
- [x] 4.5. iOS: создать `NotificationsAPIService`, добавить `AppDelegate` с запросом push-разрешений (FCM-токен — после Phase 3) — 2026-03-18
- [x] 4.6. Android: создать `NotificationsApiService`, зарегистрировать в Koin (FCM-токен — после Phase 3) — 2026-03-18

### Фаза 5: Mobile — Push уведомления (FCM)

- [x] 5.1. iOS: настроить `UNUserNotificationCenter`, запросить разрешения на пуш при первом запуске — 2026-03-18
- [x] 5.2. iOS: добавить `MessagingDelegate` с `messaging(_:didReceiveRegistrationToken:)` → вызвать `NotificationsAPIService.registerDeviceToken()` — 2026-03-19
- [x] 5.3. iOS: обработать `userNotificationCenter(_:didReceive:)` — по нажатию на пуш открывать нужный экран через NotificationCenter → `MainFlowView.onReceive(.pushDeepLinkTask)` — 2026-03-18
  - `TASK_REVIEW` → открыть детали задачи (manager)
  - `TASK_REJECTED` → открыть детали задачи (worker)
- [x] 5.4. Android: создать `WfmFirebaseMessagingService`: `onNewToken` → регистрировать токен, `onMessageReceived` → показывать системное уведомление с deep link intent — 2026-03-19
- [x] 5.5. Android: зарегистрировать сервис в `AndroidManifest.xml`, обработать `push_task_id` extra в `MainActivity`, `PushDeepLink` flow → навигация в `AppNavigation` — 2026-03-19

### Фаза 6: Memory Bank документация

- [x] 6.1. Создать `.memory_bank/backend/services/svc_notifications.md` — 2026-03-18
- [x] 6.2. Создать `.memory_bank/backend/apis/api_notifications.md` — 2026-03-18
- [x] 6.3. Создать `.memory_bank/mobile/feature_notifications/notifications_websocket.md` — 2026-03-18
- [x] 6.4. Создать `.memory_bank/mobile/feature_notifications/push_notifications.md` — 2026-03-18
- [x] 6.5. Обновить `inter_service_communication.md` — добавить svc_tasks → svc_notifications — 2026-03-18
- [x] 6.6. Обновить CLAUDE.md — добавить `/notifications/` в раздел URL доступа и API Endpoints — 2026-03-18
- [x] 6.7. Обновить `MEMORY.md` — добавить svc_notifications в ключевые файлы и URL — 2026-03-18

---

## Схема данных (для справки при реализации)

**notifications:**
- id: UUID PK
- recipient_id: INTEGER (user_id из svc_users)
- category: VARCHAR (TASK_REVIEW | TASK_REJECTED | TASK_STATE_CHANGED | ...)
- title: VARCHAR
- body: TEXT
- data: JSONB (например: `{"task_id": "uuid", "deeplink": "task-detail"}`)
- visibility: VARCHAR (USER | SYSTEM)
- delivery_strategy: VARCHAR (EMERGENCY | WEBSOCKET_ONLY | WEBSOCKET_THEN_PUSH | EMAIL_ONLY)
- is_read: BOOLEAN default false
- read_at: TIMESTAMP?
- created_at: TIMESTAMP

**notification_deliveries:**
- id: UUID PK
- notification_id: UUID FK
- channel: VARCHAR (WEBSOCKET | PUSH | EMAIL)
- status: VARCHAR (PENDING | DELIVERED | FAILED | SKIPPED)
- device_token: VARCHAR? (какой токен использовался для push)
- delivered_at: TIMESTAMP?
- created_at: TIMESTAMP

**device_tokens:**
- id: UUID PK
- user_id: INTEGER
- platform: VARCHAR (IOS | ANDROID)
- token: VARCHAR UNIQUE
- is_active: BOOLEAN default true
- registered_at: TIMESTAMP
- last_seen_at: TIMESTAMP

**user_notification_preferences:**
- id: UUID PK
- user_id: INTEGER UNIQUE
- push_enabled: BOOLEAN default true
- blocked_categories: JSONB (список заблокированных категорий)
- updated_at: TIMESTAMP

---

## WebSocket Protocol (для справки)

**Подключение:** `wss://domain/notifications/ws`
Авторизация: JWT в query param `?token=...` или в заголовке `Authorization`.

**Сервер → Клиент:**
```json
{"type": "NOTIFICATION", "notification_id": "uuid", "category": "TASK_REVIEW", "title": "...", "body": "...", "data": {"task_id": "uuid"}}
```

**Клиент → Сервер (ACK):**
```json
{"type": "ACK", "notification_id": "uuid"}
```

**Ping/Pong:** стандартный WebSocket heartbeat каждые 30с.

---

## Лог выполнения

### 2026-03-18 (сессия 1)
- Создан план на основе требований пользователя
- Зафиксированы архитектурные решения: порт 8003, стратегии доставки, ACK-механизм, 3 категории уведомлений
- Реализованы Фазы 1 и 2 полностью: svc_notifications создан, svc_tasks интегрирован
- Созданы nginx-конфиг (с WS upgrade), docker-compose, БД init
- Создана документация Memory Bank (4 новых документа, 3 обновлены)

### 2026-03-18 (сессия 2)
- Реализована Фаза 4: iOS и Android WebSocket клиенты
- iOS: `NotificationsWebSocketService.swift`, `NotificationsAPIService.swift` — Core/Notifications/
- iOS: `DependencyContainer` — добавлены `notificationsWebSocketService`, `notificationsAPIService`
- iOS: `MainFlowView` — connect/disconnect WS + подписка на уведомления + deep link из push
- iOS: `WFMApp.swift` — AppDelegate с push permissions, UNUserNotificationCenterDelegate
- Android: `NotificationsWebSocketService.kt`, `NotificationsApiService.kt` — core/notifications/
- Android: `AppModule` — зарегистрированы оба сервиса в Koin
- Android: `AppNavigation` — DisposableEffect для connect/disconnect, LaunchedEffect для подписки на уведомления
- Android: `build.gradle.kts` + `libs.versions.toml` — добавлен `ktor-client-websockets`
- Фаза 5.1 (iOS push permissions) и 5.3 (deep link handler) выполнены попутно

### 2026-03-19 (сессия 3)
- Фаза 3 выполнена пользователем вручную (Firebase project setup)
- Фаза 5.2: iOS `WFMApp.swift` — добавлен `import FirebaseMessaging`, `Messaging.messaging().delegate = self`, раскомментирован apnsToken, добавлен `extension AppDelegate: MessagingDelegate`
- Фаза 5.4: Android `WfmFirebaseMessagingService.kt` создан — onNewToken регистрирует токен через Koin + coroutine, onMessageReceived показывает системное уведомление с PendingIntent
- Фаза 5.5: `AndroidManifest.xml` — сервис зарегистрирован, добавлено POST_NOTIFICATIONS разрешение; `WFMApplication.kt` — создание notification channel; `MainActivity.kt` — handlePushDeepLink + setIntent в onNewIntent; `PushDeepLink.kt` — синглтон SharedFlow; `AppNavigation.kt` — LaunchedEffect для сбора push deep link
