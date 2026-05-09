# Backend Service: Monitoring

Сервис мониторинга хоста и Docker. Владеет in-memory snapshot'ом инфраструктуры, отдаёт его HTTP-эндпоинтом, держит WebSocket-канал к ESP32-устройству, принимает 5xx ошибки от других backend-сервисов.

**Связанные документы:**
- `.memory_bank/backend/apis/api_monitoring.md` — контракты эндпоинтов
- `.memory_bank/analytics/server_events.md` — реестр событий, отправляемых параллельно в Semetrics (исторический ряд)
- `.memory_bank/device/README.md` — устройство-клиент (концепция, сценарии использования, принципы)
- `.memory_bank/device/ws_protocol.md` — формат WS-сообщений `state`/`alert` (источник правды контракта)
- `.memory_bank/backend/patterns/inter_service_communication.md` — паттерн межсервисных вызовов

---

## Назначение

Один контейнер на сервер (dev и prod), который одновременно:

1. **Снимает метрики хоста** (CPU/RAM/swap/disk через psutil) каждые `METRICS_INTERVAL` сек.
2. **Слушает Docker events** через unix-сокет: `start`, `stop`, `die`, `restart`, `health_status`.
3. **Держит in-memory snapshot** инфраструктуры — обновляется циклами выше.
4. **Шлёт всё это в Semetrics** через `semetrics-sdk` (исторический ряд, как было). Контракт `server_metrics` и `docker_container_event` не меняется.
5. **Отдаёт snapshot** через `GET /api/state` физическому устройству.
6. **Пушит обновления** через `WSS /api/events/ws`: `state` каждые 30 сек + `alert` мгновенно при срабатывании детектора.
7. **Принимает 5xx ошибки** от svc_tasks/svc_users/svc_notifications через `POST /internal/errors` — для счётчика `errors_1h` и алерт-спайков.

Заменяет более ранний `svc_watch` из репозитория Semetrics: устройство теперь ходит напрямую к источнику данных, без круговой полировки через Postgres/svc_events.

## Стек

- Python 3.12, FastAPI + uvicorn (главный процесс)
- `psutil` — метрики хоста
- `httpx` — стрим Docker events через unix-сокет, межсервисные вызовы
- `semetrics-sdk` — отправка событий в Semetrics
- `pydantic` / `pydantic-settings`

**Порт:** 8004 снаружи / 8000 внутри Docker.

## Структура проекта

```
backend/svc_monitoring/
├── app/                          # серверная часть (FastAPI)
│   ├── main.py                   # FastAPI app + lifespan (запуск/остановка фоновых циклов)
│   ├── api/
│   │   ├── health.py             # GET /health
│   │   ├── state.py              # GET /api/state (требует DEVICE_TOKEN)
│   │   ├── ws.py                 # WSS /api/events/ws
│   │   └── internal.py           # POST /internal/errors
│   ├── core/
│   │   ├── config.py             # Settings (env)
│   │   └── auth.py               # верификация DEVICE_TOKEN (query/Bearer)
│   ├── domain/
│   │   └── schemas.py            # Pydantic-схемы + CRITICAL_CONTAINERS
│   └── services/
│       ├── state_store.py        # in-memory snapshot (метрики + контейнеры + лог событий)
│       ├── errors_buffer.py      # ring buffer 5xx ошибок + дедуп
│       ├── alert_detector.py     # порождение alert-сообщений
│       ├── connection_manager.py # WS broadcast hub
│       ├── collector.py          # psutil → props
│       ├── metrics_loop.py       # цикл: collector → state_store → semetrics.track
│       └── docker_events.py      # стрим docker.sock + warmup из /containers/json
├── firmware/                     # прошивка ESP32-устройства (PlatformIO + Arduino)
│   ├── platformio.ini            # board=esp32-s3-devkitc-1, qio_opi, huge_app.csv
│   ├── src/{main,display,state}.{cpp,h}
│   └── include/secrets.h.example # пример конфига; secrets.h в .gitignore
├── .dockerignore                 # исключает firmware/ из Docker-образа сервиса
├── Dockerfile
└── requirements.txt
```

**Прошивка устройства** живёт в `firmware/` рядом с серверной частью — устройство является клиентом сервиса. PlatformIO запускается из `backend/svc_monitoring/firmware/`. Документация устройства, протокол и handoff-дизайн — в `.memory_bank/device/`.

## Доступ к хосту

| Маунт / опция | Зачем |
|---|---|
| `pid: "host"` | psutil видит процессы и нагрузку хоста, а не контейнера |
| `/:/hostfs:ro` | `disk_usage` корня хоста (через `HOST_DISK_PATH=/hostfs`) |
| `/var/run/docker.sock:/var/run/docker.sock:ro` | стрим Docker events + warmup из `/containers/json` |

