# WFM-admin docs

Все документы и материалы проекта в одном месте — репо это home base.

## Структура

```
docs/
├── README.md            ← вы здесь
├── _claude/             — Claude internal (workflow, patterns, decisions)
├── business/            — бизнес-контекст (ревью клиента, требования, best practices)
└── screens/             — скрины UI (от user'а — для review/issues, от LAMA — для reference)
```

## Куда что класть

**Скрины UI / баги / референсы** → `docs/screens/`
- Скрины которые user шлёт в чат как контекст
- Reference-скрины из других систем (LAMA, конкуренты)
- Имя файла — оригинальное от телеграма (`photo_2026-05-06_*.jpg`) или семантическое (`tasks-review-overflow.png`)

**Бизнес-документы** → `docs/business/`
- Ревью клиента (как `операционка_v1.txt`)
- Best practices, гайдлайны
- Транскрипты звонков с user'ом

**Claude workflow / planning** → `docs/_claude/`
- Foundation patterns
- Chat audit / planning (operations-v1/MY-PLAN-*.md)
- API contracts
- DECISIONS.md — крупные архитектурные решения

## Старые места (deprecated)

До 2026-05-06 материалы лежали разбросано:
- `C:/Users/SPECTRE/wfm/admin/V0/` — V0 промпты + `_claude-only/` workflow
- `C:/Users/SPECTRE/wfm/admin/docs/` — скрины + бизнес-доки

**Эти папки больше не используем.** Всё новое — сразу в `WFM-admin/docs/`.

V0-промпты остались в `wfm/admin/V0/09b-operations-v1/` — это **рабочая область V0** (не наш repo, V0 туда смотрит). Когда V0 выпустит чат — он merge'ится в наш main и сюда не дублируется.

## Claude memory

**Системная память Claude** (для поддержания контекста между сессиями) живёт **отдельно** от репо в:
`C:/Users/SPECTRE/.claude/projects/c--Users-SPECTRE-WFM/memory/`

Её не надо trogать руками — Claude сам её обновляет.
