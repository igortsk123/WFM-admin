# WFM Admin — текущее состояние

**Updated:** 2026-05-06 (после перезда memory bank в репо)

## Где
- **Прод:** https://wfm.prodstor.com (Beyond Violet WFM Admin для FMCG)
- **Repo:** github.com/igortsk123/WFM-admin
- **Сервер:** `root@193.160.208.41`, contaner `wfm-admin` (порт 3004 локально, nginx → 443)
- **Деплой:** GitHub Actions auto при push в main (см. [DEPLOY.md](./DEPLOY.md))

## Что готово к 2026-05-06

### Базовый каркас (V0 чаты 15-63 + cleanup)
- 64 V0 экрана для admin (login, dashboard, tasks, employees, stores, schedule, taxonomy, hints, regulations, notifications, profile, org-settings, integrations, audit, reports, goals, hints-upload, bonus-tasks, payouts, ai-suggestions, ai-chat, network-goals, ai-coach, risk-rules, leaderboards, freelance + agent cabinet)
- Все смерджены в main, build green

### Серия MY-PLAN (мои foundation/cleanup)
| ID | Что |
|---|---|
| MY-PLAN-1 | Реалистичные моки: 18 stores, 100+ users, партнёры (Lama/Левушка/Техпроиздрав) |
| MY-PLAN-2 | Терминология: Привилегии→Зоны, Грейд→Разряд, Архив→Задачи; удалены Доп.задача/SMS/Импорт ЛАМА; phone country picker; breadcrumbs task.title |
| MY-PLAN-3 | Tasks Review + Task Detail: убран text report, фото условный, убрано per-subtask approve, suggest-edit для STORE_DIRECTOR, reject autofill |
| MY-PLAN-4 | formatRelative фикс floor вместо round |
| MY-PLAN-5 | Subtasks moderation foundation: SubtaskSuggestionSource ('worker'\|'store_director') + 12 PENDING моков |
| MY-PLAN-6 | Stores cleanup: header «{type}—{addr}», убрана колонка «Активность смен», working zones add/edit/delete |
| MY-PLAN-7 | Schedule foundation: bug «белое поле» при клике на planned, conflict_reason tooltip, 600+ shifts на май |
| MY-PLAN-8 | Employees: tabs Сотрудники/Архив, доля ставки, Switch invite + Email/Telegram/Max/WhatsApp |
| MY-PLAN-9 | Tasks list: «Создать задачу» работает, компактный date picker |
| MY-PLAN-10 | Task form: убран override, auto-prefill store_id |
| MY-PLAN-11 | LAMA таксономия: 11 зон (id 100-110), 53 категории с zone_id, work-type приоритеты |
| MY-PLAN-12 | Task: editable_by_store + priority |
| MY-PLAN-13 | Shift.shift_kind REGULAR/SUBSTITUTE для подработки |

### Operations V0 (5 чатов из `_claude/operations-v1/`)
- 01: Task distribution `/tasks/distribute`
- 02: Subtasks moderation redesign
- 03: Employees mass-ops bulk bar
- 04: Avatar redesign in employee wizard
- 05: Schedule day-view overlap fix

### Freelance routing engine
- Cross-network pool (agent_id optional, 5 независимых фрилансеров)
- Freelancer detail page `/freelance/freelancers/[id]`
- Mass-select + bulk offer
- TaskOffer + OfferAttempt с tier-окнами TOP3=60м / TOP4-5=30м / REST=15м
- LATE_FALLBACK логика
- Pages: `/freelance/freelancers`, `/freelance/offers`, `/freelance/offers/[id]`

### CI/CD + DevOps
- GitHub Actions auto-deploy (см. [DEPLOY.md](./DEPLOY.md))
- typecheck-gate перед deploy на бесплатных Github runners (~45с)
- Docker blue-green swap с rollback на :prev при failed smoke test
- 2GB swap на сервере (закреплён в /etc/fstab)
- Cert auto-renew через certbot.timer

### Accessibility
- Font scale toggle (M/+10%/+20%/+30%) в TopBar
- WCAG 2.1 SC 1.4.4 compliant

## Ключевые domain-решения

### Роли (DB)
2 роли: WORKER (role_id=1), MANAGER (role_id=2). Иерархия в коде через FunctionalRole: STORE_DIRECTOR → SUPERVISOR → REGIONAL → NETWORK_OPS → PLATFORM_ADMIN.

