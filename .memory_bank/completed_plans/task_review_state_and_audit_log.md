# План: Review State, Acceptance Policy и Audit Log для задач

**Статус:** Выполнено
**Создан:** 2026-02-27
**Последнее обновление:** 2026-02-27 (реализация)

---

## Цель

Расширить систему задач тремя взаимосвязанными фичами:

1. **review_state** — отдельное измерение «приёмки» задачи (NONE → ON_REVIEW → ACCEPTED/REJECTED), независимое от execution state
2. **acceptance_policy** — политика автоматической или ручной приёмки при завершении задачи
3. **task_events** — аудит-лог всех событий задачи: кто, когда, почему, с каким комментарием

Обновить документацию Memory Bank: task_states.md, task_model.md, api_tasks.md, svc_tasks.md.

---

## Контекст и текущее состояние

### Что есть в коде (backend/svc_tasks)

**Execution states (TaskState):**
- NEW → IN_PROGRESS → PAUSED → IN_PROGRESS → COMPLETED
- Реализовано: models.py, schemas.py, state_machine.py, task_repository.py

**Endpoints в tasks.py:**
- GET /list, GET /my, POST /, GET /{id}, PATCH /{id}
- POST /{id}/start, /pause, /resume, /complete

**Чего нет в коде (есть только в документации):**
- POST /{id}/approve и POST /{id}/reject — не реализованы
- Поля task_type, requires_report, report_text, report_images — не в модели
- Поля approved_by, approved_at, rejection_reason — не в модели
- Поля started_at, completed_at — не в модели
- assigned_to_permission — не в модели

> Эти gap-ы не входят в данный план, фиксируются как известный долг.
> Данный план фокусируется только на review_state, acceptance_policy и task_events.

---

## Дизайн решения

### review_state (отдельное измерение)

```
NONE        — приёмка не актуальна (задача ещё не COMPLETED)
ON_REVIEW   — ожидает проверки менеджером
ACCEPTED    — принята
REJECTED    — отвергнута (задача возвращается в PAUSED)
```

Диаграмма:
```
COMPLETED task
    |
    |-- acceptance_policy = AUTO  --> review_state = ACCEPTED (автоматически, actor=system)
    |
    |-- acceptance_policy = MANUAL --> review_state = ON_REVIEW
                                          |
                                          |-- MANAGER approve --> ACCEPTED
                                          |-- MANAGER reject  --> REJECTED + task.state = PAUSED
```

### acceptance_policy

```
AUTO   — при COMPLETE автоматически ставим review_state = ACCEPTED
MANUAL — при COMPLETE ставим review_state = ON_REVIEW, ждём действия менеджера
```

По умолчанию: **AUTO** (чтобы не сломать текущее поведение).

В будущем: RULES (триггеры по условиям), но не входит в этот план.

### task_events (аудит-лог)

Таблица `task_events`:

| поле | тип | описание |
|------|-----|----------|
| id | UUID | PRIMARY KEY |
| task_id | UUID (FK → tasks.id) | задача |
| event_type | VARCHAR(50) | тип события |
| actor_id | UUID? | кто выполнил (null для system) |
| actor_role | VARCHAR(20) | "worker" / "manager" / "system" |
| old_state | VARCHAR(50)? | предыдущий execution state |
| new_state | VARCHAR(50)? | новый execution state |
| old_review_state | VARCHAR(50)? | предыдущий review state |
| new_review_state | VARCHAR(50)? | новый review state |
| comment | TEXT? | текстовый комментарий (например, причина отклонения) |
| meta | JSONB? | произвольные доп. поля |
| created_at | TIMESTAMP | время события |

**Типы событий (TaskEventType):**
- `START` — начало задачи (NEW → IN_PROGRESS)
- `PAUSE` — пауза (IN_PROGRESS → PAUSED)
- `RESUME` — возобновление (PAUSED → IN_PROGRESS)
- `COMPLETE` — завершение (IN_PROGRESS → COMPLETED)
- `SEND_TO_REVIEW` — отправка на проверку (review_state: NONE → ON_REVIEW)
- `AUTO_ACCEPT` — автоматическая приёмка (review_state: NONE → ACCEPTED, actor_role=system)
- `ACCEPT` — ручная приёмка менеджером (review_state: ON_REVIEW → ACCEPTED)
- `REJECT` — отклонение менеджером (review_state: ON_REVIEW → REJECTED)

---

## Задачи

### Раздел 1: Миграции БД

- [x] 1.1 Создать миграцию `006_add_review_state_and_acceptance_policy.py` — 2026-02-27
- [x] 1.2 Создать миграцию `007_create_task_events.py` — 2026-02-27

### Раздел 2: Доменная модель

- [x] 2.1 Обновить `app/domain/schemas.py` — 2026-02-27
- [x] 2.2 Обновить `app/domain/models.py` — 2026-02-27

### Раздел 3: Репозиторий

- [x] 3.1 Обновить `app/repositories/task_repository.py` — 2026-02-27; добавлены `set_review_state`, `reject_to_paused` (обходит state machine для COMPLETED→PAUSED в review flow)
- [x] 3.2 Создать `app/repositories/task_event_repository.py` — 2026-02-27

### Раздел 4: Бизнес-логика (API endpoints)

- [x] 4.1 Обновить `POST /{id}/complete` — 2026-02-27
- [x] 4.2 Добавить `POST /{id}/approve` — 2026-02-27
- [x] 4.3 Добавить `POST /{id}/reject` (reason обязателен) — 2026-02-27; reject использует `reject_to_paused` (обходит state machine)
- [x] 4.4 Добавить `GET /{id}/events` — 2026-02-27
- [x] 4.5 Записывать события в start/pause/resume — 2026-02-27

