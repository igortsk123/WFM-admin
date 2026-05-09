# Доменная модель: Смены (Shifts)

Смены — это временные интервалы работы сотрудников в магазине. Система разделяет плановые смены (расписание) и фактические смены (реальное время работы).

## Таблицы данных

### stores (справочник магазинов)

Владелец: **svc_users** (таблица `stores` в БД `wfm_users`)

```
id: INTEGER (PRIMARY KEY, AUTOINCREMENT)
name: VARCHAR(255) NOT NULL
address: TEXT
external_code: VARCHAR(50) UNIQUE    -- shop_code из LAMA (nullable)
created_at: TIMESTAMP DEFAULT NOW()
```

### shifts_plan (плановое расписание)

```
id: INTEGER (PRIMARY KEY, AUTOINCREMENT)
assignment_id: INTEGER NOT NULL  -- ссылка на assignment из svc_users
shift_date: DATE NOT NULL        -- дата смены
start_time: TIME NOT NULL        -- время начала (например, 09:00)
end_time: TIME NOT NULL          -- время окончания (например, 18:00)
external_id: INTEGER UNIQUE      -- id смены из LAMA (nullable)
duration: INTEGER                -- длительность в часах из LAMA (nullable)
created_at: TIMESTAMP DEFAULT NOW()
created_by: INTEGER              -- кто создал запись (nullable, внутренний int ID)
```

### shifts_fact (фактические смены)

```
id: INTEGER (PRIMARY KEY, AUTOINCREMENT)
plan_id: INTEGER NOT NULL        -- FK на shifts_plan.id
opened_at: TIMESTAMP NOT NULL    -- фактическое время открытия смены
closed_at: TIMESTAMP             -- фактическое время закрытия (NULL если открыта)
```

**Связь план-факт:** Фактическая смена связана с плановой через `plan_id` (FK → shifts_plan.id). `assignment_id` выводится через `shifts_fact.plan_id → shifts_plan` без дублирования. Данные магазина запрашиваются у svc_users по `assignment_id`.

---

## Статусы смены

| Статус | Описание | Источник |
|--------|----------|----------|
| NEW | Смена запланирована, ещё не открыта | shifts_plan |
| OPENED | Смена открыта, работник на месте | shifts_fact (closed_at = NULL) |
| CLOSED | Смена закрыта, работник завершил работу | shifts_fact (closed_at IS NOT NULL) |

---

## Бизнес-правила

### Открытие смены
1. Работник нажимает "Открыть смену" в приложении
2. Создаётся запись в shifts_fact с `opened_at = NOW()`
3. **Ограничение**: у работника может быть только одна открытая смена одновременно
4. При попытке открыть вторую смену возвращается ошибка CONFLICT

### Закрытие смены
1. Работник нажимает "Закрыть смену" в приложении
2. Без флага `force`: проверяются задачи смены (привязаны через `Task.shift_id = shifts_plan.id`):
   - Есть задача в состоянии IN_PROGRESS → ошибка `TASKS_IN_PROGRESS`
   - Есть задача в состоянии PAUSED → ошибка `TASKS_PAUSED`
3. С флагом `force=true`: задачи IN_PROGRESS переводятся в PAUSED (системный актор), смена закрывается
4. В открытой смене устанавливается `closed_at = NOW()`
5. Если нет открытой смены — возвращается ошибка NOT_FOUND

### Получение текущей смены (get_current)

**Обязательный параметр:** `assignment_id` (int) — ID назначения сотрудника из svc_users.

Логика:
1. Синхронизируем плановую смену из LAMA по `assignment_id`
2. **Всегда** ищем плановую смену за сегодня (`shifts_plan`) для получения `start_time` / `end_time`
2. **Ищем в shifts_fact за сегодня** — берём последнюю запись
   - Если `closed_at = NULL` → статус OPENED
   - Если `closed_at IS NOT NULL` → статус CLOSED
   - К ответу добавляются `start_time` / `end_time` из плановой смены (если есть)
3. **Если нет в shifts_fact, но есть план** → возвращаем со статусом NEW
4. **Если нигде нет** — возвращаем `data: null`

**Важно:** `start_time` и `end_time` из плана всегда присутствуют в ответе (если план существует), независимо от того, из какого источника (fact или plan) взята смена.

---

## Связь с другими сервисами

### svc_users
- `assignment_id` в сменах ссылается на назначение из svc_users (таблица `assignments`)
- `stores` хранятся в svc_users; svc_shifts получает данные магазина через `GET /users/internal/assignment-store?assignment_id=X`

### svc_tasks
- Задачи привязываются к смене через `shift_id` = `shifts_plan.id`
- Таблицы `shifts_plan` и `shifts_fact` находятся в той же БД `wfm_tasks` — данные смен читаются напрямую через `ShiftRepository`, межсервисные HTTP-вызовы не нужны

### LAMA
- `ShiftPlan.external_id` — ID смены из LAMA, используется для upsert и для запроса задач
- `ShiftPlan.duration` — длительность смены в часах из LAMA
- Подробнее: `.memory_bank/backend/apis/external/api_lama.md`

---

## Расширения в будущем

- **Шаблоны расписания** — еженедельные шаблоны вместо конкретных дат
- **Уведомления** — напоминание о начале смены
- **Отчёты** — отработанные часы за период
- **Интеграция с табелем** — автоматический учёт рабочего времени
- **Геолокация** — проверка местоположения при открытии смены
