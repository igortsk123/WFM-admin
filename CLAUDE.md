# CLAUDE.md — WFM Admin

> Тонкий always-loaded entry point для Claude Code в этом репо.
> Подробности — в `.memory_bank/_claude/` (полный manifest) и `.claude/rules/` (auto-load по paths).

## Старт сессии

**Всегда начинать с:** [.memory_bank/_claude/INDEX.md](.memory_bank/_claude/INDEX.md) — Tier 0 decision tree.

Оттуда дальше в зависимости от задачи:
- Текущее состояние → `_claude/PROJECT-STATE.md`
- Foundation для нового экрана → `_claude/PATTERNS.md`
- Новое API / меняешь моки → `_claude/SYNC-WITH-BACKEND.md` (сверять с `domain/` и `backend/apis/`)
- Деплой / CI → `_claude/DEPLOY.md`
- Терминология → `_claude/PREFERENCES.md`

## Что это

Web-админка WFM (Workforce Management) для FMCG-ритейла. Прод: https://wfm.prodstor.com.

Stack: Next.js 15 (App Router) / React 19 / TypeScript strict / Tailwind v4 / shadcn-ui (new-york). Mobile-first responsive. next-intl с `localePrefix='as-needed'` (RU default, `/en` для демо).

## Как устроен процесс генерации

Two-tool режим (зафиксирован с chat 22):
- **Claude** — foundation (types / API / mocks / i18n / page-wrappers / fixes)
- **V0** — UI-компоненты в `components/features/<feature>/`

Подробности split-workflow / patterns / monolith threshold / cleanup batch threshold — в `_claude/PROJECT-STATE.md` секция «Архитектурные policies».

## Memory bank

Единая точка правды — `.memory_bank/` (под git вместе с репо). Shared между 3 продуктами WFM:

- **WFM admin (этот репо, мой scope)** — мокированный, генерируется Claude+V0
- **WFM mobile (живой)** — iOS+Android в production, описан в `.memory_bank/mobile/`
- **WFM backend (живой)** — FastAPI микросервисы, описан в `.memory_bank/backend/`

`mobile/` и `backend/` — **живой справочник**, не моя область, но использую как референс чтобы admin не был оторван от реальности (правило в `_claude/SYNC-WITH-BACKEND.md`).

Релевантное для admin:
- `domain/task_model.md`, `task_states.md`, `user_roles.md`, `shift_model.md` — read-only бизнес-модели
- `backend/apis/api_*.md` — REST контракты (моделируем в `lib/api/`)
- `product_brief.md` — общий бизнес-контекст

## Команды

```bash
pnpm install              # deps
npx tsc --noEmit          # typecheck (быстрый)
npx next build            # production build (полная проверка)
pnpm run dev              # dev server
```

Деплой автоматический — push в `main` → GitHub Actions → blue-green swap. Подробности в `_claude/DEPLOY.md`.

## Структура repo

```
app/                          # Next.js App Router
  [locale]/                   # next-intl localePrefix='as-needed'
    (admin)/                  # admin-group (sidebar layout)
      dashboard/, tasks/, employees/, stores/, schedule/, ...
    (auth)/                   # pre-auth (login)
    layout.tsx                # NuqsAdapter + NextIntl + Auth + Sidebar providers
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
middleware.ts                 # locale detection + порт-strip
```

## Critical rules (детали в `.claude/rules/` — auto-load по paths)

- **TypeScript strict, no `any`** — `code-standards.md`
- **Semantic Tailwind tokens only** — `ui-rules.md` (никаких `bg-white`, `text-gray-*`)
- **t() БЕЗ defaultValue** — `i18n-rules.md` (это react-i18next API, не next-intl)
- **mock-data только в lib/api/** — `api-rules.md`
- **Verify shared-components props before use** — `shared-components.md` (TaskStateBadge.state vs ReviewStateBadge.reviewState и т.п.)
- **Sync с domain/ и backend/apis/ перед новыми моками** — `_claude/SYNC-WITH-BACKEND.md`
- **🔴 При ЛЮБОМ изменении model — синхронизировать backend wrappers** — `backend-sync.md`
  (`lib/api/_backend-types.ts` + `lib/api/<feature>.ts` raw wrapper + `MIGRATION-NOTES.md`).
  Иначе backend-разработчик получит неактуальную карту и swap сломается.

## Что НЕ делать

- НЕ хардкодить русские строки в JSX — только через next-intl
- НЕ импортировать `lib/mock-data/` напрямую в компоненты
- НЕ редактировать `components/ui/` (shadcn — добавляй варианты в `components/shared/`)
- НЕ менять `app/[locale]/page.tsx` — это redirect на dashboard
- НЕ создавать дубликаты API-функций — проверяй `lib/api/index.ts` перед добавлением
- НЕ выдумывать новые статусы / поля / enum-values без проверки `.memory_bank/domain/`
