# Foundation patterns для типовых screen'ов

> Что Claude делает в foundation-PR в зависимости от типа экрана. Конкретные types/mocks/API определяются по V0-промпту, но структура одинакова.

---

## Pattern 1 — list-with-filters

Экраны: список с фильтрами, поиском, пагинацией. Опционально bulk-actions.

**Примеры:** employees-list, stores-list, work-types, zones, positions, hints, integrations, audit, applications-list, services-list, agents-list, payouts-list, no-show.

### Foundation work (Claude)

- **Types**: интерфейс entity (если ещё нет в lib/types), интерфейс `<Entity>ListParams` для фильтров (search, status, page, page_size, фильтр-поля), enriched-тип `<Entity>WithRelated` если в строке нужны joined-данные (assignee.full_name, store.name).
- **Mock**: `lib/mock-data/<entities>.ts` с 10-20 записями (если ещё нет — обычно есть из ранних чатов, проверить).
- **API**: 
  - `get<Entities>(params)` → `Promise<ApiListResponse<T>>` — фильтрация + сортировка + пагинация in-memory
  - `archive<Entity>(id)` или другие entity-action функции
  - `bulk<Action>(ids, ...)` если есть bulk
- **i18n**: namespace `screen.<entityList>.*` — заголовок, фильтр-лейблы, колонки, empty/error states, action-buttons.
- **Page wrapper**: `app/[locale]/(admin)/<entities>/page.tsx` — server component с `<Suspense fallback={<Skeleton />}><EntityList /></Suspense>`.
- **Nav link**: добавить в `navigation/page.tsx` если ещё нет.

### V0 получает CONTEXT-PACK

```
- Types: <Entity>, <Entity>ListParams, <Entity>WithRelated → @/lib/types или @/lib/api/<feature>
- API: get<Entities>(params), archive<Entity>(id) → @/lib/api/<feature>
- i18n: screen.<entityList>.*
- Page wrapper: app/[locale]/(admin)/<entities>/page.tsx — рендерит <EntityList />
- Reuse: components/features/tasks/tasks-list.tsx — образец паттерна (filters + table + bulk)
- Pattern: pattern-list-with-filters
```

V0 строит только `components/features/<feature>/<entity>-list.tsx` (+ опционально dialog-content sub-компоненты).

---

## Pattern 2 — detail-screen

Экраны: подробная страница entity с табами, sidebar, actions.

**Примеры:** employee-detail, store-detail, shift-detail, application-detail, agent-detail, regulation-detail.

### Foundation work (Claude)

- **Types**: `<Entity>Detail` extends `<Entity>` с related-данными (assignment, history, related_entities). Sub-types для табов (history events, audit entries и т.п.).
- **Mock**: одна-две rich-записи в существующем mock-файле для демо. Например `t-1042` для task-detail.
- **API**:
  - `get<Entity>ById(id)` → `Promise<ApiResponse<<Entity>Detail>>`
  - Actions: `archive`, `restore`, `transfer`, `approve`, `reject` и т.п.
  - `get<Entity>History(id)` если история отдельным запросом
- **i18n**: namespace `screen.<entityDetail>.*` — табы, sidebar-cards, dialogs, action-buttons.
- **Page wrapper**: `app/[locale]/(admin)/<entities>/[id]/page.tsx`. Server component, опционально prefetch + notFound() если запись не существует.

### V0 получает CONTEXT-PACK

```
- Types: <Entity>Detail, <Entity>HistoryEvent → @/lib/types
- API: get<Entity>ById, archive, transfer, approve, reject → @/lib/api/<feature>
- i18n: screen.<entityDetail>.*
- Page wrapper: app/[locale]/(admin)/<entities>/[id]/page.tsx — server component с <Suspense>
- Reuse: components/features/tasks/task-detail.tsx — образец (tabs + sidebar + dialogs)
- Pattern: pattern-detail-screen
```

V0 строит `components/features/<feature>/<entity>-detail.tsx` + dialog-content sub-компоненты в той же папке.

---

## Pattern 3 — crud-form

Экраны: форма create/edit с zod validation, react-hook-form, sticky footer.

**Примеры:** employee-create, application-new, work-type-create, zone-create, position-create, hint-create, regulation-create.

### Foundation work (Claude)

- **Types**: `<Entity>CreateData`, `<Entity>UpdateData` — типы payload (могут отличаться от entity).
- **Mock**: ничего нового обычно (форма пишет в общий MOCK_<Entities>).
- **API**:
  - `create<Entity>(data)` → `Promise<ApiMutationResponse<<Entity>>>`
  - `update<Entity>(id, data)` → `Promise<ApiMutationResponse>`
  - `get<Entity>ById(id)` (для edit-mode)
