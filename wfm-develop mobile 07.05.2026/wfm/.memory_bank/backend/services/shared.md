# Shared модуль

Общий код для всех backend сервисов WFM.

## Назначение

Модуль содержит общие компоненты, используемые всеми микросервисами:
- Стандартизированный формат API ответов (Beyond Violet API)
- Базовые классы исключений
- Глобальные exception handlers для FastAPI

## Расположение

```
backend/shared/
├── __init__.py              # Экспорт всех публичных компонентов
├── auth.py                  # JWT аутентификация (Beyond Violet)
├── schemas/
│   ├── __init__.py
│   └── response.py          # StatusSchema, ApiResponse, ok(), error()
├── exceptions.py            # ApiException и наследники
└── handlers.py              # register_exception_handlers()
```

## Содержимое модуля

### schemas/response.py

Модели ответов API:

| Компонент | Описание |
|-----------|----------|
| `ErrorCode` | Константы кодов ошибок (`SUCCESS`, `NOT_FOUND`, `CONFLICT`, ...) |
| `StatusSchema` | Схема статуса: `{"code": "", "message": "..."}` |
| `ApiResponse[T]` | Generic обёртка ответа: `{"status": {...}, "data": {...}}` |
| `ok(data)` | Хелпер для создания успешного ответа |
| `error(code, message)` | Хелпер для создания ответа с ошибкой |

### exceptions.py

Иерархия исключений:

| Класс | Код ошибки | Описание |
|-------|------------|----------|
| `ApiException` | (базовый) | Базовый класс для всех API исключений |
| `NotFoundException` | `NOT_FOUND` | Ресурс не найден |
| `ConflictException` | `CONFLICT` | Конфликт состояния |
| `ForbiddenException` | `FORBIDDEN` | Доступ запрещён |
| `UnauthorizedException` | `UNAUTHORIZED` | Не авторизован |
| `ValidationException` | `VALIDATION_ERROR` | Ошибка валидации |
| `InternalErrorException` | `INTERNAL_ERROR` | Внутренняя ошибка |
| `ServiceUnavailableException` | `SERVICE_UNAVAILABLE` | Внешний сервис недоступен |

### auth.py

JWT аутентификация на основе токенов Beyond Violet (RS256):

| Компонент | Описание |
|-----------|----------|
| `TokenValidationError` | Исключение при ошибке валидации токена (`code`, `message`) |
| `CurrentUser` | Объект пользователя из JWT (`user_id`, `token_exp`) |
| `validate_jwt_token(token)` | Декодирует и проверяет RS256 JWT токен |
| `get_current_user(credentials)` | FastAPI dependency для защищённых эндпоинтов |

**Загрузка публичного ключа:**
- Переменная окружения `BV_PUBLIC_KEY` — прямое значение ключа (обязательно)

**Конфигурация через env:**
- `JWT_CLOCK_SKEW` — допустимая рассинхронизация часов в секундах (по умолчанию 60)

### handlers.py

Exception handlers для FastAPI:

| Handler | Обрабатывает |
|---------|--------------|
| `api_exception_handler` | `ApiException` и наследники |
| `validation_exception_handler` | `RequestValidationError` (FastAPI) |
| `pydantic_validation_handler` | `ValidationError` (Pydantic) |
| `generic_exception_handler` | Все остальные `Exception` |
| `register_exception_handlers(app)` | Регистрирует все handlers в приложении |

## Подключение к сервисам

### Способ: копирование при сборке Docker образа

Shared модуль **копируется** в каждый сервис во время сборки Docker образа.
Это обеспечивает:
- Изоляцию сервисов (каждый контейнер автономен)
- Отсутствие зависимости от volume mounts
- Версионирование кода вместе с сервисом

### Структура Dockerfile

```dockerfile
# Пример: svc_tasks/Dockerfile

FROM python:3.12-slim

WORKDIR /app

# Установка зависимостей
COPY svc_tasks/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Копирование shared модуля
COPY shared/ /app/shared/

# Копирование кода сервиса
COPY svc_tasks/app /app/app

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Структура docker-compose.yml

```yaml
services:
  app:
    build:
      context: .           # Контекст сборки = backend/
      dockerfile: svc_tasks/Dockerfile
    # ...

  app_users:
    build:
      context: .           # Контекст сборки = backend/
      dockerfile: svc_users/Dockerfile
    # ...
```

**Важно:** `context: .` указывает на директорию `backend/`, что позволяет Dockerfile копировать как `shared/`, так и код сервиса.

### Импорт в коде сервиса

**main.py:**
```python
import sys
from pathlib import Path

# Добавление пути для импорта shared модуля
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))

from shared import register_exception_handlers

app = FastAPI(...)
register_exception_handlers(app)
```

**api/endpoints.py:**
```python
from shared import (
    ApiResponse,
    ok,
    NotFoundException,
    ConflictException,
    ForbiddenException,
    get_current_user,
    CurrentUser,
)

@router.get("/{id}")
def get_item(
    id: UUID,
    current_user: CurrentUser = Depends(get_current_user)
) -> ApiResponse[ItemResponse]:
    item = repo.get_by_id(id)
    if not item:
        raise NotFoundException(f"Элемент {id} не найден")
    return ok(ItemResponse.model_validate(item))
```

## Добавление нового сервиса

При создании нового микросервиса:

1. **Создать Dockerfile** с копированием shared:
   ```dockerfile
   COPY shared/ /app/shared/
   COPY svc_new/app /app/app
   ```

2. **Настроить docker-compose.yml**:
   ```yaml
   app_new:
     build:
       context: .
       dockerfile: svc_new/Dockerfile
   ```

3. **Подключить в main.py**:
   ```python
   from shared import register_exception_handlers
   register_exception_handlers(app)
   ```

4. **Использовать в endpoints**:
   ```python
   from shared import ApiResponse, ok, NotFoundException
   ```

## Локальная разработка

При локальном запуске (без Docker) путь к shared модулю добавляется через `sys.path`:

```python
# В начале main.py
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))
```

Это позволяет запускать сервис как напрямую (`python -m app.main`), так и через Docker.

## Связанная документация

- [Формат ответов API](../patterns/api_response_format.md) — детальное описание формата с примерами
- [svc_tasks](svc_tasks.md) — сервис задач
- [svc_users](svc_users.md) — сервис пользователей
- [svc_shifts](svc_shifts.md) — сервис смен
