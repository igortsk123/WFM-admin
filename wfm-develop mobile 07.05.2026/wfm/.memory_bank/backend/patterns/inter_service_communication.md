# Межсервисное взаимодействие (Inter-Service Communication)

## Паттерн

Прямой HTTP-вызов между сервисами через внутреннюю Docker-сеть.

Сервис-инициатор (caller) делает HTTP-запрос к целевому сервису (callee) по его имени в Docker Compose (например, `http://svc_shifts:8000`). Запрос проходит только внутри Docker-сети и не выходит наружу.

## Почему HTTP

- **httpx уже в зависимостях** — не нужно добавлять новые библиотеки
- **Нет новой инфраструктуры** — не требуется брокер сообщений (RabbitMQ, Kafka) или общая база данных
- **Простота** — синхронный request-response паттерн, понятный и легко отлаживаемый
- **Соответствует MVP** — минимальная сложность, масштабирование при необходимости

## Конвенции

### Внутренние эндпоинты

- Все внутренние эндпоинты используют префикс `/internal/`
- Регистрируются через отдельный роутер: `APIRouter(prefix="/internal", tags=["internal"])`
- Файл: `app/api/internal.py` в целевом сервисе

### Без JWT авторизации

Внутренние эндпоинты **не требуют JWT-токена**. Безопасность обеспечивается тем, что они доступны только из Docker-сети и не проксируются через nginx.

### Не проксируются через nginx

Конфигурация nginx (`backend/nginx/services/`) **не содержит** проксирования для `/internal/` путей. Эти эндпоинты недоступны извне.

### Стандартный формат ответа

Внутренние эндпоинты используют тот же формат `ApiResponse` (см. `api_response_format.md`):

```json
{
  "status": {"code": ""},
  "data": { ... }
}
```

Ошибки возвращаются стандартными исключениями (`NotFoundException`, `ConflictException` и т.д.).

### Таймаут

- По умолчанию: **5 секунд**
- Настраивается через переменную окружения (например, `USERS_SERVICE_TIMEOUT`)

### Обработка ошибок

Клиент должен обрабатывать три типа ошибок:

| Ошибка | Описание | Обработка |
|--------|----------|-----------|
| `httpx.TimeoutException` | Целевой сервис не ответил за таймаут | Логирование + проброс наверх |
| `httpx.ConnectError` | Целевой сервис недоступен | Логирование + проброс наверх |
| `NOT_FOUND` в ответе | Ресурс не найден (например, нет открытой смены) | Возврат `None` |

На уровне API-эндпоинта вызывающего сервиса ошибки `httpx` перехватываются и преобразуются в `ServiceUnavailableException`:

```python
try:
    shift_info = await shifts_client.get_current_shift(assignment_id)
except Exception as e:
    logger.error(f"Ошибка при запросе смены из svc_shifts: {e}")
    raise ServiceUnavailableException("Сервис смен временно недоступен")
```

## Конфигурация

Переменные окружения добавляются в `app/core/config.py` вызывающего сервиса:

```python
class Settings(BaseSettings):
    # Inter-service communication
    USERS_SERVICE_URL: str = "http://svc_users:8000"
    USERS_SERVICE_TIMEOUT: int = 5
```

Шаблон именования:
- `{SERVICE_NAME}_SERVICE_URL` — базовый URL целевого сервиса
- `{SERVICE_NAME}_SERVICE_TIMEOUT` — таймаут в секундах

Значения по умолчанию указывают на имя Docker-сервиса и стандартный порт `8000`.

## Docker Compose

В `docker-compose.yml` вызывающий сервис должен:

1. **Передать переменные окружения** с URL и таймаутом
2. **Указать зависимость** через `depends_on` с `condition: service_started`

```yaml
svc_tasks:
  image: registry.beyondviolet.com/wfm/svc_tasks:latest
  environment:
    USERS_SERVICE_URL: ${USERS_SERVICE_URL:-http://svc_users:8000}
    USERS_SERVICE_TIMEOUT: ${USERS_SERVICE_TIMEOUT:-5}
  depends_on:
    postgres:
      condition: service_healthy
    svc_users:
      condition: service_started
```

## Примеры межсервисных вызовов

> **Примечание:** `svc_shifts` объединён с `svc_tasks` (2026-03-12). Межсервисные HTTP-вызовы к svc_shifts устранены — данные смен запрашиваются напрямую через `ShiftRepository` (локальная БД wfm_tasks).

Актуальные межсервисные HTTP-вызовы:
- **svc_tasks → svc_users** — получение int user_id, данных магазина, external_id сотрудника
- **svc_tasks → svc_notifications** — отправка уведомлений при изменении состояний задач
- **svc_notifications → svc_users** — резолвинг integer user_id из sso_id для WebSocket-авторизации
- **svc_tasks/svc_users/svc_notifications → svc_monitoring** — fire-and-forget отчёт о 5xx через `shared.monitoring_client.MonitoringClient.report_error(...)`. Контракт: `POST /internal/errors`, см. `.memory_bank/backend/apis/api_monitoring.md`. Reuse через `shared/`: каждый сервис в lifespan вызывает `init_monitoring_client(...)` и в middleware — `get_monitoring_client().report_error(...)`. Параллельно тот же факт ошибки уходит в Semetrics через `analytics.track("api_error", ...)`

## Добавление нового межсервисного вызова

Пошаговое руководство для создания нового межсервисного вызова из сервиса A в сервис B.

### Шаг 1. Создать внутренний эндпоинт в сервисе B