### Раздел 4б: LAMA — входящая синхронизация review_state (LAMA → WFM)

LAMA использует статус `Accepted` (задача принята в LAMA) и `Returned` (задача возвращена на доработку). Сейчас они маппятся **только на execution state**. Нужно также проставлять review_state и записывать событие в аудит-лог.

**Текущий маппинг LAMA → WFM** (в `shared/lama_client.py`):
```
Accepted → state = COMPLETED        (review_state не меняется)
Returned → state = PAUSED           (review_state не меняется)
```

**Новый маппинг LAMA → WFM:**
```
Accepted → state = COMPLETED  +  review_state = ACCEPTED  +  событие ACCEPT (actor_role=system, meta={"source": "lama"})
Returned → state = PAUSED     +  review_state = REJECTED  +  событие REJECT (actor_role=system, meta={"source": "lama"})
```

> Комментарий для события REJECT от LAMA: если LAMA передаёт причину возврата — пишем её в `comment`. Если нет — `comment = null` (исключение из правила обязательного комментария: правило касается только ручного reject менеджером через API).

- [x] 4б.1 Обновить `app/services/lama_service.py` — метод `sync_tasks` — 2026-02-27
- [x] 4б.2 Записывать события ACCEPT/REJECT при изменении review_state из LAMA — 2026-02-27

### Раздел 4в: LAMA — исходящая синхронизация review_state (WFM → LAMA)

**Проблема с текущим кодом:**

`sync_task_status_to_lama` смотрит только на `task.state` и использует `WFM_TO_LAMA_STATUS`:
```python
WFM_TO_LAMA_STATUS = {
    "NEW": "Created",
    "IN_PROGRESS": "InProgress",
    "PAUSED": "Suspended",    # ← reject тоже вернёт Suspended — НЕВЕРНО
    "COMPLETED": "Completed", # ← approve оставит Completed — НЕВЕРНО
}
```

При reject: задача уходит в `state=PAUSED` → метод отправит в LAMA `"Suspended"` вместо `"Returned"`.
При approve: задача остаётся `state=COMPLETED` → метод отправит `"Completed"` вместо `"Accepted"`.

**Решение:** сделать метод `sync_task_status_to_lama` принимающим явный LAMA-статус, вместо вывода его из `task.state`:

```python
# Было:
async def sync_task_status_to_lama(self, task: Task) -> bool:
    lama_status = WFM_TO_LAMA_STATUS.get(task.state)
    ...

# Станет:
async def sync_task_status_to_lama(self, task: Task, lama_status: str) -> bool:
    # lama_status передаётся явно из вызывающего кода
    ...
```

Вызывающий код передаёт нужный статус:
- `start` → `"InProgress"`
- `pause` → `"Suspended"`
- `resume` → `"InProgress"`
- `complete` → `"Completed"`
- `approve` → **`"Accepted"`**
- `reject` → **`"Returned"`**

- [x] 4в.1 Обновить сигнатуру `sync_task_status_to_lama(task, lama_status)` — 2026-02-27
- [x] 4в.2 Обновить все существующие вызовы в `tasks.py` (start/pause/resume/complete) — 2026-02-27
- [x] 4в.3 В approve → "Accepted", в reject → "Returned" — 2026-02-27
- [x] 4в.4 `WFM_TO_LAMA_STATUS` оставлен как справочная константа с пояснительными комментариями — 2026-02-27

### Раздел 5: Документация Memory Bank

- [x] 5.1 Обновить `.memory_bank/domain/task_states.md` — 2026-02-27; полный перезапись с двумя state machine и LAMA-таблицей
- [x] 5.2 Обновить `.memory_bank/domain/task_model.md` — 2026-02-27; новые поля, enum'ы, TaskEvent сущность, правило KPI
- [x] 5.3 Обновить `.memory_bank/backend/apis/api_tasks.md` — 2026-02-27; approve/reject/events, acceptance_policy, LAMA маппинг
- [x] 5.4 Обновить `.memory_bank/backend/services/svc_tasks.md` — 2026-02-27; схема БД, task_events, структура проекта, LAMA маппинг

---

## Порядок выполнения

1. **Документация** (5.1–5.4) — синхронизируем спецификацию
2. **Миграции** (1.1–1.2) — структура БД
3. **Доменная модель** (2.1–2.2) — enum'ы и ORM модели
4. **Репозиторий** (3.1–3.2) — работа с данными
5. **API: review_state + events** (4.1–4.5) — бизнес-логика и endpoints
6. **LAMA входящая** (4б.1–4б.2) — проставлять review_state при Accepted/Returned из LAMA
7. **LAMA исходящая** (4в.1–4в.4) — отправлять Accepted/Returned при approve/reject менеджера

---

## Лог выполнения

### 2026-02-27

- Начало работы над планом
- Проведён анализ текущего состояния кода (backend/svc_tasks)
- Выявлен gap между документацией и кодом (approve/reject, task_type, report_* поля — не в коде)
- Принято решение: gap фиксируем как известный долг, текущий план фокусируется только на заявленных фичах
- Rev 2: добавлены уточнения по reject (обязательный комментарий) и LAMA-маппинг review_state для Accepted/Returned
- Rev 3: добавлен раздел 4в — исходящая синхронизация WFM→LAMA при approve/reject; проанализирован `lama_client.py` и `lama_service.py`; выявлена проблема с `sync_task_status_to_lama` (определяет LAMA-статус по task.state → reject отправлял бы Suspended вместо Returned); принято решение передавать lama_status явно из вызывающего кода
