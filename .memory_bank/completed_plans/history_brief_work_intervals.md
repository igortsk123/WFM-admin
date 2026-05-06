# План: Добавить work_intervals в history_brief

**Статус:** Выполнено
**Создан:** 2026-04-08
**Последнее обновление:** 2026-04-08

## Цель

Добавить в объект `history_brief` массив `work_intervals` — промежутки времени фактической работы сотрудника над задачей.

Каждый элемент массива:
```json
{ "time_start": "2026-04-08T09:15:00", "time_end": "2026-04-08T09:40:00" }
```

- `time_start` — `created_at` события `START` или `RESUME`
- `time_end` — `created_at` события `PAUSE` или `COMPLETE`; `null` если задача сейчас `IN_PROGRESS`

Текущие поля (`time_start`, `duration`, `time_state_updated`) остаются без изменений.

## Затронутые файлы

- `backend/svc_tasks/app/domain/schemas.py` — новая модель `WorkInterval`, поле `work_intervals` в `HistoryBrief`, обновить пример Swagger
- `backend/svc_tasks/app/repositories/task_event_repository.py` — логика вычисления `work_intervals` в `compute_history_brief`

## Задачи

- [x] 1. Добавить схему `WorkInterval` и поле `work_intervals: List[WorkInterval]` в `HistoryBrief` (`schemas.py`) — выполнено 2026-04-08
- [x] 2. Обновить `compute_history_brief` в `task_event_repository.py` — собирать интервалы по событиям START/RESUME (open) и PAUSE/COMPLETE (close) — выполнено 2026-04-08
- [x] 3. Обновить Swagger-пример `HistoryBrief` в `schemas.py` — добавить `work_intervals` в `json_schema_extra` — выполнено 2026-04-08
- [x] 4. Обновить документацию Memory Bank: `task_model.md`, `task_events_backend.md` — выполнено 2026-04-08

## Логика вычисления work_intervals

```
pending_start = None
intervals = []

для каждого события (хронологически):
  если START или RESUME → pending_start = event.created_at
  если PAUSE или COMPLETE:
    если pending_start is not None:
      intervals.append({time_start: pending_start, time_end: event.created_at})
      pending_start = None

если pending_start is not None (задача сейчас IN_PROGRESS):
  intervals.append({time_start: pending_start, time_end: None})
```

## Лог выполнения

### 2026-04-08
- Создан план на основе анализа `task_event_repository.py` и `schemas.py`
