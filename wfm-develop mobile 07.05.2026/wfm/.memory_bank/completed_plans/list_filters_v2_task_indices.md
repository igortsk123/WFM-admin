# План: Добавить task_filter_indices в /list/filters/v2

**Статус:** Выполнено
**Создан:** 2026-04-08
**Последнее обновление:** 2026-04-08

## Цель

Добавить в ответ `GET /list/filters/v2` новый объект `task_filter_indices` — массив, позволяющий мобильному клиенту подсчитывать количество задач при выборе фильтров без дополнительных запросов к серверу.

## Структура

```json
{
  "filters": [...],
  "task_filter_indices": [
    [0, 1, 2],   // задача 0: work_type[0], assignee[1], zone[2]
    [1, 0, -1],  // задача 1: work_type[1], assignee[0], нет зоны
    ...
  ]
}
```

- Внешний массив — по одному элементу на задачу из текущих смен магазина на сегодня
- Каждый внутренний массив: `[work_type_idx, assignee_idx, zone_idx]`
- Порядок совпадает с порядком групп в `filters`: work_types → assignees → zones
- `-1` если у задачи отсутствует соответствующий атрибут (нет work_type, zone, или assignee)

## Затронутые файлы

- `backend/svc_tasks/app/domain/schemas.py` — добавить поле `task_filter_indices` в `TaskListFiltersData`
- `backend/svc_tasks/app/api/tasks.py` — вычислить `task_filter_indices` в handler `get_task_list_filters_v2`

## Задачи

- [x] 1. Добавить поле `task_filter_indices: List[List[int]] = []` в `TaskListFiltersData` — выполнено 2026-04-08
- [x] 2. В `get_task_list_filters_v2`: построить lookup-словари (id → индекс) — выполнено 2026-04-08
- [x] 3. Для каждой задачи вычислить тройку индексов — выполнено 2026-04-08
- [ ] 4. Обновить Swagger-пример `TaskListFiltersData` — пропущено (достаточно описания в docstring схемы)

## Лог выполнения

### 2026-04-08
- Создан план
