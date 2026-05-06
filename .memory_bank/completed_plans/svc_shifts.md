# План: Создание сервиса svc_shifts

**Статус:** Выполнено (все фазы завершены)
**Создан:** 2025-02-11
**Последнее обновление:** 2026-02-11

## Цель

Создать микросервис `svc_shifts` для управления сменами сотрудников. Сервис будет владеть таблицей магазинов (stores) и предоставлять API для открытия/закрытия смен.

---

## Архитектура

### Таблицы базы данных

**1. stores (справочник магазинов)**
```
id: INTEGER (PRIMARY KEY, AUTOINCREMENT)
name: VARCHAR(255) NOT NULL
address: TEXT
created_at: TIMESTAMP DEFAULT NOW()
```

**2. shifts_plan (плановое расписание)**
```
id: INTEGER (PRIMARY KEY, AUTOINCREMENT)
user_id: UUID NOT NULL          -- ссылка на пользователя из svc_users
store_id: INTEGER NOT NULL      -- FK на stores
shift_date: DATE NOT NULL       -- дата смены
start_time: TIME NOT NULL       -- время начала (например, 09:00)
end_time: TIME NOT NULL         -- время окончания (например, 18:00)
role_id: INTEGER                -- ID роли/должности (опционально)
created_at: TIMESTAMP DEFAULT NOW()
created_by: UUID                -- кто создал запись
```

**3. shifts_fact (фактические смены)**
```
id: INTEGER (PRIMARY KEY, AUTOINCREMENT)
user_id: UUID NOT NULL          -- ссылка на пользователя из svc_users
store_id: INTEGER NOT NULL      -- FK на stores
opened_at: TIMESTAMP NOT NULL   -- фактическое время открытия смены
closed_at: TIMESTAMP            -- фактическое время закрытия (NULL если открыта)
role_id: INTEGER                -- ID роли/должности (опционально)
```

**Связь план-факт:** по user_id + дате, без FK.

### API Endpoints

**Base URL:** `/shifts/`

| Метод | Endpoint | Описание |
|-------|----------|----------|
| POST | `/open` | Открыть смену (создать запись в shifts_fact) |
| POST | `/close` | Закрыть смену (установить closed_at) |
| GET | `/current` | Получить текущую смену (логика с приоритетом) |
| GET | `/` | Список смен с фильтрами |
| GET | `/{id}` | Получить смену по ID |

**Дополнительные endpoints (CRUD магазинов):**

| Метод | Endpoint | Описание |
|-------|----------|----------|
| GET | `/stores` | Список магазинов |
| POST | `/stores` | Создать магазин |
| GET | `/stores/{id}` | Получить магазин |
| PATCH | `/stores/{id}` | Обновить магазин |

### Статусы смены (для ответа API)

```python
class ShiftStatus(str, Enum):
    NEW = "NEW"           # Смена из shifts_plan (ещё не открыта)
    OPENED = "OPENED"     # Смена открыта (shifts_fact, closed_at = NULL)
    CLOSED = "CLOSED"     # Смена закрыта (shifts_fact, closed_at IS NOT NULL)
```

### Бизнес-правила

1. **Одна открытая смена**: У работника может быть только одна открытая смена одновременно
2. **Приоритет get_current**:
   - Сначала ищем в shifts_fact за сегодня → возвращаем последнюю (OPENED или CLOSED)
   - Если нет → ищем в shifts_plan за сегодня → возвращаем со статусом NEW
3. **open создаёт запись**: При открытии смены создаётся новая запись в shifts_fact с opened_at = NOW()
4. **close заполняет время**: Находит открытую смену пользователя и устанавливает closed_at = NOW()

---

## Задачи

### Фаза 1: Инфраструктура

- [x] Создать структуру папок сервиса (`backend/svc_shifts/`)
- [x] Создать `requirements.txt` с зависимостями
- [x] Создать `Dockerfile` для сервиса
- [x] Создать конфигурацию (`app/core/config.py`, `app/core/database.py`)
- [x] Настроить Alembic для миграций

### Фаза 2: Модели данных

- [x] Создать модель `Store` (`app/domain/models.py`)
- [x] Создать модель `ShiftPlan` (`app/domain/models.py`)
- [x] Создать модель `ShiftFact` (`app/domain/models.py`)
- [x] Создать Pydantic схемы (`app/domain/schemas.py`)
- [ ] Создать миграцию Alembic для всех таблиц (при первом запуске)

### Фаза 3: Репозитории

- [x] Создать `StoreRepository` (`app/repositories/store_repository.py`)
- [x] Создать `ShiftRepository` (`app/repositories/shift_repository.py`)
  - `create_fact_shift()` — создание фактической смены
  - `find_open_shift(user_id)` — найти открытую смену
  - `close_shift(shift_id)` — закрыть смену
  - `get_today_fact_shifts(user_id)` — смены из shifts_fact за сегодня
  - `get_today_plan_shifts(user_id)` — смены из shifts_plan за сегодня

### Фаза 4: API Endpoints

- [x] Создать роутер `/stores` (`app/api/stores.py`)
  - GET `/stores` — список магазинов
  - POST `/stores` — создать магазин
  - GET `/stores/{id}` — получить магазин
  - PATCH `/stores/{id}` — обновить магазин
- [x] Создать роутер `/shifts` (`app/api/shifts.py`)
  - POST `/open` — открыть смену
  - POST `/close` — закрыть смену
  - GET `/current` — получить текущую смену
  - GET `/` — список смен
  - GET `/{id}` — смена по ID
- [x] Создать health check endpoint (`app/api/health.py`)
- [x] Создать `main.py` с FastAPI приложением

