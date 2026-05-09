# План: Рефакторинг связи смен и задач

**Статус:** Выполнено
**Создан:** 2026-02-20
**Выполнен:** 2026-02-20

## Цель

Упростить модели данных: убрать дублирующиеся поля (role_id, store_id) из смен, привязать фактические смены к плановым, заменить shift_external_id на shift_id в задачах, убрать assignment_id из задач. Создать эндпоинт «мои задачи» с межсервисным взаимодействием svc_tasks → svc_shifts по HTTP.

## Задачи

### Этап 1: svc_shifts — рефакторинг моделей

- [x] **1.1** Удалить `role_id` и `store_id` из модели `ShiftFact`
- [x] **1.2** Добавить `plan_id` (FK на `shifts_plan.id`) в модель `ShiftFact`
- [x] **1.3** Удалить `role_id` из модели `ShiftPlan`
- [x] **1.4** Написать миграцию Alembic `002_refactor_shifts_plan_fact_link.py`
- [x] **1.5** Обновить схемы (`schemas.py`)
- [x] **1.6** Обновить репозиторий (`shift_repository.py`)
- [x] **1.7** Обновить API эндпоинты (`shifts.py`)
- [x] **1.8** Добавить внутренний эндпоинт `GET /internal/current-shift`

### Этап 2: svc_tasks — рефакторинг моделей

- [x] **2.1** Переименовать `shift_external_id` → `shift_id` в модели `Task`
- [x] **2.2** Удалить `assignment_id` из модели `Task`
- [x] **2.3** Написать миграцию Alembic `005_rename_shift_id_remove_assignment.py`
- [x] **2.4** Обновить схемы (`schemas.py`)
- [x] **2.5** Обновить репозиторий (`task_repository.py`)

### Этап 3: svc_tasks — обновление эндпоинта /list

- [x] **3.1** В `GET /list` заменить параметр `shift_external_id` на `shift_id`
- [x] **3.2** Убрать параметр `assignment_id` из `GET /list`
- [x] **3.3** Обновить логику LAMA-синка

### Этап 4: Межсервисное взаимодействие (HTTP)

- [x] **4.1** Создать клиент `ShiftsServiceClient` в `svc_tasks/app/services/shifts_client.py`
- [x] **4.2** Добавить переменную окружения `SHIFTS_SERVICE_URL` в конфиг svc_tasks
- [x] **4.3** Добавить `SHIFTS_SERVICE_URL` в docker-compose.yml для svc_tasks

### Этап 5: Эндпоинт «Мои задачи»

- [x] **5.1** Создать эндпоинт `GET /my` в svc_tasks

### Этап 6: Документация межсервисного взаимодействия

- [x] **6.1** Создать `.memory_bank/backend/patterns/inter_service_communication.md`

### Этап 7: Обновление документации Memory Bank

- [x] **7.1** Обновить `.memory_bank/domain/shift_model.md`
- [x] **7.2** Обновить `.memory_bank/domain/task_model.md`
- [x] **7.3** Обновить `.memory_bank/backend/apis/api_shifts.md`
- [x] **7.4** Обновить `.memory_bank/backend/apis/api_tasks.md`
- [x] **7.5** Обновить `CLAUDE.md`

### Этап 8: OpenAPI и финализация

- [x] **8.1** Проверить, что Swagger/ReDoc корректно отображает все изменения
- [x] **8.2** Запушить изменения на develop

## Технические детали

### Межсервисное взаимодействие (HTTP)

**Паттерн**: Прямой HTTP вызов через внутреннюю Docker-сеть.

**Почему HTTP**:
- `httpx` уже есть в зависимостях обоих сервисов
- Нет новых инфраструктурных зависимостей (broker, shared DB)
- Простая реализация для синхронного запроса-ответа
- Подходит для MVP, легко заменить на другой транспорт позже

**Конвенция внутренних эндпоинтов**:
- Префикс `/internal/` — без JWT авторизации
- Доступны только из Docker-сети (не проксируются через nginx)
- Формат ответа — стандартный `ApiResponse`

### Изменения в Docker Compose

```yaml
svc_tasks:
  environment:
    SHIFTS_SERVICE_URL: http://svc_shifts:8000
  depends_on:
    - svc_shifts  # добавить зависимость
```

### Миграции

**svc_shifts**: `002_refactor_shifts_plan_fact_link.py`
- ADD `plan_id` INTEGER NULLABLE FK(shifts_plan.id) в shifts_fact
- DROP `role_id` из shifts_fact
- DROP `store_id` из shifts_fact
- DROP `role_id` из shifts_plan

**svc_tasks**: `005_rename_shift_external_id_remove_assignment.py`
- RENAME `shift_external_id` → `shift_id` в tasks
- DROP `assignment_id` из tasks

## Лог выполнения

### 2026-02-20
- Создан план
- Исследована текущая кодовая база (модели, миграции, эндпоинты)
- Выбран паттерн межсервисного взаимодействия: прямой HTTP
- Выполнены этапы 1–8: все модели, схемы, миграции, API, документация обновлены
- Запушено на develop (коммит `1a0d882`)
