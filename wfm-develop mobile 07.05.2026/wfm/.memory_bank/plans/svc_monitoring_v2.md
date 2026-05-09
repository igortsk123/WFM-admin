# План: svc_monitoring v2 — превращение в полноценный сервис

**Статус:** В работе
**Создан:** 2026-04-28
**Последнее обновление:** 2026-04-28 (rev 2 — реализованы задачи 1–10, 13)

---

## Цель

Превратить `svc_monitoring` из background-worker'а с одной обязанностью «толкать события в Semetrics» в полноценный backend-сервис, который:

1. Сам владеет актуальным in-memory snapshot'ом инфраструктуры (метрики хоста + статусы контейнеров + кольцевой буфер ошибок).
2. Отдаёт snapshot и push-канал прямо физическому ESP32-устройству — без захода в Semetrics и без отдельного `svc_watch`.
3. Принимает ошибки от WFM-бэкенд-сервисов через `/internal/errors` и поднимает алерт-пороги.
4. **Сохраняет** существующие посылки в `semetrics-sdk` (`server_metrics`, `docker_container_event`) — это исторический ряд для долгосрочного анализа стабильности, его не ломаем.

После завершения этого плана сервис `svc_watch` в Semetrics перестаёт быть нужен и удаляется (отдельной задачей в Semetrics-репозитории).

**Связанные документы:**
- `.memory_bank/backend/services/svc_monitoring.md` — текущее описание сервиса (worker)
- `.memory_bank/analytics/server_events.md` — реестр событий, отправляемых в Semetrics (контракт)
- `.memory_bank/device/ws_protocol.md` — контракт state/alert для устройства (создаётся в Plan 2)
- `.memory_bank/plans/firmware_migration_from_semetrics.md` — Plan 2: физический перенос прошивки
- `.memory_bank/plans/docker_health_events.md` — пересекается, проверить что health_status работает после рефакторинга

---

## Контекст и принципы

**Что сейчас работает и НЕ ломаем:**
- `_metrics_loop` (psutil → server_metrics в Semetrics, раз в `METRICS_INTERVAL=60` сек)
- `docker_events.stream` (docker.sock → docker_container_event в Semetrics, мгновенно)
- Маунты `pid: "host"`, `/:/hostfs:ro`, `/var/run/docker.sock:/var/run/docker.sock:ro` — оставляем
- ENV `SEMETRICS_API_KEY`, `SEMETRICS_ENDPOINT`, `SERVER_NAME`, `METRICS_INTERVAL`, `HOST_DISK_PATH`

**Принципиальные решения, которые проверим в плане:**

| Решение | Выбор | Обоснование |
|---|---|---|
| Запуск процесса | uvicorn FastAPI как **главный** процесс; loops запускаются как `asyncio.create_task` в `lifespan` | Иначе придётся держать два процесса (worker + uvicorn) → лишний overhead и сложность сигналов |
| State storage | In-memory `dict` под `asyncio.Lock` | Snapshot эфемерный по природе — потеря при рестарте контейнера приемлема, оживёт за минуту |
| Errors storage | In-memory **ring buffer** (`collections.deque(maxlen=10_000)`) | Нам важен только последний час; долгая история уже есть в Semetrics |
| Идемпотентность `/internal/errors` | По `(request_id, server_ts)` если оба переданы; иначе — без дедупа | Ретраи случаются редко, лучше принять дубль чем терять события |
| Auth для устройства | `DEVICE_TOKEN` через query (`?token=...`) — как в svc_watch | Прошивка уже умеет так, не ломаем; параллельно поддержим `Authorization: Bearer` для curl-проверок |
| Auth для `/internal/errors` | nginx `deny all` + Docker network, без токена | Соответствует паттерну `inter_service_communication.md` — все internal-эндпоинты в WFM работают одинаково |
| Контракт state/alert | Берём 1:1 из `ws_protocol.md` (Semetrics) | Прошивка не должна меняться |
| Порт сервиса | `8004` снаружи / `8000` внутри Docker (как notifications) | Рядом с другими сервисами WFM |

---

## Задачи

### 1. Переоформление сервиса под FastAPI

