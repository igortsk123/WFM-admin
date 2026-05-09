# План: LAMA daily sync — полная синхронизация сотрудников, смен и задач

**Статус:** Выполнено
**Создан:** 2026-03-12
**Последнее обновление:** 2026-03-12

## Цель

Реализовать ежедневную синхронизацию в 6:00 утра:
1. По всем магазинам — получить сотрудников из LAMA (`GET /employee/?shop_code=X`)
2. Создать/обновить пользователей без SSO и их assignments
3. Для каждого assignment — синхронизировать плановую смену и задачи
4. Запускать через n8n (cron → один HTTP вызов в svc_tasks)

## Архитектура

```
n8n cron 6:00
    └── POST /tasks/internal/sync-daily
            │
            ├── UsersClient.get_all_store_codes()
            │   → GET /users/internal/all-store-codes
            │
            └── для каждого shop_code (параллельно, semaphore 10):
                    ├── UsersClient.sync_lama_store(shop_code)
                    │   → POST /users/internal/sync-lama-store
                    │       └── LamaClient.get_employees_by_shop(shop_code)
                    │           upsert User (external_id, sso_id=None)
                    │           upsert Assignment
                    │           → [{assignment_id, employee_in_shop_id}]
                    │
                    └── для каждого assignment (параллельно, semaphore 20):
                            ├── ShiftLamaService.sync_shift(employee_in_shop_id, assignment_id)
                            └── TaskLamaService.sync_tasks(shift.external_id, assignment_id, user_id)
```

## Задачи

### 1. shared/lama_client.py — добавить метод get_employees_by_shop
- [x] Добавить `async def get_employees_by_shop(self, shop_code: str) -> Optional[list]` — выполнено 2026-03-12

### 2. config.py defaults — исправить устаревший URL
- [x] `backend/svc_users/app/core/config.py`: `LAMA_API_BASE_URL` default → `https://wfm-smart-test.lama70.ru/api` — выполнено 2026-03-12
- [x] `backend/svc_tasks/app/core/config.py`: то же самое — выполнено 2026-03-12

### 3. svc_users/services/lama_service.py — добавить sync_store_employees
- [x] Рефакторинг: выделен `_sync_positions` и `_update_lama_cache` из `sync_employee` — выполнено 2026-03-12
- [x] Добавлен `async def sync_store_employees(shop_code, db)` — выполнено 2026-03-12
- Возвращает: `[{"assignment_id": int, "employee_in_shop_id": int, "user_id": int}]`

### 4. svc_users/api/internal.py — два новых эндпоинта
- [x] `GET /internal/all-store-codes` — выполнено 2026-03-12
- [x] `POST /internal/sync-lama-store?shop_code=X` — выполнено 2026-03-12

### 5. svc_tasks/services/users_client.py — два новых метода
- [x] `async def get_all_store_codes() -> list[str]` — выполнено 2026-03-12
- [x] `async def sync_lama_store(shop_code: str) -> list[dict]` — выполнено 2026-03-12

### 6. svc_tasks/services/daily_sync_service.py — новый файл
- [x] `DailySyncService` с `sync_daily(db)` — выполнено 2026-03-12
- Параллелизм: Semaphore(10) по магазинам, Semaphore(20) по assignments

### 7. svc_tasks/api/internal.py — новый файл
- [x] `POST /internal/sync-daily` — выполнено 2026-03-12

### 8. svc_tasks/app/main.py — зарегистрировать internal роутер
- [x] Добавлен `internal.router` перед `shifts.router` — выполнено 2026-03-12

### 9. n8n workflow — новый конвейер
- [x] Создан `backend/n8n/lama_daily_sync.json` (cron 6:00 → POST /tasks/internal/sync-daily) — выполнено 2026-03-12

### 10. Документация
- [x] `api_lama.md` — добавлен эндпоинт `GET /employee/?shop_code=X`, исправлены пути (убран /smart_app_api) — выполнено 2026-03-12
- [x] `svc_tasks.md` — добавлены daily_sync_service, internal.py — выполнено 2026-03-12
- [x] `inter_service_communication.md` — уже обновлён ранее (актуальный пример svc_tasks → svc_users)

## Ключевые решения

**Создание User без SSO:**
- `User(sso_id=None, external_id=lama_employee_id)`
- Lookup при batch: `db.query(User).filter(User.external_id == employee_id).first()`
- При логине через телефон: к найденному по external_id пользователю добавляется `sso_id`

**Параллелизм:**
- `asyncio.Semaphore(10)` на уровне магазинов (не перегружаем LAMA и svc_users)
- `asyncio.Semaphore(20)` на уровне assignments (shifts+tasks)
- Graceful degradation: ошибка одного магазина не останавливает остальные

**Кэш `UserLamaCache`:**
- При batch-синхронизации TTL намеренно сбрасывается (обновляем `cached_at = NOW()`)
- Поэтому при последующем `/me` не будет лишнего LAMA-вызова до истечения TTL

## Лог выполнения

### 2026-03-12
- Создан план
