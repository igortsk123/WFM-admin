# План: Внедрение Semetrics Backend SDK

**Статус:** Выполнено
**Создан:** 2026-04-23
**Последнее обновление:** 2026-04-23

## Цель

Подключить Semetrics Python SDK к серверной части WFM для сбора системной и бизнес-аналитики. SDK уже используется в iOS и Android приложениях.

## Архитектурное решение

Отдельный контейнер `svc_monitoring`:
- `pid: "host"` — точные метрики CPU/RAM хоста
- `volumes: /:/hostfs:ro` — метрики диска хоста
- `volumes: /var/run/docker.sock:ro` — Docker events
- Единообразие с остальными сервисами WFM

## Задачи

- [x] Этап 1: server_metrics — ресурсы сервера каждые 60 секунд — выполнено 2026-04-23
  - CPU (%), кол-во ядер
  - RAM физическая (total/used/free/percent)
  - Swap (total/used/free/percent)
  - Диск (total/used/free/percent)
  - Событие: `server_metrics`, user_id="system"

- [x] Этап 2: Бизнес-события из svc_tasks и svc_users — выполнено 2026-04-23
  - `task_created` — после создания задачи (svc_tasks/api/tasks.py)
  - `task_completed` — после завершения задачи (svc_tasks/api/tasks.py)
  - `task_rejected` — после отклонения задачи (svc_tasks/api/tasks.py)
  - `user_login` — при каждом GET /me (svc_users/api/users.py)
  - SDK инициализируется в lifespan каждого сервиса (app/core/analytics.py)

- [x] Этап 3: Docker events — выполнено 2026-04-23
  - Стриминг container start/stop/die/restart через /var/run/docker.sock
  - Событие: `docker_container_event` (action, container_name, image, exit_code?)
  - Реализовано в svc_monitoring/app/docker_events.py
  - Быстрая доставка: flush() после каждого track()
  - Переподключение при обрыве соединения

- [x] Этап 4: API ошибки — выполнено 2026-04-23
  - FastAPI middleware для перехвата 5xx ответов (4xx намеренно исключены)
  - Событие: `api_error` (status_code, path, method, service)
  - Добавлено в svc_tasks, svc_users, svc_notifications (app/main.py)

## Лог выполнения

### 2026-04-23
- Этап 1: создан svc_monitoring контейнер
- Этап 2: analytics.py singleton pattern в каждом сервисе; track() вызовы в tasks.py и users.py; lifespan добавлен в svc_tasks и svc_users; svc_notifications переведён с on_event на lifespan
- Этап 3: docker_events.py с httpx unix socket streaming; параллельный запуск с metrics_loop через asyncio.gather
- Этап 4: @app.middleware("http") в main.py каждого сервиса
- Общее: SEMETRICS_API_KEY, SEMETRICS_ENDPOINT, SERVER_NAME добавлены в config.py и docker-compose файлы; semetrics-sdk в requirements.txt
