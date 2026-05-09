# План: Переработка GET /tasks/list — фильтрация по магазину, зонам, типам работ и сотрудникам

**Статус:** Выполнено
**Создан:** 2026-03-11
**Последнее обновление:** 2026-03-12

---

## Цель

Переработать endpoint `GET /tasks/list` для менеджера:
- добавить `assignment_id` как параметр идентификации магазина
- добавить два новых endpoint'а для получения доступных фильтров: по зонам/типам работ и по сотрудникам
- добавить фильтрацию задач по массиву сотрудников, зон и типов работ
- обновить Memory Bank и OpenAPI документацию

---

## Архитектурное решение

### Потоки данных

**`GET /tasks/list/filters?assignment_id=X`** и **`GET /tasks/list/users?assignment_id=X`**:
1. svc_tasks получает `assignment_id` → вызывает svc_users: `GET /internal/assignment-store?assignment_id=X` → получает `store_id`
2. svc_tasks вызывает svc_users: `GET /internal/store-assignments?store_id=X` → получает список `[{assignment_id, user_id, ...}]`
3. svc_tasks вызывает svc_shifts: `GET /internal/today-shift-plans?assignment_ids=1,2,3` → получает список `[{plan_id, assignment_id}]` плановых смен на сегодня
4. По полученным `plan_id` из таблицы tasks вытаскивает задачи → агрегирует доступные зоны, типы работ, список сотрудников

**`GET /tasks/list?assignment_id=X&assignee_ids=1,2&zone_ids=3,4&work_type_ids=5`**:
- То же что выше, но после получения plan_id применяет фильтры к задачам

### Новые внутренние endpoint'ы

| Сервис | Endpoint | Описание |
|--------|----------|----------|
| svc_users | `GET /internal/store-assignments?store_id=X` | Все назначения в магазине с данными пользователей |
| svc_shifts | `GET /internal/today-shift-plans?assignment_ids=1,2,3` | Плановые смены на сегодня для набора assignment_ids |

> `GET /internal/assignment-store?assignment_id=X` в svc_users уже существует.

---

## Форматы ответов

### GET /tasks/list/filters

```json
{
  "status": {"code": ""},
  "data": {
    "filters": [
      {
        "id": "zones",
        "title": "Зона",
        "zones": [
          {"id": 1, "title": "Фреш 1"},
          {"id": 2, "title": "Фреш 2"},
          {"id": 3, "title": "Напитки б/а"}
        ]
      },
      {
        "id": "work_types",
        "title": "Тип работ",
        "work_types": [
          {"id": 1, "title": "Менеджерские операции"},
          {"id": 2, "title": "Касса"},
          {"id": 3, "title": "КСО"}
        ]
      }
    ]
  }
}
```

### GET /tasks/list/users

```json
{
  "status": {"code": ""},
  "data": {
    "users": [
      {
        "assignment_id": 7,
        "user_id": 42,
        "first_name": "Иван",
        "last_name": "Иванов",
        "middle_name": "Иванович",
        "position": {
          "id": 2,
          "code": "prodav_prod",
          "name": "Продавец продовольственных товаров"
        }
      }
    ]
  }
}
```

### GET /tasks/list (обновлённые параметры)

**Query параметры (все опциональные, кроме assignment_id для MANAGER):**
- `assignment_id` (int, required для MANAGER) — определяет магазин
- `assignee_ids` (int[], optional) — фильтр по ID работников
- `zone_ids` (int[], optional) — фильтр по ID зон
- `work_type_ids` (int[], optional) — фильтр по ID типов работ
- `state` (string, optional) — фильтр по статусу задачи
- `review_state` (string, optional) — фильтр по статусу проверки; если указан, **накладывается на всю выдачу** независимо от других фильтров (значения: NONE | ON_REVIEW | ACCEPTED | REJECTED)

---

## Задачи

### 1. svc_users — новый внутренний endpoint

- [x] **1.1** Реализовать `GET /internal/store-assignments?store_id=X` — 2026-03-11
  - Возвращает список `[{assignment_id, user_id, external_id, position: {id, code, name}}]` для магазина
  - Без JWT (внутренний Docker-сеть endpoint)
  - Присоединяет данные ФИО пользователя из SSO (graceful degradation: возвращать без ФИО если SSO недоступен)
  - Добавить в `app/api/internal.py`

### 2. svc_shifts — новый внутренний endpoint

- [x] **2.1** Реализовать `GET /internal/today-shift-plans?assignment_ids=1,2,3` — 2026-03-11
  - Принимает `assignment_ids` как comma-separated строку или repeating query param
  - Возвращает `[{plan_id, assignment_id}]` — плановые смены (`shifts_plan`) за сегодня (`shift_date = today()`)
  - Без JWT (внутренний Docker-сеть endpoint)
  - Добавить в `app/api/internal.py`

### 3. svc_tasks — обновление клиентов межсервисного взаимодействия

- [x] **3.1** Обновить `shifts_client.py` — добавить метод `get_today_shift_plans` — 2026-03-11
- [x] **3.2** Обновить `users_client.py` — добавить методы `get_assignment_store`, `get_store_assignments` — 2026-03-11

### 4. svc_tasks — новые endpoint'ы фильтров

- [x] **4.1** Реализовать `GET /list/filters?assignment_id=X` — 2026-03-11
- [x] **4.2** Реализовать `GET /list/users?assignment_id=X` — 2026-03-11

### 5. svc_tasks — обновление GET /list

- [x] **5.1–5.7** Реализованы все параметры и обновлён репозиторий — 2026-03-11

### 6. Обновление Memory Bank

- [x] **6.1** Обновлён `api_tasks.md` — 2026-03-11
- [x] **6.2** Обновлён `api_users.md` — 2026-03-11
- [x] **6.3** Обновлён `api_shifts.md` — 2026-03-11
- [x] **6.4** Обновлён `svc_tasks.md` — структура и межсервисные вызовы — 2026-03-11
- [x] **6.5** Обновлён `svc_shifts.md` — новый internal endpoint — 2026-03-11
- [x] **6.6** Обновлён CLAUDE.md — `GET /list` новые параметры — 2026-03-11

### 7. OpenAPI / Swagger

- [x] **7.1** Все новые endpoint'ы имеют FastAPI docstrings — 2026-03-11
- [x] **7.2** Проверить корректность отображения в `/tasks/docs` (требует запуска сервиса)

---

## Лог выполнения

### 2026-03-11

- Создан план на основе анализа текущего состояния svc_tasks, svc_shifts, svc_users
- Определена архитектура: 2 новых internal endpoint (svc_users + svc_shifts), 2 новых endpoint'а фильтров в svc_tasks, расширение GET /list
