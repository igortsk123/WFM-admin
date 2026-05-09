# API: Tasks (FastAPI)

**Base URL:** `/tasks/` (задается через nginx proxy или root_path)

Все эндпоинты требуют аутентификацию (JWT токен в заголовке `Authorization: Bearer <token>`).

**Формат ответов:** Beyond Violet API (см. `.memory_bank/backend/patterns/api_response_format.md`)

**Связанные документы:**
- `.memory_bank/domain/task_model.md` — доменная модель задач
- `.memory_bank/domain/user_roles.md` — роли и привилегии
- `.memory_bank/backend/patterns/api_response_format.md` — формат ответов API
- `.memory_bank/backend/apis/api_operations.md` — операции задачи, модерация, /complete операции

---

## Формат ответов

Все endpoints возвращают HTTP 200 с телом в формате Beyond Violet:

**Успех (единичный объект):**
```json
{
  "status": {"code": ""},
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Выкладка товара",
    "state": "NEW",
    ...
  }
}
```

**Успех (список):**
```json
{
  "status": {"code": ""},
  "data": {
    "tasks": [...]
  }
}
```

**Ошибка:**
```json
{
  "status": {
    "code": "NOT_FOUND",
    "message": "Задача не найдена"
  }
}
```

**Коды ошибок:**
- `UNAUTHORIZED` — требуется авторизация
- `FORBIDDEN` — нет прав доступа
- `NOT_FOUND` — задача не найдена
- `CONFLICT` — недопустимый переход состояния или активная задача
- `VALIDATION_ERROR` — ошибка валидации данных

---

## Служебные endpoints

См. `.memory_bank/backend/patterns/service_endpoints.md`

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/` | Информация о сервисе |
| GET | `/health` | Health check |

---

## Endpoints: Задачи

### GET /list/filters
Получить доступные фильтры для списка задач магазина на сегодня (только MANAGER)

**Query параметры:**
- `assignment_id` (int, required) — ID назначения менеджера (определяет магазин)

**Бизнес-логика:**
- Определяет магазин через `assignment_id` → svc_users
- Получает все assignment_ids магазина → svc_users: `GET /internal/store-assignments`
- Получает plan_ids плановых смен на сегодня → svc_shifts: `GET /internal/today-shift-plans`
- По задачам этих смен агрегирует уникальные зоны и типы работ

**Ответ:**
```json
{
  "status": {"code": ""},
  "data": {
    "filters": [
      {
        "id": "zones",
        "title": "Зона",
        "zones": [{"id": 1, "title": "Фреш 1"}, {"id": 2, "title": "Напитки б/а"}]
      },
      {
        "id": "work_types",
        "title": "Тип работ",
        "work_types": [{"id": 1, "title": "Менеджерские операции"}, {"id": 2, "title": "Касса"}]
      }
    ]
  }
}
```

---

### GET /list/users
Получить сотрудников магазина с плановой сменой на сегодня (только MANAGER)

**Query параметры:**
- `assignment_id` (int, required) — ID назначения менеджера (определяет магазин)

**Бизнес-логика:**
- Определяет магазин и получает все назначения → svc_users
- Фильтрует только тех, у кого есть плановая смена на сегодня → svc_shifts

**Ответ:**
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
        "position": {"id": 2, "code": "prodav_prod", "name": "Продавец"}
      }
    ]
  }
}
```

---

### GET /list
Возвращает список задач магазина с фильтрацией (только MANAGER)

**Query параметры:**
- `assignment_id` (int, optional) — ID назначения менеджера; определяет магазин, фильтрует задачи по сменам всех сотрудников на сегодня
- `state` (string, optional) — фильтр по состоянию задачи
- `review_state` (string, optional) — фильтр по статусу проверки; **накладывается глобально** поверх всех остальных фильтров (NONE | ON_REVIEW | ACCEPTED | REJECTED)
- `assignee_ids` (int[], optional) — фильтр по массиву ID сотрудников
- `zone_ids` (int[], optional) — фильтр по массиву ID зон
- `work_type_ids` (int[], optional) — фильтр по массиву ID типов работ
- `assignee_id` (int, optional) — фильтр по одному исполнителю (устаревший)
- `shift_id` (int, optional) — фильтр по одной плановой смене (устаревший)