- [x] Добавить зависимости в `requirements.txt`: `fastapi`, `uvicorn[standard]`, `websockets` (для WS-эндпоинта) — 2026-04-28
- [x] Перенести существующий код в новую структуру (2026-04-28):
  ```
  backend/svc_monitoring/app/
  ├── main.py                # FastAPI app + lifespan (старт/стоп background loops)
  ├── api/
  │   ├── state.py           # GET /api/state
  │   ├── ws.py              # WSS /api/events/ws + ConnectionManager
  │   ├── internal.py        # POST /internal/errors
  │   └── health.py          # GET /health
  ├── core/
  │   ├── config.py          # Settings (расширяем)
  │   └── auth.py            # верификация DEVICE_TOKEN (query/header)
  ├── services/
  │   ├── state_store.py     # in-memory snapshot (cpu/mem/disk/containers)
  │   ├── errors_buffer.py   # ring buffer + spike detection
  │   ├── alert_detector.py  # перенос логики из svc_watch
  │   ├── connection_manager.py  # WS broadcast
  │   ├── collector.py       # ← существующий (не трогаем)
  │   └── docker_events.py   # ← существующий, дополнить вызовом state_store.set_container_status
  ```
- [x] Не оставлять `app/main.py` со старой `asyncio.run(run())` структурой — точка входа теперь uvicorn — 2026-04-28
- [x] Изменить `Dockerfile` `CMD` на `["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]` — 2026-04-28
- [x] Добавить `HEALTHCHECK` в Dockerfile (по `/health` endpoint, как в svc_notifications) — 2026-04-28

### 2. In-memory state — расширение существующих циклов

Существующие `_metrics_loop` и `docker_events.stream` должны не только пушить в Semetrics, но и обновлять `state_store`. На каждом тике:

- [x] `state_store` хранит — 2026-04-28:
  - `cpu_percent`, `mem_percent`, `disk_percent` (и full props для GET /api/state)
  - `last_metrics_ts` (для определения stale: > 2 минут без обновления → клиенты помечают как stale)
  - `containers: dict[name, status]` где `status ∈ {healthy, starting, unhealthy, stopped, unknown}`
  - `server` (из settings)
- [x] В `_metrics_loop` (теперь `services/metrics_loop.py`) — 2026-04-28
- [x] В `docker_events.stream` — обновление state_store + сохранение Semetrics — 2026-04-28
- [x] При старте сервиса state_store инициализирует все контейнеры в `unknown` — 2026-04-28
- [x] Прогрев `warmup_from_docker` (`/containers/json` при подключении к docker.sock) — 2026-04-28

### 3. /api/state endpoint (snapshot)

- [x] `GET /api/state?token=DEVICE_TOKEN` — 2026-04-28
- [x] Auth: проверка через `core/auth.py` — query `token` или header `Authorization: Bearer <token>`. На несовпадении — `401 Unauthorized` — 2026-04-28
- [x] Ответ — формат **полностью совместим с `state` сообщением** из `ws_protocol.md` — 2026-04-28:
  ```json
  {"type":"state","ts":1714000000,"server":"prod","cpu":23.5,"mem":37.8,"disk":22.2,
   "containers":{"postgres":"healthy","svc_tasks":"healthy",...},"errors_1h":3}
  ```
- [x] `errors_1h` берётся из `errors_buffer.count_last_hour()` — 2026-04-28
- [x] Если данных нет (только что стартовали) — возвращать поля как `null`, не 500 — 2026-04-28

### 4. WSS /api/events/ws endpoint (push)

- [x] `ConnectionManager` — `services/connection_manager.py` (asyncio.Lock + broadcast) — 2026-04-28
- [x] При подключении: проверка `?token=DEVICE_TOKEN` → `close(4001)` при невалидном; иначе `accept()` + немедленно `state` — 2026-04-28
- [x] Background loop `_broadcast_state_loop` (`main.py`): каждые `WS_BROADCAST_INTERVAL=30` сек — 2026-04-28
- [x] Background loop `_alert_check_loop`: каждые `ALERT_POLL_INTERVAL=5` сек — 2026-04-28
- [x] WS keep-alive timeout `WS_PING_TIMEOUT=30` сек (если устройство молчит — закрываем, оно переподключится) — 2026-04-28
- [x] Lifespan: tasks через `asyncio.create_task`; при выключении — `stop_event.set()` + `gather` — 2026-04-28

