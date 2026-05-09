# API: Monitoring

API сервиса `svc_monitoring`. Описание сервиса: `.memory_bank/backend/services/svc_monitoring.md`.

**Base URL:** `/monitoring/`

---

## GET /health

Без авторизации. Используется Docker healthcheck.

**Ответ:**
```json
{"status":"ok","service":"svc_monitoring","server":"prod"}
```

---

## GET /api/state

Snapshot инфраструктуры для устройства. Формат полностью совместим с WS-сообщением `state`.

**Авторизация:**
- query: `?token=DEVICE_TOKEN`, или
- header: `Authorization: Bearer DEVICE_TOKEN`

При несовпадении — `401 Unauthorized`.

**Ответ (200):**
```json
{
  "type": "state",
  "ts": 1714000000,
  "server": "prod",
  "cpu": 23.5,
  "mem": 37.8,
  "disk": 22.2,
  "containers": {
    "postgres": "healthy",
    "svc_tasks": "healthy",
    "svc_users": "healthy",
    "svc_notifications": "healthy"
  },
  "errors_1h": 3
}
```

**Поля:**
- `cpu` / `mem` / `disk` — текущие проценты загрузки хоста (`null` пока не пришёл первый цикл `metrics_loop`)
- `containers` — порядок ключей детерминированный: `CRITICAL_CONTAINERS` из `app/domain/schemas.py`
- `containers[name]` ∈ `healthy` / `starting` / `unhealthy` / `stopped` / `unknown`
- `errors_1h` — число ошибок в `errors_buffer` за последние 60 минут

---

## WSS /api/events/ws

Push-канал к устройству.

**Подключение:**
```
wss://wfm.beyondviolet.com/monitoring/api/events/ws?token=DEVICE_TOKEN
```

При неверном токене сервер закрывает соединение с кодом `4001`. После успешного `accept()` сервер немедленно отправляет текущее `state`.

### Сервер → клиент

**`state`** — каждые `WS_BROADCAST_INTERVAL=30` сек (если есть подключённые клиенты). Формат — как в `GET /api/state`.

**`alert`** — мгновенно по результату `AlertDetector` (опрос каждые `ALERT_POLL_INTERVAL=5` сек):

```json
{
  "type": "alert",
  "ts": 1714000000,
  "level": "critical",
  "kind": "container_down",
  "container": "svc_tasks",
  "message": "svc_tasks stop"
}
```

| Поле | Значения |
|---|---|
| `level` | `critical` / `warning` |
| `kind` | `container_down` (stop/die) / `container_unhealthy` (health_status: unhealthy) / `api_errors` (спайк 5xx) |
| `container` | имя контейнера (для container_*) |
| `count` | число ошибок за 5 мин (только для `api_errors`) |
| `message` | человекочитаемая строка ≤120 символов |

### Клиент → сервер

Сообщений не предусмотрено. Сервер закрывает соединение, если от клиента ничего не приходит дольше `WS_PING_TIMEOUT=30` сек — устройство переподключается.

---

## POST /internal/errors

Приём 5xx ошибок от других backend-сервисов WFM.

**Защита:** стандартный паттерн internal API WFM (`.memory_bank/backend/patterns/inter_service_communication.md`) — без дополнительной авторизации, доступ только из Docker-сети, nginx закрывает путь правилом `location /monitoring/internal/ { deny all; return 404; }`.

**Тело запроса:**
```json
{
  "service": "svc_tasks",
  "status_code": 500,
  "path": "/tasks/list",
  "method": "GET",
  "error_message": "ConnectionRefusedError: ...",
  "stack_trace": "Traceback (most recent call last)...",
  "request_id": "uuid-v4",
  "server_ts": "2026-04-28T12:34:56Z"
}
```

| Поле | Обязательное | Описание |
|---|---|---|
| `service` | ✅ | имя сервиса-источника |
| `status_code` | ✅ | HTTP статус |
| `path` | ✅ | путь запроса |
| `method` | ✅ | HTTP метод |
| `error_message` | — | текст исключения |
| `stack_trace` | — | стек-трейс |
| `request_id` | — | UUID запроса; используется для дедупа |
| `server_ts` | — | время на стороне источника; используется для дедупа |

**Идемпотентность:** если переданы и `request_id`, и `server_ts` — комбинация хранится 5 минут; повторный запрос с тем же ключом возвращает `{"status":"duplicate"}` и в буфер не добавляется.

**Ответ (200):**
```json
{"status": "accepted"}
```

или `{"status": "duplicate"}` при срабатывании дедупа.

---

## Использование на стороне backend-сервисов

WFM-сервисы пользуются `shared.monitoring_client` (singleton):

```python
from shared import init_monitoring_client, get_monitoring_client, shutdown_monitoring_client

# в lifespan:
init_monitoring_client(
    service_name="svc_tasks",
    base_url=settings.MONITORING_SERVICE_URL,
    timeout=settings.MONITORING_SERVICE_TIMEOUT,
)

# в middleware на 5xx:
if (mc := get_monitoring_client()) is not None:
    mc.report_error(
        status_code=response.status_code,
        path=request.url.path,
        method=request.method,
    )

# в lifespan на shutdown:
await shutdown_monitoring_client()
```

`report_error` — fire-and-forget: создаёт `asyncio.create_task`, никогда не блокирует и не кидает исключения наружу. На сетевых ошибках лог `warning` и продолжаем.

Параллельный канал `analytics.track("api_error", ...)` в Semetrics **сохраняется** — отчёт о тех же ошибках уходит и туда (исторический ряд), и в `svc_monitoring` (мгновенный канал для устройства).
