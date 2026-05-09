# План: Удалить user_id из shifts и убрать /list endpoint

**Статус:** Выполнено
**Создан:** 2026-03-08
**Последнее обновление:** 2026-03-08

## Цель

Удалить `user_id` из таблиц `shifts_plan` и `shifts_fact`, сделать `assignment_id` основным идентификатором владельца смены. Удалить устаревший `GET /list` endpoint.

## Мотивация

- `user_id` в shifts — легаси, появилось до концепции assignment
- `assignment_id` уже содержит `user_id` (через таблицу `assignments` в svc_users)
- Internal endpoint уже работает только через `assignment_id`
- Подготовка к pre-provisioning: shifts будут принадлежать assignment, а не SSO UUID

---

## Задачи

- [x] **1. БД миграция** — выполнено 2026-03-08
  - `003_remove_user_id_from_shifts.py`: drop `user_id` из обеих таблиц, `assignment_id NOT NULL`

- [x] **2. Модели (models.py)** — выполнено 2026-03-08
  - Удалён `user_id` из `ShiftPlan` и `ShiftFact`, `assignment_id` стал `nullable=False`

- [x] **3. Схемы (schemas.py)** — выполнено 2026-03-08
  - Удалён `user_id` из всех схем
  - `ShiftOpenRequest`: убран `assignment_id`
  - `ShiftCloseRequest`: добавлен `plan_id: int`
  - Удалены `ShiftListResponse`, `ShiftFactResponse`

- [x] **4. Репозиторий (shift_repository.py)** — выполнено 2026-03-08
  - Удалён `get_open_shift(user_id)`, оставлен `get_open_shift_by_assignment`
  - Добавлен `get_open_shift_by_plan_id(plan_id)`
  - Все методы переведены на `assignment_id`
  - Удалены `get_all_fact_shifts`, `get_all_plan_shifts`

- [x] **5. API эндпоинты (shifts.py)** — выполнено 2026-03-08
  - `POST /open`: `assignment_id` берётся из плана, не из JWT
  - `POST /close`: принимает `plan_id` в теле, ищет смену через `get_open_shift_by_plan_id`
  - `GET /current`: убран `user_id` из вызовов репозитория
  - **Удалён `GET /list`**

- [x] **6. LAMA сервис (lama_service.py)** — выполнено 2026-03-08
  - Убран параметр `user_id` из `sync_shift()`

- [x] **7. Internal endpoint (internal.py)** — выполнено 2026-03-08
  - Убран `user_id` из `CurrentShiftResponse`

- [x] **8. iOS** — выполнено 2026-03-08
  - `ShiftModels.swift`: убран `userId` из `CurrentShift`, добавлен `ShiftCloseRequest`, убран `assignmentId` из `ShiftOpenRequest`, удалены `ShiftFact`/`ShiftsListResponse`
  - `ShiftsService.swift`: `closeShift(planId:)`, `openShift(planId:)`, удалён `getShiftsList`
  - `UserManager.swift`: обновлены сигнатуры `openShift(planId:)` и `closeShift(planId:)`
  - `HomeViewModel.swift`: передаётся `planId` в оба вызова

- [x] **9. Android** — выполнено 2026-03-08
  - `ShiftModels.kt`: аналогичные изменения
  - `ShiftsService.kt`: аналогичные изменения
  - `UserManager.kt`: обновлены сигнатуры
  - `HomeViewModel.kt`: передаётся `planId` в оба вызова

- [x] **10. Memory Bank документация** — выполнено 2026-03-08

---

## Ключевые изменения в поведении API

| Endpoint | Изменение |
|----------|-----------|
| `POST /open` | Убран `assignment_id` из тела — сервер берёт из плана сам |
| `POST /close` | Принимает `{ "plan_id": int }` вместо пустого тела |
| `GET /current` | Без изменений |
| `GET /list` | **Удалён** |
| `GET /{id}` | Ответ без `user_id` |
| `GET /internal/current-shift` | Ответ без `user_id` |

---

## Лог выполнения

### 2026-03-08
- Создан план на основе анализа кода svc_shifts
- Добавлены задачи по мобильным приложениям (iOS и Android)
- Реализованы все задачи (backend + iOS + Android)