**Бизнес-логика:**
- Если передан `assignment_id`: определяет магазин → получает plan_ids всех смен сегодня → фильтрует задачи по `shift_id IN (plan_ids)`
- Затем применяются остальные фильтры: assignee_ids, zone_ids, work_type_ids
- `review_state` применяется последним как глобальный фильтр
- **WORKER** видит только свои задачи (`assignee_id = current_user_id`)
- **MANAGER** видит все задачи своего магазина

---

### GET /my
Получить задачи текущего работника для активной смены

**Query параметры:**
- `assignment_id` (int, required) — ID назначения сотрудника из svc_users

**Бизнес-логика:**
- Ищет плановую смену на сегодня по `assignment_id` (смена не обязана быть открыта)
- Читает задачи из локальной БД
- Если список пуст и у смены есть `external_id` — синхронизирует задачи из LAMA (lazy sync) и повторно читает
- Если нет плановой смены — возвращает ошибку NOT_FOUND
- Graceful degradation: если LAMA недоступна, возвращаются задачи из БД без ошибки

**Важно:** LAMA sync вызывается только если задач в БД нет. В обычном режиме (задачи уже синхронизированы утренним n8n-джобом) запрос к LAMA не происходит.

---

### POST /
Создать задачу (только MANAGER)

**Права доступа:** Только MANAGER

**Бизнес-логика:**
- `task_type = PLANNED` → `requires_report = false` (по умолчанию)
- `task_type = ADDITIONAL` → `requires_report = true` (всегда)
- `creator_id` устанавливается автоматически из токена
- Задача с `assigned_to_permission` видна всем работникам с этой привилегией
- Нельзя одновременно указать `assignee_id` и `assigned_to_permission`

---

### GET /{id}
Получить задачу по ID

**Ответ включает дополнительные поля операций:**
- `operations` — список операций (ACCEPTED + PENDING) для work_type/zone задачи; пустой список если у задачи нет work_type или zone
- `completed_operation_ids` — массив int: id операций, отмеченных работником при завершении

---

### PATCH /{id}
Обновить поля задачи (только MANAGER)

**Права доступа:** Только MANAGER

**Бизнес-логика:**
- При установке `assignee_id` поле `assigned_to_permission` обнуляется
- При установке `assigned_to_permission` поле `assignee_id` обнуляется
- Нельзя одновременно установить оба поля

---

### POST /{id}/start
Начать задачу (NEW → IN_PROGRESS)

**Бизнес-логика:**
- Задачу может начать:
  - Работник, указанный в `assignee_id`
  - Любой работник с привилегией из `assigned_to_permission`
- При старте задачи с `assigned_to_permission`, поле `assignee_id` устанавливается на текущего работника (задача закрепляется за ним)
- Если у пользователя уже есть активная задача, она автоматически переходит в PAUSED
- Устанавливается `started_at = current_timestamp`

---

### POST /{id}/pause
Приостановить задачу (IN_PROGRESS → PAUSED)

---

### POST /{id}/resume
Возобновить задачу (PAUSED → IN_PROGRESS)

**Бизнес-логика:**
- Если у пользователя уже есть активная задача, она автоматически переходит в PAUSED

---

### POST /{id}/complete
Завершить задачу (IN_PROGRESS или PAUSED → COMPLETED)

**Content-Type:** `multipart/form-data`

**Form-поля:**
- `report_text` (string, optional) — текстовый комментарий работника
- `report_image` (file, optional) — фотография выполненной задачи (image/jpeg, image/png, image/webp, image/heic)
- `operation_ids` (string, optional) — JSON-массив int: id операций, отмеченных работником, например `"[1, 2, 3]"`
- `new_operations` (string, optional) — JSON-массив string: названия новых операций, например `"[\"Протереть полку\"]"`; допускается только если `work_type.allow_new_operations = true`

**Бизнес-логика:**
- Принимается из состояний `IN_PROGRESS` и `PAUSED` — работник может завершить задачу без возобновления
- Если `task.requires_photo = true` и `report_image` не передан → 400 Validation Error
- Если `report_image` передан — API загружает его в S3 (бакет `wfm-images`) и сохраняет URL в `task.report_image_url`
- `report_text` всегда опционален
- Для каждой строки из `new_operations`: создаётся `Operation(review_state=PENDING)` + маппинг в `operation_work_type_zone` по данным задачи; ID добавляется к `operation_ids`
- Все operation_ids (существующие + новые) сохраняются в `task_completed_operations`
- В аудит-событии COMPLETE: `meta = {"image_url": "...", "operation_ids": [...], "new_operation_ids": [...]}`

