# План: Перенести сущность Store из svc_shifts в svc_users

**Статус:** Выполнено
**Создан:** 2026-03-08
**Завершён:** 2026-03-08

## Цель

Перенести справочник магазинов (`stores`) из `svc_shifts` в `svc_users`, так как:
- `Assignment` (владелец `store_id`) живёт в svc_users
- После удаления `user_id` и `assignment_id` из shifts, магазины в shifts логически "висят в воздухе"
- svc_users уже является основным потребителем stores (через `Assignment.store_id`)

## Итоговая архитектура

```
svc_users (владелец Store)
  stores ← Assignment.store_id (FK внутри одной БД)
  GET/POST/PATCH /users/stores
  GET /users/internal/assignment-external-id  ← svc_shifts для LAMA sync
  GET /users/internal/assignment-store        ← svc_shifts для данных магазина

svc_shifts (потребитель Store)
  ShiftPlan — без store_id (полностью удалён)
  users_client.get_store_by_assignment(assignment_id) ← новый метод
```

## Отклонение от первоначального плана

- `ShiftPlan.store_id` **удалён полностью** (пользователь подтвердил — кэш не нужен)
- svc_shifts получает магазин через `assignment_id` → `GET /users/internal/assignment-store`
  (не через `store_id`, т.к. его больше нет)
- Внутренний эндпоинт `/internal/store-by-id` добавлен в svc_users, но не используется svc_shifts
  (оставлен для возможного будущего использования)
- `/internal/current-shift` в svc_shifts возвращает `store=null` (sync endpoint, не критично)

## Выполненные задачи

### svc_users
- [x] 007_add_stores_table.py — создание таблицы stores + FK на assignments
- [x] models.py — Store модель, Assignment.store_id → FK
- [x] schemas.py — StoreResponse, StoreCreate, StoreUpdate, StoreListResponse; AssignmentResponse.store_name → store: StoreResponse
- [x] repositories/store_repository.py — СОЗДАН (get_all, get_by_id, get_by_external_code, create, get_or_create, update)
- [x] api/stores.py — СОЗДАН (GET/POST /stores, GET/PATCH /stores/{id})
- [x] api/internal.py — добавлены /internal/store-by-id, /internal/store-by-code, /internal/assignment-store
- [x] services/lama_service.py — использует StoreRepository напрямую (убран shifts_client)
- [x] api/users.py — убрана зависимость от shifts_client, убрано ручное обогащение store_name
- [x] services/shifts_client.py — УДАЛЁН
- [x] main.py — добавлен stores router

### svc_shifts
- [x] 005_remove_stores_from_shifts.py — удаление store_id из shifts_plan, удаление таблицы stores
- [x] models.py — удалена модель Store, удалён store_id из ShiftPlan
- [x] schemas.py — удалены store-related схемы, CurrentShiftResponse.store_id → Optional[int]
- [x] repositories/store_repository.py — УДАЛЁН
- [x] api/stores.py — УДАЛЁН
- [x] api/internal.py — удалены /store-by-id, /store-by-code; /current-shift теперь без store (store=None)
- [x] services/users_client.py — добавлен StoreInfo dataclass + get_store_by_assignment()
- [x] services/lama_service.py — удалена логика создания магазинов
- [x] api/shifts.py — все endpoints используют users_client.get_store_by_assignment()
- [x] main.py — убран stores router

### Memory Bank
- [x] shift_model.md — stores → svc_users, убран store_id из shifts_plan
- [x] api_shifts.md — убраны stores endpoints, обновлены internal endpoints
- [x] api_users.md — добавлены stores endpoints и internal endpoints
- [x] svc_shifts.md — обновлена структура, схема БД, описание LAMA sync
- [x] inter_service_communication.md — убран svc_users→svc_shifts, обновлён svc_shifts→svc_users

## Лог выполнения

### 2026-03-08
- Создан план на основе анализа кода всех трёх сервисов
- Выполнены все изменения в svc_users и svc_shifts
- Обновлена документация Memory Bank
