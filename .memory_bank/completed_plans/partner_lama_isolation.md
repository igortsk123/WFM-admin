# План: Изоляция партнёров — LAMA vs другие партнёры

**Статус:** Выполнено
**Создан:** 2026-04-07
**Последнее обновление:** 2026-04-07

## Цель

Обеспечить корректную работу системы при наличии нескольких партнёров.
LAMA — партнёр с id=2 в таблице `partners`. Все места синхронизации с LAMA
должны работать только с LAMA-магазинами, а магазины, созданные через
LAMA-синхронизацию, должны получать `partner_id=2`.

## Проблемы

1. **Магазины создаются без partner_id** — при первом входе LAMA-пользователя
   `StoreRepository.get_or_create()` создаёт магазин с `partner_id=null`.

2. **Ежедневная синхронизация захватывает все магазины** — `get_all_store_codes()`
   в internal.py делает `WHERE external_code IS NOT NULL` без фильтра по partner_id.
   Магазины нового партнёра тоже имеют external_code, поэтому попадают в LAMA-синхронизацию.

3. **UNIQUE(external_code) вместо UNIQUE(external_code, partner_id)** — у двух партнёров
   может совпасть внешний код магазина. Нужна составная уникальность, но с возможностью
   оставить оба поля null.

4. **Нет поля partner_id в shifts_plan** — для фильтрации "является ли эта смена LAMA-сменой"
   приходится идти по цепочке: shift → assignment → store → partner. Денормализация
   (`shifts_plan.partner_id`) решает это на уровне svc_tasks без запросов в svc_users.

## Что НЕ меняется

- Проверка `if task.external_id:` перед вызовом `set_task_status` — уже корректная.
  Задачи нового партнёра не имеют LAMA external_id, поэтому sync в LAMA не идёт.
  После фикса п.2 ежедневный sync не будет трогать их смены/задачи.
- Lazy sync смен (`GET /shifts/current`) — уже корректен: проверяет `assignment.external_id`.
  Сотрудники нового партнёра не имеют external_id в assignment → LAMA не вызывается.

## Задачи

- [x] 1. Добавить `LAMA_PARTNER_ID: int = 2` в settings обоих сервисов — выполнено 2026-04-07
- [x] 2. Миграция svc_users `011`: изменить `UNIQUE(external_code)` → `UNIQUE(external_code, partner_id)` в stores — выполнено 2026-04-07
- [x] 3. Обновить `StoreRepository`: новый метод `get_by_external_code_and_partner`, добавить `partner_id` в `create()` и `get_or_create()` — выполнено 2026-04-07
- [x] 4. `LamaService._sync_positions()`: передавать `partner_id=settings.LAMA_PARTNER_ID` в `store_repo.get_or_create()` — выполнено 2026-04-07
- [x] 5. `internal.py get_all_store_codes()`: добавить фильтр `partner_id = settings.LAMA_PARTNER_ID` — выполнено 2026-04-07
- [x] 6. Миграция svc_tasks `020`: добавить nullable `partner_id` в `shifts_plan` — выполнено 2026-04-07
- [x] 7. `ShiftPlan` модель + `ShiftLamaService.sync_shift()`: ставить `partner_id = settings.LAMA_PARTNER_ID` при upsert — выполнено 2026-04-07
- [x] 8. Документация Memory Bank: создать `.memory_bank/backend/partners.md` — выполнено 2026-04-07

## Детали реализации

### Задача 1: LAMA_PARTNER_ID в settings

Файлы:
- `backend/svc_users/app/core/config.py`
- `backend/svc_tasks/app/core/config.py`

Добавить рядом с `LAMA_API_*`:
```python
LAMA_PARTNER_ID: int = 2  # ID партнёра LAMA в таблице partners
```

---

### Задача 2: Миграция stores (svc_users)

Файл: `backend/svc_users/alembic/versions/011_fix_store_external_code_unique.py`

