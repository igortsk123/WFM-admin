# MIGRATION NOTES — admin ↔ backend

> Документ для backend-разработчика. Сюда смотреть когда планируешь дотягивать
> backend под admin model. Чтобы интеграция была бесшовной — admin сохраняет
> весь свой богатый model, а backend постепенно расширяет Pydantic schemas
> и добавляет endpoint'ы.

---

## Что сейчас работает в admin → backend

Реализовано в `lib/api/`:

- **Auth**: JWT в `Authorization: Bearer` через `_auth-token.ts`. Токен в localStorage.
- **Config**: `NEXT_PUBLIC_API_BASE_URL` + `NEXT_PUBLIC_USE_REAL_API` флаг.
- **Client**: `_client.ts` — обёртка fetch + распаковка backend envelope `{status, data}`.
- **Backend types**: `_backend-types.ts` — TS-зеркала Pydantic schemas.
- **Endpoints подключены** (raw wrappers, без lossy dispatch):
  - **users** (`lib/api/users.ts`):
    - `getCurrentUserMe()` → `GET /users/me`
    - `getUserByIdFromBackend(id)` → `GET /users/{id}`
    - `updateUserOnBackend(id, data)` → `PATCH /users/{id}`
    - `updateUserPermissionsOnBackend(id, perms)` → `PATCH /users/{id}/permissions`
  - **stores** (`lib/api/stores.ts`):
    - `getStores()` под флагом `USE_REAL_API` → `GET /users/stores`
  - **tasks** (`lib/api/tasks.ts`):
    - `getTasksFromBackend(params)` → `GET /tasks/list`
    - `getTasksV2FromBackend(params)` → `GET /tasks/list/v2` (AND-filter)
    - `getTaskFiltersFromBackend(assignmentId)` → `GET /tasks/list/filters`
    - `getTaskListUsersFromBackend(assignmentId)` → `GET /tasks/list/users`
    - `getMyTasksFromBackend(assignmentId, state?)` → `GET /tasks/my`
    - `getTaskByIdFromBackend(id)` → `GET /tasks/{id}`
    - `createTaskOnBackend(data)` → `POST /tasks/`
    - `updateTaskOnBackend(id, data)` → `PATCH /tasks/{id}`
    - `startTaskOnBackend(id)` → `POST /tasks/{id}/start`
    - `pauseTaskOnBackend(id)` → `POST /tasks/{id}/pause`
    - `resumeTaskOnBackend(id)` → `POST /tasks/{id}/resume`
    - `completeTaskOnBackend(id, {reportText?, reportImage?, operationIds?, newOperations?})` →
      `POST /tasks/{id}/complete` (multipart/form-data)
    - `approveTaskOnBackend(id)` → `POST /tasks/{id}/approve`
    - `rejectTaskOnBackend(id, reason)` → `POST /tasks/{id}/reject`
    - `getTaskEventsFromBackend(id)` → `GET /tasks/{id}/events`
  - **shifts** (`lib/api/shifts.ts`):
    - `openShiftOnBackend(planId)` → `POST /shifts/open`
    - `closeShiftOnBackend(planId, force?)` → `POST /shifts/close`
    - `getCurrentShiftFromBackend(assignmentId)` → `GET /shifts/current`
    - `getShiftByIdFromBackend(id)` → `GET /shifts/{id}`
  - **hints** (`lib/api/hints.ts`):
    - `getHintsFromBackend(workTypeId, zoneId)` → `GET /tasks/hints`
    - `createHintOnBackend(data)` → `POST /tasks/hints`
    - `updateHintOnBackend(id, data)` → `PATCH /tasks/hints/{id}`
    - `deleteHintOnBackend(id)` → `DELETE /tasks/hints/{id}`
  - **operations** (`lib/api/operations.ts` — новый файл):
    - `getOperationsFromBackend(workTypeId, zoneId)` → `GET /tasks/operations`
    - `getPendingOperationsFromBackend()` → `GET /tasks/operations/pending`
    - `approveOperationOnBackend(id)` → `POST /tasks/operations/{id}/approve`
    - `rejectOperationOnBackend(id, reason?)` → `POST /tasks/operations/{id}/reject`

Dev-страница: `/dev/api-token` — установить JWT, протестировать `/users/me`.

---

## Что admin использует поверх backend (нужно дотянуть)

Эти поля admin уже моделирует и использует в UI. Когда backend их добавит,
интеграция усилится без изменений admin'а.

### Store extension (priority HIGH)

Backend сейчас отдаёт: `{id, name, address, external_code, created_at}`.
Admin ожидает дополнительно:

| Поле | Тип | Зачем |
|---|---|---|
| `organization_id` | string (uuid) | Multi-tenant scope. Без этого admin показывает все магазины во всех org. |
| `legal_entity_id` | int | FK на legal_entity. Для bills, payouts, юридических документов. |
| `manager_id` | int? | FK на user (директор). Используется в нотификациях, аудите. |
| `supervisor_id` | int? | FK на user (супервайзер магазина). |
| `region` | string? | «Томская обл.» для региональной отчётности. |
| `object_type` | enum: STORE/WORKSHOP/DEPARTMENT/OFFICE/WAREHOUSE_HUB | Для фильтрации по типу объекта. |
| `object_format` | enum: SUPERMARKET/HYPERMARKET/CONVENIENCE/SMALL_SHOP/SEWING_WORKSHOP/PRODUCTION_LINE | Для маппинга на сервисные нормы. |
| `format_shop_name` | string? | Сырое название формата из LAMA («Гипермаркет», «Универсам ФРЕШ»). |
| `internal_company` | LegalEntity? | Полный объект юрлица (id, code, name, inn, kpp, rec_id). LAMA-style nested. |
| `time_start` / `time_end` | time? | Часы работы магазина. |
| `storage_code` | string? | Код склада в 1С (мгФС_1, etc.). |
| `in_group` | bool | В составе сети (vs independent). |
| `lama_rec_id` | int? | rec_id магазина в 1С ERP. |
| `lama_synced_at` | timestamp? | Когда последняя синхронизация с LAMA. |
| `geo` | `{lat, lng}`? | Координаты для карт. |
| `archived` / `archive_reason` | bool / enum | Soft-delete + причина. |

Часть этих полей уже есть в LAMA (`/shops/` endpoint). Бекенд может проксировать их в `/users/stores`.

### Store stats (priority MEDIUM)

Admin показывает счётчики на карточке магазина в `/stores`:
- `tasks_today_count` — задач сегодня
- `staff_count` — активных сотрудников
- `current_shifts_open_count` — открытых смен сейчас
- `current_shifts_total` — всего смен сегодня
- `permissions_coverage_pct` — % сотрудников с привилегиями

Backend может добавить `GET /users/stores/list/with-stats` или агрегатор внутри `/stores`.

### User extension (priority HIGH)

Backend `UserResponse` отдаёт: `{id, sso_id, external_id, employee_type, permissions, assignments, updated_at}`.
Admin использует поверх:

| Поле | Тип | Зачем |
|---|---|---|
| `phone` | string | Для звонка/sms из карточки. SSO-cache в `/me` уже даёт. Прокинуть в `UserResponse`. |
| `email` | string? | Аналогично. |
| `avatar_url` (= photo_url) | string? | Для UserCell. |
| `type` | "STAFF" \| "FREELANCE" | Внештата vs штат — определяет visibility freelance-flow. |
| `hired_at` | date? | Дата найма для анонса юбилеев. |
| `archived` / `archive_reason` | bool / enum | Soft-delete. |
| `freelancer_status` | enum (ACTIVE/PAUSED/...) | Только для FREELANCE. |
| `agent_id` | string? | FK на агента (для freelance via агентство). |
| `oferta_accepted_at` | timestamp? | Когда внештатник принял оферту. |
| `rating` | float | Рейтинг для распределения задач. |
| `source` | "MANUAL" \| "EXTERNAL_SYNC" | Откуда создан (HR-система, внешний sync). |

### User stats (priority LOW для backend, для admin есть mock)

В UserDetail админ показывает:
`tasks_total, tasks_diff_pct, tasks_accepted, tasks_rejected, paused_now, avg_completion_min, avg_completion_diff_min`.

Backend может посчитать через `GET /users/{id}/stats?period=...`.

### Functional roles (admin invented, NOT в backend)

Backend знает только 2 роли: **MANAGER** и **WORKER** (через position.role_id).
Admin использует hierarchy:

```
PLATFORM_ADMIN > NETWORK_OPS > REGIONAL > SUPERVISOR > STORE_DIRECTOR > WORKER
                                                                       AGENT (отдельная ветка)
                                                                       HR_MANAGER (отдельная ветка)
```

**Решение**: backend может оставить лаконично 2 роли (для mobile worker/manager flow),
admin держит hierarchy в `MOCK_FUNCTIONAL_ROLES` локально. JWT клейм `role` опционально.

Если backend хочет поддержать — добавить `GET /users/{id}/functional-role` с
`{functional_role, scope_type, scope_ids[]}`.

### Task extension (priority HIGH когда дойдём до tasks-миграции)

Backend Task уже совпадает с admin почти 1-в-1. Что admin использует поверх:

| Поле | Тип | Зачем |
|---|---|---|
| `goal_id` | uuid? | FK на Goal (модуль AI-целей). |
| `bonus_points` | int? | Баллы премии за задачу. |
| `marketing_channel_target` | string? | Для маркетинговых задач. |
| `freelance_application_id` | uuid? | FK когда задача создана через заявку внештата. |
| `freelance_assignment_id` | uuid? | FK на закрытие заявки. |
| `service_id` | uuid? | FK на сервисную услугу. |
| `is_overdue` | bool | Computed на сервере: дедлайн прошёл. |
| `priority` | int (1-100) | LAMA приоритет — admin сортирует. |
| `editable_by_store` | bool | true если директор магазина может править. |
| `history_brief` | object | `{opened_at, paused_intervals[], completed_at, work_intervals[]}` для истории на task-detail. |

### Hint extension

Admin: `Hint { id, work_type_id, zone_id, text, created_at, updated_at }` — совпадает с backend.

### Operation/Subtask (admin рендерит, backend связь через task complete)

Backend хранит `operation` через `operation_work_type_zone` join. Admin рендерит как Subtask на детали задачи.

Гэп: admin не имеет endpoint'а для предложения новой операции — backend принимает через `POST /tasks/{id}/complete` body `new_operations: string[]`.

### Multi-tenant (admin делает, backend пока не описывает)

Admin держит 3 организации (LAMA, ТехПродЗдрав, Левас). Переключение в topbar.
Backend подразумевается single-tenant (одна организация на инстанс).

**Решение**: backend может добавить `org_id` в JWT-claims, или query-param `?organization_id=...`.
Admin сможет тогда передавать orgId на каждый запрос.

### Полностью admin-only (пока)

- Goals API (`/goals`, `/goal-categories`)
- Bonus tasks (`/bonus`, `/bonus-payouts`)
- Freelance flow (`/freelance/applications`, `/freelance/services`, `/payouts`)
- Network health / Budget summary (`/dashboard/network-health`, `/dashboard/budget`)
- Reports (`/reports/plan-fact`, `/reports/store-compare`)
- Leaderboards (`/leaderboards`)
- Notifications categories beyond TASK_* (CHAT_INVITE, GOAL_REACHED, BONUS_CREDITED, ...)
- Activity feed
- Audit log
- Permissions coverage analytics
- Service norms (для маппинга формат магазина → нормы трудозатрат)
- Hints coverage matrix
- Schedule conflict detection

Эти модули backend подхватит позже — admin их моделирует чтобы UI работал и спецификация была понятна.

---

## Запрос на endpoints (приоритезированный)

| # | Endpoint | Что добавить | Приоритет |
|---|---|---|---|
| 1 | `GET /users/list` | Backend нет list-а для users. Admin использует только моки. Если будет — admin сможет показать всех 593+ юзеров через backend. Параметры: `store_id, position_id, role_id, archived, search, page, page_size`. | **HIGH** |
| 2 | `GET /users/stores/list/with-stats` | Stores с counts (tasks/staff/shifts). Иначе admin вынужден делать N+1 запросов. | HIGH |
| 3 | `GET /tasks/list` | (уже есть!) — admin может подключаться. Гэп: фильтры `assignment_id` обязателен. Хорошо бы сделать org-wide через `?store_id=*`. | LOW (уже есть) |
| 4 | `GET /tasks/{id}/history` | Полная история событий (start/pause/resume/complete) для task-detail screen. | MEDIUM |
| 5 | `GET /shifts/by-store?store_id=&date=` | Все смены магазина на дату — для /schedule. Сейчас есть только `/shifts/current?assignment_id`. | HIGH |
| 6 | `GET /references/zones, /work-types, /positions, /ranks` | Backend уже имеет — admin подключит. | MEDIUM |
| 7 | `GET /stores/{id}` | Уже есть. Расширить response согласно Store extension table. | HIGH |
| 8 | `GET /notifications/list?store_id=` | Org-wide nofitications для admin (сейчас только user-scoped). | LOW |

---

## Про подход USE_REAL_API

`NEXT_PUBLIC_USE_REAL_API=true` — admin ходит в backend для уже мигрированных endpoints.
`false` — admin живёт на mocks (`lib/mock-data/`).

При swap-е каждого endpoint'а:
1. Добавить raw backend wrapper (как `getUserByIdFromBackend`)
2. НЕ делать lossy dispatch — backend ответ передавать UI как `BackendXxx` тип
3. UI слой мерджит backend response с admin extras (mock'ами или новыми API когда backend дотянет)

---

## Где смотреть исходники

- Admin типы: `lib/types/index.ts`
- Admin API: `lib/api/*.ts`
- Backend типы: `wfm-develop mobile 07.05.2026/wfm/backend/svc_*/app/domain/schemas.py`
- Backend endpoints: `wfm-develop mobile 07.05.2026/wfm/backend/svc_*/app/api/*.py`
- Backend контракты-документы: `.memory_bank/backend/apis/api_*.md`