**Логика acceptance_policy:**
- `acceptance_policy = AUTO`: `review_state` автоматически → `ACCEPTED`; записываются события COMPLETE + AUTO_ACCEPT (actor_role=system); в LAMA отправляется `"Completed"` (не Accepted — приёмка системная)
- `acceptance_policy = MANUAL`: `review_state` → `ON_REVIEW`; записываются события COMPLETE + SEND_TO_REVIEW; задача ждёт менеджера

---

### POST /{id}/approve
Принять выполнение задачи (только MANAGER)

**Права доступа:** Только MANAGER

**Бизнес-логика:**
- Задача должна быть в состоянии `COMPLETED` с `review_state = ON_REVIEW`
- Устанавливается `review_state = ACCEPTED`; дополнительно `approved_by = current_user_id` и `approved_at = current_timestamp`
- Записывается событие ACCEPT (actor_role=manager)
- Если задача из LAMA (`external_id` не null): отправляется статус `"Accepted"` в LAMA
- Задача учитывается в KPI работника

---

### POST /{id}/reject
Отклонить выполнение задачи (только MANAGER)

**Права доступа:** Только MANAGER

**Обязательные поля:**
- `reason` (string, min_length=1) — причина отклонения; **поле обязательное**, без него reject невозможен

**Бизнес-логика:**
- Задача должна быть в состоянии `COMPLETED` с `review_state = ON_REVIEW`
- `review_state` → `REJECTED`, `task.state` → `PAUSED`
- Устанавливается `review_comment = reason`
- Записывается событие REJECT (actor_role=manager, comment=reason)
- Если задача из LAMA (`external_id` не null): отправляется статус `"Returned"` в LAMA
- Работник получает уведомление с причиной и должен исправить и завершить задачу заново

---

### GET /{id}/events
Получить историю событий задачи

**Бизнес-логика:**
- MANAGER видит события любой задачи своего магазина
- WORKER видит события только своих задач

**Ответ:** список `TaskEvent` в хронологическом порядке (`created_at` ASC)

```json
{
  "status": {"code": ""},
  "data": {
    "events": [
      {
        "id": "...",
        "task_id": "...",
        "event_type": "COMPLETE",
        "actor_id": "...",
        "actor_role": "worker",
        "old_state": "IN_PROGRESS",
        "new_state": "COMPLETED",
        "old_review_state": "NONE",
        "new_review_state": "NONE",
        "comment": null,
        "meta": null,
        "created_at": "2026-02-27T12:00:00"
      }
    ]
  }
}
```

---

## Справочники

Справочники хранят допустимые значения для полей задач. При получении неизвестного значения из LAMA — автоматически создаётся новая запись.

### Таблица work_types (типы работ)

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | INTEGER | PRIMARY KEY, autoincrement |
| `name` | VARCHAR(255) | Уникальное название типа работы |
| `requires_photo` | BOOLEAN | Требуется ли фотоотчёт при завершении задачи этого типа (default: false) |
| `acceptance_policy` | VARCHAR(10) | Политика приёмки для задач этого типа: AUTO или MANUAL (default: AUTO) |
| `allow_new_operations` | BOOLEAN | Разрешено ли работникам предлагать новые операции при завершении задачи (default: false) |

Начальные значения: «Менеджерские операции», «Касса», «КСО», «Выкладка», «Переоценка», «Инвентаризация», «Другие работы»

**Флаг `requires_photo` в типе работы:** если установлен в `true`, все задачи этого типа, импортируемые из LAMA, автоматически получают `task.requires_photo = true`.

**Поле `acceptance_policy` в типе работы:** определяет политику приёмки для LAMA-задач этого типа. По умолчанию `AUTO` — задачи принимаются автоматически. Для типов работ, требующих ручной проверки менеджером, устанавливается `MANUAL`. При синхронизации с LAMA `task.acceptance_policy` берётся из этого поля.

