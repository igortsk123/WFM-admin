# CLAUDE.md — WFM Admin

> Тонкий always-loaded entry point для Claude Code в этом репо. Подробности — в `.claude/rules/` (auto-load по paths).

## Что это

Web-админка WFM (Workforce Management) для ритейла. Next.js 15 / React 19 / TypeScript strict / Tailwind v4 / shadcn-ui (new-york). Mobile-first responsive.

## Как устроен процесс генерации

Репо в two-tool режиме:
- **Claude** делает foundation (types / API / mocks / i18n / page-wrappers / fixes)
- **V0** делает UI-компоненты в `components/features/<feature>/`

Подробности процесса (split workflow / patterns / chat audit / tech debt) — во внешнем playbook:

```
C:/Users/SPECTRE/wfm/admin/V0/
├── WORKFLOW.md                       — split-workflow Claude/V0
├── TECH-DEBT.md                      — non-критичные warnings
├── _claude-only/INDEX.md             — Tier 0 entry point для playbook
├── _claude-only/CHAT-AUDIT.md        — статус всех 42 экранов
├── _claude-only/PATTERNS.md          — 7 foundation patterns
├── 00-system/project-instructions-*  — Project Instructions для V0 (НЕ для Claude)
└── 06-screens-m0/, 07-..., 08-..., 09-...  — V0 промпты по экранам
```

При работе в новой сессии, начни с `_claude-only/INDEX.md`.

## Где доменные модели

`C:/Users/SPECTRE/WFM/.memory_bank/` — общий memory bank всего проекта (web + mobile + backend). Для админки релевантно:

- `domain/task_model.md`, `task_states.md`, `user_roles.md`, `shift_model.md` — read-only бизнес-модели
- `backend/api_tasks.md`, `api_users.md`, `api_shifts.md`, `api_notifications.md` — REST контракты (мы их моделируем в `lib/api/`)
- `web/` — папка веб-специфичных требований
- `product_brief.md` — общий бизнес-контекст

**НЕ трогаем:** `mobile/`, `backend/patterns/` — чужая область.

## Команды

```bash
pnpm install              # deps
npx tsc --noEmit          # typecheck (быстрый)
npx next build            # production build (полная проверка)
pnpm run dev              # dev server
```

## Структура repo

```
app/                          # Next.js App Router
  [locale]/                   # next-intl localePrefix='as-needed'
    (admin)/                  # admin-group (sidebar layout)
      dashboard/, tasks/, employees/, stores/, ...
    (auth)/                   # pre-auth (login)
    layout.tsx                # NuqsAdapter + NextIntl + Auth + Sidebar providers
    page.tsx                  # redirect to /dashboard
  agent/                      # AGENT role isolated cabinet (отдельный layout)
components/
  ui/                         # shadcn primitives — НЕ редактировать
  shared/                     # reusable бизнес-компоненты (PageHeader, KpiCard, etc.)
  features/<feature>/         # feature-specific (V0 пишет сюда)
lib/
  types/                      # domain types (Task, User, Store, ...)
  api/                        # async-функции (mock), single integration point
  mock-data/                  # read-only, импорт ТОЛЬКО в lib/api/
  constants/                  # routes.ts (typed routes)
messages/
  ru.json + en.json           # next-intl translations
i18n/                         # next-intl config (routing, navigation)
middleware.ts                 # locale detection
```

## Critical rules (детали в `.claude/rules/`)

- **TypeScript strict, no `any`** — `code-standards.md`
- **Semantic Tailwind tokens only** — `ui-rules.md` (никаких `bg-white`, `text-gray-*`)
- **t() БЕЗ defaultValue** — `i18n-rules.md` (это react-i18next API, не next-intl)
- **mock-data только в lib/api/** — `api-rules.md`
- **Verify shared-components props before use** — `shared-components.md` (TaskStateBadge.state vs ReviewStateBadge.reviewState и т.п.)

## Что НЕ делать

- НЕ хардкодить русские строки в JSX — только через next-intl
- НЕ импортировать `lib/mock-data/` напрямую в компоненты
- НЕ редактировать `components/ui/` (shadcn — добавляй варианты в `components/shared/`)
- НЕ менять `app/[locale]/page.tsx` — это redirect на dashboard, не nav-hub (nav-hub живёт в `(admin)/navigation/page.tsx`)
- НЕ создавать дубликаты API-функций — проверяй `lib/api/index.ts` перед добавлением
