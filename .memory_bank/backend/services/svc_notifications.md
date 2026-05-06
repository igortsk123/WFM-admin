# Backend Service: Notifications

Сервис доставки уведомлений через WebSocket и Push (FCM). Принимает сообщения от других сервисов через internal API и доставляет их пользователям по выбранной стратегии.

**Связанные документы:**
- `.memory_bank/backend/apis/api_notifications.md` — API контракты
- `.memory_bank/mobile/feature_notifications/notifications_websocket.md` — WebSocket на мобильных
- `.memory_bank/mobile/feature_notifications/push_notifications.md` — FCM push на мобильных
- `.memory_bank/backend/patterns/inter_service_communication.md` — паттерн межсервисных вызовов

---

## Назначение

Отделённый сервис для доставки сообщений, который:
- принимает уведомления от svc_tasks (и других сервисов) через `/internal/send`
- доставляет их через WebSocket в реальном времени
- при неудаче fallback на FCM push-уведомления
- хранит историю уведомлений и статусы доставки
- управляет FCM-токенами устройств пользователей

## Стек

Аналогичен svc_tasks: Python 3.12, FastAPI, PostgreSQL 16, docker-compose.

**Дополнительные зависимости:**
- `websockets` — WebSocket поддержка в uvicorn
- `firebase-admin` — Firebase Admin SDK для FCM push

**Порт:** 8003 (внутри Docker-сети — порт 8000)

## Структура проекта

```
backend/svc_notifications/
├── app/
│   ├── api/
│   │   ├── notifications.py  # Public API (список, read, токены, preferences)
│   │   ├── websocket.py      # WebSocket endpoint /ws
│   │   ├── internal.py       # Internal API /internal/send, /internal/test
│   │   ├── dependencies.py   # get_current_user (JWT + svc_users)
│   │   └── health.py
│   ├── core/
│   │   ├── config.py         # Settings (DB, Firebase, WS_ACK_TIMEOUT, USERS_SERVICE_URL)
│   │   └── database.py
│   ├── domain/
│   │   ├── models.py         # SQLAlchemy модели
│   │   └── schemas.py        # Pydantic схемы, Enum-ы
│   ├── repositories/
│   │   └── notification_repository.py  # CRUD для всех таблиц
│   ├── services/
│   │   ├── connection_manager.py  # In-memory WebSocket менеджер
│   │   ├── fcm_client.py          # Firebase Admin SDK клиент
│   │   ├── delivery_engine.py     # Движок стратегий доставки
│   │   ├── message_builder.py     # Шаблоны текстов по категориям
│   │   └── users_client.py        # HTTP-клиент к svc_users
│   └── main.py
├── alembic/versions/001_initial_schema.py
└── Dockerfile
```

## Стратегии доставки

| Стратегия | Поведение |
|-----------|-----------|
| `WEBSOCKET_ONLY` | WS → нет ACK → FAILED, больше ничего |
| `WEBSOCKET_THEN_PUSH` | WS → нет ACK за 5с → push на все устройства |
| `EMERGENCY` | WS + push одновременно |
| `EMAIL_ONLY` | email (stub, не реализован) |

## Категории уведомлений

| Категория | Получатель | Стратегия | Видимость |
|-----------|-----------|-----------|-----------|
| `TASK_REVIEW` | менеджер (creator_id) | `WEBSOCKET_THEN_PUSH` | USER |
| `TASK_REJECTED` | работник (assignee_id) | `WEBSOCKET_THEN_PUSH` | USER |
| `TASK_STATE_CHANGED` | работник (assignee_id) | `WEBSOCKET_ONLY` | SYSTEM |

Новые категории добавляются в `message_builder.py` → `MESSAGE_TEMPLATES`.

## Схема данных

**notifications** — уведомления:
- `id`: UUID PK
- `recipient_id`: INTEGER (user_id)
- `category`: VARCHAR (TASK_REVIEW | TASK_REJECTED | TASK_STATE_CHANGED | ...)
- `visibility`: VARCHAR (USER — видно пользователю, SYSTEM — скрыто)
- `delivery_strategy`: VARCHAR
- `is_read`, `read_at`
- `data`: JSONB (deeplink data: task_id, task_title, reject_reason и т.д.)

**notification_deliveries** — статусы доставки:
- `channel`: VARCHAR (WEBSOCKET | PUSH | EMAIL)
- `status`: VARCHAR (PENDING | DELIVERED | FAILED | SKIPPED)
- `device_token`: VARCHAR? (токен, использованный при push)

**device_tokens** — FCM-токены устройств:
- `user_id`: INTEGER, `platform`: IOS | ANDROID, `token`: VARCHAR UNIQUE
- `is_active`: BOOLEAN (false после логаута)
- `last_seen_at`: TIMESTAMP

**user_notification_preferences** — настройки:
- `push_enabled`: BOOLEAN
- `blocked_categories`: JSONB (список заблокированных категорий)

## WebSocket Protocol

**Подключение:** `wss://domain/notifications/ws?token={jwt}`

**Сервер → Клиент:**
```json
{"type": "NOTIFICATION", "notification_id": "uuid", "category": "TASK_REVIEW", "title": "...", "body": "...", "data": {"task_id": "uuid"}}
```

**Клиент → Сервер (ACK):**
```json
{"type": "ACK", "notification_id": "uuid"}
```

ACK таймаут: 5 секунд (настраивается через `WS_ACK_TIMEOUT`).

## Конфигурация

```bash
DATABASE_URL=postgresql://wfm_notifications_user:...@postgres:5432/wfm_notifications
FIREBASE_CREDENTIALS_JSON=<json строка serviceAccountKey.json>
WS_ACK_TIMEOUT=5
USERS_SERVICE_URL=http://svc_users:8000
BV_PUBLIC_KEY=<публичный ключ>
```

Если `FIREBASE_CREDENTIALS_JSON` пустой — push отключён (stub-режим).

## Межсервисное взаимодействие

- **Входящие:** svc_tasks → `POST /internal/send` (отправить уведомление)
- **Исходящие:** svc_notifications → svc_users `/internal/user-id` (резолвинг user_id)

В svc_tasks: `app/services/notifications_client.py` — `NotificationsServiceClient`.
При ошибке svc_notifications — логирует warning, не блокирует основную операцию.
