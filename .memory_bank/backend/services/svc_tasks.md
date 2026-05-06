# Backend Service: Tasks

Сервис обеспечивает:
- хранение задач,
- изменение статусов,
- логику переходов состояний,
- базовые CRUD операции.

Используемый стек:
- Ubuntu 24.04
- docker-compose
- Postgres 16
- Python 3.12
- FastAPI
- nginx

## Зависимости

- **[shared](shared.md)** — общий модуль с форматом ответов API и exception handlers
- **LAMA API** — синхронизация задач и двусторонняя синхронизация статусов (см. `.memory_bank/backend/apis/external/api_lama.md`)
- **svc_users** — получение int user_id, данных магазина и external_id сотрудника (для LAMA sync смен)

> **Примечание:** svc_shifts объединён с svc_tasks. Таблицы `shifts_plan` и `shifts_fact` находятся в базе `wfm_tasks`. Эндпоинты смен доступны по префиксу `/shifts/` этого же сервиса.

### Структура проекта

```
backend/svc_tasks/
├── app/
│   ├── api/              # API endpoints
│   │   ├── tasks.py      # Endpoints управления задачами (включая approve, reject, events)
│   │   ├── shifts.py     # Endpoints управления сменами (open, close, current, /{id})
│   │   ├── references.py # Endpoints справочников (operation_types, zones, categories)
│   │   ├── internal.py   # Internal endpoints (POST /internal/sync-daily, /internal/close-shifts-eod, /internal/clear-external-ids)
│   │   └── health.py     # Health check
│   ├── core/             # Базовые компоненты
│   │   ├── config.py     # Конфигурация
│   │   └── database.py   # База данных
│   ├── domain/           # Доменная логика
│   │   ├── models.py     # SQLAlchemy модели (Task, TaskEvent, ShiftPlan, ShiftFact, справочники)
│   │   ├── schemas.py    # Pydantic схемы (TaskState, TaskReviewState, ShiftStatus, ...)
│   │   └── state_machine.py  # Валидация execution state transitions
│   ├── repositories/     # Работа с данными
│   │   ├── task_repository.py        # CRUD и переходы состояний задач
│   │   ├── task_event_repository.py  # Создание и чтение аудит-лога событий
│   │   └── shift_repository.py       # CRUD для shifts_plan и shifts_fact
│   ├── services/         # Внешние сервисы
│   │   ├── lama_service.py      # Синхронизация задач с LAMA (входящая и исходящая)
│   │   ├── shift_lama_service.py # Синхронизация смен с LAMA (sync_shift)
│   │   ├── daily_sync_service.py # Ежедневная batch-синхронизация (сотрудники → смены → задачи)
│   │   ├── users_client.py      # HTTP-клиент для svc_users (get_int_user_id, get_all_store_codes, sync_lama_store, ...)
│   │   └── s3_client.py         # Загрузка фото в S3 (RegRU, бакет wfm-images)
│   └── main.py           # Точка входа
├── alembic/
│   └── versions/
│       ├── 000_create_tasks_table.py
│       ├── 003_add_lama_fields.py
│       ├── 004_add_reference_tables.py
│       ├── 005_rename_shift_id_remove_assignment.py
│       ├── 006_add_review_state_and_acceptance_policy.py
│       ├── 007_create_task_events.py
│       ├── 008_recreate_task_events_integer_id.py
│       ├── 009_add_task_comment_and_review_comment.py
│       ├── 010_add_report_fields.py
│       └── 016_add_shift_tables.py   # shifts_plan, shifts_fact (перенесено из svc_shifts)
├── Dockerfile
└── requirements.txt
```

> **Примечание:** JWT аутентификация вынесена в [shared модуль](shared.md) (`shared/auth.py`). Публичный ключ передается через переменную окружения `BV_PUBLIC_KEY`.

### Docker сборка

Shared модуль копируется при сборке образа:

```dockerfile
COPY shared/ /app/shared/
COPY svc_tasks/app /app/app
```

Контекст сборки в docker-compose.yml:

```yaml
app:
  build:
    context: .           # backend/
    dockerfile: svc_tasks/Dockerfile
```

---

## Структура данных

Таблица: **tasks**