Поля `requires_photo`, `acceptance_policy`, `allow_new_operations` управляются через `PATCH /references/work-types/{id}` — только MANAGER. Изменение влияет только на задачи при следующей синхронизации с LAMA, уже существующие задачи не обновляются.

### Таблица zones (зоны)

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | INTEGER | PRIMARY KEY, autoincrement |
| `name` | VARCHAR(255) | Уникальное название зоны |
| `priority` | INTEGER | Приоритет (для сортировки) |

Начальные значения: «Фреш 1» (1), «Фреш 2» (2), «Напитки б/а» (3), ... (14 зон)

### Таблица categories (категории)

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | INTEGER | PRIMARY KEY, autoincrement |
| `name` | VARCHAR(255) | Уникальное название категории |

Начальные значения: 53 категории товаров (от «АВТОТОВАРЫ» до «ФРУКТЫ И ОВОЩИ»)

### Endpoints справочников

| Метод | Путь | Доступ | Описание |
|-------|------|--------|----------|
| GET | `/references/work-types` | Все | Список типов работ (включает `requires_photo`, `acceptance_policy`, `allow_new_operations`) |
| PATCH | `/references/work-types/{id}` | MANAGER | Обновить тип работы: `requires_photo`, `acceptance_policy`, `allow_new_operations` |
| GET | `/references/zones` | Все | Список зон (отсортированы по priority) |
| GET | `/references/categories` | Все | Список категорий (отсортированы по name) |

Операции задачи (`/operations/*`) вынесены в отдельный роутер — см. `.memory_bank/backend/apis/api_operations.md`.

**PATCH /references/work-types/{id}** — обновить настройки типа работы (только MANAGER):
- Тело запроса: `{"requires_photo": true, "acceptance_policy": "MANUAL", "allow_new_operations": true}` — все поля опциональны
- Ответ: обновлённый объект `WorkTypeResponse` (id, name, requires_photo, acceptance_policy, allow_new_operations)

---

## Итог

**Служебные endpoints (Base URL: /tasks/):**
- `GET /` — информация о сервисе
- `GET /health` — health check

**Основные endpoints (Base URL: /tasks/):**
- `GET /list/filters` — фильтры для списка задач (MANAGER; зоны и типы работ по сменам магазина сегодня)
- `GET /list/users` — сотрудники с плановой сменой сегодня (MANAGER)
- `GET /list` — список задач (фильтры: assignment_id, state, review_state, assignee_ids, zone_ids, work_type_ids)
- `GET /my` — задачи текущего работника для активной смены (межсервисный вызов к svc_shifts)
- `POST /` — создать задачу (MANAGER)
- `POST /{id}/start` — начать задачу
- `POST /{id}/complete` — завершить задачу (multipart/form-data: report_text, report_image, operation_ids, new_operations; применяет acceptance_policy; загружает фото в S3)
- `POST /{id}/approve` — принять выполнение (MANAGER; только при review_state=ON_REVIEW)
- `POST /{id}/reject` — отклонить выполнение (MANAGER; только при review_state=ON_REVIEW; reason обязателен)
- `GET /{id}/events` — история событий задачи (аудит-лог)

**Ключевые правила:**
- Два типа задач: плановые и дополнительные
- Дополнительные всегда требуют текст или фото при завершении
- Работник добавляет результаты прямо в complete endpoint
- acceptance_policy = AUTO → автоматическая приёмка; MANUAL → требует действия менеджера
- Только задачи с review_state = ACCEPTED учитываются в KPI

---

## Webhook: уведомление от LAMA об изменениях задач

### GET /webhook/lama

Вызывается LAMA при изменении задач в смене (добавление, изменение статуса, длительности).

**Авторизация:** без JWT. Опциональный query-параметр `secret` — проверяется если задан `LAMA_WEBHOOK_SECRET` в конфиге.

**Query параметры:**
- `shift_id` (int, required) — ID смены в LAMA (`external_id` в нашей таблице `shifts_plan`)
- `secret` (string, optional) — токен безопасности

**Что происходит:**
1. Проверяет `secret` если задан `LAMA_WEBHOOK_SECRET`
2. Находит `ShiftPlan` по `external_id = shift_id`
3. Определяет `user_id` через существующие задачи смены или через svc_users
4. Вызывает `TaskLamaService.sync_tasks()` — upsert задач из `GET /tasks/?shift_id=X`
5. Возвращает количество синхронизированных задач

