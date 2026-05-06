# План: Стандартизация формата ответов WFM API

**Статус:** Выполнено ✅
**Создан:** 2026-02-04
**Завершён:** 2026-02-04
**Ветка:** feature/api-response-format

## Цель

Стандартизировать формат ответов всех API endpoints по аналогии с Beyond Violet API.

## Целевой формат ответов

### Успешный ответ (единичный объект)
```json
{
  "status": {"code": ""},
  "data": {
    "id": "uuid",
    "title": "Название задачи",
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
      {"id": "uuid1", ...},
      {"id": "uuid2", ...}
    ]
  }
}
```

### Ответ с ошибкой
```json
{
  "status": {
    "code": "NOT_FOUND",
    "message": "Задача не найдена"
  }
}
```

## Задачи

### Фаза 1: Создание базовой инфраструктуры

- [x] 1.1. Создать shared модуль `backend/shared/`
- [x] 1.2. Создать response модели (StatusSchema, ApiResponse)
- [x] 1.3. Определить коды ошибок (ErrorCode)
- [x] 1.4. Создать helper-функции (ok, error)
- [x] 1.5. Создать custom exception классы
- [x] 1.6. Создать глобальный exception handler

### Фаза 2: Интеграция в svc_tasks

- [x] 2.1. Обновить Dockerfile для копирования shared
- [x] 2.2. Подключить exception handler в main.py
- [x] 2.3. Обновить все 8 endpoints
- [x] 2.4. Обновить auth.py

### Фаза 3: Интеграция в svc_users

- [x] 3.1. Обновить Dockerfile для копирования shared
- [x] 3.2. Подключить exception handler в main.py
- [x] 3.3. Обновить все 4 endpoints
- [x] 3.4. Обновить auth.py
- [x] 3.5. Обновить sso_service.py

### Фаза 4: Документация и тестирование

- [x] 4.1. Проверить синтаксис Python файлов
- [x] 4.2. Проверить OpenAPI схемы
- [x] 4.3. Протестировать формат ответов
- [x] 4.4. Обновить api_tasks.md
- [x] 4.5. Обновить api_roles.md
- [x] 4.6. Создать api_response_format.md

## Изменённые файлы

### Новые файлы
- `backend/shared/__init__.py`
- `backend/shared/schemas/__init__.py`
- `backend/shared/schemas/response.py`
- `backend/shared/exceptions.py`
- `backend/shared/handlers.py`
- `.memory_bank/backend/api_response_format.md`

### Обновлённые файлы
- `backend/docker-compose.yml` — context для сборки
- `backend/svc_tasks/Dockerfile` — копирование shared
- `backend/svc_tasks/app/main.py` — exception handler
- `backend/svc_tasks/app/api/tasks.py` — все endpoints
- `backend/svc_tasks/app/domain/schemas.py` — TaskListData
- `backend/svc_tasks/app/core/auth.py` — UnauthorizedException
- `backend/svc_users/Dockerfile` — копирование shared
- `backend/svc_users/app/main.py` — exception handler
- `backend/svc_users/app/api/users.py` — все endpoints
- `backend/svc_users/app/core/auth.py` — UnauthorizedException
- `backend/svc_users/app/services/sso_service.py` — ServiceUnavailableException
- `.memory_bank/backend/api_tasks.md` — формат ответов
- `.memory_bank/backend/api_roles.md` — формат ответов

## Результат тестирования

```bash
$ curl -s http://localhost:8000/tasks/
{"status":{"code":"UNAUTHORIZED","message":"Требуется токен авторизации"}}

$ curl -s http://localhost:8001/users/me
{"status":{"code":"UNAUTHORIZED","message":"Требуется токен авторизации"}}
```

Формат ответов соответствует Beyond Violet API.

## Лог выполнения

### 2026-02-04
- Создан план стандартизации API
- Изучен формат Beyond Violet API (api_bv.md)
- Создан shared модуль с моделями и exceptions
- Обновлены Dockerfile для копирования shared при сборке
- Обновлены все endpoints svc_tasks (8 шт.)
- Обновлены все endpoints svc_users (4 шт.)
- Обновлены auth.py в обоих сервисах
- Протестированы сервисы через docker-compose
- Обновлена документация Memory Bank
- План выполнен полностью ✅
