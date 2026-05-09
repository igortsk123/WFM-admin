# План: Проверка задач при закрытии смены

**Статус:** Выполнено
**Создан:** 2026-03-13
**Последнее обновление:** 2026-03-13

## Цель

Добавить в `POST /shifts/close` проверку наличия незавершённых задач и флаг принудительного закрытия `force`.

**Алгоритм:**
- `force=false` (по умолчанию):
  1. Есть задача IN_PROGRESS → ошибка `TASKS_IN_PROGRESS` ("У вас есть задачи в работе")
  2. Есть задача PAUSED → ошибка `TASKS_PAUSED` ("У вас есть незавершённые задачи")
- `force=true`:
  1. Все IN_PROGRESS задачи смены → PAUSED (системный PAUSE с `meta.reason = "shift_force_close"`)
  2. Закрыть смену в штатном режиме

**Привязка задач к смене:** `Task.shift_id` → `shifts_plan.id` (то же, что `plan_id` в запросе).

---

## Задачи

- [x] **1. Добавить коды ошибок** в `backend/shared/schemas/response.py` — выполнено 2026-03-13
- [x] **2. Обновить схему `ShiftCloseRequest`** в `backend/svc_tasks/app/domain/schemas.py` — выполнено 2026-03-13
- [x] **3. Добавить метод `get_tasks_by_shift_and_states`** в `backend/svc_tasks/app/repositories/task_repository.py` — выполнено 2026-03-13
- [x] **4. Обновить эндпоинт `POST /shifts/close`** в `backend/svc_tasks/app/api/shifts.py` — выполнено 2026-03-13
- [x] **5. Обновить документацию** `.memory_bank/backend/apis/api_shifts.md` — выполнено 2026-03-13
- [x] **6. Обновить `.memory_bank/domain/shift_model.md`** — выполнено 2026-03-13

---

## Технические детали

### Новые коды ошибок
```
TASKS_IN_PROGRESS — задача(и) смены находятся в работе
TASKS_PAUSED      — задача(и) смены находятся на паузе
```

### Событие при force-close
```
event_type: PAUSE
actor_role: "system"
actor_id:   None
old_state:  "IN_PROGRESS"
new_state:  "PAUSED"
meta:       {"reason": "shift_force_close"}
```
Этот подход позволит аналитике идентифицировать системные паузы по `actor_role="system"` + `meta.reason` и сопоставить время с `shifts_fact.closed_at`.

### Зависимости файлов
- `shared/schemas/response.py` (1) должен быть выполнен до (4)
- `task_repository.py` (3) должен быть выполнен до (4)
- Все (1–4) должны быть выполнены до обновления документации (5)

---

## Лог выполнения

### 2026-03-13
- Создан план на основе анализа кода: `shifts.py`, `task_repository.py`, `schemas.py`, `response.py`, `task_event_repository.py`
- Подтверждено: `Task.shift_id` ссылается на `shifts_plan.id` (комментарий в `models.py`)
- Подтверждено: форматы ошибок идут через `ApiException(message, code=...)`
- Подтверждено: task events содержат поля `actor_role`, `meta` — достаточно для отслеживания системных пауз
