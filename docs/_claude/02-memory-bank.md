# Раздел 48 — Memory Bank update (admin scope) `[Pro]`

> 🤖 НЕ для V0! Этот промпт я (Claude) применяю при сборке проекта. Запустится автоматически когда ты скажешь «собирай».

## Промпт (для контекста)

```
Update Memory Bank with admin-scoped documentation files.

Product surface — create/update these files:

1. .memory_bank/web/admin/README.md (40 lines max):
   - Что такое WFM Admin (одна строка)
   - Стек (одна строка)
   - Список разделов (links to other admin/ docs):
     · admin-flow.md
     · ui-rules.md
     · components.md
     · routing-map.md
   - Feature status table: Feature | Status (M0 готово / M0 mocked / M1+ stretch)

2. .memory_bank/web/admin/admin-flow.md (80 lines max):
   - User journey по ролям: NETWORK_OPS / SUPERVISOR / STORE_DIRECTOR / HR_MANAGER / OPERATOR (что они делают в каждый день)
   - Связи между экранами (Tasks → Task detail → Employee → Store)
   - Auth flow (phone + SMS Beyond Violet)
   - Multi-tenant (NETWORK_OPS видит свою организацию)
   - Critical business rules: одна активная задача на работника, force-close shift, reject reason обязателен, role hierarchy

3. .memory_bank/web/admin/ui-rules.md (120 lines max):
   - Tailwind v4 + OKLCH через @theme inline
   - Полная token table из globals.css: Token | OKLCH value | Tailwind class | When to use
   - Custom tokens: --success, --warning, --info (не стандарт shadcn)
   - Typography: Inter headings, Inter body, scale
   - Spacing: p-4 cards, p-6 sections, gap-4 grids, rounded-lg
   - Component rules: max 1 primary button per section, card padding, semantic colors only
   - 4 mandatory states (loading/error/empty/success)
   - Status semantics (Tasks/Shifts/Reviews/Permissions): green/yellow/red/blue/gray mapping
   - PROHIBITIONS: raw colors, button variants, arbitrary spacing, animations beyond shadcn

4. .memory_bank/web/admin/components.md (80 lines max):
   - Table: Component | File path | Feature | Compound? | Purpose
   - Sections: Shared components (TaskStateBadge, ReviewStateBadge, ShiftStateBadge, PermissionPill, RoleBadge, PageHeader, KpiCard, EntitySummaryCard, ActivityFeed, EmptyState, FilterChip, UserCell, DataTableShell, ConfirmDialog), Feature components (per pipeline), shadcn primitives
   - Compound component split rules

5. .memory_bank/web/admin/routing-map.md (60 lines max):
   - Table: Route path | Feature | Role visibility | Status (M0/M1+)
   - All M0 routes (/login, /, /tasks, /tasks/:id, /tasks/new, /tasks/review, /tasks/archive, /subtasks/moderation, /goals, /bonus/tasks, /payouts, /employees, /employees/:id, /employees/new, /employees/permissions, /stores, /stores/:id, /schedule, /schedule/:shiftId, /taxonomy/work-types, /taxonomy/zones, /taxonomy/positions, /taxonomy/hints, /taxonomy/hints/manager, /notifications, /settings/profile, /settings/organization, /integrations, /integrations/lama, /audit, /reports/kpi, /reports/plan-fact, /reports/compare)
   - Future routes (/ai/coach, /risk/rules, /strategy/radar, /leaderboards, /bonus/templates, /payouts) — Stretch
   - ASCII navigation flow для admin portal

6. .memory_bank/web/admin/decisions.md (60 lines max) — архитектурные решения:
   - Decision: Tailwind v4 + OKLCH (V0 compatibility)
   - Decision: App Router with route group (admin) (для общего layout)
   - Decision: 3-layer data architecture (mock-data → api → page components, hooks extracted later)
   - Decision: ApiListResponse / ApiResponse standardized wrappers
   - Decision: Named exports
   - Decision: Compound shadcn split (Root+Trigger parent, Content child)
   - Decision: nuqs для URL state на list pages
   - Decision: Roles в БД = WORKER + MANAGER, functional sub-roles (NETWORK_OPS/SUPERVISOR/STORE_DIRECTOR/HR_MANAGER/OPERATOR/REGIONAL) — UI-сценарные overlays
   - Each decision: what / why / alternatives / impact

Constraints: All Russian. Each file within line limit. Only what Claude Code cannot infer from code itself.
```