### 5. /internal/errors endpoint и errors_buffer

**Цель:** WFM-сервисы шлют сюда каждый api_error синхронно (как сейчас в Semetrics), мы храним их 1 час, считаем спайки.

- [x] `POST /internal/errors` — без публичного auth, защищается через nginx (`location /monitoring/internal/ { deny all; return 404; }`) — 2026-04-28
- [x] ~~Опциональный `INTERNAL_TOKEN` ENV~~ — удалён 2026-04-28 как отступление от паттерна `inter_service_communication.md`
- [x] Контракт payload (Pydantic) — 2026-04-28:
  ```json
  {
    "service": "svc_tasks",                  // обязательно
    "status_code": 500,                      // обязательно
    "path": "/tasks/list",                   // обязательно
    "method": "GET",                         // обязательно
    "error_message": "ConnectionRefusedError: ...",  // опционально
    "stack_trace": "Traceback...",           // опционально
    "request_id": "uuid",                    // опционально, для дедупа
    "server_ts": "2026-04-28T12:34:56Z"      // опционально, иначе now()
  }
  ```
- [x] Идемпотентность по `(request_id, server_ts)` с TTL 5 мин — 2026-04-28
- [x] `errors_buffer = collections.deque(maxlen=ERRORS_BUFFER_MAXLEN)` — 2026-04-28
- [x] `count_within(window_sec)` + `count_last_hour` + `count_last_5min` — 2026-04-28
- [x] Эндпоинт возвращает `{"status": "accepted"}` или `{"status": "duplicate"}` — 2026-04-28
- [x] Параллельный канал в Semetrics сохранён, в middleware добавлен fire-and-forget вызов в svc_monitoring (задача 7) — 2026-04-28

### 6. AlertDetector — перенос из svc_watch

Перенести `backend/svc_watch/app/services/alert_detector.py` логически (не строкой), но без `EventsClient` — теперь источник: `state_store` и `errors_buffer`.

- [x] Контейнерные алерты через `state_store.events_log.since(last_seq)` — 2026-04-28
- [x] Спайк ошибок: порог `ERROR_SPIKE_COUNT`, окно `ERROR_SPIKE_WINDOW_SEC`, cooldown `ERROR_ALERT_COOLDOWN_SEC` — 2026-04-28
- [ ] **Не реализуем сейчас:** `kind: high_cpu`, `high_mem` — пороги CPU/mem >90%, добавим по необходимости
- [x] Все алерты идут через `ConnectionManager.broadcast` — 2026-04-28

### 7. Изменения в WFM-сервисах (svc_tasks, svc_users, svc_notifications)

- [x] Создан **общий** клиент в `backend/shared/monitoring_client.py` (singleton, fire-and-forget, таймаут 1 сек, экспортируется через `shared/__init__.py`) — 2026-04-28
- [x] В lifespan каждого сервиса: `init_monitoring_client(...)` + `shutdown_monitoring_client()` — 2026-04-28
- [x] В middleware `track_5xx_middleware` добавлен `mc.report_error(...)` параллельно с `analytics.track("api_error", ...)` — 2026-04-28
- [x] Конфиг: `MONITORING_SERVICE_URL`, `MONITORING_SERVICE_TIMEOUT` в трёх сервисах — 2026-04-28
- [x] `inter_service_communication.md` обновлён — 2026-04-28

### 8. Auth модуль для устройства

- [x] `core/auth.py`: `verify_device_token_value`, `require_device_token` (FastAPI dep) — 2026-04-28
- [x] HTTP — 401 при несовпадении, WS — `close(4001)` — 2026-04-28
- [x] Защита от misconfig: пустой `DEVICE_TOKEN` ⇒ доступ всем отказан — 2026-04-28

### 9. nginx — проксирование наружу

- [x] Создан `backend/nginx/services/monitoring.conf` (deny `/internal/`, WS upgrade, общий location) — 2026-04-28
- [x] WS таймауты `proxy_read_timeout 3600; proxy_send_timeout 3600` — 2026-04-28
- [x] URL зафиксированы в `.memory_bank/backend/services/svc_monitoring.md` и CLAUDE.md — 2026-04-28

### 10. docker-compose

