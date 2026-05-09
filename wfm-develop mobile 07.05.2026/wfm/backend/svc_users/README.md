# WFM Users Service (svc_users)

Микросервис управления пользователями для системы WFM.

## Описание

Сервис отвечает за:
- Управление данными пользователей (роль, тип, должность, разряд, магазин)
- Управление привилегиями пользователей (CASHIER, SALES_FLOOR, SELF_CHECKOUT, WAREHOUSE)
- Интеграцию с SSO API Beyond Violet для получения персональных данных
- Кэширование данных из SSO (24 часа)

## Технологии

- **Python 3.12**
- **FastAPI** — веб-фреймворк
- **SQLAlchemy 2.0** — ORM
- **PostgreSQL 16** — база данных
- **Alembic** — миграции БД
- **httpx** — асинхронные HTTP запросы к SSO
- **Pydantic** — валидация данных

## Структура БД

### Справочники

- **roles** — роли пользователей (worker, manager)
- **employee_types** — типы сотрудников (штатный, временный)
- **positions** — должности сотрудников
- **stores** — магазины

### Основные таблицы

- **users** — пользователи системы
  - `id` (UUID) — ID из SSO/JWT
  - `external_id` — внешний ID из системы Лама
  - `role_id` → roles
  - `type_id` → employee_types
  - `position_id` → positions
  - `grade` — разряд
  - `store_id` → stores
  - `updated_at`, `updated_by` — аудит

- **permissions** — привилегии пользователей
  - `id`, `user_id`, `permission`, `granted_at`, `granted_by`, `revoked_at`

- **user_sso_cache** — кэш данных из SSO (ФИО, email, телефон, фото, пол, дата рождения)
  - TTL: 24 часа

## API Endpoints

### Базовый URL: `/users`

### Пользователи

- `GET /me` — получить полную информацию о текущем пользователе (локальные данные + SSO)
- `GET /{user_id}` — получить пользователя по ID (только MANAGER)
- `PATCH /{user_id}` — обновить данные пользователя (только MANAGER)
- `PATCH /{user_id}/permissions` — обновить привилегии пользователя (только MANAGER)

### Служебные

- `GET /health` — health check

## Запуск

### 1. Настройка окружения

Скопируйте `.env.example` в `.env` и настройте переменные:

```bash
cp .env.example .env
```

Основные переменные:
- `DATABASE_URL` — URL подключения к PostgreSQL
- `SSO_BASE_URL` — URL SSO API (по умолчанию: https://api.beyondviolet.com/sys/v1)
- `SSO_TIMEOUT` — таймаут запросов к SSO (секунды)
- `SSO_CACHE_TTL` — время жизни кэша SSO (секунды, по умолчанию 86400 = 24 часа)
- `BV_PUBLIC_KEY_PATH` — путь к публичному ключу для проверки JWT

### 2. Запуск через Docker Compose

Из директории `backend/`:

```bash
# Запуск БД и приложения
docker-compose up -d db_users app_users

# Применить миграции
docker-compose exec app_users alembic upgrade head

# Просмотр логов
docker-compose logs -f app_users
```

Сервис будет доступен на:
- **HTTP**: http://localhost:8001
- **База данных**: localhost:5433

### 3. Документация API

После запуска откройте в браузере:
- Swagger UI: http://localhost:8001/users/docs
- ReDoc: http://localhost:8001/users/redoc

## Миграции БД

### Применить миграции

```bash
docker-compose exec app_users alembic upgrade head
```

### Создать новую миграцию

```bash
docker-compose exec app_users alembic revision -m "description"
```

### Откатить миграцию

```bash
docker-compose exec app_users alembic downgrade -1
```

## Логика кэширования SSO

1. **Кэш свежий (< 24 часов)** → возврат данных из кэша без обращения к SSO
2. **Кэш устарел, SSO доступен** → запрос к SSO, обновление кэша, возврат свежих данных
3. **Кэш устарел, SSO недоступен** → WARNING в логах, возврат устаревшего кэша
4. **Кэша нет, SSO недоступен** → ERROR в логах, HTTP 503

Логирование:
- `INFO` — успешное обновление кэша
- `WARNING` — возврат устаревшего кэша из-за недоступности SSO
- `ERROR` — SSO недоступен и кэша нет

## Разработка

### Установка зависимостей (локально)

```bash
cd backend/svc_users
python -m venv venv
source venv/bin/activate  # Linux/macOS
# или
venv\Scripts\activate  # Windows

pip install -r requirements.txt
```

### Запуск локально

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Линтинг и форматирование

```bash
# Форматирование
black app/

# Проверка стиля
ruff check app/
```

## Порты и адреса

- **Приложение**: 8001 (внешний) → 8000 (внутренний)
- **База данных**: 5433 (внешний) → 5432 (внутренний)
- **База данных**: wfm_users

## Соответствие Memory Bank

Реализация соответствует спецификациям:
- `.memory_bank/plans/svc_users_creation.md` — план создания сервиса
- `.memory_bank/backend/` — будущие документы по API и архитектуре
- `.memory_bank/domain/` — доменная модель пользователей