**Ответ:**
```json
{
  "status": {"code": ""},
  "data": {"status": "ok", "shift_external_id": 61003, "tasks_synced": 5}
}
```

**Поле `status` в data:**
- `"ok"` — синхронизация прошла успешно
- `"not_found"` — смена с таким `shift_id` не найдена в БД (нет утренней синхронизации)
- `"error"` — внутренняя ошибка (дополнительное поле `message`)

**Конфигурация:** `LAMA_WEBHOOK_SECRET` env var. Если пустой — endpoint открыт без проверки.

**Полная документация для LAMA:** `docs/lama_webhook.md`

---

## Интеграция с LAMA

### Новые поля в модели Task

| Поле | Тип | Описание |
|------|-----|----------|
| `external_id` | INTEGER | ID задачи из LAMA (индексировано) |
| `shift_id` | INTEGER | ID плановой смены из svc_shifts (shifts_plan.id, индексировано) |
| `priority` | INTEGER | Приоритет задачи из LAMA |
| `work_type_id` | INTEGER (FK → work_types.id) | Тип работы (справочник) |
| `zone_id` | INTEGER (FK → zones.id) | Зона операции (справочник) |
| `category_id` | INTEGER (FK → categories.id) | Категория товаров (справочник) |
| `time_start` | TIME | Плановое время начала задачи |
| `time_end` | TIME | Плановое время окончания задачи |
| `source` | VARCHAR(50) | Источник задачи: `"WFM"` (по умолчанию) или `"LAMA"` |

### Синхронизация задач из LAMA

При запросе `GET /my` для работника с активной сменой из LAMA:

1. Получаем `plan_id` текущей смены через межсервисный вызов `GET /shifts/internal/current-shift?assignment_id=X`
2. По `plan_id` находим `external_id` плановой смены и запрашиваем задачи из LAMA: `GET /tasks/?shift_id={external_id}`
3. Для каждой задачи — upsert по `external_id`
4. Маппинг полей: `operation_work` + `operation_zone` формируют `title`, `duration` (сек) делится на 60 для `planned_minutes`
5. `operation_work`, `operation_zone`, `category` резолвятся в FK через справочники (get or create — если значение не найдено, создаётся новая запись)
6. `task.requires_photo` и `task.acceptance_policy` берутся из справочника `work_types` — управляются через API, не хардкодятся в коде
7. Статусы маппятся через таблицу соответствий (см. ниже)

### Двусторонняя синхронизация статусов

При изменении состояния задачи в WFM (start, pause, complete), если задача имеет `external_id` (source = "LAMA"), статус **автоматически отправляется обратно** в LAMA через `POST /set_task_status/{task_id}`.

**Маппинг статусов LAMA → WFM:**
| LAMA | state | review_state | Событие | Примечание |
|------|-------|--------------|---------|------------|
| Created | NEW | без изменений | — | Новая задача |
| InProgress | IN_PROGRESS | без изменений | — | В работе |
| Suspended | PAUSED | без изменений | — | Приостановлена |
| Completed | COMPLETED | без изменений | — | Завершена |
| Accepted | COMPLETED | **ACCEPTED** | ACCEPT (system) | Принята в LAMA |
| Returned | PAUSED | **REJECTED** | REJECT (system) | Отклонена в LAMA |

**Маппинг статусов WFM → LAMA (исходящая синхронизация):**
| WFM действие | LAMA статус | Примечание |
|--------------|-------------|------------|
| start | InProgress | |
| pause | Suspended | |
| resume | InProgress | |
| complete | Completed | |
| approve | **Accepted** | Передаётся явно, не из task.state |
| reject | **Returned** | Передаётся явно, не из task.state |

### Graceful degradation

При недоступности LAMA API:
- Задачи из LAMA **не** синхронизируются, но ранее синхронизированные задачи остаются доступными
- Обновление статуса в LAMA логируется как warning, но **не блокирует** переход состояния в WFM

**Подробнее:**
- LAMA API: `.memory_bank/backend/apis/external/api_lama.md`
- Сервис синхронизации: `.memory_bank/backend/services/svc_tasks.md`

**Источники:**
- Доменная модель: `.memory_bank/domain/task_model.md`
