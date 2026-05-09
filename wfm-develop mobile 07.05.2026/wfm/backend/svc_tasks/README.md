# WFM Tasks Service

Сервис управления задачами для системы WFM (Workforce Management).

## Технологии

- **Python 3.12**
- **FastAPI** - веб-фреймворк
- **SQLAlchemy** - ORM
- **PostgreSQL 16** - база данных
- **Alembic** - миграции БД
- **PyJWT** - валидация JWT токенов (RS256)
- **Docker & Docker Compose** - контейнеризация

## Структура проекта

```
svc_tasks/
├── app/
│   ├── api/              # API endpoints
│   │   └── tasks.py      # Роутер для задач
│   ├── core/             # Ядро приложения
│   │   ├── config.py     # Конфигурация
│   │   └── database.py   # Подключение к БД
│   ├── domain/           # Доменная модель
│   │   ├── models.py     # SQLAlchemy модели
│   │   ├── schemas.py    # Pydantic схемы
│   │   └── state_machine.py  # State Machine для задач
│   ├── repositories/     # Репозитории для работы с БД
│   │   └── task_repository.py
│   └── main.py           # Точка входа приложения
├── alembic/              # Миграции базы данных
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
├── alembic.ini
└── README.md
```

## Доменная модель

### Task (Задача)

Основная сущность системы со следующими состояниями:

- **NEW** - задача создана, но никто не начал выполнение
- **IN_PROGRESS** - сотрудник начал выполнение
- **PAUSED** - сотрудник приостановил выполнение
- **COMPLETED** - задача завершена

### Правила переходов состояний

```
NEW → IN_PROGRESS (start)
IN_PROGRESS → PAUSED (pause)
PAUSED → IN_PROGRESS (resume)
IN_PROGRESS → COMPLETED (complete)
```

### Бизнес-правила

1. Сотрудник может иметь только 1 активную задачу одновременно
2. Переходы между состояниями валидируются на сервере
3. Недопустимые переходы возвращают HTTP 409 Conflict

## API Endpoints

**Base URL:** `/tasks/` (задается через `root_path` в FastAPI или nginx proxy)

### Аутентификация

Все эндпоинты кроме `/health` требуют JWT токен в заголовке:

```
Authorization: Bearer <access_token>
```

Токен выдаётся сервером Beyond Violet и должен быть валидным RS256 JWT.

При ошибках аутентификации возвращается HTTP 401 с кодами:
- `token_missing` - отсутствует токен
- `token_invalid` - невалидный токен
- `token_expired` - токен истёк

### Tasks API (требуют аутентификации)

- `GET /` - Список задач (фильтры: state, assignee_id)
- `POST /` - Создать задачу
- `GET /{id}` - Получить задачу по ID
- `PATCH /{id}` - Обновить поля задачи
- `POST /{id}/start` - Переход NEW → IN_PROGRESS
- `POST /{id}/pause` - Переход IN_PROGRESS → PAUSED
- `POST /{id}/resume` - Переход PAUSED → IN_PROGRESS
- `POST /{id}/complete` - Переход IN_PROGRESS → COMPLETED

### System (без аутентификации)

- `GET /health` - Health check

## Установка и запуск (PyCharm)

### 1. Клонирование и настройка

```bash
cd backend/svc_tasks
```

### 2. Создание виртуального окружения

В PyCharm:
1. File → Settings → Project → Python Interpreter
2. Add Interpreter → Add Local Interpreter
3. Выберите Virtualenv Environment
4. Location: `./venv`
5. Base interpreter: Python 3.12

Или через терминал:
```bash
python3.12 -m venv venv
source venv/bin/activate  # Linux/Mac
# или
venv\Scripts\activate  # Windows
```

### 3. Установка зависимостей

```bash
pip install -r requirements.txt
```

### 4. Настройка переменных окружения

Создайте файл `.env` на основе `.env.example`:

```bash
cp .env.example .env
```

**Важно**: Для работы аутентификации необходимо настроить публичный RSA-ключ от сервера Beyond Violet.

#### Рекомендуемый способ (через файл):

1. Создайте файл с публичным ключом:
```bash
cp bv_public_key.pem.example bv_public_key.pem
# Откройте bv_public_key.pem и вставьте реальный публичный ключ
```

2. В файле `.env` укажите путь:
```env
BV_PUBLIC_KEY_PATH=./bv_public_key.pem
```

#### Альтернативный способ (в одну строку):

Вставьте ключ в `.env` в одну строку, используя `\n` для переносов:
```env
BV_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...\n-----END PUBLIC KEY-----"
```

### 5. Запуск через Docker Compose (рекомендуется)

```bash
docker-compose up --build
```

Сервис будет доступен на http://localhost:8000

### 6. Запуск локально (для разработки в PyCharm)

#### Запустить PostgreSQL отдельно:

```bash
docker run -d \
  --name wfm_tasks_db \
  -e POSTGRES_USER=wfm_user \
  -e POSTGRES_PASSWORD=wfm_password \
  -e POSTGRES_DB=wfm_tasks \
  -p 5432:5432 \
  postgres:16
```

#### Применить миграции:

```bash
alembic upgrade head
```

#### Запустить приложение:

В PyCharm создайте Run Configuration:
- Script path: путь к `uvicorn`
- Parameters: `app.main:app --reload --host 0.0.0.0 --port 8000`
- Working directory: `backend/svc_tasks`

Или через терминал:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Работа с миграциями

### Создать новую миграцию

```bash
alembic revision --autogenerate -m "описание миграции"
```

### Применить миграции

```bash
alembic upgrade head
```

### Откатить последнюю миграцию

```bash
alembic downgrade -1
```

## Документация API

После запуска приложения документация доступна по адресам:

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Разработка в PyCharm

### Настройка интерпретатора для Docker

1. File → Settings → Project → Python Interpreter
2. Add Interpreter → On Docker Compose
3. Configuration file: `docker-compose.yml`
4. Service: `app`

### Отладка

Для отладки в контейнере:
1. Добавьте в `docker-compose.yml` в секцию `app`:
   ```yaml
   ports:
     - "5678:5678"  # для debugpy
   ```
2. В PyCharm создайте конфигурацию "Python Debug Server"

### Форматирование кода

```bash
black app/
ruff check app/
```

## Тестирование

```bash
pytest
```

## Примеры использования

### Создание задачи

```bash
curl -X POST http://localhost:8000/tasks/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your_access_token>" \
  -d '{
    "title": "Проверить склад",
    "description": "Провести инвентаризацию",
    "planned_minutes": 60,
    "creator_id": "123e4567-e89b-12d3-a456-426614174000",
    "assignee_id": "123e4567-e89b-12d3-a456-426614174001"
  }'
```

### Начать выполнение задачи

```bash
curl -X POST http://localhost:8000/tasks/{task_id}/start \
  -H "Authorization: Bearer <your_access_token>"
```

### Получить список задач

```bash
curl http://localhost:8000/tasks/ \
  -H "Authorization: Bearer <your_access_token>"
```

### Получить список задач с фильтром

```bash
curl "http://localhost:8000/tasks/?state=IN_PROGRESS" \
  -H "Authorization: Bearer <your_access_token>"
```

## Полезные команды

### Подключение к БД

```bash
docker exec -it wfm_tasks_db psql -U wfm_user -d wfm_tasks
```

### Просмотр логов

```bash
docker-compose logs -f app
```

### Остановка сервисов

```bash
docker-compose down
```

### Остановка с удалением данных

```bash
docker-compose down -v
```
