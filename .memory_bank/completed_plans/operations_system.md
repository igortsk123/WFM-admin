# План: Система операций v2

**Статус:** Выполнено
**Создан:** 2026-04-20
**Выполнено:** 2026-04-20

---

## Цель

Расширить систему операций: добавить review_state для модерации предложенных операций, привязку выполненных операций к задаче, возможность работнику предлагать новые операции при завершении задачи.

---

## Контекст и дизайн

### Текущее состояние
- Таблица `operations` — шаги выполнения с 6 hint-полями
- Таблица `operation_work_type_zone` — маппинг операция → (work_type, zone)
- `GET /references/operations?work_type_id=X&zone_id=Y` — список операций (будет перенесён)
- Никакой привязки операций к конкретной задаче нет

### Новые сущности и изменения

**`operations.review_state`** — статус модерации:
- `ACCEPTED` — проверена, отображается всем (дефолт для существующих)
- `PENDING` — предложена работником, ждёт проверки менеджером
- `REJECTED` — отклонена (не удаляется, т.к. задача в истории может ссылаться)

**`work_types.allow_new_operations`** — флаг разрешения предлагать новые операции (Boolean, default: False)

**`task_completed_operations`** — новая таблица, что отметил работник в задаче:
```
id: Integer PK
task_id: UUID FK → tasks.id CASCADE DELETE
operation_id: Integer FK → operations.id
```

**Запрос деталей задачи** возвращает:
- `operations` — список операций (ACCEPTED + PENDING) для work_type/zone задачи
- `completed_operation_ids` — какие отметил работник
- `work_type.allow_new_operations` — флаг в объекте work_type

**Завершение задачи** (`POST /{id}/complete`) принимает дополнительно:
- `operation_ids` — JSON-массив int: операции, которые работник отметил как выполненные
- `new_operations` — JSON-массив string: новые операции (только если work_type.allow_new_operations=true)

На сервере для каждой строки из `new_operations`:
1. Создаётся `Operation(name=..., review_state=PENDING)`
2. Создаётся `OperationWorkTypeZone(operation_id, work_type_id, zone_id)` по данным задачи
3. ID добавляется к списку выполненных

В `task_events.meta` при COMPLETE сохраняется:
```json
{
  "image_url": "...",
  "operation_ids": [1, 2, 3],
  "new_operation_ids": [42, 43]
}
```

**API операций — отдельный роутер `/operations`** (вместо `/references/operations`):
- `GET /operations?work_type_id=X&zone_id=Y` — список операций (ACCEPTED + PENDING) для пары work_type/zone
- `GET /operations/pending` — список PENDING на проверку (только MANAGER)
- `POST /operations/{id}/approve` — PENDING → ACCEPTED (только MANAGER)
- `POST /operations/{id}/reject` — PENDING → REJECTED (только MANAGER)

Старый эндпоинт `GET /references/operations` — убрать или оставить deprecated редиректом.

---

## Задачи

### 1. Backend: миграции БД

- [x] Миграция `022`: добавить `review_state` в таблицу `operations`, убрать уникальность name — 2026-04-20
- [x] Миграция `023`: добавить `allow_new_operations` в таблицу `work_types` — 2026-04-20
- [x] Миграция `024`: создать таблицу `task_completed_operations` — 2026-04-20

### 2. Backend: модели и схемы

- [x] Обновить SQLAlchemy модель `Operation` — добавить `review_state`, убрать `unique=True` из name — 2026-04-20
- [x] Обновить SQLAlchemy модель `WorkType` — добавить `allow_new_operations` — 2026-04-20
- [x] Создать SQLAlchemy модель `TaskCompletedOperation` — 2026-04-20
- [x] Добавить `OperationReviewState` enum в schemas.py — 2026-04-20
- [x] Обновить Pydantic-схему `OperationResponse` — добавить `review_state`, classmethod `from_model()` — 2026-04-20
- [x] Обновить Pydantic-схемы `WorkTypeResponse` и `WorkTypeUpdate` — добавить `allow_new_operations` — 2026-04-20

### 3. Backend: обновление `TaskResponse`

