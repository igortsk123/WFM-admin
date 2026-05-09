# API Operations

Операции — шаги выполнения задачи. Каждая операция привязана к одной или нескольким парам (work_type, zone) через таблицу `operation_work_type_zone`.

## Эндпоинты

**Base URL:** `/tasks/` (обслуживается svc_tasks)

### Публичные (обе роли)

- `GET /operations?work_type_id=X&zone_id=Y` — список операций для пары (тип работы, зона). Возвращает ACCEPTED + PENDING, исключает REJECTED. Сортировка по `display_order` пары (см. ниже), затем по `id` для стабильности.

### Только MANAGER

- `GET /operations/pending` — все операции со статусом PENDING (предложенные работниками, ожидают проверки)
- `POST /operations/{id}/approve` — принять операцию: PENDING → ACCEPTED
- `POST /operations/{id}/reject` — отклонить: PENDING → REJECTED

## Модель Operation

```
id: int
name: str
review_state: ACCEPTED | PENDING | REJECTED
hint_1..hint_6: str | null  (сырой материал из LAMA, не редактируется вручную)
```

`name` — не уникален глобально (ограничение снято в миграции 022), т.к. работники могут предлагать одинаковые названия в разных контекстах.

## Порядок операций (display_order)

Порядок операций — свойство **пары** (work_type, zone), не самой операции. Хранится в `operation_work_type_zone.display_order` (миграция 025). Одна и та же операция в разных парах может иметь разный порядок.

- В ответе `OperationResponse.display_order: int | null` — заполнен в `GET /operations` и в `TaskResponse.operations`. Для глобальных эндпоинтов (`/operations/pending`, `/approve`, `/reject`) — `null`.
- При создании новой PENDING-операции через `/complete` сервер вычисляет `MAX(display_order) + 1` для пары и пишет в новую запись `operation_work_type_zone`.
- Редактирование порядка делается точечно через БД (`UPDATE operation_work_type_zone SET display_order = X WHERE id = Y`). API пересортировки не реализован — появится при необходимости в UI.

## Статусы review_state

| Статус | Значение |
|--------|---------|
| ACCEPTED | Проверена, видна всем работникам |
| PENDING | Предложена работником, ждёт модерации |
| REJECTED | Отклонена; не удаляется (сохраняется для истории task_completed_operations) |

Существующие операции (из LAMA) имеют `review_state = ACCEPTED` по умолчанию (миграция 022 устанавливает server_default).

## Выполненные операции в задаче

При завершении задачи (`POST /{id}/complete`) клиент может передать:
- `operation_ids` — JSON-строка с массивом int: `"[1, 2, 3]"` (существующие операции)
- `new_operations` — JSON-строка с массивом string: `"[\"Протереть полку\"]"` (новые, только если `work_type.allow_new_operations = true`)

Сервер для каждой строки в `new_operations`:
1. Создаёт `Operation(name=..., review_state=PENDING)`
2. Создаёт запись в `operation_work_type_zone` по данным задачи
3. Добавляет ID в `task_completed_operations`

В `task_events.meta` при COMPLETE:
```json
{
  "image_url": "...",
  "operation_ids": [1, 2],
  "new_operation_ids": [42]
}
```

## Операции в ответе задачи

`GET /{task_id}` включает в `TaskResponse`:
- `operations` — список доступных операций (ACCEPTED + PENDING) для work_type/zone задачи; пустой если задача без work_type или zone
- `completed_operation_ids` — id операций, отмеченных работником при завершении

Списки задач (`GET /list`, `GET /my`) операции не возвращают.

## Флаг allow_new_operations в work_types

`work_types.allow_new_operations` (Boolean, default: False) — разрешает работникам предлагать новые операции при завершении задачи данного типа работы. Управляется через `PATCH /references/work-types/{id}`.

## Связанные файлы

- `backend/svc_tasks/app/api/operations.py` — роутер
- `backend/svc_tasks/app/domain/models.py` — Operation, OperationWorkTypeZone, TaskCompletedOperation
- `backend/svc_tasks/alembic/versions/022-025_*.py` — миграции (025 — display_order)
