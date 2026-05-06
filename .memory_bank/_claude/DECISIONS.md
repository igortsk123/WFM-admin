# Architectural Decisions Log — WFM Admin

> Реестр принятых решений по проекту админки. Формат: дата, решение, почему, альтернативы (если рассматривали), на что влияет.
>
> Цель: при возврате через N недель/месяцев не переоткрывать дискуссии. Если хочешь оспорить решение — добавь новую запись «отменяет такое-то».

---

## [2026-05-02] Split-workflow Claude + V0

**Решение:** Foundation (types/API/mocks/i18n/page-wrappers/fixes) делает Claude. UI-компоненты (`components/features/<feature>/`) делает V0.

**Почему:** V0 чат на feature-screen стоил $5 (chat 21), 55% денег уходило на discovery/debugging/mechanical работу. Юзер на pay-as-you-go в V0 Pro, на Claude — MAX-подписка $200 (ресурс достаточен).

**Альтернативы:** V0 делает всё (как было до chat 22) — отвергнуто, дорого. Claude делает всё (включая UI) — отвергнуто, V0 объективно сильнее в shadcn-композиции и mobile-responsive.

**Влияет на:** `wfm/admin/V0/WORKFLOW.md`, branch naming (`claude/<feature>-foundation` vs `v0/<auto>`), правило «не запускать V0-чат пока foundation не смерджен в main».

**Метрика:** chat 22 (split) — $1.3 vs chat 21 (V0-only) — $5. Снижение 74%.

---

## [2026-05-02] Patch ≠ Patch — extension classification

**Решение:** Если `XXa-...-patch.md` промпт добавляет **новые поля API/types / новый i18n namespace / новые tabs / Dialog-flows / actions** — это **extension**, не patch. Foundation от Claude всё равно нужен.

**Почему:** Chat 23a назывался patch но добавил 3 таба + новый Dialog + 7-критериев rating — V0 потратил $3 на это (~$1.5 на самостоятельно сделанное foundation). Если бы я сделал foundation заранее, было бы $1.5.

**Влияет на:** `_claude-only/CHAT-AUDIT.md` колонка `pattern` — для всех patch-файлов 24a, 34a, 35a, 36a, 37a, 38a, 44a — оценить являются ли они extension.

---

## [2026-05-02] Monolith split threshold = 600 строк

**Решение:** Компоненты >600 строк → план разбить на sub-components (records в `TECH-DEBT.md`). Текущие монолиты (task-form 1778, task-detail 1416, tasks-list 1182, dashboard 1013, employees-list 1931, employee-create 1442) — отложенный refactor.

**Почему:** PATCH-чаты на 1500+-строчные монолиты дороже из-за discovery — V0 читает файл 5+ чанков. Chat 22a — $4, chat 23a — $3, прежде всего из-за размера.

**Влияет на:** `code-standards.md` (правило размера), `TECH-DEBT.md` (cleanup pass с monolith split промптом).

**Когда чистим:** один dedicated cleanup-batch когда наберётся 4+ монолита (уже есть 6).

---

## [2026-05-02] Cleanup batch threshold = 10 пунктов

**Решение:** Накапливаем non-критичные warnings (unused imports, prefer-const, deprecated patterns) в `TECH-DEBT.md`. Когда секция «Cleanup #N» набирает 10+ пунктов — гоним V0-чат «cleanup pass».

**Почему:** V0 на 1 unused-import fix = $0.5+. Batch 10+ за один прогон ≈ $1.5-2. Не блокируют билд (warning, не error). Нет смысла чинить по одному.

**Влияет на:** `TECH-DEBT.md` структура, workflow «после каждого V0-PR проверять билд → копировать warnings туда».

---

## [2026-05-02] Pattern-based foundation (7 patterns)

**Решение:** 42 оставшихся V0-чатов классифицированы по 7 паттернам в `_claude-only/PATTERNS.md`:
1. `list-with-filters` (employees, stores, work-types, ...)
2. `detail-screen` (employee, store, shift, ...)
3. `crud-form` (create wizard / edit form)
4. `settings-screen` (profile, organization, ...)
5. `report-dashboard` (KPI, plan-fact, ...)
6. `modal-flow / wizard` (login, hints-upload)
7. `agent-cabinet` (AGENT role isolated)

Foundation work предсказуем по pattern: какие types/API/i18n/page-wrappers нужны.

**Почему:** Без классификации каждый foundation = «придумываю с нуля». Pattern шаблон = 30-40% быстрее.

**Влияет на:** `_claude-only/CHAT-AUDIT.md` (колонка `pattern`), все foundation-PR следуют шаблону.

---

## [2026-05-02] Memory bank разграничение web vs mobile

**Решение:** `WFM/.memory_bank/` остаётся общим (mobile + backend + web). Для веб-админки добавлены entry points:
- `WFM-admin/CLAUDE.md` (тонкий ~95 строк, всегда загружается в репо)
- `WFM-admin/.claude/rules/*.md` (auto-load по `paths:`)
- `wfm/admin/V0/_claude-only/INDEX.md` (Tier 0 для playbook)
- `WFM/.memory_bank/INDEX-WEB.md` (pointer на релевантные domain/api файлы)

**Почему:** Сократить токены при работе в админке. Раньше грузил весь `WFM/CLAUDE.md` (627 строк, mobile-heavy). Теперь точечно.

**Альтернативы:** 3-tier структура для всего `.memory_bank/` (как у health-card) — отвергнуто, мобильная часть не наша область, не имеем права рефакторить.

**Влияет на:** при новой сессии — открывать `_claude-only/INDEX.md`, не общий CLAUDE.md.

---

## [2026-05-02] V0 Project Instructions ≠ Claude `.claude/rules/`

**Решение:** PI в `wfm/admin/V0/00-system/project-instructions-{1..6}.md` — для V0-чатов. Claude (я) **НЕ** грузит их в свой контекст.

Параллельно созданы `WFM-admin/.claude/rules/*.md` — для меня в Cursor/VSCode/CLI auto-load. Дублирующее содержимое — допустимо (PI в виде отдельного формата для V0).

**Почему:** V0 не понимает frontmatter `paths:`. Claude Code не понимает «загружай project-instructions из external folder». Разные среды, разные правила.

**Влияет на:** при изменении правила (например новый known-gotcha) — обновлять и PI (для V0), и `.claude/rules/` (для Claude).

---

## [2026-05-02] PR-driven workflow (без `plans/`)

**Решение:** Не используем `plans/<slug>.md` workflow. Каждое изменение = PR (или серия PR-ов).

**Почему:** Health-card project использует plan-first workflow (план в файл → ждать «деплой» → выполнить). Это полезно для медленных AI-only итераций. Мы работаем гибрид (Claude в CLI + V0 в чате) с быстрым feedback через билд → не нужен формальный план в файле, контекст в PR description.

**Альтернативы:** Plan-driven (как health-card) — отвергнуто, лишний overhead для нас.

**Влияет на:** только PR-style работа, без `plans/<slug>.md` файлов.
