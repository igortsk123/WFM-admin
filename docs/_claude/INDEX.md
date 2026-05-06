# WFM Admin Playbook — INDEX (Tier 0)

> Always-read pointer. С него начинай новую сессию.

## Текущее состояние (обновляется руками после каждого чата)

- **Последний завершённый V0:** 28 (schedule) — V0 PR #65 в main
- **Foundations в main:** до chat 33b (#73) — 26/27/28/29/30/31/32/33/33b готовы
- **V0 готов к запуску:** 29 (shift-detail), 30 (work-types), 31 (zones), 32 (positions), 33 (hints), 33b (regulations) — 6 чатов ждут запуска
- **Активные V0-чаты:** 26/27/28 закрыты
- **Дата:** 2026-05-03

## Decision tree — что читать

| Юзер пишет | Открыть в этом порядке |
|---|---|
| «делаем foundation для chat N» | 1. `_claude-only/CHAT-AUDIT.md` (строка N — pattern, foundation Y/N, reuse_from)<br>2. `_claude-only/PATTERNS.md` (нужный pattern целиком)<br>3. V0-промпт `06-screens-m0/N-*.md` или `07-...`/`08-`/`09-` |
| «продолжаем chat N в V0» | 1. `_claude-only/CHAT-AUDIT.md` (статус foundation для N — должен быть смерджен)<br>2. V0-промпт N (проверить аннотацию CONTEXT-PACK) |
| «билд упал на Vercel» | 1. лог ошибки от юзера<br>2. `WFM-admin/.claude/rules/` (auto-load уже сработал) — открой релевантное правило по пути файла<br>3. `TECH-DEBT.md` (чтобы записать non-критичные warnings) |
| «cleanup pass» | 1. `TECH-DEBT.md` Active backlog — есть ли 10+ пунктов<br>2. промпт «cleanup pass» оттуда |
| «как мы работаем» | `WORKFLOW.md` |
| «сравни ход с прошлым разом» / «текущая статистика по экранам» | `_claude-only/CHAT-AUDIT.md` |
| «сколько ушло на V0 за последний чат» | юзер обычно сообщает, добавить в CHAT-AUDIT |

## Правила split-workflow (короткая версия)

1. **Claude foundation-PR → мердж в main** (types/API/i18n/page-wrapper/stub)
2. **V0-чат запускается ТОЛЬКО после мерджа foundation** — иначе V0 продублирует работу (см. урок чат 23 → закрыли мой PR #48)
3. **После V0 PR** — `npx tsc --noEmit` + `npx next build` локально → если красный, точечный fix-PR от Claude
4. **Warnings → `TECH-DEBT.md`** (не V0, не сейчас) — чистим раз в 5 чатов

## Patch ≠ Patch (урок чата 23a)

Если `XXa-...-patch-pro.md` промпт добавляет:
- новые поля API/types
- новый i18n namespace
- новые tabs / Dialog-flows / actions

— это **extension**, не patch. Foundation от Claude всё равно нужен ($1.5 экономии vs если V0 делает сам).

## Файлы playbook

| Файл | Назначение |
|---|---|
| `INDEX.md` (этот) | Tier 0 entry point |
| `WORKFLOW.md` | Полный split-workflow процесс |
| `_claude-only/PATTERNS.md` | 7 foundation patterns (list-with-filters / detail / crud-form / settings / report / wizard / agent-cabinet) |
| `_claude-only/CHAT-AUDIT.md` | Таблица 42 чатов (pattern, foundation, reuse_from, done статус) |
| `_claude-only/DECISIONS.md` | Реестр архитектурных решений с датой и обоснованием |
| `TECH-DEBT.md` | Non-критичные warnings + monolith split backlog |
| `00-system/project-instructions-{1..6}.md` | Project Instructions для V0 (не для Claude) |
| `06-screens-m0/`, `07-screens-priority/`, `08-screens-stretch/`, `09-screens-freelance/` | V0-промпты по экранам |

## Path-scoped rules (auto-load в Claude Code)

Внутри репо `WFM-admin/.claude/rules/` — 6 файлов с frontmatter `paths:`. Claude Code автоматически грузит их когда я редактирую matching файлы:

| Файл | paths | Когда грузится |
|---|---|---|
| `agent-workflow.md` | (always) | Любая сессия в репо WFM-admin |
| `code-standards.md` | `**/*.{ts,tsx}` | Редактируешь TypeScript |
| `ui-rules.md` | `app/**/*.tsx`, `components/**/*.tsx`, `globals.css` | Редактируешь UI |
| `i18n-rules.md` | `**/*.{ts,tsx}`, `messages/**/*.json` | Редактируешь компонент или i18n |
| `api-rules.md` | `lib/api/**`, `lib/types/**`, `lib/mock-data/**` | Редактируешь API слой |
| `shared-components.md` | `components/features/**/*.tsx`, `components/shared/**/*.tsx` | Редактируешь feature-компонент |

**В этом INDEX перечислены чтобы помнить что они есть.** Не нужно копировать содержимое — Claude Code сам подгружает по paths.

## Где код / domain

- **Код админки:** `C:/Users/SPECTRE/WFM-admin/` (есть свой `CLAUDE.md` + `.claude/rules/`)
- **Доменные модели + API контракты:** `C:/Users/SPECTRE/WFM/.memory_bank/domain/`, `backend/api_*.md`
- **Auto-memory:** `C:/Users/SPECTRE/.claude/projects/c--Users-SPECTRE-WFM/memory/`

## Когда обновлять INDEX.md

- После каждого закрытого чата → обновить «Последний завершённый чат» + «Следующий»
- Если меняется workflow — апдейт decision tree
- Не нагружать новыми файлами — INDEX.md должен оставаться < 100 строк
