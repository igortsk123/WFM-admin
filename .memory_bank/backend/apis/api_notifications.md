# API: Notifications

**Base URL:** `/notifications/`
**Сервис:** svc_notifications (порт 8003)

**Связанные документы:**
- `.memory_bank/backend/services/svc_notifications.md` — архитектура сервиса
- `.memory_bank/mobile/feature_notifications/notifications_websocket.md`

---

## Public API (требует JWT)

### Список уведомлений

`GET /notifications/list`

Query params: `is_read` (bool, optional), `limit` (1–100, default 50), `offset`.
Возвращает только `visibility=USER` уведомления.

```json
{
  "status": {"code": ""},
  "data": {
    "notifications": [
      {"id": "uuid", "category": "TASK_REJECTED", "title": "Задача возвращена",
       "body": "Задача «Выкладка» отклонена: недостаточно фото",
       "data": {"task_id": "uuid"}, "is_read": false, "created_at": "..."}
    ],
    "total": 5,
    "unread_count": 2
  }
}
```

### Счётчик непрочитанных

`GET /notifications/unread-count`

```json
{"status": {"code": ""}, "data": {"unread_count": 2}}
```

### Отметить как прочитанное

`POST /notifications/{notification_id}/read`

### Отметить все прочитанными

`POST /notifications/read-all`

```json
{"status": {"code": ""}, "data": {"marked_count": 3}}
```

### Управление токенами устройств

`POST /notifications/devices/tokens` — зарегистрировать токен
```json
{
  "platform": "IOS" | "AND" | "HUA",
  "token": "token_string",
  "token_type": "fcm" | "hms"
}
```

Поле `token_type` — опциональное, по умолчанию `"fcm"` (обратная совместимость).
Backward compat: `platform = "ANDROID"` принимается и нормализуется в `"AND"`.

`DELETE /notifications/devices/tokens/{token}` — деактивировать при логауте

### Настройки уведомлений

`GET /notifications/preferences`
```json
{"push_enabled": true, "blocked_categories": [], "updated_at": "..."}
```

`PATCH /notifications/preferences`
```json
{"push_enabled": false, "blocked_categories": ["TASK_STATE_CHANGED"]}
```

---

## WebSocket

**URL:** `wss://domain/notifications/ws?token={jwt}`

Авторизация через query param `token`. После подключения сервер пушит уведомления в реальном времени. Клиент должен отвечать ACK на каждое сообщение.

**Сервер → клиент:**
```json
{"type": "NOTIFICATION", "notification_id": "uuid", "category": "TASK_REVIEW",
 "title": "Задача на проверку", "body": "Иван завершил задачу «Выкладка»",
 "data": {"task_id": "uuid", "worker_id": 42}}
```

**Клиент → сервер (ACK):**
```json
{"type": "ACK", "notification_id": "uuid"}
```

---

## Internal API (без JWT, только Docker-сеть)

### Отправить уведомление

`POST /internal/send`
```json
{
  "recipient_id": 42,
  "category": "TASK_REVIEW",
  "data": {"task_id": "uuid", "task_title": "Выкладка товара", "worker_id": 7}
}
```

Поле `data` зависит от категории:

| Категория | Обязательные поля data |
|-----------|------------------------|
| `TASK_REVIEW` | `task_id`, `task_title`, `worker_id` |
| `TASK_REJECTED` | `task_id`, `task_title`, `reject_reason` |
| `TASK_STATE_CHANGED` | `task_id`, `task_title`, `new_state` |

Ответ:
```json
{"status": {"code": ""}, "data": {"notification_id": "uuid", "strategy": "WEBSOCKET_THEN_PUSH"}}
```

Если категория заблокирована пользователем:
```json
{"status": {"code": ""}, "data": {"skipped": true, "reason": "blocked_by_user"}}
```

### Тестовая отправка

`POST /internal/test?recipient_id=42&category=TASK_REVIEW`

Отправляет тестовое уведомление с фиктивными данными. Только для разработки.