| поле              | тип          | описание |
|-------------------|--------------|----------|
| id                | UUID         | PRIMARY KEY |
| title             | VARCHAR(255) | Название задачи |
| description       | TEXT         | Описание задачи |
| planned_minutes   | INTEGER      | Плановая длительность в минутах |
| creator_id        | UUID         | Создатель задачи |
| assignee_id       | UUID?        | Исполнитель задачи |
| state             | VARCHAR(50)  | Execution state (NEW, IN_PROGRESS, PAUSED, COMPLETED). DEFAULT 'NEW' |
| review_state      | VARCHAR(50)  | Review state (NONE, ON_REVIEW, ACCEPTED, REJECTED). DEFAULT 'NONE' |
| acceptance_policy | VARCHAR(50)  | Политика приёмки (AUTO, MANUAL). DEFAULT 'MANUAL' |
| created_at        | TIMESTAMP    | Дата создания |
| updated_at        | TIMESTAMP    | Дата обновления |
| external_id       | INTEGER?     | ID задачи из LAMA (indexed) |
| shift_id          | INTEGER?     | ID плановой смены (FK → shifts_plan.id, indexed) |
| priority          | INTEGER?     | Приоритет задачи из LAMA |
| operation_type_id | INTEGER? (FK)| Тип операции (→ operation_types.id) |
| zone_id           | INTEGER? (FK)| Зона операции (→ zones.id) |
| category_id       | INTEGER? (FK)| Категория товаров (→ categories.id) |
| time_start        | TIME?        | Плановое время начала |
| time_end          | TIME?        | Плановое время окончания |
| source            | VARCHAR(50)  | Источник: "WFM" (по умолчанию) или "LAMA" |
| requires_photo    | BOOLEAN      | Обязательно фото при завершении. DEFAULT false |
| report_text       | TEXT?        | Текстовый отчёт работника (сохраняется при complete) |
| report_image_url  | VARCHAR(500)?| URL фото в S3 (сохраняется при complete, если передано) |

Таблица: **task_events** (аудит-лог событий задачи)

| поле              | тип          | описание |
|-------------------|--------------|----------|
| id                | UUID         | PRIMARY KEY |
| task_id           | UUID (FK)    | Ссылка на tasks.id (CASCADE DELETE), indexed |
| event_type        | VARCHAR(50)  | Тип события: START, PAUSE, RESUME, COMPLETE, SEND_TO_REVIEW, AUTO_ACCEPT, ACCEPT, REJECT |
| actor_id          | UUID?        | Кто выполнил (null для системных событий) |
| actor_role        | VARCHAR(20)  | "worker" / "manager" / "system" |
| old_state         | VARCHAR(50)? | Execution state до события |
| new_state         | VARCHAR(50)? | Execution state после события |
| old_review_state  | VARCHAR(50)? | Review state до события |
| new_review_state  | VARCHAR(50)? | Review state после события |
| comment           | TEXT?        | Комментарий (обязателен для REJECT через API) |
| meta              | JSONB?       | Доп. поля (например `{"source": "lama"}`) |
| created_at        | TIMESTAMP    | Время события |

### Таблицы смен (перенесены из svc_shifts)

**shifts_plan** — плановые смены (расписание):

| поле | тип | описание |
|------|-----|----------|
| id | INTEGER | PRIMARY KEY, autoincrement |
| assignment_id | INTEGER | Ссылка на assignment из svc_users (NOT NULL, indexed) |
| shift_date | DATE | Дата смены (indexed) |
| start_time | TIME | Время начала |
| end_time | TIME | Время окончания |
| external_id | INTEGER? | ID смены из LAMA (unique) |
| duration | INTEGER? | Длительность в часах из LAMA |
| created_at | TIMESTAMP | Дата создания |
| created_by | INTEGER? | Кто создал запись |

**shifts_fact** — фактические смены:

| поле | тип | описание |
|------|-----|----------|
| id | INTEGER | PRIMARY KEY, autoincrement |
| plan_id | INTEGER (FK) | Ссылка на shifts_plan.id (NOT NULL, indexed) |
| opened_at | TIMESTAMP | Время открытия |
| closed_at | TIMESTAMP? | Время закрытия (NULL если открыта) |

> `assignment_id` для фактической смены выводится через `plan_id → shifts_plan.assignment_id`.

### Справочные таблицы

**operation_types** — типы операций:

| поле | тип | описание |
|------|-----|----------|
| id | INTEGER | PRIMARY KEY, autoincrement |
| name | VARCHAR(255) | Уникальное название |

**zones** — зоны:

| поле | тип | описание |
|------|-----|----------|
| id | INTEGER | PRIMARY KEY, autoincrement |
| name | VARCHAR(255) | Уникальное название |
| priority | INTEGER | Приоритет для сортировки |

**categories** — категории товаров:

| поле | тип | описание |
|------|-----|----------|
| id | INTEGER | PRIMARY KEY, autoincrement |
| name | VARCHAR(255) | Уникальное название |

Начальные данные загружаются миграцией `004_add_reference_tables.py`. При получении неизвестных значений из LAMA — автоматически создаются новые записи (get or create).

---

## Правила

- Сервис сам валидирует переходы между состояниями.
- Ошибочные попытки → HTTP 409 Conflict.
- Все операции логируются.

## Версионирование эндпоинтов

Ряд эндпоинтов существует в двух версиях ради обратной совместимости с мобильными клиентами. Подробнее — `.memory_bank/backend/api_compatibility.md`.

