# План: Интеграция LAMA API

**Статус:** Выполнено
**Создан:** 2026-02-18
**Завершён:** 2026-02-18
**Ветка:** `backend/lama_api`

## Контекст

Система WFM v2 строилась с независимыми микросервисами. Теперь появилось API первой версии (LAMA), через которое можно получать данные о сотрудниках, сменах и задачах. Нужно наладить синхронную интеграцию, сохранив возможность работы без LAMA (graceful degradation).

## Общий подход

- Создан **shared LAMA клиент** (`backend/shared/lama_client.py`) — единый HTTP клиент для всех сервисов
- Паттерн аналогичен `sso_service.py`: httpx + кэш + fallback при ошибках
- Конфигурация LAMA через env переменные: `LAMA_API_BASE_URL`, `LAMA_API_TIMEOUT`, `LAMA_API_ENABLED`
- Флаг `LAMA_API_ENABLED=true/false` — возможность отключить интеграцию

---

## Задача 1: Документация LAMA API

**Файл:** `.memory_bank/backend/apis/external/api_lama.md`

- [x] Описание 4 endpoints — 2026-02-18
  1. `GET /smart_app_api/employee/?phone={phone}` → employee_id, positions[]
  2. `GET /smart_app_api/shift/?employee_in_shop_id={id}` → смена на сегодня
  3. `GET /smart_app_api/tasks/?shift_id={id}` → задачи смены
  4. `POST /smart_app_api/set_task_status/{task_id}` → обновление статуса
- [x] Маппинг статусов LAMA ↔ WFM — 2026-02-18

Маппинг статусов LAMA ↔ WFM:
| LAMA | WFM |
|------|-----|
| Created | NEW |
| InProgress | IN_PROGRESS |
| Suspended | PAUSED |
| Completed | COMPLETED |
| Accepted | COMPLETED (approved) |
| Returned | PAUSED (rejected) |

---

## Задача 2: Shared LAMA Client

**Новый файл:** `backend/shared/lama_client.py`

- [x] Реализован `LamaClient` — 2026-02-18
  - `async get_employee(phone)` → Optional[dict]
  - `async get_shift(employee_in_shop_id)` → Optional[dict]
  - `async get_tasks(shift_id)` → Optional[list]
  - `async set_task_status(task_id, status)` → bool
  - Timeout: 5 секунд (настраиваемый)
  - При ошибке/timeout: логировать warning, вернуть None
- [x] Экспорт из `shared/__init__.py` — 2026-02-18
  - `LamaClient`, `LAMA_TO_WFM_STATUS`, `WFM_TO_LAMA_STATUS`

---

## Задача 3: Изменения в svc_users

### 3.1 Новая таблица ranks (справочник разрядов)

- [x] Модель `Rank` в `backend/svc_users/app/domain/models.py` — 2026-02-18
  - `id` (Integer, PK), `code` (String(50), unique), `name` (String(255))

### 3.2 Новая таблица assignments (назначения)

- [x] Модель `Assignment` в `backend/svc_users/app/domain/models.py` — 2026-02-18
  - `id` (Integer, PK), `user_id` (UUID, FK users.id CASCADE)
  - `external_id` (Integer, unique) — employee_in_shop_id из LAMA
  - `company_name` (String(255)), `position_id` (FK positions.id), `rank_id` (FK ranks.id)
  - `store_id` (Integer), `date_start` (Date), `date_end` (Date)
  - Relationships: user, position, rank

### 3.3 Изменения в модели User

- [x] `external_id`: String(255) → **Integer** (employee_id из LAMA) — 2026-02-18
- [x] **Удалён** `position_id` (переходит в assignments) — 2026-02-18
- [x] **Удалён** `grade` (переходит в ranks через assignments) — 2026-02-18
- [x] Удалён relationship `position`, добавлен relationship `assignments` — 2026-02-18

### 3.4 Миграция 004

- [x] Файл `backend/svc_users/alembic/versions/004_add_ranks_assignments_tables.py` — 2026-02-18
  1. Создана таблица `ranks`
  2. Создана таблица `user_lama_cache`
  3. Создана таблица `assignments`
  4. Изменён `users.external_id` с String(255) на Integer
  5. Удалён FK `users.position_id` → positions
  6. Удалена колонка `users.position_id`
  7. Удалена колонка `users.grade`

