# MY-PLAN-5: Subtasks Moderation cleanup

**Размер:** малый.
**Зависимости:** нет.
**Затрагивает:** subtasks-moderation.tsx + types + mock-data + i18n.

## Контекст бизнес-логики

User раскрыл смысл экрана `/subtasks/moderation`:

1. **Источники предложений подзадач:**
   - **Сотрудник** (worker) — на текущий момент только при типе работ "Другие работы". Сотрудник вводит свою подзадачу когда выполнял что-то нестандартное.
   - **Управляющий магазина** (store_director) — из Task Detail предлагает отредактировать существующую подзадачу.

2. **Кто модерирует:** супервайзер и выше (обычные admin роли).

3. **Что происходит при approve:** подзадача попадает в общий список подзадач для соответствующего типа работ → доступна другим сотрудникам.

4. **Текущее имя экрана** «Модерация подзадач» — лучше переименовать в «Предложения подзадач».

## Задачи

### 5.1. Текстовые баги в карточках

**Файл:** `lib/mock-data/subtasks.ts` (или mock-data subtasks file)

User указал:
> «текстовые баги. Например, предложил заголовок, там баг. в названиях контроль качества, холодильники, тут есть баг.»

Прочитать mock-data, найти текстовые баги в title/description подзадач связанных с "контроль качества" / "холодильники". Исправить опечатки/грамматику.

### 5.2. Source field в Subtask Suggestion

**Файлы:** `lib/types/index.ts` + mock-data + API.

```ts
export type SubtaskSuggestionSource = 'worker' | 'store_director';

// extend существующий SubtaskSuggestion / Subtask
export interface SubtaskSuggestion {
  // ... existing fields
  suggestion_source: SubtaskSuggestionSource;
  suggested_by_user_id: number;
  suggested_by_user_name: string;
  // суть, кто предложил
}
```

В моках указать source у каждого suggestion (микс ~80% worker, ~20% store_director).

### 5.3. В моках: только тип работ "Другие работы" для worker-source

**Файл:** mock-data subtasks.

Все suggestions с `source: 'worker'` → должны иметь `work_type_id` соответствующий "Другие работы" (`id=7` если правильно помню по типам работ).

`source: 'store_director'` — может быть любой work_type (директор может предлагать редактирование подзадачи в любом типе).

### 5.4. Translations namespace + переименование

**Файл:** `messages/ru.json` + `messages/en.json`

В namespace `screen.subtasksModeration`:
- `page_title`: "Модерация подзадач" → **"Предложения подзадач"**
- `page_subtitle`: добавить пояснение «Подзадачи, предложенные сотрудниками и управляющими магазинов»
- Добавить:
  - `source.worker`: "От сотрудника"
  - `source.store_director`: "От управляющего"
  - `source.label`: "Источник"

Sidebar label обновить в `nav.subtasks_moderation` → "Предложения подзадач".

### 5.5. UI правки (минимальные — V0 сделает остальное в V0-PLAN-2)

В существующем `components/features/tasks/subtasks-moderation.tsx`:
- Source badge на каждой карточке (если есть отдельный компонент Card render — добавить chip с source label)
- Если нет места — V0 переоформит в V0-PLAN-2

## Verification

- `tsc --noEmit` zero errors
- Открыть `/subtasks/moderation` → каждая карточка показывает source badge
- Title страницы и breadcrumb показывают «Предложения подзадач»
- В sidebar пункт меню переименован