| Старый эндпоинт | Новый эндпоинт | Причина |
|---|---|---|
| `GET /list/filters` | `GET /list/filters/v2` | v2 добавляет фильтр «Сотрудники» (assignee_ids) и меняет порядок групп |
| `GET /list` | `GET /list/v2` | v2 применяет zone_ids + work_type_ids как AND (v1 — OR) |

## Порядок выдачи задач в GET /my

Эндпоинт `GET /my` возвращает задачи работника в порядке приоритетных кластеров:

| # | Кластер | Условие |
|---|---------|---------|
| 1 | Возвращена | `state=PAUSED AND review_state=REJECTED` |
| 2 | В работе | `state=IN_PROGRESS` |
| 3 | Приостановлена | `state=PAUSED AND review_state=NONE` |
| 4 | К выполнению | `state=NEW` |
| 5 | На проверке | `review_state=ON_REVIEW` |
| 6 | Завершённые | `state=COMPLETED AND review_state=ACCEPTED` |

Внутри каждого кластера — сортировка по `time_start ASC NULLS LAST`.

Реализовано через параметр `sort_by_cluster=True` в `TaskRepository.get_all()`. Другие эндпоинты (`GET /list`) используют сортировку по `created_at DESC` — `sort_by_cluster` по умолчанию `False`.

---

## Интеграция с LAMA

### TaskLamaService

Файл: `app/services/lama_service.py`

Синхронизация задач из LAMA и двусторонняя синхронизация статусов.

**Метод `sync_tasks(shift_external_id, assignment_id, user_id, db)`:**

1. `GET /tasks/?shift_id={shift_external_id}` — получение задач из LAMA
2. Для каждой задачи — upsert по `external_id`
3. Маппинг полей:
   - `operation_work` + `operation_zone` -> `title` (формат: "КСО — Фреш 1")
   - `duration` (секунды) / 60 -> `planned_minutes`
   - `operation_work` → `operation_type_id` (get or create в справочнике)
   - `operation_zone` → `zone_id` (get or create в справочнике)
   - `category` → `category_id` (get or create в справочнике)
   - Статус маппится через `LAMA_TO_WFM_STATUS`
4. Новые задачи создаются с `source = "LAMA"`

**Метод `sync_task_status_to_lama(task)`:**

Двусторонняя синхронизация — при изменении состояния задачи в WFM:
1. Проверяет наличие `external_id` (задача из LAMA)
2. Маппит состояние WFM -> LAMA через `WFM_TO_LAMA_STATUS`
3. Отправляет `POST /set_task_status/{task_id}` в LAMA
4. При ошибке — логирует warning, не блокирует операцию в WFM

### Маппинг статусов

Определён в `backend/shared/lama_client.py`:

**LAMA → WFM (входящая синхронизация в `sync_tasks`):**

| LAMA | state | review_state | Событие |
|------|-------|--------------|---------|
| Created | NEW | без изменений | — |
| InProgress | IN_PROGRESS | без изменений | — |
| Suspended | PAUSED | без изменений | — |
| Completed | COMPLETED | без изменений | — |
| Accepted | COMPLETED | **ACCEPTED** | ACCEPT (actor_role=system, meta={"source":"lama"}) |
| Returned | PAUSED | **REJECTED** | REJECT (actor_role=system, meta={"source":"lama"}) |

События при Accepted/Returned записываются только если review_state изменился (защита от дублей при повторной синхронизации).

**WFM → LAMA (исходящая синхронизация через `sync_task_status_to_lama(task, lama_status)`):**

Метод принимает `lama_status` явно — не выводит из `task.state`.

| WFM действие | lama_status | Примечание |
|--------------|-------------|------------|
| start | InProgress | |
| pause | Suspended | |
| resume | InProgress | |
| complete | Completed | |
| approve | **Accepted** | Явно, не из state |
| reject | **Returned** | Явно, не из state |

### Конфигурация

```bash
LAMA_API_BASE_URL=https://wfm-smart.lama70.ru/api/
LAMA_API_TIMEOUT=5
LAMA_API_ENABLED=true
```

---

## S3 интеграция

Фотоотчёты задач загружаются в S3-совместимое хранилище RegRU.

**Файл:** `app/services/s3_client.py`

**Функция:** `upload_task_image(file: UploadFile, task_id: str) → public_url`
- Ключ объекта: `tasks/{task_id}/{uuid}.{ext}`
- Допустимые типы: image/jpeg, image/png, image/webp, image/heic
- Возвращает публичный URL вида `https://wfm-images.website.regru.cloud/tasks/{task_id}/...`

**Конфигурация:**

```bash
S3_ENDPOINT_URL=https://s3.regru.cloud
S3_ACCESS_KEY=aa7fc107-af5f-44c1-9849-2cb7f1a696c4
S3_SECRET_KEY=<секрет, только через env>
S3_BUCKET_NAME=wfm-images
S3_PUBLIC_URL_PREFIX=https://wfm-images.website.regru.cloud
```