### 3.5 LAMA Service (кэширование)

- [x] Файл `backend/svc_users/app/services/lama_service.py` — 2026-02-18
  - `LamaService.sync_employee(user_id, phone, db)` → list[Assignment]
  - Проверка кэша `user_lama_cache` (TTL 1 час)
  - Запрос LAMA: `GET /employee/?phone={phone}`
  - Обновление `user.external_id = employee_id`
  - Upsert Assignment по `external_id` (employee_in_shop_id)
  - Автоматическое создание Position и Rank при первой синхронизации
  - Модель кэша `UserLamaCache` (user_id UUID PK, cached_at DateTime)

### 3.6 Изменения в endpoint /me

- [x] Файл `backend/svc_users/app/api/users.py` — 2026-02-18
  - Добавлена зависимость `LamaService`
  - Перед возвратом вызывается `lama_service.sync_employee()` (если есть phone из SSO)
  - Graceful degradation: при ошибке LAMA возвращаются локальные данные
  - Добавлены `assignments` в ответ

### 3.7 Обновление схем

- [x] Файл `backend/svc_users/app/domain/schemas.py` — 2026-02-18
  - Добавлен `RankResponse(id, code, name)`
  - Добавлен `AssignmentResponse(id, external_id, company_name, position, rank, store_id, date_start, date_end)`
  - Обновлён `UserMeResponse`: удалены `position`, `grade`, добавлены `assignments`
  - Обновлён `UserResponse`: аналогично
  - Обновлены `UserUpdate`, `UserCreate`: убраны `position_id`, `grade`

### 3.8 Обновление repository

- [x] Файл `backend/svc_users/app/repositories/user_repository.py` — 2026-02-18
  - Убраны `position_id`, `grade` из `create_user()`, `update_user()`
  - Добавлены `get_user_assignments()`, `upsert_assignment()`
  - Обновлён `get_user_with_permissions()` — eager load assignments + rank + position

### 3.9 Конфигурация

- [x] Файл `backend/svc_users/app/core/config.py` — 2026-02-18
  - `LAMA_API_BASE_URL`, `LAMA_API_TIMEOUT`, `LAMA_API_ENABLED`, `LAMA_CACHE_TTL`
- [x] Файл `backend/docker-compose.yml` — env для svc_users — 2026-02-18

---

## Задача 4: Изменения в svc_shifts

### 4.1 Изменения моделей

- [x] Файл `backend/svc_shifts/app/domain/models.py` — 2026-02-18
  - **Store**: добавлен `external_code = Column(String(50), nullable=True, unique=True)`
  - **ShiftPlan**: добавлены `external_id` (Integer, unique), `assignment_id` (Integer), `duration` (Integer)
  - **ShiftFact**: добавлен `assignment_id` (Integer)

### 4.2 Изменения в /current

- [x] Файл `backend/svc_shifts/app/api/shifts.py` — 2026-02-18
  - Добавлен query parameter `assignment_id` (опциональный)
  - Если передан — синхронизация смены из LAMA через `ShiftLamaService`
  - Обновлён `_build_current_response()` для assignment_id, external_id, duration

### 4.3 Изменения в /open, /close

- [x] `ShiftOpenRequest`: добавлен `assignment_id: Optional[int]` — 2026-02-18
- [x] `create_fact_shift()`: принимает `assignment_id` — 2026-02-18

### 4.4 LAMA сервис для shifts

- [x] Файл `backend/svc_shifts/app/services/lama_service.py` — 2026-02-18
  - `ShiftLamaService.sync_shift(employee_in_shop_id, user_id, assignment_id, db)` → Optional[ShiftPlan]
  - Upsert ShiftPlan по external_id, создание Store по shop_code

### 4.5 Обновление схем

- [x] Файл `backend/svc_shifts/app/domain/schemas.py` — 2026-02-18
  - `ShiftOpenRequest`: добавлен `assignment_id`
  - `CurrentShiftResponse`: добавлены `assignment_id`, `external_id`, `duration`
  - `StoreResponse`, `StoreCreate`, `StoreUpdate`: добавлен `external_code`

### 4.6 Конфигурация

- [x] Файл `backend/svc_shifts/app/core/config.py` — LAMA env vars — 2026-02-18
- [x] Файл `backend/svc_shifts/requirements.txt` — добавлен `httpx==0.28.1` — 2026-02-18
- [x] Файл `backend/docker-compose.yml` — env для svc_shifts — 2026-02-18
- [x] `store_repository.py` — добавлен `get_by_external_code()`, `external_code` в create/update — 2026-02-18

