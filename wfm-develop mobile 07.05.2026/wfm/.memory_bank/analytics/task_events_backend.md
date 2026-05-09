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

---

## Покрытие потребностей аналитики

В `.memory_bank/strategy/theoretical_foundation.md` описана модель EIM, в которой шаг **S** (Signal) — фундамент для будущих **I** (Interpretation) и **L** (Learning). Текущая схема `task_events` достаточна для этого фундамента **без структурных изменений**:

| Потребность | Откуда берётся | Реструктуризация нужна? |
|---|---|---|
| Δt = `completed_at − created_at` | `tasks.created_at` + `task_events.created_at` (event_type IN ACCEPT, AUTO_ACCEPT) | Нет |
| Контекст задачи (zone, work_type, shift, store) | JOIN `task_events → tasks → references` | Нет |
| Фактическое время IN_PROGRESS | `history_brief.duration` (вычисляется по START/RESUME/PAUSE/COMPLETE) | Нет |
| Причина reject | `comment` у событий с `event_type = REJECT` | Нет |
| Системный/ручной актор | `actor_role` (`worker` / `manager` / `system`) + `actor_id` | Нет |

**Что НЕ закладываем заранее:**
- Денормализация `zone_id` / `work_type_id` / `shift_id` напрямую в `task_events` — JOIN с `tasks` уже даёт эти поля; копия избыточна и склонна расходиться при изменении задачи.
- Поле `duration_seconds` per-event — длительность это интервал между событиями, а не свойство одного события; считается агрегацией.
- Структурированный `reason_code` отдельно от `comment` — пока единственное место с обязательным `comment` (REJECT) использует свободный текст; формализация под коды появится при росте объёма reject'ов и реальном спросе на категоризацию.

См. также `.memory_bank/analytics/dt_metric.md` — концепция метрики Δt и её источники данных.