- [x] `docker-compose.yml`: `ports: ["8004:8000"]`, ENV `DEVICE_TOKEN`, `healthcheck` через python urllib — 2026-04-28
- [ ] `docker-compose.dev.yml` / `docker-compose.prod.yml` — добавить `MONITORING_DEVICE_TOKEN` через `.env` сервера (применить на DEV/PROD при выкатке)
- [x] Watchtower label — сохранён (был ранее) — 2026-04-28

### 11. CI

- [ ] Добавить пайплайн сборки/публикации образа `registry.beyondviolet.com/wfm/svc_monitoring:dev` и `:latest` — по образцу остальных сервисов WFM (нужно посмотреть, как это сделано для svc_tasks/svc_users/svc_notifications, в репозитории `.github/workflows/` нет — значит CI организован вне репо, нужно уточнить у пользователя)
- [ ] **Открытый вопрос:** где живёт CI для WFM? Если в Gitea/GitLab вне репозитория — нужно отдельно доработать, отметить как блокер

### 12. Тестирование

**Unit:**
- [ ] `state_store`: set_metrics → snapshot отдаёт корректный dict; set_container_status меняет порядок только при insert, не при update
- [ ] `errors_buffer`: count_last_hour корректно отсекает старые; идемпотентность по (request_id, server_ts)
- [ ] `alert_detector`: спайк ошибок триггерится на 5+, cooldown работает
- [ ] `auth`: query token, header bearer, плохой/пустой → отказ

**Интеграция (локально):**
- [ ] Поднять svc_monitoring + один тестовый контейнер с HEALTHCHECK; убедиться, что после `docker stop` приходит `state.containers.X = "stopped"` и WS-клиент получает `alert`
- [ ] Запустить локальный WS-клиент (`websocat wss://localhost:8004/api/events/ws?token=...`), подождать 30 сек — должен прийти `state`
- [ ] Сделать 5 запросов с 500-кой подряд в svc_tasks → через 5 сек должен прийти `alert kind=api_errors`

**С реальной прошивкой:**
- [ ] После Plan 2: прошить устройство, прописать `WS_HOST=dev.wfm.beyondviolet.com`, `WS_PATH=/monitoring/api/events/ws`, проверить что dashboard оживает
- [ ] Перезапустить контейнер на сервере → устройство должно показать `alert` в течение ≤ 5 сек

### 13. Документация

- [x] Переписан `.memory_bank/backend/services/svc_monitoring.md` — 2026-04-28
- [x] Создан `.memory_bank/backend/apis/api_monitoring.md` — 2026-04-28
- [x] `.memory_bank/README.md` — добавлен `api_monitoring.md` — 2026-04-28
- [x] `CLAUDE.md` — Nginx URL, Monitoring API, межсервисное взаимодействие — 2026-04-28
- [x] `.memory_bank/analytics/server_events.md` — добавлен абзац о параллельном канале — 2026-04-28
- [x] `.memory_bank/backend/patterns/inter_service_communication.md` — добавлено направление в svc_monitoring — 2026-04-28
- [ ] План `docker_health_events.md` — проверить вручную после деплоя (health_status маппинг сохранён в `state_store.set_container_status`)

### 14. Удаление svc_watch (отдельный план в Semetrics-репо)

- [ ] Зафиксировать в этом плане как **выходную задачу для Semetrics-агента**: после успешного запуска svc_monitoring v2 с устройством — удалить `backend/svc_watch/` и связанные nginx-конфиги, убрать из `docker-compose`
- [ ] **Из этого плана не делаем** — это работа в чужом репо

---

## Контракты эндпоинтов (итоговые, после реализации)

### Внешние (через nginx)

| Метод | Путь | Auth | Назначение |
|---|---|---|---|
| `GET` | `/monitoring/api/state` | `?token=DEVICE_TOKEN` или `Authorization: Bearer` | JSON snapshot (тот же формат, что WS-сообщение `state`) |
| `WSS` | `/monitoring/api/events/ws` | `?token=DEVICE_TOKEN` | Push-канал: `state` каждые 30с + `alert` при срабатывании детектора |
| `GET` | `/monitoring/health` | — | `{"status":"ok",...}` |

### Внутренние (только Docker network)

| Метод | Путь | Auth | Назначение |
|---|---|---|---|
| `POST` | `/internal/errors` | nginx deny + опц. `X-Internal-Token` | Приём api_error от svc_tasks/svc_users/svc_notifications |

