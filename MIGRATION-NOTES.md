# MIGRATION NOTES — admin ↔ backend

## 🆕 LAMA review-queue mock — hourly refresh (admin-only, без backend changes)

**Что это.** Реальные LAMA-задачи в статусе `Completed`/`Accepted`/`Rejected`
вытаскиваются из daily snapshot'а и hourly refresh'ятся отдельным cron'ом
(LAMA `/tasks/?shift_id=X`). Маппинг status → WFM (state, review_state):

| LAMA status | WFM state    | WFM review_state |
|-------------|--------------|------------------|
| Completed   | COMPLETED    | ON_REVIEW        |
| Accepted    | COMPLETED    | ACCEPTED         |
| Rejected    | PAUSED       | REJECTED         |

**Где это в admin.**
- Mock: `lib/mock-data/_lama-review-tasks.ts` (auto-generated)
- Generator: `tools/lama/build-review-tasks.py` (читает snapshot, пишет TS)
- Hourly refresh: `tools/lama/refresh-review-statuses.py` + `.sh` cron-wrapper
- Подключено в `lib/mock-data/tasks.ts` через spread `...REAL_LAMA_REVIEW_TASKS`
- UI: `/tasks/review` — `getTasks({review_state: "ON_REVIEW"})` уже фильтрует

**Запуск hourly cron на сервере:**
```
0 * * * * /opt/wfm-admin/tools/lama/refresh-review-statuses.sh
```

**Backend changes:** не требуются. Это admin-only обновление mock-логики
поверх существующего `/tasks/?shift_id=X` endpoint'а LAMA. Когда backend
завезёт собственный review-queue, переключим `getTasks` на real API.

---

## 🆕 /schedule подключён к real LAMA shifts (admin-only fallback)

**Что это.** Экран `/schedule` (Расписание) теперь рендерит реальные LAMA-смены
из `lib/mock-data/_lama-shifts.ts` (2436 смен на текущую LAMA-неделю
Пн 2026-05-04 — Вс 2026-05-10, 593 сотрудника, 21 непустой ЛАМА-магазин).

Магазины уже идут из `REAL_LAMA_STORES` (133 магазина) через `MOCK_STORES`
spread → `auth.user.stores` (org-lama scope) → `useStoreContext()` → toolbar
filter combobox.

**Где это в admin.**
- TODAY anchor: `components/features/schedule/schedule-calendar/_shared.ts`
  (`TODAY_STR = "2026-05-07"`, центр LAMA-недели)
- Shifts mock: `lib/mock-data/shifts.ts` уже spread'ит `...REAL_LAMA_SHIFTS`
- API: `lib/api/shifts.ts::getSchedule()` фильтрует MOCK_SHIFTS по
  `(date_from, date_to, store_ids?, zone_ids?, user_id?, status?)`
- Real backend wrapper: `getStoreScheduleOnBackend()` (готов к swap'у когда
  backend дотянет `GET /shifts/by-store`)
- TS-зеркало: `BackendStoreSchedule`, `BackendScheduleSlot`,
  `BackendStoreScheduleParams` в `lib/api/_backend-types.ts`