```python
def upgrade():
    # Удалить старый unique на external_code (автоимя: stores_external_code_key)
    op.drop_constraint('stores_external_code_key', 'stores', type_='unique')
    # Добавить составной unique (external_code, partner_id)
    # PostgreSQL: NULL != NULL, поэтому строки с NULL не конфликтуют
    op.create_unique_constraint(
        'uq_stores_external_code_partner',
        'stores',
        ['external_code', 'partner_id'],
    )

def downgrade():
    op.drop_constraint('uq_stores_external_code_partner', 'stores', type_='unique')
    op.create_unique_constraint('stores_external_code_key', 'stores', ['external_code'])
```

---

### Задача 3: StoreRepository

Файл: `backend/svc_users/app/repositories/store_repository.py`

Изменения:
- `get_by_external_code(external_code)` → оставить (обратная совместимость)
- Новый: `get_by_external_code_and_partner(external_code, partner_id)` — ищет по паре
- `create(name, address, external_code, partner_id)` — добавить параметр
- `get_or_create(external_code, partner_id, name)` — ищет через новый метод, создаёт с partner_id

---

### Задача 4: LamaService._sync_positions()

Файл: `backend/svc_users/app/services/lama_service.py`

Место вызова (строки ~183-188):
```python
store = store_repo.get_or_create(
    external_code=shop_code,
    name=pos.get("shop_name"),
    partner_id=settings.LAMA_PARTNER_ID,  # ← добавить
)
```

Импорт `settings` уже есть.

---

### Задача 5: get_all_store_codes()

Файл: `backend/svc_users/app/api/internal.py`

```python
codes = (
    db.query(Store.external_code)
    .filter(
        Store.external_code.isnot(None),
        Store.partner_id == settings.LAMA_PARTNER_ID,  # ← добавить
    )
    .all()
)
```

Нужно добавить импорт `settings`.

---

### Задача 6: Миграция shifts_plan (svc_tasks)

Файл: `backend/svc_tasks/alembic/versions/020_add_partner_id_to_shifts_plan.py`

```python
def upgrade():
    op.add_column(
        'shifts_plan',
        sa.Column('partner_id', sa.Integer(), nullable=True),
    )

def downgrade():
    op.drop_column('shifts_plan', 'partner_id')
```

Заполнять `partner_id` для существующих строк не нужно (они уже все из LAMA,
но проставить вручную или оставить NULL — оба варианта корректны для MVP).

---

### Задача 7: ShiftPlan модель + ShiftLamaService

**Модель** (`backend/svc_tasks/app/domain/models.py`):
```python
partner_id = Column(Integer, nullable=True)  # ID партнёра (2 = LAMA)
```

**ShiftLamaService** (`backend/svc_tasks/app/services/shift_lama_service.py`):
При upsert ShiftPlan добавить `partner_id=settings.LAMA_PARTNER_ID` в обе ветки
(create и update).

Импорт `settings` уже есть (`from app.core.config import settings`).

---

### Задача 8: Memory Bank

Файл: `.memory_bank/backend/partners.md`

Содержимое:
- Концепция партнёров: LAMA как один из партнёров
- Таблица partners (id, name, created_at)
- LAMA_PARTNER_ID = 2
- Паттерны фильтрации по partner_id
- Уникальность (external_code, partner_id) в stores
- Денормализация partner_id в shifts_plan

## Лог выполнения

### 2026-04-07
- Выполнено: все 8 задач
- `LAMA_PARTNER_ID = 2` добавлен в Settings обоих сервисов
- Миграция 011 (svc_users): UNIQUE(external_code) → UNIQUE(external_code, partner_id)
- StoreRepository: get_by_external_code_and_partner + partner_id в create/get_or_create
- LamaService._sync_positions(): partner_id=LAMA_PARTNER_ID при создании магазина
- get_all_store_codes(): фильтр по partner_id=LAMA_PARTNER_ID
- Миграция 020 (svc_tasks): partner_id в shifts_plan
- ShiftPlan модель + ShiftLamaService: partner_id при upsert
- Memory Bank: .memory_bank/backend/partners.md