- **i18n**: namespace `screen.<entityForm>.*` — section-headers, label, hints, validation-messages, buttons.
- **Page wrappers**:
  - `app/[locale]/(admin)/<entities>/new/page.tsx` — `<EntityForm mode="create" />`
  - `app/[locale]/(admin)/<entities>/[id]/edit/page.tsx` — server prefetch via `get<Entity>ById` → `<EntityForm mode="edit" initialValues={...} />`

### V0 получает CONTEXT-PACK

```
- Types: <Entity>, <Entity>CreateData → @/lib/types
- API: create<Entity>, update<Entity>, get<Entity>ById, get<RelatedEntities> для combobox'ов → @/lib/api/<feature>
- i18n: screen.<entityForm>.*
- Page wrappers: new/page.tsx и [id]/edit/page.tsx — создают TaskForm / EmployeeForm / etc.
- Reuse: components/features/tasks/task-form.tsx — образец (sections + sidebar + sticky footer + zod)
- Pattern: pattern-crud-form
```

V0 строит `components/features/<feature>/<entity>-form.tsx`.

---

## Pattern 4 — settings-screen

Экраны: настройки конфига, single-page form, без sticky footer (autosave per-section или явный Save).

**Примеры:** profile, organization, integrations-config, hr-sync, freelance-config, external-hr-config.

### Foundation work (Claude)

- **Types**: `<Settings>Config`, sub-типы для секций.
- **Mock**: единичная запись (например `MOCK_ORGANIZATION_CONFIG`).
- **API**: `get<Settings>Config()` + `update<Settings>(patch)` — возвращает обновлённый конфиг.
- **i18n**: namespace `screen.<settings>.*` — section-headers, labels, hints, buttons.
- **Page wrapper**: `app/[locale]/(admin)/settings/<feature>/page.tsx` или `app/[locale]/(admin)/<feature>/page.tsx`.

### V0 получает CONTEXT-PACK

Аналогично crud-form.
Reuse: при наличии — образец из существующих settings-экранов.

---

## Pattern 5 — report-dashboard

Экраны: дашборды с графиками, KPI-карточками, фильтрами по периоду/скоупу.

**Примеры:** reports-kpi, reports-plan-fact, reports-compare, network-goals, freelance-dashboard, agent-dashboard.

### Foundation work (Claude)

- **Types**: `<Report>Data` — структура агрегата (rows, totals, by_period, by_format).
- **Mock**: `lib/mock-data/<report>.ts` с реалистичной агрегатной структурой.
- **API**: `get<Report>(period, scope, filters)` → `Promise<ApiResponse<<Report>Data>>`. Опционально `export<Report>(format)`.
- **i18n**: namespace `screen.<report>.*` — заголовки, period-labels, KPI-titles, chart-labels.
- **Page wrapper**: server component `<Suspense>`.

### V0 получает CONTEXT-PACK

```
- Types: <Report>Data, sub-types → @/lib/types
- API: get<Report>(period, scope) → @/lib/api/<feature>
- i18n: screen.<report>.*
- Reuse: components/features/dashboard/network-health-tab.tsx или components/shared/health-gauge.tsx (если semicircle gauge нужен)
- Pattern: pattern-report-dashboard
```

V0 строит `components/features/<feature>/<report>-view.tsx` + chart-sub-компоненты.

---

## Pattern 6 — modal-flow / wizard

Экраны: пошаговый wizard, login-flow, hints-upload, application-new.

**Примеры:** login (chat 15), hints-upload (43), application-new (54).

### Foundation work (Claude)

- **Types**: `<Wizard>State`, payload-типы для каждого шага.
- **API**: per-step actions + final submit.
- **i18n**: per-step namespace.

V0 строит wizard как чистую UI-композицию — Claude не нужен в большинстве случаев. Foundation минимальный.

---

## Pattern 7 — agent-cabinet (отдельный layout)

Экраны: AGENT role isolated cabinet (chats 61a-61d).

### Foundation work (Claude)

- Layout: `app/[locale]/agent/layout.tsx` (если ещё нет)
- Types и API уже существуют в `lib/api/agent-cabinet.ts`
- i18n namespace `screen.agent<Section>.*`

V0 строит UI для каждой страницы кабинета. Минимальная foundation — большинство уже сделано в раннем чате.

---

## Уровень 2 — reuse через дубликат

Когда новый экран на 80%+ повторяет паттерн уже существующего, V0-промпт начинается со «Скопируй X.tsx, замени Y → Z». См. `CHAT-AUDIT.md` колонку `reuse_from`.