1. Если файла `app/api/internal.py` ещё нет — создать:
   ```python
   from fastapi import APIRouter
   router = APIRouter(prefix="/internal", tags=["internal"])
   ```

2. Добавить эндпоинт с нужной логикой. **Без JWT авторизации** — не использовать `Depends(get_current_user)`.

3. Подключить роутер в `main.py`:
   ```python
   from app.api import internal
   app.include_router(internal.router)
   ```

### Шаг 2. Создать HTTP-клиент в сервисе A

1. Создать файл `app/services/{service_b}_client.py`

2. Определить dataclass для ответа (только нужные поля):
   ```python
   @dataclass
   class SomeResponseInfo:
       id: int
       field: str
   ```

3. Создать класс клиента по шаблону `ShiftsServiceClient`:
   - В `__init__` — читать URL и таймаут из `settings`
   - Метод — async, использует `httpx.AsyncClient`
   - Обработка ошибок: `TimeoutException`, `ConnectError`, `NOT_FOUND`

4. Добавить функцию-dependency:
   ```python
   def get_service_b_client() -> ServiceBClient:
       return ServiceBClient()
   ```

### Шаг 3. Добавить конфигурацию в сервис A

В `app/core/config.py`:

```python
class Settings(BaseSettings):
    # Inter-service communication
    SERVICE_B_SERVICE_URL: str = "http://svc_service_b:8000"
    SERVICE_B_SERVICE_TIMEOUT: int = 5
```

### Шаг 4. Обновить Docker Compose

В `docker-compose.yml` для сервиса A:

```yaml
svc_service_a:
  environment:
    SERVICE_B_SERVICE_URL: ${SERVICE_B_SERVICE_URL:-http://svc_service_b:8000}
    SERVICE_B_SERVICE_TIMEOUT: ${SERVICE_B_SERVICE_TIMEOUT:-5}
  depends_on:
    svc_service_b:
      condition: service_started
```

### Шаг 5. Использовать клиент в эндпоинте

```python
from app.services.service_b_client import ServiceBClient, get_service_b_client

@router.get("/some-endpoint")
async def some_endpoint(
    service_b: ServiceBClient = Depends(get_service_b_client),
):
    try:
        result = await service_b.some_method(param)
    except Exception as e:
        logger.error(f"Ошибка при запросе к svc_service_b: {e}")
        raise ServiceUnavailableException("Сервис B временно недоступен")
```

### Шаг 6. Проверить

- [ ] Эндпоинт в сервисе B доступен по `http://svc_service_b:8000/internal/...`
- [ ] Эндпоинт **не** требует JWT
- [ ] Эндпоинт **не** проксируется через nginx
- [ ] Клиент корректно парсит `ApiResponse` формат
- [ ] Обработаны ошибки: таймаут, недоступность, NOT_FOUND
- [ ] Переменные окружения добавлены в `config.py` и `docker-compose.yml`
- [ ] `depends_on` добавлен в Docker Compose

---

## Пример: svc_tasks → svc_users

**svc_tasks** обращается к **svc_users** в нескольких случаях:

1. **int user_id** — получить внутренний int ID по JWT `external_id`
2. **Данные магазина** — получить `store` по `assignment_id` для обогащения ответа (смены, задачи)
3. **external_id сотрудника** — получить `employee_in_shop_id` для LAMA sync

### Структура файлов

**Вызывающий сервис (svc_tasks):**
```
svc_tasks/app/
├── core/
│   └── config.py                # USERS_SERVICE_URL, USERS_SERVICE_TIMEOUT
└── services/
    └── users_client.py          # UsersServiceClient
```

**Целевой сервис (svc_users):**
```
svc_users/app/
└── api/
    └── internal.py              # GET /internal/user-id
                                 # GET /internal/assignment-store
                                 # GET /internal/assignment-external-id
                                 # GET /internal/store-assignments
```

### Клиент (svc_tasks)

Файл: `svc_tasks/app/services/users_client.py`

```python
class UsersServiceClient:
    async def get_int_user_id(self, external_id: str) -> Optional[int]:
        """Получить внутренний int ID пользователя по external_id из JWT."""

    async def get_assignment_store(self, assignment_id: int) -> Optional[StoreInfo]:
        """Получить данные магазина по assignment_id. Возвращает StoreInfo или None."""

    async def get_store_assignments(self, assignment_id: int) -> list[AssignmentInfo]:
        """Получить все назначения магазина по assignment_id сотрудника."""

    async def get_assignment_external_id(self, assignment_id: int) -> Optional[int]:
        """Получить external_id (employee_in_shop_id) по assignment_id для LAMA sync."""
```

Graceful degradation — при ошибках возвращают `None` / пустой список. Если `external_id` недоступен, LAMA sync пропускается с warning.

### Внутренние эндпоинты (svc_users)

```python
@router.get("/user-id")
def get_user_id(external_id: str = Query(...), db: Session = Depends(get_db)):
    # Возвращает {"external_id": "...", "user_id": 42}

@router.get("/assignment-store")
def get_assignment_store(assignment_id: int = Query(...), db: Session = Depends(get_db)):
    # Возвращает StoreResponse для магазина, привязанного к assignment

@router.get("/assignment-external-id")
def get_assignment_external_id(assignment_id: int = Query(...), db: Session = Depends(get_db)):
    # Возвращает {"assignment_id": X, "external_id": Y}

@router.get("/store-assignments")
def get_store_assignments(assignment_id: int = Query(...), db: Session = Depends(get_db)):
    # Возвращает список назначений магазина
```