---

## Задача 5: Изменения в svc_tasks

### 5.1 Изменения модели Task

- [x] Файл `backend/svc_tasks/app/domain/models.py` — 2026-02-18
  - Добавлены: `external_id`, `shift_external_id`, `assignment_id`, `priority`, `operation_work`, `operation_zone`, `category`, `time_start`, `time_end`, `source`

### 5.2 LAMA сервис для tasks

- [x] Файл `backend/svc_tasks/app/services/lama_service.py` — 2026-02-18
  - `TaskLamaService.sync_tasks(shift_external_id, assignment_id, user_id, db)` → list[Task]
    - GET /tasks/?shift_id → upsert по external_id
    - Маппинг: operation_work → title, duration (сек) → planned_minutes (мин)
    - Маппинг статусов LAMA → WFM
  - `TaskLamaService.sync_task_status_to_lama(task)` → bool
    - POST /set_task_status/{task.external_id}
    - Маппинг WFM → LAMA

### 5.3 Миграция для tasks

- [x] Файл `backend/svc_tasks/alembic/versions/003_add_lama_fields.py` — 2026-02-18
  - Добавлены 10 колонок + 2 индекса (external_id, shift_external_id)

### 5.4 Изменения в API

- [x] Файл `backend/svc_tasks/app/api/tasks.py` — 2026-02-18
  - `get_tasks()`: добавлены query params `assignment_id`, `shift_external_id`; LAMA sync перед выдачей
  - `start_task()`, `pause_task()`, `resume_task()`, `complete_task()`: после перехода → sync статуса в LAMA (если task.external_id)
  - Все state transition endpoints стали `async` для LAMA sync

### 5.5 Обновление схем

- [x] Файл `backend/svc_tasks/app/domain/schemas.py` — 2026-02-18
  - `TaskResponse`: добавлены external_id, priority, operation_work, operation_zone, category, time_start, time_end, source
  - `TaskCreate`: добавлен `assignment_id`
  - `TaskRepository.get_all()`: фильтр по `assignment_id`

### 5.6 Конфигурация

- [x] Файл `backend/svc_tasks/app/core/config.py` — LAMA env vars — 2026-02-18
- [x] Файл `backend/svc_tasks/requirements.txt` — httpx из dev в основные — 2026-02-18
- [x] Файл `backend/docker-compose.yml` — env для svc_tasks — 2026-02-18

---

## Задача 6: Обновление документации Memory Bank

- [x] `.memory_bank/backend/apis/external/api_lama.md` — создан (задача 1) — 2026-02-18
- [x] `.memory_bank/backend/apis/api_roles.md` — убраны grade/position, добавлены assignments — 2026-02-18
- [x] `.memory_bank/backend/apis/api_shifts.md` — assignment_id, external_id, external_code — 2026-02-18
- [x] `.memory_bank/backend/apis/api_tasks.md` — LAMA поля, sync, двусторонние статусы — 2026-02-18
- [x] `.memory_bank/backend/services/svc_users.md` — assignments, ranks, LAMA sync — 2026-02-18
- [x] `.memory_bank/backend/services/svc_shifts.md` — Store.external_code, LAMA sync — 2026-02-18
- [x] `.memory_bank/backend/services/svc_tasks.md` — LAMA поля, sync логика — 2026-02-18
- [x] `.memory_bank/domain/user_roles.md` — Assignment, Rank модели — 2026-02-18
- [x] `.memory_bank/domain/shift_model.md` — external_id, assignment_id — 2026-02-18

---

## Задача 7: Git

- [x] Создана ветка `backend/lama_api` от `develop` — 2026-02-18
- [x] Коммиты — 2026-02-18:
  - `026a915` — `docs: add LAMA API external documentation`
  - `05d5edc` — `feat(shared): add LAMA API client`
  - `6f0910c` — `feat(users): add ranks, assignments, LAMA sync`
  - `e1b0ecc` — `feat(shifts): add LAMA shift sync, assignment_id support`
  - `91df3d0` — `feat(tasks): add LAMA task sync, bidirectional status updates`
  - `e699ae1` — `docs: update memory bank for LAMA integration`
