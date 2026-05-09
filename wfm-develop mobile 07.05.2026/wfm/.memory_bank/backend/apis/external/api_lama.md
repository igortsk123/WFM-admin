# LAMA API — Внешнее API для интеграции

## Обзор

LAMA — внешняя система управления персоналом, через которую можно получать данные о сотрудниках, сменах и задачах. WFM интегрируется с LAMA для синхронизации данных.

**Base URL:** `https://wfm-smart.lama70.ru/api`

**Конфигурация:**
- `LAMA_API_BASE_URL` — базовый URL
- `LAMA_API_TIMEOUT` — таймаут запросов (по умолчанию 5 сек)
- `LAMA_API_ENABLED` — включение/отключение интеграции (по умолчанию `true`)
- `LAMA_CACHE_TTL` — время жизни кэша (по умолчанию 3600 сек = 1 час)

**Принцип работы:** Graceful degradation — при недоступности LAMA система продолжает работать на локальных данных.

---

## Endpoints

### 1. GET /employee/?phone=

Получение информации о сотруднике по номеру телефона.

**Параметры запроса:**
- `phone` (query, string, required) — номер телефона сотрудника

**Пример запроса:**
```
GET /employee/?phone=79001234567
```

**Пример ответа:**
```json
{
  "employee_id": 12345,
  "employee_name": "Шелудько Нина Александровна",
  "positions": [
    {
      "employee_in_shop_id": 67890,
      "position_code": "cashier",
      "position_name": "Кассир",
      "position_role": "Executor",
      "rank_code": "Разряд 2",
      "rank_name": "Разряд 2",
      "shop_code": "shop_001",
      "shop_name": "Магазин №1",
      "company_name": "ООО \"Инвест Ресторация\"",
      "date_start": "2025-01-15",
      "date_end": null
    }
  ]
}
```

**Маппинг на WFM:**
- `employee_id` → `User.external_id`
- `employee_name` → парсинг "Фамилия Имя Отчество" → `UserLamaCache.last_name`, `first_name`, `middle_name`
- Каждый элемент `positions[]` → `Assignment`
- `employee_in_shop_id` → `Assignment.external_id`
- `position_code` → `Position.code`
- `position_role` → `Position.role_id` (`Executor` = worker / `Administrator` = manager; отсутствие поля = worker)
- `rank_code` → `Rank.code`
- `shop_code` → `Store.external_code` → `Assignment.store_id` (через межсервисный вызов `svc_users → svc_shifts GET /internal/store-by-code`)

---

### 2. GET /employee/?shop_code=

Получение всех сотрудников магазина. Используется при ежедневной batch-синхронизации.

**Параметры запроса:**
- `shop_code` (query, string, required) — код магазина из LAMA

**Пример запроса:**
```
GET /employee/?shop_code=0120
```

**Пример ответа:**
```json
[
  {
    "employee_id": 44945,
    "employee_name": "Елисеева Анна Михайловна",
    "positions": [
      {
        "employee_in_shop_id": 11057,
        "company_name": "ООО \"Инвест Ресторация\"",
        "position_code": "КасКасСамобсл",
        "position_name": "Кассир кассы самообслуживания",
        "position_role": "Executor",
        "rank_code": "Н/А",
        "rank_name": "Н/А",
        "shop_code": "0120",
        "shop_name": "С-12 Некрасова, 41 (ИР)",
        "date_start": "2026-03-12",
        "date_end": "2154-12-31"
      }
    ]
  }
]
```

**Маппинг на WFM:** аналогичен `GET /employee/?phone=`.

---

### 3. GET /shift/

Получение смены сотрудника на сегодня.

**Параметры запроса:**
- `employee_in_shop_id` (query, int, required) — ID назначения из LAMA

**Пример запроса:**
```
GET /shift/?employee_in_shop_id=67890
```

**Пример ответа:**
```json
{
  "id": 111,
  "shift_date": "2026-02-18",
  "start_time": "09:00",
  "end_time": "18:00",
  "duration": 9,
  "shop_code": "shop_001"
}
```

**Маппинг на WFM:**
- `id` → `ShiftPlan.external_id`
- `shift_date` → `ShiftPlan.shift_date`
- `start_time` → `ShiftPlan.start_time`
- `end_time` → `ShiftPlan.end_time`
- `duration` → `ShiftPlan.duration`
- `shop_code` → `Store.external_code`

---

### 4. GET /tasks/

Получение задач для смены.

**Параметры запроса:**
- `shift_id` (query, int, required) — ID смены из LAMA

**Пример запроса:**
```
GET /tasks/?shift_id=111
```

**Пример ответа:**
```json
[
  {
    "id": 501,
    "status": "Created",
    "priority": 1,
    "operation_work": "КСО",
    "operation_zone": "Фреш 1",
    "category": "СВЕЖЕЕ МЯСО И ПТИЦА",
    "duration": 1800,
    "time_start": "09:00",
    "time_end": "09:30"
  }
]
```

**Маппинг на WFM:**
- `id` → `Task.external_id`
- `status` → `Task.state` (через маппинг статусов)
- `priority` → `Task.priority`
- `operation_work` → `Task.operation_work` и `Task.title`
- `operation_zone` → `Task.operation_zone`
- `category` → `Task.category`
- `duration` (секунды) → `Task.planned_minutes` (минуты, деление на 60)
- `time_start` → `Task.time_start`
- `time_end` → `Task.time_end`

---

### 5. POST /set_task_status/{task_id}

Обновление статуса задачи в LAMA (двусторонняя синхронизация).

**Параметры пути:**
- `task_id` (int, required) — ID задачи в LAMA

**Тело запроса:**
```json
{
  "status": "InProgress"
}
```

**Ответ:** HTTP 200 при успехе.

---

## Маппинг статусов

### LAMA → WFM (при получении задач)

| Статус LAMA | Состояние WFM | Примечание |
|-------------|---------------|------------|
| `Created` | `NEW` | Новая задача |
| `InProgress` | `IN_PROGRESS` | В работе |
| `Suspended` | `PAUSED` | Приостановлена |
| `Completed` | `COMPLETED` | Завершена |
| `Accepted` | `COMPLETED` | Подтверждена (`approved_by != null`) |
| `Returned` | `PAUSED` | Отклонена (`rejection_reason != null`) |

### WFM → LAMA (при обновлении статуса)

| Состояние WFM | Статус LAMA |
|---------------|-------------|
| `NEW` | `Created` |
| `IN_PROGRESS` | `InProgress` |
| `PAUSED` | `Suspended` |
| `COMPLETED` | `Completed` |

---

## Архитектура интеграции

### Shared LAMA Client

Файл: `backend/shared/lama_client.py`

Единый HTTP клиент для всех сервисов. Паттерн аналогичен `sso_service.py`:
- `httpx.AsyncClient` с настраиваемым таймаутом
- При ошибке/таймауте: логировать warning, вернуть `None`
- Флаг `LAMA_API_ENABLED` для отключения интеграции

### Кэширование

- **svc_users:** Кэш данных сотрудника (`user_lama_cache`, TTL 1 час)
- **svc_shifts:** Синхронный запрос при каждом `/current` (без кэша)
- **svc_tasks:** Синхронный запрос при каждом `/list` (без кэша)

### Двусторонняя синхронизация статусов

При изменении состояния задачи в WFM (start, pause, complete), если задача имеет `external_id` (пришла из LAMA), статус отправляется обратно в LAMA через `POST /set_task_status/{task_id}`.
