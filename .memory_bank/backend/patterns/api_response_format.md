# Стандартный формат ответов WFM API

Все API endpoints WFM используют единый формат ответов, совместимый с Beyond Violet API.

## Принципы

1. **HTTP статус всегда 200** — логика успеха/ошибки определяется по `status.code`
2. **`data` всегда объект** — для списков используется именованный массив внутри
3. **Единая структура ошибок** — код + сообщение в объекте `status`

## Формат ответов

### Успешный ответ (единичный объект)

```json
{
  "status": {"code": ""},
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Выкладка товара",
    "state": "NEW",
    ...
  }
}
```

### Успешный ответ (список)

```json
{
  "status": {"code": ""},
  "data": {
    "tasks": [
      {"id": "...", "title": "Задача 1", ...},
      {"id": "...", "title": "Задача 2", ...}
    ]
  }
}
```

**Примечание:** `data` всегда объект. Списки возвращаются как именованные массивы:
- `tasks` — для списка задач
- `users` — для списка пользователей
- `permissions` — для списка привилегий

Это позволяет в будущем добавить pagination:
```json
{
  "status": {"code": ""},
  "data": {
    "tasks": [...],
    "total": 100,
    "page": 1,
    "limit": 20
  }
}
```

### Ответ с ошибкой

```json
{
  "status": {
    "code": "NOT_FOUND",
    "message": "Задача 550e8400-e29b-41d4-a716-446655440000 не найдена"
  }
}
```

## Коды ошибок

| Код | Описание | Аналог HTTP |
|-----|----------|-------------|
| `""` (пустая строка) | Успех | 200 |
| `NOT_FOUND` | Ресурс не найден | 404 |
| `CONFLICT` | Конфликт состояния | 409 |
| `FORBIDDEN` | Доступ запрещён | 403 |
| `UNAUTHORIZED` | Не авторизован | 401 |
| `VALIDATION_ERROR` | Ошибка валидации | 422 |
| `INTERNAL_ERROR` | Внутренняя ошибка | 500 |
| `SERVICE_UNAVAILABLE` | Внешний сервис недоступен | 503 |

## Реализация

### Shared модуль

Расположение: `backend/shared/`

```
backend/shared/
├── __init__.py
├── schemas/
│   ├── __init__.py
│   └── response.py      # StatusSchema, ApiResponse, ok(), error()
├── exceptions.py        # ApiException и наследники
└── handlers.py          # register_exception_handlers()
```

### Использование в сервисах

**Подключение в main.py:**
```python
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))

from shared import register_exception_handlers

app = FastAPI(...)
register_exception_handlers(app)
```

**Использование в endpoints:**
```python
from shared import ApiResponse, ok, NotFoundException, ConflictException

@router.get("/{task_id}")
def get_task(task_id: UUID, ...) -> ApiResponse[TaskResponse]:
    task = repo.get_by_id(task_id)
    if not task:
        raise NotFoundException(f"Задача {task_id} не найдена")
    return ok(TaskResponse.model_validate(task))
```

**Списки с именованным массивом:**
```python
class TaskListData(BaseModel):
    tasks: List[TaskResponse]

@router.get("/")
def get_tasks(...) -> ApiResponse[TaskListData]:
    tasks = repo.get_all()
    return ok(TaskListData(tasks=[TaskResponse.model_validate(t) for t in tasks]))
```

### Exception классы

| Класс | Код | Использование |
|-------|-----|---------------|
| `NotFoundException` | `NOT_FOUND` | Ресурс не найден |
| `ConflictException` | `CONFLICT` | Недопустимый переход состояния, активная задача |
| `ForbiddenException` | `FORBIDDEN` | Нет прав (не MANAGER, другой магазин) |
| `UnauthorizedException` | `UNAUTHORIZED` | Отсутствует токен |
| `ValidationException` | `VALIDATION_ERROR` | Ошибка валидации данных |
| `InternalErrorException` | `INTERNAL_ERROR` | Непредвиденная ошибка |
| `ServiceUnavailableException` | `SERVICE_UNAVAILABLE` | Внешний сервис (SSO) недоступен |

## Примеры ответов

### GET /tasks/ — список задач
```json
{
  "status": {"code": ""},
  "data": {
    "tasks": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "title": "Выкладка товара",
        "description": "Разложить молочную продукцию",
        "planned_minutes": 30,
        "state": "NEW",
        "created_at": "2026-02-04T10:00:00Z",
        "updated_at": "2026-02-04T10:00:00Z"
      }
    ]
  }
}
```

### POST /tasks/{id}/start — ошибка конфликта
```json
{
  "status": {
    "code": "CONFLICT",
    "message": "У сотрудника уже есть активная задача: 123e4567-e89b-12d3-a456-426614174000"
  }
}
```

### GET /users/me — данные пользователя
```json
{
  "status": {"code": ""},
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "first_name": "Павел",
    "last_name": "Иванов",
    "role": {"id": 1, "code": "WORKER", "name": "Работник"},
    "permissions": [
      {"id": "...", "permission": "CASHIER", "granted_at": "..."}
    ],
    ...
  }
}
```

### GET /users/{id} — доступ запрещён
```json
{
  "status": {
    "code": "FORBIDDEN",
    "message": "Доступ запрещён: требуется роль MANAGER"
  }
}
```
