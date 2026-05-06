# Domain Model: Task

## Зачем нужны задачи

Задачи в WFM — это **единица работы**, которую управляющий назначает работникам магазина.

**Проблема без системы задач:**
- Непонятно, кто и что должен делать → работники простаивают или делают не то
- Нет контроля выполнения → задачи забываются или выполняются некачественно
- Невозможно отследить трудозатраты → нельзя оптимизировать ФОТ

**Что даёт система задач:**
- **Прозрачность:** каждый работник знает, что ему делать и в какой последовательности
- **Контроль:** управляющий видит, кто чем занят, что завершено, что в процессе
- **Отчётность:** для важных задач собираются отчёты с фото и метаданными
- **Аналитика:** на основе данных о задачах можно оптимизировать график и нагрузку

---

## Основная сущность

**Task**
- id: string (UUID)
- title: string
- description: string
- type: TaskType (PLANNED | ADDITIONAL, default: PLANNED)
- planned_minutes: int
- creator_id: integer (внутренний int ID пользователя-создателя)
- assignee_id: integer | null (внутренний int ID назначенного работника)
- state: TaskState (NEW | IN_PROGRESS | PAUSED | COMPLETED)
- review_state: TaskReviewState (NONE | ON_REVIEW | ACCEPTED | REJECTED)
- acceptance_policy: AcceptancePolicy (AUTO | MANUAL)
- comment: string | null (произвольный комментарий от создателя/редактора)
- review_comment: string | null (последний комментарий к review_state; reason при reject)
- requires_photo: boolean (обязательно ли фото при завершении, default: false)
- report_text: string | null (текстовый комментарий работника, добавляется при complete)
- report_image_url: string | null (URL фото в S3, добавляется при complete)
- created_at: datetime
- updated_at: datetime
- history_brief: object | null (вычисляется по task_events; поля: time_start, duration, time_state_updated, work_intervals)

**Назначение задач:**
- Задача назначается конкретному работнику через `assignee_id`

**Отчёт о выполнении:**
- При завершении задачи (POST /{id}/complete, multipart/form-data) работник может передать:
  - `report_text` — текстовый комментарий (всегда опционален)
  - `report_image` — одна фотография (опциональна, если только `requires_photo != true`)
- Если `task.requires_photo = true` и фото не передано → 400 Validation Error
- API сам загружает фото в S3 и сохраняет URL в `report_image_url`

---

## Типы задач

### PLANNED (Плановая задача) — текущее состояние

**Характеристики:**
- Все задачи в системе на данный момент являются плановыми
- По умолчанию при создании `type = "PLANNED"` (если не передан явно)
- Назначается конкретному работнику через `assignee_id`

### ADDITIONAL (Дополнительная задача) — планируется

> Концепция дополнительных задач не реализована в текущей версии. Поле `type` добавлено в модель заранее для поддержки этого типа в будущем.

**Планируемые характеристики:**
- Создаётся управляющим вручную (вне плана)
- Не обязательна для выполнения (работник может пропустить)
- Потребует хотя бы текст или фото при завершении

---

## TaskType (enum)

```kotlin
// Android
enum class TaskType {
    PLANNED,     // Плановая задача (используется сейчас)
    ADDITIONAL   // Дополнительная задача (планируется)
}
```

```swift
// iOS
enum TaskType: String, Codable {
    case planned = "PLANNED"
    case additional = "ADDITIONAL"  // планируется
}
```

---

## TaskReviewState (enum)

Отдельное измерение задачи — стадия приёмки менеджером. Активируется после COMPLETED.

```kotlin
// Android
enum class TaskReviewState {
    NONE,       // Приёмка не актуальна
    ON_REVIEW,  // Ожидает проверки менеджером
    ACCEPTED,   // Принята
    REJECTED    // Отклонена (task.state возвращается в PAUSED)
}
```

```swift
// iOS
enum TaskReviewState: String, Codable {
    case none = "NONE"
    case onReview = "ON_REVIEW"
    case accepted = "ACCEPTED"
    case rejected = "REJECTED"
}
```

---

## AcceptancePolicy (enum)

Политика задачи, определяющая, что происходит с review_state при complete.

| Значение | Поведение |
|----------|-----------|
| AUTO | review_state = ACCEPTED автоматически (actor_role=system). По умолчанию. |
| MANUAL | review_state = ON_REVIEW, ждём действия менеджера |

```kotlin
// Android
enum class AcceptancePolicy {
    AUTO,   // Автоматическая приёмка (по умолчанию)
    MANUAL  // Ручная проверка менеджером
}
```

```swift
// iOS
enum AcceptancePolicy: String, Codable {
    case auto = "AUTO"
    case manual = "MANUAL"
}
```

---

## Базовая логика

- Работник может иметь **только 1 активную задачу** одновременно.
- Все текущие задачи имеют `type = PLANNED`.
- Отчёт при завершении: `report_text` и `report_image` — опциональны, если только `requires_photo != true`.
- **Проверка задач:**
  - Управляющий проверяет завершённые задачи и подтверждает/отклоняет
  - Подтверждённые задачи (`review_state = ACCEPTED`) учитываются в KPI
  - Отклонённые задачи возвращаются в PAUSED с указанием причины

---

## Бизнес-правила

### Правило 1: Одна активная задача
- Работник может иметь только одну задачу в состоянии IN_PROGRESS
- При старте новой задачи предыдущая автоматически переходит в PAUSED

### Правило 2: Тип задачи
- В текущей реализации все задачи имеют `type = PLANNED`
- Поле добавлено в модель заранее — в будущем появится тип `ADDITIONAL`
- При создании задачи `type` по умолчанию равен `PLANNED`

