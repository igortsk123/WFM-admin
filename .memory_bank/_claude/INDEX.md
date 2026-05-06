# `_claude/` — Tier 0 entry для Claude

> Начни здесь любую новую сессию по проекту WFM Admin.

## Decision tree

| Сценарий | Что читать |
|---|---|
| **Старт сессии** | [PROJECT-STATE.md](./PROJECT-STATE.md) — что готово, ключевые решения, terminology |
| **Делаешь foundation для нового экрана** | [PATTERNS.md](./PATTERNS.md) → нужный pattern (list-with-filters / detail-screen / crud-form / settings / report / wizard / agent-cabinet) |
| **Review V0 PR** | [V0-FAIL-PATTERNS.md](./V0-FAIL-PATTERNS.md) — 14 повторяющихся ошибок |
| **Деплой / билд упал в CI** | [DEPLOY.md](./DEPLOY.md) — workflow, manual rollback, что НЕ делать руками |
| **Новое API / меняешь моки** | [SYNC-WITH-BACKEND.md](./SYNC-WITH-BACKEND.md) — сначала сверить с `../backend/apis/` (живые контракты) |
| **Хочу проверить терминологию / стиль** | [PREFERENCES.md](./PREFERENCES.md) — terminology, tokens, language, тон |
| **Историческая справка по operations серии MY-PLAN** | [operations-v1/](./operations-v1/) — 10 планов 2026-05-06, выполнено |

## Файлы в `_claude/`

| Файл | О чём | Размер |
|---|---|---|
| `INDEX.md` (этот) | Tier 0 entry | ~80 строк |
| `PROJECT-STATE.md` | Current state, ключевые решения, что готово | ~150 строк |
| `DEPLOY.md` | CI/CD, прод, manual rollback | ~95 строк |
| `PATTERNS.md` | 7 foundation patterns для типовых экранов | ~190 строк |
| `V0-FAIL-PATTERNS.md` | 14 повторяющихся V0 ошибок | ~80 строк |
| `PREFERENCES.md` | Terminology, tokens, style | ~70 строк |
| `SYNC-WITH-BACKEND.md` | Mobile+backend как живой справочник, синхронизация | новый |
| `operations-v1/` | Архив MY-PLAN-1..10 (выполнено, для blame/history) | 10 файлов |

## Path-scoped rules (auto-load в Claude Code)

Внутри репо `WFM-admin/.claude/rules/` — 6 файлов с frontmatter `paths:`. Claude Code автоматически грузит их когда я редактирую matching файлы:

| Файл | paths | Когда грузится |
|---|---|---|
| `agent-workflow.md` | (always) | Любая сессия в репо |
| `code-standards.md` | `**/*.{ts,tsx}` | Редактирую TypeScript |
| `ui-rules.md` | `app/**/*.tsx`, `components/**/*.tsx`, `globals.css` | Редактирую UI |
| `i18n-rules.md` | `**/*.{ts,tsx}`, `messages/**/*.json` | Редактирую компонент или i18n |
| `api-rules.md` | `lib/api/**`, `lib/types/**`, `lib/mock-data/**` | Редактирую API слой |
| `shared-components.md` | `components/features/**/*.tsx`, `components/shared/**/*.tsx` | Редактирую feature-компонент |

**Не нужно копировать содержимое в этот memory bank** — Claude Code сам подгружает.

## Соседние папки в `.memory_bank/`

- `../CLAUDE.md` — root manifest всего проекта WFM (web + mobile + backend)
- `../INDEX-WEB.md` — entry для admin/web work
- `../README.md` — обзор всего memory bank, куда что класть
- `../domain/` — модели не зависящие от платформы (task, user, shift, auth)
- `../backend/apis/` — **живые API contracts** ⚠ используются другими командами, синхронизируй admin под них
- `../mobile/` — **живой mobile проект (production)** ⚠ справочник, не моя область
- `../guides/` — documentation_style, lang, ci_cd
- `../plans/` — активные планы (>3 шагов), `../completed_plans/` — архив
- `../screens/`, `../business/` — куда user кидает контекст

См. [SYNC-WITH-BACKEND.md](./SYNC-WITH-BACKEND.md) для подробностей.
