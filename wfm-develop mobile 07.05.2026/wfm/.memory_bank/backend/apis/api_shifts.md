# API: Shifts (FastAPI)

**Base URL:** `/shifts/`

> **Примечание:** Начиная с 2026-03-12, эндпоинты смен обслуживаются `svc_tasks` (порт 8000). Отдельного `svc_shifts` нет. Nginx проксирует `/shifts/` → `http://localhost:8000/shifts/`.

Все эндпоинты требуют аутентификацию (JWT токен в заголовке `Authorization: Bearer <token>`).

**Формат ответов:** Beyond Violet API (см. `.memory_bank/backend/patterns/api_response_format.md`)

**Связанные документы:**
- `.memory_bank/domain/shift_model.md` — доменная модель смен
- `.memory_bank/backend/patterns/api_response_format.md` — формат ответов API
- `.memory_bank/backend/services/svc_tasks.md` — сервис, который обслуживает эти endpoints

---

## Служебные endpoints

См. `.memory_bank/backend/patterns/service_endpoints.md`

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/` | Информация о сервисе |
| GET | `/health` | Health check |

---

## Статусы смены

```
NEW      — Смена из shifts_plan (ещё не открыта)
OPENED   — Смена открыта (shifts_fact, closed_at = NULL)
CLOSED   — Смена закрыта (shifts_fact, closed_at IS NOT NULL)
```

---

## Endpoints: Смены

### POST /open
Открыть смену (создать запись в shifts_fact)

**Request Body:**
```json
{
  "plan_id": 1
}
```

**Бизнес-логика:**
- Создаёт новую запись в shifts_fact с `plan_id` и `opened_at = NOW()`
- Данные магазина запрашиваются у svc_users по `assignment_id` (graceful degradation)
- У работника может быть только одна открытая смена одновременно
- Если уже есть открытая смена → HTTP 200 с `status.code = "CONFLICT"`

**Response:** `CurrentShiftResponse` — единая модель ответа (см. ниже)

---

### POST /close
Закрыть смену (установить closed_at)

**Request Body:**
```json
{
  "plan_id": 1,
  "force": false
}
```

**Параметры:**
- `plan_id` (int, required) — ID плановой смены
- `force` (bool, default: `false`) — принудительное закрытие при наличии незавершённых задач

**Бизнес-логика:**
- Находит открытую смену по `plan_id` (`closed_at IS NULL`)
- Если нет открытой смены → `status.code = "NOT_FOUND"`

**Проверка задач (если `force = false`):**
1. Если есть хотя бы одна задача смены в состоянии `IN_PROGRESS` → `status.code = "TASKS_IN_PROGRESS"` ("У вас есть задачи в работе")
2. Если есть хотя бы одна задача смены в состоянии `PAUSED` → `status.code = "TASKS_PAUSED"` ("У вас есть незавершённые задачи")

**Принудительное закрытие (`force = true`):**
- Все задачи смены в состоянии `IN_PROGRESS` переводятся в `PAUSED`
- Для каждой такой задачи создаётся событие `PAUSE` с `actor_role = "system"` и `meta.reason = "shift_force_close"`
- Смена закрывается в штатном режиме

**Задачи привязаны к смене** через `Task.shift_id = shifts_plan.id` (то же значение, что `plan_id` в запросе).

**Response:** `CurrentShiftResponse` — единая модель ответа (см. ниже)

---

### GET /current
Получить текущую смену пользователя

**Query параметры:**
- `assignment_id` (int, **required**) — ID назначения сотрудника из svc_users (для LAMA sync)

**Логика:**
1. Ищем плановую смену за сегодня в локальной БД (`shifts_plan`)
2. Если план не найден → синхронизируем из LAMA (lazy sync), затем повторно читаем план из БД
3. Ищем в shifts_fact за сегодня → возвращаем последнюю (OPENED или CLOSED) с `start_time`/`end_time` из плана
4. Если факта нет, но есть план → возвращаем со статусом NEW
5. Если нигде нет → возвращаем `data: null`

**Важно:** LAMA sync вызывается только если плановой смены нет в локальной БД. В обычном режиме (смена уже синхронизирована утренним n8n-джобом) запрос к LAMA не происходит.

**Response:** `CurrentShiftResponse` — единая модель ответа (см. ниже)

---

### Модель CurrentShiftResponse

Единая модель ответа для `POST /open`, `POST /close`, `GET /current`, `GET /{id}`.

Все три эндпоинта (`/open`, `/close`, `/current`) возвращают одинаковую структуру с объектом магазина и плановым временем смены.

**Response (из shifts_fact, с планом):**
```json
{
  "status": {"code": ""},
  "data": {
    "id": 1,
    "plan_id": 1,
    "status": "OPENED",
    "assignment_id": 7,
    "opened_at": "2025-02-11T09:00:00",
    "closed_at": null,
    "start_time": "09:00:00",
    "end_time": "18:00:00",
    "store": {
      "id": 1,
      "name": "Магазин на Ленина",
      "address": "ул. Ленина, 42",
      "created_at": "2025-01-01T00:00:00"
    }
  }
}
```

**Response (из shifts_plan):**
```json
{
  "status": {"code": ""},
  "data": {
    "id": 1,
    "status": "NEW",
    "assignment_id": 7,
    "shift_date": "2025-02-11",
    "start_time": "09:00:00",
    "end_time": "18:00:00",
    "store": {...}
  }
}
```

---

### GET /{id}
Получить смену по ID

---


## Итог

**Служебные endpoints (Base URL: /shifts/):**
- `GET /` — информация о сервисе
- `GET /health` — health check

**Основные endpoints (Base URL: /shifts/):**
- `POST /open` — открыть смену (требует `plan_id`; `assignment_id` берётся из плана)
- `POST /close` — закрыть смену (требует `plan_id`)
- `GET /current` — получить текущую смену (приоритет: fact → plan)
- `GET /{id}` — получить смену по ID

**Ключевые правила:**
- Одна открытая смена на работника
- `GET /current`, `POST /open`, `POST /close` возвращают единую модель `CurrentShiftResponse` с объектом магазина (`store`) и плановым временем (`start_time`, `end_time`)
- `start_time` / `end_time` берутся из `shifts_plan` за сегодня (если план существует)
- Данные магазина (`store`) получаются из svc_users по `assignment_id` (graceful degradation: `null` при недоступности)
- Приоритет get_current: shifts_fact → shifts_plan
- Статусы: NEW (план), OPENED (открыта), CLOSED (закрыта)
- Магазины хранятся в svc_users — endpoints `/stores` перенесены туда
- `POST /close` без `force` блокируется при наличии задач IN_PROGRESS или PAUSED — мобильный клиент должен обрабатывать коды `TASKS_IN_PROGRESS` и `TASKS_PAUSED`
- При `force=true` задачи IN_PROGRESS принудительно переводятся в PAUSED; событие `PAUSE` с `actor_role="system"` и `meta.reason="shift_force_close"` позволяет идентифицировать их в аналитике

---

## Интеграция с LAMA

### Новые поля в моделях

**Store:**
- `external_code` (VARCHAR(50), unique, nullable) — код магазина из LAMA (`shop_code`). Используется для связки магазинов WFM и LAMA при синхронизации смен.

**ShiftPlan:**
- `assignment_id` (INTEGER, NOT NULL) — владелец смены (ссылка на assignment из svc_users).
- `external_id` (INTEGER, unique, nullable) — ID смены из LAMA. Используется для upsert при синхронизации.
- `duration` (INTEGER, nullable) — длительность смены в часах из LAMA.

**ShiftFact:**
- `plan_id` (INTEGER, NOT NULL, FK → shifts_plan.id) — связь с плановой сменой. `assignment_id` для фактической смены выводится через план. Объект `store` запрашивается из svc_users по `assignment_id`.

### Синхронизация смен из LAMA

Существуют два независимых пути синхронизации:

**1. Утренний n8n-джоб** (`POST /tasks/internal/sync-daily`, запускается в 6:00) — основной путь:
- Синхронизирует смены и задачи для всех assignment сразу
- Не зависит от активности пользователей

**2. Lazy sync в `GET /current`** — резервный путь:
- Срабатывает только если плановой смены за сегодня нет в локальной БД
- Шаги: получить `external_id` из svc_users → `GET /shift/?employee_in_shop_id={id}` → upsert `ShiftPlan`
- При недоступности LAMA система работает на локальных данных (graceful degradation)

### Поле `assignment_id` в ответе CurrentShiftResponse

Поле `assignment_id` присутствует в ответе и используется для связки с задачами из LAMA.

**Подробнее:**
- LAMA API: `.memory_bank/backend/apis/external/api_lama.md`
- Сервис синхронизации: `.memory_bank/backend/services/svc_tasks.md`
