# Сервис svc_users

Микросервис управления пользователями для системы WFM.

## Назначение

Сервис отвечает за:
- Хранение и управление данными пользователей
- Управление ролями и привилегиями пользователей
- Интеграцию с SSO API Beyond Violet
- Кэширование персональных данных из SSO

## Зависимости

- **[shared](shared.md)** — общий модуль с форматом ответов API и exception handlers
- **SSO API Beyond Violet** — получение персональных данных пользователей
- **LAMA API** — синхронизация данных сотрудников, назначений и должностей (см. `.memory_bank/backend/apis/external/api_lama.md`)
- **svc_shifts** — межсервисный вызов для маппинга `shop_code` → `store_id` (см. `.memory_bank/backend/patterns/inter_service_communication.md`)

## Архитектура

### Технологии

- **Python 3.12**
- **FastAPI** — веб-фреймворк
- **SQLAlchemy 2.0** — ORM
- **PostgreSQL 16** — база данных
- **Alembic** — миграции БД
- **httpx** — асинхронные HTTP запросы к SSO
- **Pydantic** — валидация данных

### Структура проекта

```
backend/svc_users/
├── app/
│   ├── api/              # API endpoints
│   │   ├── users.py      # Endpoints управления пользователями
│   │   └── health.py     # Health check
│   ├── core/             # Базовые компоненты
│   │   ├── config.py     # Конфигурация
│   │   └── database.py   # База данных
│   ├── domain/           # Доменная логика
│   │   ├── models.py     # SQLAlchemy модели
│   │   └── schemas.py    # Pydantic схемы
│   ├── repositories/     # Слой доступа к данным
│   │   └── user_repository.py
│   ├── services/         # Бизнес-логика
│   │   └── sso_service.py
│   └── main.py           # Точка входа
├── alembic/              # Миграции БД
│   └── versions/
├── Dockerfile
├── requirements.txt
└── README.md
```

> **Примечание:** JWT аутентификация вынесена в [shared модуль](shared.md) (`shared/auth.py`). Публичный ключ передается через переменную окружения `BV_PUBLIC_KEY`.

## База данных

### База: wfm_users

### Справочники

- **roles** — роли пользователей (worker, manager)
- **employee_types** — типы сотрудников (штатный, временный)
- **positions** — должности сотрудников
- **stores** — магазины

### Основные таблицы

#### users

Основная таблица пользователей системы.

| Поле | Тип | Описание |
|------|-----|----------|
| id | UUID | PRIMARY KEY, ID из SSO/JWT (поле 'u') |
| external_id | INTEGER | employee_id из LAMA (nullable) |
| role_id | INTEGER | FK на roles.id |
| type_id | INTEGER | FK на employee_types.id |
| store_id | INTEGER | ID магазина из svc_shifts (без FK) |
| updated_at | TIMESTAMP | Дата обновления |
| updated_by | UUID | Кто обновил |

> **Примечание:** Поля `position_id` и `grade` удалены из модели User. Должность и разряд теперь хранятся в модели Assignment (связь с LAMA).

#### permissions

Привилегии пользователей (разрешения на действия).

| Поле | Тип | Описание |
|------|-----|----------|
| id | UUID | PRIMARY KEY |
| user_id | UUID | FK на users.id (CASCADE DELETE) |
| permission | VARCHAR(50) | Тип привилегии (CHECK constraint) |
| granted_at | TIMESTAMP | Дата назначения |
| granted_by | UUID | Кто назначил |
| revoked_at | TIMESTAMP | Дата отзыва (soft delete) |

Допустимые значения permission:
- `CASHIER` — работа на кассе
- `SALES_FLOOR` — работа в торговом зале
- `SELF_CHECKOUT` — касса самообслуживания
- `WAREHOUSE` — работа на складе

#### assignments

Назначения сотрудников (связь с LAMA). У одного пользователя может быть несколько назначений (работа в разных магазинах).

