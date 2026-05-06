# MY-PLAN-9: Tasks list (`/tasks`) UI fixes

**Размер:** малый.
**Зависимости:** MY-PLAN-2 (rename "Архив задач" → "Задачи").
**Затрагивает:** tasks-list.tsx + button handler + i18n.

## Задачи

### 9.1. Перераспределить ширину фильтров

**Файл:** `components/features/tasks/tasks-list.tsx`

User: «период сгенерирован длинной-длинной строчкой. Тогда уж логичнее поиск сместить вниз, а период наверх убрать, чтобы он был меньше по размеру поля, а то период — это очень маленькое поле, а занимает так много места, а поиск у тебя меньше.»

Сейчас в filter row:
- Период — занимает много места (date range picker с длинным placeholder)
- Поиск — меньше

Решения (выбрать одно):

**Option A — переразместить:**
- Period в отдельную row top (компактный date picker)
- Search в основном filter row, занимая 50%+ ширины

**Option B — сжать period picker:**
- Date picker компактный icon-only с popup календарём
- Освободить место под search

Предпочтение: Option B (как в Audit / Reports).

### 9.2. Кнопка "Создать задачу" не работает

**Файл:** tasks-list.tsx + page wrapper.

User: «Пробую здесь нажать кнопку "Создать задачу", она не работает. Поправь это.»

Найти кнопку (toolbar `+ Создать задачу` или `Plus`). Скорее всего:
- Кнопка не имеет `onClick` или `asChild` с Link
- Должна вести на `/tasks/new`

Заменить на:
```tsx
<Button asChild>
  <Link href={ADMIN_ROUTES.taskNew}>
    <Plus className="size-4 mr-1" />
    {t("actions.create")}
  </Link>
</Button>
```

### 9.3. "Архив задач" → "Задачи" (в меню)

В MY-PLAN-2.4. Здесь напомнить.

## Verification

- `tsc --noEmit` zero errors
- Открыть `/tasks` → фильтр row компактен, search занимает разумное место
- Click "Создать задачу" → переход на `/tasks/new`
- В sidebar пункт меню «Задачи» (не «Архив задач»)
