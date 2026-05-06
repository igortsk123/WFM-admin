# WFM Memory Bank — ЕДИНАЯ ТОЧКА ПРАВДЫ

⚠️ **Сюда пишу всё, отсюда читаю всё.** Не полагаюсь на системную Claude memory — там только короткие pointer'ы на файлы здесь. Реальный контекст, решения, скрины, бизнес-доки — только тут, в репо, под git.

🌉 **Этот memory bank shared между 3 продуктами WFM:**
- **WFM admin (наш)** — мой scope, мокированный, я работаю над ним
- **WFM mobile (живой)** — iOS+Android в production, описан в `mobile/`
- **WFM backend (живой)** — FastAPI микросервисы, описан в `backend/`

`mobile/` + `backend/` — **живой справочник**. Использую как референс чтобы admin не был оторван от реальности и backend смог легко подключить реальное API к моим мокам. Подробнее: [`_claude/SYNC-WITH-BACKEND.md`](./_claude/SYNC-WITH-BACKEND.md).

## Структура

```
.memory_bank/
├── README.md              ← вы здесь
├── CLAUDE.md              — корневой manifest всего проекта (web + mobile + backend)
├── INDEX-WEB.md           — entry point для admin/web работы
│
├── domain/                — модели не зависящие от платформы (task, user, shift, auth)
├── backend/               — API contracts + guides + patterns + services
├── web/admin/             — стек и решения по веб-админке
├── mobile/                — iOS+Android architecture, UI patterns
├── analytics/             — events (firebase, server, mobile)
├── guides/                — documentation_style, lang, ci_cd
├── patterns/              — paradigms cross-platform
├── plans/                 — активные планы
├── completed_plans/       — архив выполненных
├── product_brief.md       — целевой рынок, задачи системы
├── product_roadmap.md     — фичи и приоритеты
│
├── _claude/               — Claude internal (workflow, V0 patterns, MY-PLANs, decisions для admin)
├── business/              — ревью клиента, best practices, технические заметки
└── screens/               — UI скрины от user'а (баги, reference из LAMA)
```

## Куда тебе кидать файлы

| Что | Куда |
|---|---|
| Скрин бага UI | `screens/` |
| Скрин reference из другой системы | `screens/` |
| Бизнес-документ (ревью, требования) | `business/` |
| Транскрипт звонка | `business/` |

## Куда я (Claude) пишу

| Что | Куда |
|---|---|
| Архитектурное решение | `_claude/DECISIONS.md` |
| Foundation план для V0 чата | `_claude/operations-vN/MY-PLAN-*.md` |
| Domain change (новое поле, состояние) | обновить `domain/<entity>.md` |
| API change | обновить `backend/apis/api_<entity>.md` |
| План на больше 3 шагов | новый файл в `plans/`, после выполнения → `completed_plans/` |
| Recurring V0 failure pattern | `_claude/V0-FAIL-PATTERNS.md` |
| Deploy / CI/CD изменения | `backend/guides/cicd.md` или `_claude/DEPLOY.md` |

## Правило

**Перед реализацией фичи** — заглянуть в `domain/` и `backend/apis/`. Это договоры между web/mobile/backend.

**После принятия решения** — зафиксировать в правильном файле и закоммитить.

**Системная Claude memory** (`.claude/projects/.../memory/`) — только короткие pointer'ы на этот memory bank, не дублировать контент.

## Старая локация (deprecated)

До 2026-05-06 memory bank был в `C:/Users/SPECTRE/wfm/.memory_bank/`. Теперь полностью перенесён сюда (`WFM-admin/.memory_bank/`) и развивается через git. Старая папка больше не используется.