### Правило 4: Проверка задач
- Только управляющий может подтверждать или отклонять завершённые задачи
- Задача может быть проверена только в состоянии `review_state = ON_REVIEW` (acceptance_policy = MANUAL)
- При подтверждении: `review_state = ACCEPTED`; дополнительно `approved_by` и `approved_at` заполняются
- При отклонении: `review_state = REJECTED`, `task.state = PAUSED`, `review_comment` заполняется; reject **требует обязательного комментария**
- При acceptance_policy = AUTO: проверка менеджером не требуется, `review_state = ACCEPTED` выставляется системой автоматически

### Правило 5: KPI и аналитика
- Только задачи с `review_state = ACCEPTED` учитываются в KPI
- Задачи с review_state NONE, ON_REVIEW, REJECTED не влияют на статистику работника

### Правило 6: Результаты выполнения
- Поля `report_text` и `report_image` опциональны
- Работник сам решает, что добавить при завершении задачи
- Если `requires_photo = true` — фото обязательно

---

## LAMA интеграция

Система WFM интегрируется с внешней системой LAMA (система планирования и управления трудозатратами). LAMA создаёт задачи на основе нормативов и расписания магазина.

### Вложенные объекты

**WorkType** (Тип работы):
```
id: int
name: string
```

Примеры типов работ:
- 1: "Выкладка"
- 2: "Переоценка"
- 3: "Проверка срока годности"
- 4: "Уборка торгового зала"
- 5: "Приёмка товара на склад"
- 6: "Инвентаризация остатков"
- 7: "Обслуживание покупателей на кассе"

**Zone** (Зона магазина):
```
id: int
name: string
priority: int
```

Примеры зон:
- "Торговый зал"
- "Склад"
- "Касса"
- "Касса самообслуживания"

**Category** (Категория товаров):
```
id: int
name: string
```

Примеры категорий:
- "Алкоголь"
- "Молочная продукция"
- "Свежие овощи и фрукты"

### Дополнительные поля задачи (LAMA)

- `external_id: int | null` — ID задачи в системе LAMA
- `shift_id: int | null` — ID смены из LAMA
- `priority: int | null` — приоритет задачи
- `work_type_id: int | null` — FK на тип работы
- `work_type: WorkType | null` — вложенный объект типа работы
- `zone_id: int | null` — FK на зону
- `zone: Zone | null` — вложенный объект зоны
- `category_id: int | null` — FK на категорию товаров
- `category: Category | null` — вложенный объект категории
- `time_start: string | null` — время начала (формат "HH:MM:SS")
- `time_end: string | null` — время окончания (формат "HH:MM:SS")
- `source: string` — источник задачи ("WFM" или "LAMA")

### Логика работы с LAMA задачами

- Задачи из LAMA приходят через интеграцию с полями `work_type`, `zone`, `category`
- Для LAMA задач `type` может быть `null` (определяется системой LAMA)
- Для LAMA задач `requires_report` может быть `null` (определяется системой LAMA)
- Время выполнения задаётся через `time_start` и `time_end` (точное время в смене)
- Если `time_start`/`time_end` не указаны — задача выполняется в любое время смены
- `task.requires_photo` берётся из `work_type.requires_photo` справочника (default: false)
- `task.acceptance_policy` берётся из `work_type.acceptance_policy` справочника (default: AUTO); для типов работ, требующих ручной проверки, устанавливается MANUAL через `PATCH /references/work-types/{id}`

---

---

## TaskEvent (аудит-лог событий задачи)

Каждый переход состояния (execution или review) фиксируется в таблице `task_events`.

**TaskEvent**
- id: string (UUID)
- task_id: string (UUID, FK → Task)
- event_type: TaskEventType
- actor_id: integer | null (внутренний int ID; null для системных событий)
- actor_role: string ("worker" | "manager" | "system")
- old_state: TaskState | null
- new_state: TaskState | null
- old_review_state: TaskReviewState | null
- new_review_state: TaskReviewState | null
- comment: string | null (обязателен для REJECT через API)
- meta: object | null (произвольные доп. поля, например `{"source": "lama"}`)
- created_at: datetime

**TaskEventType (enum)**

| Значение | Триггер |
|----------|---------|
| START | NEW → IN_PROGRESS |
| PAUSE | IN_PROGRESS → PAUSED |
| RESUME | PAUSED → IN_PROGRESS |
| COMPLETE | IN_PROGRESS → COMPLETED |
| SEND_TO_REVIEW | review: NONE → ON_REVIEW (при MANUAL) |
| AUTO_ACCEPT | review: NONE → ACCEPTED (при AUTO, actor_role=system) |
| ACCEPT | review: ON_REVIEW → ACCEPTED |
| REJECT | review: ON_REVIEW → REJECTED |

---

## Итог

**Ключевые моменты:**
- **Тип задачи:** поле `type` (PLANNED | ADDITIONAL), сейчас все задачи — PLANNED; ADDITIONAL — планируется
- **Назначение:** конкретному работнику через `assignee_id`
- **Результаты выполнения:** работник может добавить `report_text` и `report_image` при завершении задачи
- **Два измерения состояния:** `state` (исполнение) и `review_state` (приёмка) — независимые, но связанные
- **Acceptance policy:** AUTO = автоматическая приёмка; MANUAL = менеджер проверяет вручную
- **Контроль качества:** только задачи с `review_state = ACCEPTED` учитываются в KPI
- **Аудит-лог:** все переходы фиксируются в `task_events` с указанием актора, ролей и комментария
- **Одна активная задача:** работник может иметь только одну задачу в состоянии IN_PROGRESS
