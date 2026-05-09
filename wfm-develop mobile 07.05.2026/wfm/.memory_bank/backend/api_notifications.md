# API Notifications (svc_notifications)

**Base URL:** `/notifications/`
**Порт:** 8003
**БД:** wfm_notifications

## Public API (требует JWT)

### Список уведомлений

**GET /notifications/list**

Параметры:
- `is_read: bool | null` — фильтр по статусу прочтения
- `date_from: datetime | null` — фильтр: уведомления не раньше этой даты (ISO 8601, UTC)
- `limit: int` — максимум записей (1–100, по умолчанию 50)
- `offset: int` — смещение для пагинации

Возвращает `NotificationListData`: `notifications[]`, `total`, `unread_count`.

Только уведомления с `visibility = USER`.

### Непрочитанные

**GET /notifications/unread-count** — возвращает `{ unread_count: int }`

### Пометить прочитанным

**POST /notifications/{id}/read** — помечает одно уведомление. Возвращает обновлённый объект.

**POST /notifications/read-all** — помечает все. Возвращает `{ marked_count: int }`.

### Токены устройств

**POST /notifications/devices/tokens** — зарегистрировать/обновить FCM/HMS токен
**DELETE /notifications/devices/tokens/{token}** — деактивировать при логауте

### Настройки

**GET /notifications/preferences** — настройки уведомлений
**PATCH /notifications/preferences** — обновить (`push_enabled`, `blocked_categories`)

## WebSocket

**WS /notifications/ws?token={jwt}** — real-time уведомления; клиент отвечает ACK

## Internal API (без JWT, только Docker-сеть)

**POST /notifications/internal/send** — отправить уведомление из другого сервиса
**POST /notifications/internal/test** — тестовая отправка

## Модель Notification

```
id: UUID
recipient_id: int
category: TASK_REVIEW | TASK_REJECTED | TASK_STATE_CHANGED
title: string
body: string
data: JSON | null  (task_id, screen и т.д.)
visibility: USER | SYSTEM
delivery_strategy: EMERGENCY | WEBSOCKET_ONLY | WEBSOCKET_THEN_PUSH | EMAIL_ONLY
is_read: bool
read_at: datetime | null
created_at: datetime
```

## Связанные документы

- WebSocket клиент: `.memory_bank/mobile/feature_notifications/notifications_websocket.md`
- Push-уведомления: `.memory_bank/mobile/feature_notifications/push_notifications.md`
- Экран списка: `.memory_bank/mobile/feature_notifications/notifications_list.md`
