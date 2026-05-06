# MY-PLAN-6: Stores cleanup

**Размер:** малый.
**Зависимости:** MY-PLAN-2 (rename "Директор" → "Управляющий" уже там) + MY-PLAN-1 (расширенные mock-stores).
**Затрагивает:** stores-list + store-detail + i18n.

## Задачи

### 6.1. Stores Detail — заголовок

**Файл:** `components/features/stores/store-detail.tsx`

Сейчас: PageHeader title — short store name.

Должно: формат **`{тип магазина} — {адрес}`**. Например:
- "Супермаркет Spar — пр. Ленина 80"
- "Магазин одежды Левушка — пр. Ленина 50"
- "Швейный цех — ул. Профсоюзная 12"

Получаем `store.type_label` (нужно: проверить, есть ли поле `type_label` или используется enum + map).

### 6.2. Mock-данные: реалистичные имена

**Файл:** `lib/mock-data/stores.ts`

Для FMCG-магазинов (Lama партнёр):
- Префикс **"Продуктовый магазин"** в названии или type_label
- Например: `name: "Spar Томск, пр. Ленина 80"` + `type_label: "Продуктовый магазин"`

Это уже в MY-PLAN-1 mock data overhaul — но напомнить там добавить `type_label` или унифицировать.

### 6.3. Колонка "Активность смен" — удалить (per user 2026-05-06)

**Файл:** `components/features/stores/stores-list.tsx`

User: "Не знаю это ты или v0 сделали если не разберёмся удаляй"

Убрать колонку из ColumnDef + i18n key. Если есть API field — оставить в типе, но не отображать.

### 6.4. Принудительная синхронизация — удалить

**Файл:** `components/features/stores/store-detail.tsx`

Уже в MY-PLAN-2 (cleanup). Здесь напомнить чтобы не забыть.

### 6.5. Зоны — Edit/Add сломаны

**Файл:** `components/features/stores/store-detail.tsx` (Tab "Зоны")

User: «Редактирование зон магазина сейчас не работает. Добавление зон тоже не работает.»

Нужно:
- Открыть текущую реализацию Tab "Зоны" в store-detail
- Найти кнопку "Добавить зону" + "Редактировать"
- Проверить что они вызывают валидные функции из API
- Если функции мокаются — убедиться что toast после save показывается, и UI обновляется

Скорее всего проблема:
- Click "Добавить зону" → открывается Dialog но submit ничего не делает (no handler)
- Click "Редактировать" → дублирование стейта или missing rerender

Конкретный fix зависит от того что там сейчас. Прочитать → понять → починить.

### 6.6. История store

User: «История, она важна, нужна, пусть будет.» Уже есть, не трогаем.

### 6.7. Кнопка "Создать задачу" из store-detail

**Файл:** `components/features/stores/store-detail.tsx`

User: «Создать задачу. Кнопку вижу. Окей.»

Если кнопка ведёт на `/tasks/new` — добавить URL search param `?store_id={id}` чтобы Task Form автоподставил магазин (см. MY-PLAN-10).

## Verification

- `tsc --noEmit` zero errors
- Открыть Stores Detail → header показывает "Тип — адрес"
- Tab "Зоны" — Add/Edit работают, после save UI обновляется
- Stores list — нет колонки "Активность смен"
- Click "Создать задачу" из store-detail → /tasks/new?store_id=N с предзаполненным магазином
