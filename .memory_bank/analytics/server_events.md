# Реестр событий сервера (Semetrics)

> ❗ **Этот файл — источник правды.** Любое изменение списка событий (добавление, удаление, переименование параметра) обязательно сопровождается обновлением этого документа.

Источник: Python-сервисы WFM backend. Провайдер: Semetrics SDK (`semetrics-sdk`).

Отличие от `task_events_backend.md`: тот файл описывает аудит-лог задач в PostgreSQL (внутренний, читается через API). Этот — аналитические события, отправляемые во внешнюю систему Semetrics.

---

## Идентификация

| Поле | Значение | Описание |
|---|---|---|
| `user_id` | `"system"` | Для инфраструктурных событий (мониторинг, docker) |
| `user_id` | строковое представление `user_id` из БД | Для бизнес-событий, инициированных пользователем |

---

## Инфраструктура (svc_monitoring)

Отправляет `svc_monitoring`. Сервис имеет доступ к хост-метрикам через `pid: "host"` и `/:/hostfs:ro`.

### `server_metrics`

Регулярный снимок ресурсов сервера. Интервал: 60 секунд.

| Параметр | Тип | Описание |
|---|---|---|
| `server` | string | `"prod"` / `"dev"` |
| `cpu_percent` | float | Загрузка CPU хоста, % |
| `cpu_cores_logical` | int | Логических ядер |
| `cpu_cores_physical` | int | Физических ядер |
| `mem_total_gb` | float | Всего RAM, ГБ |
| `mem_used_gb` | float | Использовано RAM, ГБ |
| `mem_free_gb` | float | Доступно RAM (available), ГБ |
| `mem_percent` | float | Загрузка RAM, % |
| `swap_total_gb` | float | Всего swap, ГБ |
| `swap_used_gb` | float | Использовано swap, ГБ |
| `swap_free_gb` | float | Свободно swap, ГБ |
| `swap_percent` | float | Загрузка swap, % |
| `disk_total_gb` | float | Всего диска, ГБ |
| `disk_used_gb` | float | Использовано диска, ГБ |
| `disk_free_gb` | float | Свободно диска, ГБ |
| `disk_percent` | float | Загрузка диска, % |

### `docker_container_event`

Событие жизненного цикла и здоровья Docker-контейнера. Доставляется немедленно (`flush()` после каждого `track()`).

| Параметр | Тип | Описание |
|---|---|---|
| `server` | string | `"prod"` / `"dev"` |
| `action` | string | `"start"` / `"stop"` / `"die"` / `"restart"` / `"health_status"` |
| `container_name` | string | Имя контейнера |
| `image` | string | Docker-образ |
| `exit_code` | int? | Код выхода (только для `"die"`) |
| `health_status` | string? | `"healthy"` / `"unhealthy"` / `"starting"` (только для `"health_status"`) |

---

## Бизнес-события

### `task_created` (svc_tasks)

| Параметр | Тип | Описание |
|---|---|---|
| `task_id` | string | UUID задачи |
| `task_type` | string | `"PLANNED"` / `"ADDITIONAL"` |
| `work_type_id` | int? | ID типа работы |
| `has_assignee` | bool | Назначена ли задача конкретному работнику |

### `task_completed` (svc_tasks)

| Параметр | Тип | Описание |
|---|---|---|
| `task_id` | string | UUID задачи |
| `task_type` | string | `"PLANNED"` / `"ADDITIONAL"` |
| `work_type_id` | int? | ID типа работы |
| `has_photo` | bool | Приложено ли фото отчёта |
| `has_text` | bool | Приложен ли текстовый отчёт |

### `task_rejected` (svc_tasks)

| Параметр | Тип | Описание |
|---|---|---|
| `task_id` | string | UUID задачи |
| `task_type` | string | `"PLANNED"` / `"ADDITIONAL"` |
| `work_type_id` | int? | ID типа работы |

### `user_registered` (svc_users)

Трекается однократно при первом входе пользователя — в момент создания записи в локальной таблице `users` по SSO UUID.

| Параметр | Тип | Описание |
|---|---|---|
| — | — | Только общие поля (`server`, `user_id`) |

---

## API ошибки

### `push_notification_sent` (svc_notifications)

Трекается непосредственно перед попыткой отправки на каждый канал. Параметры единообразны с мобильным событием `push_notification_received`.

Условия трекинга по каналам:
- **fcm / hms** — перед вызовом провайдера (токены есть)
- **websocket** — перед вызовом `send_notification`, только если пользователь подключён (`is_connected = true`)

| Параметр | Тип | Описание |
|---|---|---|
| `channel` | string | `"fcm"` / `"hms"` / `"websocket"` |
| `notification_id` | string | UUID уведомления |
| `task_id` | string? | UUID задачи из `notification.data`, если есть |

### `push_notification_failed` (svc_notifications)

Отправка не удалась. Трекается после `push_notification_sent` при провале.

| Параметр | Тип | Описание |
|---|---|---|
| `channel` | string | `"fcm"` / `"hms"` / `"websocket"` |
| `notification_id` | string | UUID уведомления |
| `task_id` | string? | UUID задачи из `notification.data`, если есть |
| `reason` | string | `"provider_rejected"` (FCM/HMS: success=0) / `"disconnect"` (WS: соединение умерло в процессе) / `"ack_timeout"` (WS: ACK не пришёл за таймаут) |

---

### `api_error` (svc_tasks, svc_users, svc_notifications)

HTTP middleware перехватывает ответы со статусом >= 500.

| Параметр | Тип | Описание |
|---|---|---|
| `service` | string | `"svc_tasks"` / `"svc_users"` / `"svc_notifications"` |
| `status_code` | int | HTTP статус-код |
| `path` | string | Путь запроса |
| `method` | string | HTTP метод |

---

## Реализация

| Сервис | Файлы |
|---|---|
| `svc_monitoring` | `backend/svc_monitoring/app/main.py`, `collector.py`, `config.py` |
| `svc_tasks` | `backend/svc_tasks/app/core/analytics.py`, `api/tasks.py` |
| `svc_users` | `backend/svc_users/app/core/analytics.py`, `api/users.py` |
| `svc_notifications` | `backend/svc_notifications/app/core/analytics.py`, `services/delivery_engine.py` |
