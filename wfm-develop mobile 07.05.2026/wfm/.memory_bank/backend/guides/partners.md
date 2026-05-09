# Партнёры и изоляция интеграций

## Концепция

Партнёр — внешняя система или бизнес, чьи магазины и сотрудники интегрируются с WFM.
Каждый магазин принадлежит одному партнёру через `stores.partner_id`.

Текущие партнёры:
- **id=1** — зарезервирован (не LAMA)
- **id=2** — LAMA (основная интеграция, синхронизация смен и задач)

## Таблица partners (svc_users)

```
id          INTEGER PK
name        VARCHAR(255)
created_at  DATETIME
```

## Поле partner_id в stores

- `stores.partner_id` — FK на `partners.id`, nullable
- `NULL` означает магазин без привязки к партнёру (внутренний)
- Уникальность: `UNIQUE(external_code, partner_id)` — пара внешних кодов уникальна в рамках партнёра
- PostgreSQL: строки с NULL в любом из полей не конфликтуют (NULL ≠ NULL в unique constraints)

## Константа LAMA_PARTNER_ID

Оба сервиса (`svc_users`, `svc_tasks`) хранят `LAMA_PARTNER_ID: int = 2` в `Settings`.
Переопределяется через env var `LAMA_PARTNER_ID`.

## Паттерны фильтрации

**Получить только LAMA-магазины:**
```sql
SELECT * FROM stores WHERE partner_id = :lama_partner_id AND external_code IS NOT NULL
```

**Создать/найти магазин из LAMA-sync:**
```python
store_repo.get_or_create(
    external_code=shop_code,
    partner_id=settings.LAMA_PARTNER_ID,
    name=shop_name,
)
```

**Ежедневная LAMA-синхронизация (`get_all_store_codes`):**
Фильтрует только магазины с `partner_id = LAMA_PARTNER_ID`.
Магазины других партнёров не попадают в LAMA-sync.

## Денормализация: partner_id в shifts_plan (svc_tasks)

`shifts_plan.partner_id` — nullable, проставляется при синхронизации из LAMA.

- LAMA sync → `partner_id = settings.LAMA_PARTNER_ID` (2)
- Ручные смены (менеджер) → `partner_id = NULL`

Позволяет svc_tasks определить "эта смена из LAMA?" без запроса в svc_users.

## Исходящая синхронизация статусов задач в LAMA

Вызов `set_task_status` происходит только если `task.external_id` не NULL.
Задачи, созданные вручную (не из LAMA), не имеют `external_id` → LAMA не вызывается.
Задачи других партнёров не получают `external_id` LAMA, т.к. их магазины
исключены из LAMA-sync (см. фильтрацию `get_all_store_codes`).

## Добавление нового партнёра

1. Вставить запись в `partners` (name, created_at)
2. При создании магазинов нового партнёра — указывать их `partner_id`
3. Если партнёр использует собственную систему задач: реализовать отдельный
   сервис синхронизации по аналогии с LAMA (свой `PARTNER_X_PARTNER_ID`)
4. `get_all_store_codes` фильтрует только LAMA — магазины нового партнёра
   не затрагиваются LAMA-sync автоматически