- [x] Push ветки — 2026-02-18

---

## Критические файлы (все модификации)

| Файл | Действие |
|------|----------|
| `backend/shared/lama_client.py` | Новый |
| `backend/shared/__init__.py` | Изменён (экспорт LamaClient) |
| `backend/svc_users/app/domain/models.py` | Изменён (Rank, Assignment, UserLamaCache, User changes) |
| `backend/svc_users/app/domain/schemas.py` | Изменён (RankResponse, AssignmentResponse, убраны position/grade) |
| `backend/svc_users/app/api/users.py` | Изменён (LAMA sync в /me) |
| `backend/svc_users/app/services/lama_service.py` | Новый |
| `backend/svc_users/app/repositories/user_repository.py` | Изменён (assignments, убраны position/grade) |
| `backend/svc_users/app/core/config.py` | Изменён (LAMA_ vars) |
| `backend/svc_users/alembic/versions/004_add_ranks_assignments_tables.py` | Новый |
| `backend/svc_shifts/app/domain/models.py` | Изменён (external_code, external_id, assignment_id, duration) |
| `backend/svc_shifts/app/domain/schemas.py` | Изменён (assignment_id, external_id, duration, external_code) |
| `backend/svc_shifts/app/api/shifts.py` | Изменён (LAMA sync в /current, assignment_id в /open) |
| `backend/svc_shifts/app/api/stores.py` | Изменён (external_code) |
| `backend/svc_shifts/app/services/lama_service.py` | Новый |
| `backend/svc_shifts/app/repositories/shift_repository.py` | Изменён (assignment_id в create_fact_shift) |
| `backend/svc_shifts/app/repositories/store_repository.py` | Изменён (get_by_external_code, external_code) |
| `backend/svc_shifts/app/core/config.py` | Изменён (LAMA_ vars) |
| `backend/svc_shifts/requirements.txt` | Изменён (httpx) |
| `backend/svc_tasks/app/domain/models.py` | Изменён (10 LAMA полей) |
| `backend/svc_tasks/app/domain/schemas.py` | Изменён (LAMA поля в TaskResponse, assignment_id в TaskCreate) |
| `backend/svc_tasks/app/api/tasks.py` | Изменён (LAMA sync, двусторонние статусы, async) |
| `backend/svc_tasks/app/services/lama_service.py` | Новый |
| `backend/svc_tasks/app/repositories/task_repository.py` | Изменён (assignment_id фильтр) |
| `backend/svc_tasks/app/core/config.py` | Изменён (LAMA_ vars) |
| `backend/svc_tasks/alembic/versions/003_add_lama_fields.py` | Новый |
| `backend/svc_tasks/requirements.txt` | Изменён (httpx в основные) |
| `backend/docker-compose.yml` | Изменён (LAMA env для всех 3 сервисов) |

---

## Верификация

Тестирование отложено — LAMA API ещё не работает (timeout). После запуска API:
1. Проверить `/users/me` — должен возвращать assignments из LAMA
2. Проверить `/shifts/current?assignment_id=X` — должен синхронизировать план
3. Проверить `/tasks/list?assignment_id=X&shift_external_id=Y` — должен подтянуть задачи из LAMA
4. Проверить state transitions — статусы должны отправляться в LAMA
5. При выключении LAMA (`LAMA_API_ENABLED=false`) — всё должно работать как раньше

---

## Лог выполнения

### 2026-02-18
- Создана ветка `backend/lama_api` от `develop`
- Задача 1: создана документация LAMA API (`api_lama.md`)
- Задача 2: создан shared LAMA клиент с graceful degradation и маппингом статусов
- Задача 3: svc_users — модели Rank, Assignment, UserLamaCache; миграция 004; LamaService с кэшированием 1 час; обновление /me, схем, repository, конфигурации
- Задача 4: svc_shifts — external_code в Store, LAMA-поля в ShiftPlan/ShiftFact; ShiftLamaService; обновление /current и /open; httpx в зависимости
- Задача 5: svc_tasks — 10 LAMA-полей в Task; миграция 003; TaskLamaService с двусторонней синхронизацией; обновление всех state transitions (async + LAMA sync)
- Задача 6: обновлены 9 файлов Memory Bank документации
- Задача 7: 6 коммитов, push ветки `backend/lama_api`
- Проблемы: нет (LAMA API недоступен для тестирования, но код готов)
