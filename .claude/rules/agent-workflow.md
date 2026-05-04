---
description: Split-workflow Claude+V0 для генерации экранов админки. ALWAYS loaded.
---

# Workflow для WFM Admin

Этот репозиторий генерируется в two-tool режиме:
- **Claude** делает foundation (types / API / mocks / i18n / page-wrappers / fixes)
- **V0** делает UI-компоненты (`components/features/<feature>/<name>.tsx`)

Подробности процесса — в `C:/Users/SPECTRE/wfm/admin/V0/WORKFLOW.md`.

## Master playbook

Внешняя папка с V0-промптами, foundation patterns, аудитом чатов и tech-debt:
`C:/Users/SPECTRE/wfm/admin/V0/`

При работе над новым экраном начинай с `_claude-only/INDEX.md` — там decision tree.

## Branch naming

| Тип | Pattern | Кто создаёт |
|---|---|---|
| Foundation от Claude | `claude/<feature>-foundation` | Claude (я) |
| Bug fix от Claude | `claude/<short-fix>` | Claude (я) |
| V0 generated | `v0/<auto-name>` | V0 |
| Cleanup batch | `claude/cleanup-N` | Claude (я) |

## PR rules

- Squash-merge в `main`
- НЕ запускать V0-чат пока foundation-PR не смерджен в main
- После V0 PR проверять `npx tsc --noEmit` + `npx next build` локально
- Warnings (unused imports, prefer-const) → накапливаем в `wfm/admin/V0/TECH-DEBT.md`, чистим раз в 5 чатов

## Команды

```bash
pnpm install              # deps
npx tsc --noEmit          # typecheck
npx next build            # production build
pnpm run dev              # dev server (port 3000)
```

## Что НЕ делать

- НЕ трогать `app/[locale]/page.tsx` (это redirect на /dashboard, не nav-hub)
- НЕ создавать дубликаты API-функций (в `lib/api/index.ts` уже есть re-exports — проверяй сначала)
- НЕ хардкодить русские строки в JSX — только через `useTranslations()` / `getTranslations()`
- НЕ импортировать из `lib/mock-data/` напрямую в компоненты — только через `lib/api/`