| Поле | Тип | Описание |
|------|-----|----------|
| id | INTEGER | PRIMARY KEY, autoincrement |
| user_id | UUID | FK на users.id (CASCADE DELETE) |
| external_id | INTEGER | employee_in_shop_id из LAMA (unique, nullable) |
| company_name | VARCHAR(255) | Название компании (nullable) |
| position_id | INTEGER | FK на positions.id (nullable) |
| rank_id | INTEGER | FK на ranks.id (nullable) |
| store_id | INTEGER | ID магазина из svc_shifts (nullable) |
| date_start | DATE | Дата начала назначения (nullable) |
| date_end | DATE | Дата окончания назначения (nullable) |

#### ranks

Справочник разрядов сотрудников (синхронизируется из LAMA).

| Поле | Тип | Описание |
|------|-----|----------|
| id | INTEGER | PRIMARY KEY, autoincrement |
| code | VARCHAR(50) | Код разряда (unique) |
| name | VARCHAR(255) | Название разряда |

#### user_lama_cache

Кэш синхронизации с LAMA (TTL 1 час). Хранит также ФИО из LAMA (парсинг `employee_name`).

| Поле | Тип | Описание |
|------|-----|----------|
| user_id | UUID | PRIMARY KEY |
| first_name | VARCHAR(255) | Имя (из employee_name LAMA) |
| last_name | VARCHAR(255) | Фамилия (из employee_name LAMA) |
| middle_name | VARCHAR(255) | Отчество (из employee_name LAMA) |
| cached_at | TIMESTAMP | Время последней синхронизации |

**Время жизни кэша LAMA**: 1 час (настраивается через `LAMA_CACHE_TTL`)

#### user_sso_cache

Кэш данных из SSO API (персональные данные пользователей).

| Поле | Тип | Описание |
|------|-----|----------|
| user_id | UUID | PRIMARY KEY |
| first_name | VARCHAR(255) | Имя |
| last_name | VARCHAR(255) | Фамилия |
| middle_name | VARCHAR(255) | Отчество |
| email | VARCHAR(255) | Email |
| phone | VARCHAR(50) | Телефон |
| photo_url | TEXT | URL фотографии |
| gender | VARCHAR(10) | Пол |
| birth_date | DATE | Дата рождения |
| cached_at | TIMESTAMP | Время кэширования |

**Время жизни кэша**: 24 часа (настраивается через `SSO_CACHE_TTL`)

## Интеграция с SSO

### Endpoint SSO API

- **Base URL**: https://api.beyondviolet.com/sys/v1
- **Метод**: GET /users/{uuid}/
- **Авторизация**: Bearer token (из заголовка Authorization)

### Логика кэширования

1. **Кэш свежий (< 24 часов)** → возврат данных из кэша без обращения к SSO
2. **Кэш устарел, SSO доступен** → запрос к SSO, обновление кэша, возврат свежих данных
3. **Кэш устарел, SSO недоступен** → WARNING в логах, возврат устаревшего кэша
4. **Кэша нет, SSO недоступен** → ERROR в логах, HTTP 503

### Логирование

- `INFO` — успешное обновление кэша
- `WARNING` — возврат устаревшего кэша из-за недоступности SSO
- `ERROR` — SSO недоступен и кэша нет

## Интеграция с LAMA

### LamaService

Файл: `app/services/lama_service.py`

Синхронизация данных сотрудника из LAMA с кэшированием 1 час.

**Метод `sync_employee(user_id, phone, db, shifts_client)`:**

1. Проверить кэш (`user_lama_cache`, TTL 1 час)
2. Если свежий — вернуть assignments из БД
3. Запросить LAMA: `GET /employee/?phone={phone}`
4. Парсить `employee_name` → `last_name`, `first_name`, `middle_name`
5. Обновить `user.external_id = employee_id`
6. Для каждой позиции:
   - upsert Assignment по `external_id` (employee_in_shop_id)
   - `shop_code` → `shifts_client.get_or_create_store(shop_code, shop_name)` → `Assignment.store_id`
7. Автоматическое создание справочников Position и Rank при первой синхронизации
8. Обновить кэш (включая ФИО)
9. Вернуть список assignments