- [x] Добавить в `TaskResponse` поля `operations: List[OperationResponse]` и `completed_operation_ids: List[int]` — 2026-04-20
- [x] Обновить handler `GET /{task_id}` — вызов `_populate_task_operations` — 2026-04-20
- [x] `GET /list` и `GET /my` — операции не включаем; поля в TaskResponse по умолчанию пустые списки — 2026-04-20

### 4. Backend: обновление `/tasks/{id}/complete`

- [x] Добавить Form-параметры `operation_ids` и `new_operations` (JSON-строки) — 2026-04-20
- [x] Парсинг и валидация обоих параметров — 2026-04-20
- [x] Валидация allow_new_operations — 2026-04-20
- [x] Создание новых Operation + OperationWorkTypeZone для каждой строки new_operations — 2026-04-20
- [x] Создание TaskCompletedOperation записей — 2026-04-20
- [x] Сохранение в task_events.meta: operation_ids и new_operation_ids — 2026-04-20
- [x] Вызов `_populate_task_operations` в ответе — 2026-04-20

### 5. Backend: новый роутер `/operations`

- [x] Создать `app/api/operations.py` и подключить в `main.py` — 2026-04-20
- [x] `GET /operations` — ACCEPTED + PENDING — 2026-04-20
- [x] `GET /operations/pending` — MANAGER only — 2026-04-20
- [x] `POST /operations/{id}/approve` и `/reject` — MANAGER only — 2026-04-20
- [x] Удалить `GET /references/operations` из `references.py` — 2026-04-20

### 6. Backend: обновление API work_types

- [x] PATCH `/references/work-types/{id}` принимает `allow_new_operations` — обновлена схема WorkTypeUpdate — 2026-04-20

### 7. Проверка совместимости с текущими мобильными приложениями

- [x] Новые поля в `TaskResponse` (`operations`, `completed_operation_ids`): **безопасно** — iOS Codable игнорирует неизвестные ключи по умолчанию; Android `ignoreUnknownKeys = true` в ApiClient — 2026-04-20
- [x] Новые Form-параметры `/complete` (`operation_ids`, `new_operations`): **безопасно** — оба параметра `Optional`, клиенты не отправляют их и продолжают работать — 2026-04-20
- [x] `OperationResponse.review_state`: **безопасно** — мобильные клиенты не используют `/references/operations` (проверено grep'ом) — 2026-04-20
- [x] `WorkTypeResponse.allow_new_operations`: **безопасно** — iOS `WorkType` struct парсит только `id` и `name`; Android аналогично; игнорируется — 2026-04-20
- [x] Удаление `GET /references/operations`: **безопасно** — мобильные клиенты не вызывают этот endpoint — 2026-04-20

### 8. Документация Memory Bank

- [x] Обновить `.memory_bank/backend/apis/api_tasks.md` — GET /{id}, POST /complete, work_types таблица, справочники — 2026-04-20
- [x] Создать `.memory_bank/backend/apis/api_operations.md` — 2026-04-20
- [x] Обновить `CLAUDE.md` — добавить ссылку на apis/api_operations.md — 2026-04-20
- [x] Обновить `MEMORY.md` — Task model (operations, work_type.allow_new_operations), API Endpoints — 2026-04-20

---

## Лог выполнения

### 2026-04-20

- Создан план на основе анализа кодовой базы
- Изучены существующие модели: Operation, WorkType, Task, TaskEvent
- Определена архитектура: review_state в operations, allow_new_operations в work_types, новая таблица task_completed_operations
- Реализованы миграции 022-024
- Обновлены модели и схемы (Operation, WorkType, TaskCompletedOperation, OperationReviewState, OperationResponse, WorkTypeResponse, WorkTypeUpdate, TaskResponse)
- Создан роутер /operations (4 эндпоинта), удалён /references/operations
- Обновлён GET /{task_id}: добавлен _populate_task_operations
- Обновлён POST /{id}/complete: operation_ids, new_operations, сохранение в task_events.meta
- Проверена совместимость с iOS и Android — breaking changes отсутствуют
- Создана документация api_operations.md, обновлён CLAUDE.md