### URL-ы окружений

- DEV: `wss://dev.wfm.beyondviolet.com/monitoring/api/events/ws?token=...`
- PROD: `wss://wfm.beyondviolet.com/monitoring/api/events/ws?token=...`
- Local: `ws://localhost:8004/api/events/ws?token=...`

---

## Риски и trade-offs

| Риск | Mitigation |
|---|---|
| In-memory state теряется при рестарте svc_monitoring → устройство 30 сек видит `unknown` | Опциональное прогревание из `docker.sock /containers/json` на старте (задача 2) |
| Errors deque теряется при рестарте → счётчик `errors_1h` обнуляется | Принимаем; долгая история по-прежнему в Semetrics; для алертов 5 мин достаточно горячих данных |
| WFM-сервисы ходят в svc_monitoring синхронно — лишняя задержка | Делаем fire-and-forget через `BackgroundTasks` / `asyncio.create_task`, таймаут 1 сек |
| Сервис теперь exposed (порт 8004) — поверхность атаки шире | nginx + DEVICE_TOKEN; `/internal/` дополнительно блокируется в nginx |
| Совместимость прошивки с новым WS path | Path меняется на `/monitoring/api/events/ws`, обновляется в `secrets.h` (Plan 2). Контракт сообщений `state`/`alert` не меняется → парсер прошивки не трогаем |
| `docker_events.stream` теперь делает 2 действия (track + state_store) — точка отказа | Обернуть `state_store.set_*` в try/except, чтобы падение не ломало track в Semetrics (история приоритетнее snapshot'а) |
| Старая `app/main.py` с `asyncio.run(run())` ломается, если CMD контейнера не обновлён | Обновляем Dockerfile и dev/prod compose в одном PR; перепроверяем oнбординг новых серверов |

---

## Лог выполнения

### 2026-04-28
- План создан после ревизии текущего svc_monitoring и переноса контекста из Semetrics svc_watch
- Согласован контракт: `state`/`alert` 1:1 с `ws_protocol.md`, расширений совместимости нет
- Выбраны решения по storage (in-memory) и auth (DEVICE_TOKEN query/header)
- **Реализация (rev 2):**
  - svc_monitoring переоформлен под FastAPI: `app/{api,core,services,domain}` структура, lifespan-managed loops, `Dockerfile` обновлён под uvicorn + healthcheck
  - `state_store` + `errors_buffer` + `alert_detector` + `connection_manager` написаны
  - Эндпоинты: `GET /health`, `GET /api/state`, `WSS /api/events/ws`, `POST /internal/errors`
  - Прогрев `warmup_from_docker` через `/containers/json` на старте
  - `shared/monitoring_client.py` — fire-and-forget singleton, переиспользуется тремя сервисами
  - В svc_tasks/svc_users/svc_notifications: lifespan init/shutdown + middleware fire-and-forget вызов параллельно с `analytics.track`
  - `backend/nginx/services/monitoring.conf` создан (deny `/internal/`, WS upgrade, общий location)
  - `docker-compose.yml`: `ports 8004:8000`, `DEVICE_TOKEN`, healthcheck
  - Документация: `services/svc_monitoring.md`, `apis/api_monitoring.md`, `README.md`, `CLAUDE.md`, `analytics/server_events.md`, `patterns/inter_service_communication.md`
- **Открытые пункты:**
  - CI пайплайн для `svc_monitoring` (где живёт CI WFM — уточнить у пользователя)
  - Dev/prod overrides — добавить `MONITORING_DEVICE_TOKEN` в `.env` на серверах при выкатке
- **Корректировка (2026-04-28, post-review):** удалён `INTERNAL_TOKEN`/`X-Internal-Token` из `/internal/errors` — это отступало от паттерна `inter_service_communication.md`. Защита канала теперь только nginx `deny all` + Docker network, как у всех остальных internal-эндпоинтов WFM. Также обнаружено: CI пайплайн уже описан в `.gitverse/workflows/backend_build_dev.yaml` и `backend_build_prod.yaml` — `svc_monitoring` там присутствует
  - Тестирование (unit + интеграция + ручное с прошивкой) — после миграции прошивки в WFM (Plan 2)