**Приоритет ФИО в `/me`:** LAMA → SSO. Данные LAMA точнее для рабочего контекста.

**Graceful degradation:** При недоступности LAMA возвращаются локальные данные из БД.

**Merge при первом входе:**

`merge_preloaded_by_phone` вызывается в `/me` после получения телефона из SSO. Находит пользователя с `phone=X, sso_id=NULL`. Поведение зависит от типа:

- **LAMA-пользователь** (есть хотя бы одно назначение в магазин с `store.partner_id == LAMA_PARTNER_ID`): assignments переносятся к новому SSO-пользователю, preloaded удаляется. `user_id` = новый.
- **Не-LAMA партнёр** (нет LAMA-назначений): `sso_id` и `phone` записываются в preloaded, новый SSO-пользователь удаляется. `user_id` = preloaded. Все ссылки (assignments, tasks) остаются корректными.

После merge `/me` использует возвращённый `effective_user_id`.

**Известное ограничение (только LAMA-пользователи):** задачи, созданные batch-sync до первого входа, содержат `assignee_id = preloaded_user.id`. После удаления preloaded эти ссылки становятся висячими — `assignee` в ответе будет `null`. На маршрутизацию задач не влияет (через `shift_id → shifts_plan.assignment_id`).

**LAMA sync в `/me`:** пропускается только если у пользователя **есть назначения И ни одно из них не в LAMA-магазине** (`is_confirmed_non_lama`). Если назначений нет — LAMA вызывается, так как пользователь может оказаться LAMA-сотрудником которому нужно проставить `external_id` и создать назначения.

### Связь Assignment с другими сервисами

- `Assignment.external_id` (employee_in_shop_id) используется в svc_shifts для запроса смены из LAMA
- `Assignment.id` передаётся как `assignment_id` в ShiftPlan, ShiftFact и Task

## Конфигурация

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://wfm_user:wfm_password@db_users:5432/wfm_users

# Application
DEBUG=True
LOG_LEVEL=INFO
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# JWT Authentication — через shared модуль
BV_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"
# Опционально: JWT_CLOCK_SKEW (по умолчанию 60)

# SSO Integration
SSO_BASE_URL=https://api.beyondviolet.com/sys/v1
SSO_TIMEOUT=5
SSO_CACHE_TTL=86400  # 24 часа

# LAMA Integration
LAMA_API_BASE_URL=https://wfm-smart.lama70.ru/api/
LAMA_API_TIMEOUT=5
LAMA_API_ENABLED=true
LAMA_CACHE_TTL=3600  # 1 час

# Shifts Service (межсервисное взаимодействие)
SHIFTS_SERVICE_URL=http://svc_shifts:8000
SHIFTS_SERVICE_TIMEOUT=5
```

## Развертывание

### Docker сборка

Shared модуль копируется при сборке образа:

```dockerfile
# svc_users/Dockerfile
COPY shared/ /app/shared/
COPY svc_users/app /app/app
```

### Docker Compose

```yaml
db_users:
  image: postgres:16
  container_name: wfm_users_db
  ports:
    - "5433:5432"
  environment:
    POSTGRES_DB: wfm_users

app_users:
  build:
    context: .           # backend/ - для доступа к shared/
    dockerfile: svc_users/Dockerfile
  container_name: wfm_users_app
  ports:
    - "8001:8000"
  depends_on:
    - db_users
```

### Порты

- **Приложение**: 8001 (внешний) → 8000 (внутренний)
- **База данных**: 5433 (внешний) → 5432 (внутренний)

### Базовый URL

`/users` — все endpoints сервиса доступны по этому префиксу

## Миграции БД

### Применить миграции

```bash
docker-compose exec app_users alembic upgrade head
```

### Создать новую миграцию

```bash
docker-compose exec app_users alembic revision -m "description"
```

## API Documentation

Подробное описание API endpoints см. в `.memory_bank/backend/apis/api_users.md`

Swagger UI: http://localhost:8001/users/docs
