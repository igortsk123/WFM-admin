# План: Переход на internal integer ID пользователей

**Статус:** Выполнено
**Создан:** 2026-03-09
**Последнее обновление:** 2026-03-09

## Цель

Заменить UUID (из SSO) как основной идентификатор пользователей на auto-increment INTEGER.
SSO UUID сохраняется как `sso_id` — только для маппинга при JWT аутентификации.

## Архитектура до и после

### До
```
JWT u=<uuid> → CurrentUser.user_id = str(uuid)
users.id = UUID (PK)             assignments.user_id = UUID FK
tasks.creator_id = UUID          tasks.assignee_id = UUID
task_events.actor_id = UUID      permissions.user_id = UUID
```

### После
```
JWT u=<uuid> → lookup users by sso_id → CurrentUser.user_id = int
users.id = INTEGER (PK, auto)    users.sso_id = UUID (unique, not null)
assignments.user_id = INTEGER FK tasks.creator_id = INTEGER
tasks.assignee_id = INTEGER      task_events.actor_id = INTEGER
permissions.user_id = INTEGER    permissions.granted_by = INTEGER
```

---

## Задачи

### Фаза 1: svc_users — миграция схемы

- [x] **1.1** Создать миграцию `008_internal_int_id.py` — выполнено 2026-03-09
- [x] **1.2** `models.py` — User.id → Integer autoincrement, добавить sso_id = UUID unique — выполнено 2026-03-09
- [x] **1.3** `schemas.py` — UserResponse.id → int, добавить sso_id — выполнено 2026-03-09
- [x] **1.4** `user_repository.py` — get_by_sso_id(), get_or_create_user_by_sso() — выполнено 2026-03-09
- [x] **1.5** `api/users.py` — path params UUID → int, local get_current_user — выполнено 2026-03-09
- [x] **1.6** `api/internal.py` — добавить `GET /internal/id-by-sso?sso_id=X` → `{"id": 42}` — выполнено 2026-03-09
- [x] **1.7** `api/dependencies.py` — создан сервисный get_current_user с DB lookup — выполнено 2026-03-09
- [x] **1.8** `sso_service.py`, `lama_service.py` — user_id: UUID → int — выполнено 2026-03-09

### Фаза 2: shared/auth — резолвинг UUID → int

- [x] **2.1** `shared/auth.py`:
  - CurrentUser: `sso_id: str` + `user_id: int` — выполнено 2026-03-09
  - `validate_token_and_get_sso_id()` хелпер для сервисных зависимостей — выполнено 2026-03-09

### Фаза 3: svc_tasks — миграция данных и схемы

- [x] **3.1** Создать миграцию `015_uuid_to_int_user_ids.py` — выполнено 2026-03-09
- [x] **3.2** Написать скрипт `data_migration.py` — выполнено 2026-03-09
- [x] **3.3** `models.py` — creator_id, assignee_id, actor_id → Integer — выполнено 2026-03-09
- [x] **3.4** `schemas.py` — UUID → int во всех схемах — выполнено 2026-03-09
- [x] **3.5** `task_repository.py` — типы параметров — выполнено 2026-03-09
- [x] **3.6** `api/tasks.py` — assignee_id query param int, local get_current_user — выполнено 2026-03-09
- [x] **3.7** `services/lama_service.py` — user_id: UUID → int — выполнено 2026-03-09
- [x] **3.8** `services/users_client.py` — HTTP клиент с in-memory кэшем — выполнено 2026-03-09
- [x] **3.9** `api/dependencies.py` — async get_current_user с HTTP lookup — выполнено 2026-03-09
- [x] **3.10** `core/config.py` — добавить USERS_SERVICE_URL, USERS_SERVICE_TIMEOUT — выполнено 2026-03-09

### Фаза 4: svc_shifts — minor cleanup

- [x] **4.1** Создать миграцию `006_created_by_int.py` — выполнено 2026-03-09
- [x] **4.2** `models.py` — created_by UUID → Integer — выполнено 2026-03-09
- [x] **4.3** `schemas.py` — created_by UUID → int — выполнено 2026-03-09
- [x] **4.4** `shift_repository.py` — created_by UUID → int — выполнено 2026-03-09

### Фаза 5: Мобильные приложения

- [x] **5.1** iOS `User.swift`:
  - `UserMe.id: String` → `Int`, добавить `ssoId: String`
  - `User.id: String` → `Int`, добавить `ssoId: String`
  - `Permission.grantedBy: String` → `Int` — выполнено 2026-03-09
- [x] **5.2** iOS `TaskModel.swift`: creatorId, assigneeId: String → Int, request models аналогично — выполнено 2026-03-09
- [x] **5.3** Android `User.kt`:
  - `UserMe.id: String` → `Int`, добавить `ssoId: String`
  - `User.id: String` → `Int`, добавить `ssoId: String`
  - `Permission.grantedBy: String` → `Int` — выполнено 2026-03-09
- [x] **5.4** Android `Task.kt`: creatorId, assigneeId: String → Int, request models аналогично — выполнено 2026-03-09

---

## Зависимости

```
Фаза 1 (svc_users DB + API)
  → Фаза 2 (shared/auth)
    → Фаза 3 (svc_tasks) + Фаза 4 (svc_shifts) параллельно
      → Фаза 5 (mobile)
```

## Ключевые решения

| Вопрос | Решение |
|--------|---------|
| Что делать со старым UUID? | Оставить как `sso_id` (unique, NOT NULL) |
| Как резолвить UUID→int? | DB lookup в get_current_user (+1 запрос/запрос) |
| Как мигрировать tasks (другая БД)? | Скрипт через `/users/internal/id-by-sso` |
| Permission.id (UUID PK)? | Оставить UUID — не связан с user identity |
| Обратная совместимость? | Breaking change — mobile обновляются вместе |
| svc_tasks get_current_user? | Async HTTP через UsersServiceClient с in-memory кэшем |

## Лог выполнения

### 2026-03-09
- Создан план после анализа всех сервисов
- Выполнены все 5 фаз миграции:
  - Фаза 1: svc_users — миграция 008, models, schemas, repositories, api, services
  - Фаза 2: shared/auth — CurrentUser.sso_id + user_id, validate_token_and_get_sso_id()
  - Фаза 3: svc_tasks — миграция 015, data_migration.py, models, schemas, repositories, api, services, users_client
  - Фаза 4: svc_shifts — миграция 006, models, schemas, repository
  - Фаза 5: iOS (User.swift, TaskModel.swift), Android (User.kt, Task.kt)
