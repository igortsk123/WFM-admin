# ADR: svc_notifications — выделенный сервис доставки и WS-протокол

**Дата:** 2026-03-18
**Режим:** FULL
**Owner:** Pavel Karpychev
**Review trigger:** появление третьего канала доставки помимо WebSocket/Push (например, Email/SMS/Telegram bot), либо рост числа категорий уведомлений > 10, требующий конфигурируемых стратегий доставки на стороне менеджера.

## Контекст

С добавлением модели `review_state` и сценария «менеджер видит, что задача отправлена на проверку» появилась потребность в real-time доставке: ждать pull-to-refresh — слишком медленно. Параллельно нужна была доставка в фоне (push), когда приложение закрыто. Размещать всё это в svc_tasks означало смешивать домен задач с инфраструктурой доставки (FCM-токены, WebSocket-соединения, ACK-механизм, retry-стратегии), а WS-сервер внутри svc_tasks конкурировал бы с HTTP API за event-loop.

## Решение

Выделить `svc_notifications` (порт 8003, БД `wfm_notifications`) с собственным WS-каналом, FCM/HMS push, internal API без JWT и движком стратегий доставки — потому что доставка сообщений является cross-domain инфраструктурой (любой сервис может стать producer'ом), а WebSocket-сервер требует отдельного процесса с управлением долгоживущими соединениями.

## Альтернативы

- **Встроить уведомления в svc_tasks:** отвергнуто — WS-соединения и пуш-токены не имеют отношения к домену задач, а WS-сервер с менеджером соединений плохо уживается с обычным REST в одном процессе (особенно при перезапусках и graceful shutdown).
- **Использовать готовый сервис (Pusher/Firebase Realtime DB):** отвергнуто — мы уже имеем Docker-кластер, latency выше, vendor lock-in, нет контроля над форматом сообщений и стратегиями доставки.
- **Только push, без WebSocket:** отвергнуто — push приходит с задержкой и не работает на iOS-приоритете «не беспокоить»; для in-app сценария «менеджер сидит в приложении» нужна моментальная доставка.
- **WebSocket общий через nginx, а сервис — только REST:** отвергнуто — nginx умеет проксировать WS, но не управлять состоянием соединений и ACK; нужен бэкенд-процесс с in-memory `ConnectionManager`.

## Экономическое/архитектурное обоснование

- WS-протокол с ACK от клиента (`{"type": "ACK", "notification_id": ...}`) даёт надёжный сигнал «доставлено» — это позволяет стратегии `WEBSOCKET_THEN_PUSH` корректно решать, нужен ли fallback в push (5-секундное окно ожидания ACK).
- 4 стратегии доставки (`EMERGENCY`, `WEBSOCKET_ONLY`, `WEBSOCKET_THEN_PUSH`, `EMAIL_ONLY`) и 2 уровня видимости (`USER`/`SYSTEM`) задаются на стороне сервиса при отправке — producer-сервисам (svc_tasks) не нужно знать про каналы.
- Internal API `/internal/send` без JWT (доступен только из Docker-сети) даёт минимальный contract surface для producer'ов: одна точка входа, формат `{recipient_id, category, data}`.
- Раздельные FCM (Google) и HMS (Huawei) токены через единый канал push дают поддержку обоих brand-вариантов мобильных приложений (см. `mobile/brands.md`).

## Принятые риски

- `ConnectionManager` хранит `user_id → [WebSocket]` **в памяти процесса** — при горизонтальном масштабировании svc_notifications потребуется sticky session или Redis Pub/Sub для broadcast'а между инстансами. Сейчас один инстанс — этого достаточно.
- WS-соединение требует JWT в query-параметре (`?token=...`), что менее предпочтительно по сравнению с заголовком (token попадает в access logs). Митигация: nginx настроен не логировать query string для `/notifications/ws`.
- ACK-механизм не покрывает случай «клиент получил, но потерял соединение до отправки ACK» — мы можем продублировать сообщение (push поверх WS). Это сознательный trade-off в пользу гарантии доставки.
- Каждое изменение состояния задачи теперь генерирует HTTP fire-and-forget вызов в svc_notifications — при недоступности svc_notifications svc_tasks логирует и продолжает (доставка не блокирует бизнес-операцию, но и не гарантируется на 100%).

## Future hook

- Поле `delivery_strategy` хранится в БД per-notification — можно добавить пользовательские настройки (отключить категорию, выбрать каналы) без миграции схемы (есть `user_notification_preferences.blocked_categories` JSONB).
- Таблица `notification_deliveries` хранит per-channel статус (`PENDING`/`DELIVERED`/`FAILED`/`SKIPPED`) — задел под analytics-слой «какой канал работает лучше для какой категории» и под retry-стратегии.
- WS-протокол расширяем: тип сообщения вынесен в поле `type` (`NOTIFICATION`, `ACK`), легко добавить `READ_RECEIPT`, `BROADCAST`, `TYPING` и т.п. без breaking change.
- Поле `data: JSONB` в notification — свободная нагрузка для deep link и метаданных; новые категории не требуют миграции.

## Связанные документы

- План: `.memory_bank/completed_plans/notifications_service.md`
- Сервис: `.memory_bank/backend/services/svc_notifications.md`
- API: `.memory_bank/backend/apis/api_notifications.md`
- Mobile: `.memory_bank/mobile/feature_notifications/notifications_websocket.md`, `.memory_bank/mobile/feature_notifications/push_notifications.md`
- Паттерны: `.memory_bank/backend/patterns/inter_service_communication.md`