## Конфигурация

| ENV | Default | Назначение |
|---|---|---|
| `SEMETRICS_API_KEY` | `""` | Если пусто — отправка в Semetrics отключена; остальная функциональность работает |
| `SEMETRICS_ENDPOINT` | `https://semetrics.ru/events` | Endpoint Semetrics |
| `SERVER_NAME` | `server` | Помечает события и snapshot (`prod` / `dev`) |
| `METRICS_INTERVAL` | `60` | Интервал снятия метрик, сек |
| `HOST_DISK_PATH` | `/hostfs` | Путь, по которому снимается `disk_usage` |
| `DEVICE_TOKEN` | `""` | Токен авторизации устройства (`?token=`/Bearer). Пустой ⇒ доступ всем отказан |
| `WS_BROADCAST_INTERVAL` | `30` | Как часто рассылать `state` всем подключённым устройствам |
| `WS_PING_TIMEOUT` | `30` | Если от устройства нет сообщений > этого периода — закрываем WS |
| `ALERT_POLL_INTERVAL` | `5` | Как часто прогонять детектор алертов |
| `ERROR_SPIKE_COUNT` | `5` | Порог: ошибок за окно для срабатывания алерта `api_errors` |
| `ERROR_SPIKE_WINDOW_SEC` | `300` | Окно для подсчёта спайка ошибок (5 минут) |
| `ERROR_ALERT_COOLDOWN_SEC` | `300` | Между двумя алертами `api_errors` должно пройти столько секунд |
| `ERRORS_BUFFER_MAXLEN` | `10000` | Размер кольцевого буфера ошибок |

## In-memory state

- `state_store.metrics` — последний `props` от `collector` (cpu/mem/swap/disk и т.д.)
- `state_store.containers: dict[name, ContainerStatus]` — порядок задаётся `CRITICAL_CONTAINERS` из `domain/schemas.py`. Сейчас: `postgres`, `svc_tasks`, `svc_users`, `svc_notifications`. Для добавления контейнера достаточно дополнить кортеж — устройство сохранит порядок прихода.
- `state_store.events_log` — deque на 100 последних контейнерных событий, читается `AlertDetector` через монотонно растущий `seq`
- `errors_buffer` — deque на `ERRORS_BUFFER_MAXLEN` записей `(server_ts, ErrorReport)`; идемпотентность по `(request_id, server_ts)`, TTL дедупа 5 мин

**Прогрев на старте:** `docker_events.warmup_from_docker` делает один `GET /containers/json` к docker.sock и заполняет `containers` из текущего состояния. Это закрывает дыру «после рестарта svc_monitoring всё `unknown` пока что-то не произойдёт».

## Сохраняемое поведение для Semetrics

- `server_metrics` — `metrics_loop` шлёт каждый интервал, **до** обновления `state_store`. Контракт не меняется.
- `docker_container_event` — `docker_events.stream` шлёт мгновенно (`flush()` после `track()`). Контракт не меняется.
- При падении `state_store.set_*` — Semetrics-канал продолжает работать (try/except внутри циклов).

## Контракты эндпоинтов

См. `.memory_bank/backend/apis/api_monitoring.md`.

| Метод | Путь | Auth | Назначение |
|---|---|---|---|
| `GET` | `/health` | — | Healthcheck |
| `GET` | `/api/state` | `?token=` или `Authorization: Bearer` | Snapshot для устройства |
| `WSS` | `/api/events/ws` | `?token=` | Push-канал устройства (`state` + `alert`) |
| `POST` | `/internal/errors` | nginx `deny all` + Docker network | Приём 5xx ошибок (паттерн `inter_service_communication.md`) |

## URL доступа

- DEV: `https://dev.wfm.beyondviolet.com/monitoring/`, WS `wss://dev.wfm.beyondviolet.com/monitoring/api/events/ws`
- PROD: `https://wfm.beyondviolet.com/monitoring/`, WS `wss://wfm.beyondviolet.com/monitoring/api/events/ws`
- Local: `http://localhost:8004/`, WS `ws://localhost:8004/api/events/ws`

## Межсервисное взаимодействие

- **Входящие:** svc_tasks/svc_users/svc_notifications → `POST /internal/errors`
  - Реализовано в `shared/monitoring_client.py` (singleton, fire-and-forget, таймаут 1 сек)
  - Параллельный канал в Semetrics (`analytics.track("api_error", ...)`) сохраняется
- **Исходящие:** svc_monitoring → Semetrics (`server_metrics`, `docker_container_event`) — как было
