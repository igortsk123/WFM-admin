# Аудит-лог задач (task_events)

Таблица `task_events` в БД сервиса `svc_tasks` — полная история всех изменений по каждой задаче. Хранится в PostgreSQL, не отправляется во внешние системы.

**Endpoint для чтения:** `GET /tasks/{id}/events`

---

## Структура записи

| Поле | Тип | Описание |
|---|---|---|
| `id` | integer | Идентификатор записи |
| `task_id` | UUID | Задача, к которой относится событие |
| `event_type` | string | Тип события (см. таблицу ниже) |
| `actor_id` | integer / null | Внутренний `user_id` актора; `null` для системных событий |
| `actor_role` | string | `"worker"` / `"manager"` / `"system"` |
| `old_state` | string / null | Состояние задачи до события |
| `new_state` | string / null | Состояние задачи после события |
| `old_review_state` | string / null | Состояние проверки до события |
| `new_review_state` | string / null | Состояние проверки после события |
| `comment` | text / null | Комментарий (обязателен при `REJECT`) |
| `meta` | JSONB / null | Произвольные дополнительные поля |
| `created_at` | datetime | Время события |

---

## Типы событий

| `event_type` | Кто инициирует | Переход состояния | Описание |
|---|---|---|---|
| `START` | worker | `NEW → IN_PROGRESS` | Работник начал задачу |
| `PAUSE` | worker | `IN_PROGRESS → PAUSED` | Работник поставил задачу на паузу |
| `RESUME` | worker | `PAUSED → IN_PROGRESS` | Работник возобновил задачу |
| `COMPLETE` | worker | `IN_PROGRESS → COMPLETED` | Работник завершил задачу (с отчётом или без) |
| `SEND_TO_REVIEW` | system | review: `NONE → ON_REVIEW` | Задача отправлена на проверку (политика MANUAL) |
| `AUTO_ACCEPT` | system | review: `NONE → ACCEPTED` | Задача автоматически принята (политика AUTO) |
| `ACCEPT` | manager | review: `ON_REVIEW → ACCEPTED` | Управляющий принял выполнение задачи |
| `REJECT` | manager | review: `ON_REVIEW → REJECTED` + `COMPLETED → PAUSED` | Управляющий отклонил; задача возвращается в PAUSED |

### Примечания

- `actor_id` равен `null` у событий с `actor_role = "system"` (`SEND_TO_REVIEW`, `AUTO_ACCEPT`)
- Поле `meta` используется, например, для хранения `{"source": "lama"}` у задач из внешней системы
- По событиям `START`, `PAUSE`, `RESUME`, `COMPLETE` вычисляется `history_brief.duration` (суммарное IN_PROGRESS время) и `history_brief.work_intervals` (массив промежутков `{time_start, time_end}`; открывается START/RESUME, закрывается PAUSE/COMPLETE; последний элемент может иметь `time_end = null` если задача сейчас IN_PROGRESS)

---

## Связь с Firebase

События аудит-лога (`task_events`) и события Firebase Analytics — независимые источники. Мобильное приложение отправляет события жизненного цикла интерфейса; `task_events` фиксирует факт изменения на сервере. При расследовании инцидента можно сопоставить оба источника по `user_id` и временным меткам.