**Что нужно от backend (HIGH, см. также пункт #5 ниже).**

| Endpoint | Назначение |
|---|---|
| `GET /shifts/by-store?store_id=&date_from=&date_to=&zone_id=&user_id=&status=` | Все смены магазина(ов) на диапазон дат, плюс aggregate'ы (planned/actual hours, coverage_pct). Сейчас backend умеет только `GET /shifts/current?assignment_id=` (одна смена, один сотрудник). |

**Pydantic schema (предлагаемая):**
```python
class StoreScheduleSlot(BaseModel):
    id: int
    user_id: int
    user_name: str
    store_id: int
    store_name: str
    zone_id: int | None
    zone_name: str | None
    position_id: int | None
    position_name: str | None
    shift_date: date
    planned_start: datetime
    planned_end: datetime
    actual_start: datetime | None
    actual_end: datetime | None
    status: Literal["NEW", "OPENED", "CLOSED"]
    has_conflict: bool
    conflict_reason: Literal["OVERLAP", "LATE_CLOSE", "OVERFLOW", "OTHER"] | None
    late_minutes: int
    overtime_minutes: int

class StoreSchedule(BaseModel):
    slots: list[StoreScheduleSlot]
    date_from: date
    date_to: date
    total_planned_hours: float
    total_actual_hours: float
    coverage_pct: int  # 0..100
```

**До добавления endpoint'а** admin живёт на `getSchedule()` поверх MOCK_SHIFTS
(включая 2436 LAMA смен). После — переключим `USE_REAL_API` и admin начнёт
ходить через `getStoreScheduleOnBackend()`.

---

## 🆕 UnassignedTaskBlock — концепция распределения (HIGH)

**Что это.** В реальности LAMA отдаёт сводки трудозатрат на магазин блоками,
например:
- «Выкладка ФРОВ — 480 мин на день»
- «Переоценка молочной зоны — 180 мин»
- «Инвентаризация бакалеи — 300 мин»

Это **не** конкретные задачи на конкретного работника. Это **сводка** по
паре `(work_type, zone)`. Директор магазина (или ИИ) **распределяет** этот
блок на N задач конкретным сотрудникам.

**Где это сейчас в admin.**
- Тип: `lib/types/index.ts` — `interface UnassignedTaskBlock`
- Mock-пул: `lib/mock-data/_lama-unassigned-blocks.ts` — 214 блоков по 21 ЛАМА-магазину
  (сгенерированы группировкой реальных LAMA-задач по `(work_type, zone)` из live API)
- API: `lib/api/distribution.ts` — `getStoreUnassignedBlocks()`, `distributeBlock()`
- TS-зеркало: `lib/api/_backend-types.ts` — `BackendUnassignedTaskBlock`
- UI: `components/features/tasks/task-distribution.tsx` — секция «Блоки от ЛАМА»
  на /tasks/distribute

**Что нужно от backend (когда дойдёт очередь).**
Endpoint'ы которых сейчас нет, но мобайл и admin их ожидают:

| Endpoint | Назначение |
|---|---|
| `POST /tasks/unassigned-blocks/sync` | LAMA n8n → backend: ежедневная заливка блоков на следующий день |
| `GET /tasks/unassigned-blocks?store_id=&date=` | admin/mobile manager: список нераспределённых блоков |
| `POST /tasks/unassigned-blocks/{id}/distribute` | директор/ИИ: лопает блок на N Task'ов (body: `{allocations: [{user_id, minutes}]}`) |
| `GET /tasks/unassigned-blocks/{id}` | детали одного блока (опционально) |

**Поведение `distribute`:**
- Backend проверяет: сумма minutes ≤ remaining_minutes
- Создаёт N task'ов в taskstable со shift_id, assignee_id из allocation
- Помечает блок: `distributed_minutes += sum`, `is_distributed = (remaining=0)`
- Возвращает массив task_id

**Pydantic schema (предлагаемая):**
```python
class UnassignedTaskBlock(BaseModel):
    id: UUID
    store_id: int
    date: date
    work_type_id: int
    zone_id: int
    product_category_id: int | None
    total_minutes: int
    distributed_minutes: int
    priority: int | None
    source: Literal["LAMA", "MANAGER", "AI"]
    created_at: datetime
    is_distributed: bool
    spawned_task_ids: list[UUID]
```

**До добавления endpoint'а** admin живёт на mock-блоках. После — переключим
USE_REAL_API и admin начнёт грузить блоки из backend.

---


> **Привет, backend-разработчик!** Этот документ — карта что у нас уже совпадает,
> что у нас admin-only и просит твоей поддержки. Цель — сделать переключение
> admin с моков на твой backend бесшовным, без переписывания UI.
>
> Принципы:
> 1. Admin = source of truth по бизнес-модели (богаче backend ~3x)
> 2. Имена в коде совпадают где возможно (`Operation`, `Task`, `assignee_id`)
> 3. Каждое изменение admin model → синхронизируется в trio:
>    `lib/api/_backend-types.ts` + `lib/api/<feature>.ts` + этот документ
> 4. Никакого lossy dispatch — admin поля сохраняются, backend дотягивает
>
> Где смотреть:
> - **Полный inventory endpoints** — `lib/api/README.md`
> - **TS-зеркала твоих Pydantic schemas** — `lib/api/_backend-types.ts`
> - **Raw wrappers** (готовые fetch'и к твоим endpoints) — `lib/api/<service>.ts` функции `*OnBackend()` / `*FromBackend()`
> - **Dev-инструмент тестирования** — `/dev/api-token` (вставь JWT, нажми «Тест /users/me»)
> - **Поля admin-extensions** — везде в `lib/types/index.ts` отмечены `@admin-extension`

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
    - `getStoreScheduleOnBackend(params)` → `GET /shifts/by-store` (**backend gap** — endpoint'а пока нет, см. секцию `/schedule` ниже и пункт #5 в «Запросе на endpoints»)
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

#### LAMA-derived permissions fallback (admin)

Для 1850+ реальных LAMA сотрудников у которых нет explicit `WorkerPermission`
записей — admin деривирует `permissions[]` из истории work-types
(`_lama-employee-work-types.ts`):

| LAMA work_type | Admin Permission |
|---|---|
| Касса | CASHIER |
| КСО | SELF_CHECKOUT |
| Выкладка / Переоценка / Менеджерские операции / Другие работы | SALES_FLOOR |
| Инвентаризация | WAREHOUSE |

Логика в `lib/api/users.ts::deriveLamaPermissions`. При swap на real backend
эти fallback'и удаляются — backend отдаст реальные granted permissions
из `/users/{id}` или новый `/users/list` (пункт #1 в таблице ниже).

Аналогично `functional_role` деривируется из active assignment.position через
`REAL_LAMA_POSITIONS[].functional_role_default`. Это admin-логика.

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

### Goal model — поля admin (полностью admin-only пока, но фиксируем shape)

Admin: `Goal { id, category, title, description, starting_value?, target_value, current_value, target_unit, direction?, status, scope, store_id?, proposed_by, selected_by?, selected_at?, period_start, period_end, money_impact? }`

| Поле | Тип | Зачем |
|---|---|---|
| `starting_value` | number? | Значение метрики на момент установки цели. Нужно для корректного прогресса для убывающих метрик (OOS, списания): `progress = (starting - current) / (starting - target)`. Без этого поля старый расчёт `current/target` ломается на decreasing-целях (показывает 100% когда реально 33%). |
| `direction` | "increase" \| "decrease"? | Направление "правильного" движения метрики. Если не задано — выводится из target vs starting. |
| `money_impact` | object? | Денежный эффект достижения цели: `{ amount, period: week\|month\|quarter\|year, rationale_short, rationale_breakdown[] }`. Используется для UI-пилюли «Денежный эффект» с popover'ом «Как считаем» и кнопкой «Разобрать в ИИ-чате». Backend пока не считает — admin держит как mock. Когда backend подключим — потребуется endpoint `GET /goals/:id/money-impact` с теми же полями. |

### Полностью admin-only (пока)

- Goals API (`/goals`, `/goal-categories`, `/goals/:id/money-impact`)
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
- **Employee speed score** — `lib/utils/employee-speed.ts::computeEmployeeSpeed(userId)`.
  Деривируется из `EMPLOYEE_STATS` (LAMA snapshots) и `MOCK_STORES.object_format`:
  per-employee median_duration по work_type сравнивается с peer-cohort'ом
  (employees в магазинах того же object_format). Output 0..10 + объяснение
  (RU/EN). Backend wrapper не нужен — это derived KPI поверх данных, которые
  backend и так отдаёт (history событий + stores). Если backend позже отдаст
  готовый endpoint `GET /users/{id}/speed` — admin переключится без UI-changes.

### Bilingual mock-fields (frontend-only translations) — `*_en`

Для bilingual demo (RU default + EN через `?en` префикс) в admin-only моках добавлены
опциональные EN-копии RU-литералов. **Это чистая presentation-layer**, никаких
backend-changes не требуется — backend отдаёт поля как есть, а UI выбирает текст
по locale через helper `pickLocalized(ru, en, locale)` из `lib/utils/locale-pick.ts`.

| Тип | Поля |
|---|---|
| `Notification` | `title_en?`, `body_en?` |
| `AuditEntry` | `action_label_en?`, `entity_name_en?` |
| `Regulation` | `name_en?`, `description_en?` |
| `Goal` | `title_en?`, `description_en?`, `MoneyImpact.rationale_short_en?`, `rationale_breakdown_en?` |
| `KpiMetric` (reports-kpi) | `label_en?` |
| `KpiByDimension` (zones only) | `label_en?` (work-types — RU only, отраслевой стандарт) |
| `PlanFactSummary.worst_day` | `reason_en?` |

Backend может игнорировать эти поля — если они приходят от admin, его контракт
терпимо относится к unknown fields. Если backend сам генерирует RU-only — admin
fallback'ом покажет RU на EN-локали.

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
| 9 | `GET /users/{id}/history` | Audit log по сотруднику (hire / assignment / permission grants+revokes). Сейчас admin деривирует из MOCK_PERMISSIONS + MOCK_ASSIGNMENTS + LAMA work-types. Используется в employee-detail tab «История». | MEDIUM |

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