### Партнёры / тенанты
- **Lama** (FMCG): SPAR Томск ×3, СПАР Новосибирск, СПАР Северск, Abricos, Первоцвет, Food City — 18 магазинов
- **Левушка** (fashion): 1 бренд
- **Техпроиздрав** (производство): швейный цех

### Терминология (зафиксировано)
| Старое | Используем |
|---|---|
| Привилегии | Зоны (LAMA: товарные зоны магазина) |
| Грейд | Разряд (1-6) |
| Архив задач | Задачи |
| Дополнительная | удалена, только Плановая + Бонусная |
| operations | подзадачи (subtasks) |

### LAMA таксономия (PR #176)
- **11 зон** (id 100-110): Фреш 1, Фреш 2, Бакалея, Заморозка, Бытовая химия, Non-Food, Алкоголь, ЗОЖ, Кондитерка-чай-кофе, Пиво-чипсы, Напитки б/а
- **53 product categories** с `zone_id` mapping
- **Work type priorities** (1-100): 1 для критичных (КСО, Касса), 3-5 выкладка/переоценка, 11-13 контроль/уборка, 100 «другие работы»

### Tasks
- `priority` 1-100, `editable_by_store` (false для спущенных сверху → STORE_DIRECTOR не редактирует)
- Подзадачи STORE_DIRECTOR может ДОБАВЛЯТЬ всегда
- Архивирование, не удаление
- Конвейер задач (передача следующему) — для производства

### Shifts
- Read-only (всё из LAMA)
- `shift_kind`: REGULAR / SUBSTITUTE (подработка — тот же STAFF в свой выходной в другом магазине того же юрлица; должность та же, ЗП штатная)
- `home_store_id` для SUBSTITUTE

### Freelance
- 23 фрилансера: 5 независимых + 18 через 3 агентов
- 3 канала закрытия часов: STAFF / PART_TIME (substitute shift) / EXTERNAL (фрилансер через агента)

### Auth
- Beyond Violet SSO: phone + Telegram/Max/Звонок/SMS-fallback
- Email magic link, TOTP authenticator (generic)

### Sidebar порядок (зафиксирован 2026-05-06)
- **Задачи**: Планирование → На проверке → Все задачи → Предложения
- **Расписание**
- **Сотрудники**: Все → Добавить → Зоны работ
- **Магазины** (top-level)

### i18n + Mobile
- next-intl, path-based (`/dashboard` ru default, `/en/dashboard`)
- Pri-1 mobile: STORE_DIRECTOR + SUPERVISOR
- ResponsiveDataTable, MobileBottomNav, MobileFilterSheet, TouchInlineEdit

## Что НЕ делаем
- Циклограммы как отдельный экран (дашборд достаточно)
- EN mock-tenant до реального UK клиента
- Полная UK налоговая интеграция
- Drag-drop touch на Schedule
- Удаление задач (только архивирование)

## Open questions (когда вернёмся)
- Список фрилансеров отдельный от агента — частично сделано, нужна полная independence
- Дашборд аналитика по shift_kind каналам closure (если потребуется)
- TaskAllocation domain extended (V0 уже сделал основу в task-distribution.tsx)

## Архитектурные policies (зафиксированы)

- **Split-workflow Claude+V0** (с chat 22): foundation от Claude, UI от V0. Не запускать V0 пока foundation не смерджен.
- **Patch ≠ Patch:** если patch-промпт добавляет новые типы / API / i18n / tabs / Dialog — это extension, нужен Claude foundation (иначе V0 платит +$1.5-2 за самостоятельную foundation).
- **Monolith threshold = 600 строк:** компоненты крупнее → план разбить на sub-components в TECH-DEBT (отложенный refactor).
- **Cleanup batch threshold = 10 пунктов:** non-критичные warnings (unused imports, prefer-const) копим в TECH-DEBT, batch-чисткой когда наберётся 10+.
- **PR-driven workflow** (без plans/<slug>.md): каждое изменение = PR. Plan-first используем только для серий 5+ задач.
- **Pattern-based foundation** (7 типов): см. [PATTERNS.md](./PATTERNS.md). Foundation работа предсказуема по pattern.