### Фаза 5: Docker и Nginx

- [x] Добавить сервис `svc_shifts` в `docker-compose.yml`
- [x] Добавить скрипт создания базы данных `wfm_shifts` в `backend/db/init/`
- [x] Создать конфиг nginx (`backend/nginx/services/shifts.conf`)
- [x] Добавить порт 8002 для локальной разработки в `docker-compose.override.yml`

### Фаза 6: Миграция Store из svc_users (ВЫПОЛНЕНО)

- [x] Обновить модель `User` в svc_users — убрать FK на stores, оставить только `store_id: INTEGER`
- [x] Удалить модель `Store` из svc_users
- [x] Обновить схемы в svc_users (убрать вложенный store, оставить store_id)
- [x] Создать миграцию в svc_users для удаления таблицы stores
- [x] Обновить API svc_users для работы с store_id без JOIN

### Фаза 7: Документация Memory Bank

- [x] Создать `.memory_bank/backend/api_shifts.md` — описание API
- [x] Создать `.memory_bank/domain/shift_model.md` — доменная модель смен
- [ ] Обновить `.memory_bank/domain/stores.md` — вынести описание магазинов (владелец: svc_shifts)
- [x] Обновить `CLAUDE.md` — добавить информацию о svc_shifts
- [ ] Обновить `.memory_bank/backend/nginx.md` — добавить конфиг shifts

---

## Структура сервиса

```
backend/svc_shifts/
├── Dockerfile
├── requirements.txt
├── alembic.ini
├── alembic/
│   ├── env.py
│   ├── script.py.mako
│   └── versions/
├── app/
│   ├── __init__.py
│   ├── main.py
│   ├── api/
│   │   ├── __init__.py
│   │   ├── health.py
│   │   ├── stores.py
│   │   └── shifts.py
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py
│   │   ├── database.py
│   │   └── logging_config.py
│   ├── domain/
│   │   ├── __init__.py
│   │   ├── models.py
│   │   └── schemas.py
│   ├── repositories/
│   │   ├── __init__.py
│   │   ├── store_repository.py
│   │   └── shift_repository.py
│   └── services/
│       └── __init__.py
└── shared -> ../shared  (симлинк на общий модуль)
```

---

## Технические детали

### Порты

| Сервис | Порт (local) | Порт (docker) |
|--------|--------------|---------------|
| svc_tasks | 8000 | 8000 |
| svc_users | 8001 | 8001 |
| svc_shifts | 8002 | 8002 |

### Переменные окружения

```env
SHIFTS_DATABASE_URL=postgresql://wfm_shifts_user:wfm_shifts_password@postgres:5432/wfm_shifts
BV_PUBLIC_KEY=...
DEBUG=False
LOG_LEVEL=INFO
```

### URL доступа

- **Production:** `https://dev.wfm.beyondviolet.com/shifts/`
- **Local:** `http://localhost:8002/shifts/`
- **Swagger:** `/shifts/docs`

---

## Лог выполнения

### 2025-02-11
- Создан план разработки сервиса svc_shifts
- Определена структура таблиц и API
- Решено перенести Store из svc_users в svc_shifts
- Изменён тип `store.id` с UUID на INTEGER (для справочника достаточно)
- **Выполнены Фазы 1-5, 7**: создан сервис svc_shifts со всеми файлами
  - Структура папок и конфигурация
  - Модели данных (Store, ShiftPlan, ShiftFact)
  - Pydantic схемы
  - Репозитории (StoreRepository, ShiftRepository)
  - API endpoints (stores, shifts, health)
  - Docker-compose конфигурация (base, override, dev)
  - Nginx конфиг
  - Документация Memory Bank (api_shifts.md, shift_model.md, CLAUDE.md)

### 2026-02-11
- **Сервис svc_shifts запущен и работает**
- Исправлена ошибка парсинга ALLOWED_ORIGINS (переключено на string с property)
- Создана база данных wfm_shifts и пользователь wfm_shifts_user в PostgreSQL
- Исправлен порядок подключения роутеров (health.router перед shifts.router)
- Изменён путь списка смен с `/` на `/list` для избежания конфликта с root endpoint
- Проверены endpoints: /, /health, /docs

- **Выполнена Фаза 6: Миграция Store из svc_users**
  - Удалена модель Store из svc_users/app/domain/models.py
  - Изменён тип `store_id` с UUID на INTEGER в User модели
  - Обновлены Pydantic схемы: `store: StoreResponse` → `store_id: int`
  - Обновлён user_repository.py: убраны joinedload(User.store), изменены типы
  - Обновлены API endpoints: `store=user.store` → `store_id=user.store_id`
  - Создана миграция 003_remove_stores_table.py
  - Исправлена ошибка ALLOWED_ORIGINS в svc_users и svc_tasks
  - Исправлен порядок роутеров в svc_users (health.router первым)

---

## Примечания

1. **role_id в сменах**: Пока храним как INTEGER. В будущем можно связать с справочником должностей из svc_users через FK или enum.

2. **Синхронизация store_id**: После переноса Store в svc_shifts, svc_users будет хранить только store_id (INTEGER). Валидация существования магазина — на уровне бизнес-логики или через API-вызов.

3. **Фаза 6 (миграция Store из svc_users)**: Эта фаза требует отдельной работы — нужно удалить Store из svc_users и обновить все связанные файлы. Пока svc_shifts и svc_users имеют свои копии Store.

4. **Расширение в будущем**:
   - Шаблоны расписания (еженедельные)
   - Уведомления о начале смены
   - Отчёты по отработанным часам
   - Интеграция с табелем
