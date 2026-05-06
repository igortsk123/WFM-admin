# Раздел 50 — API contract documentation (для Python backend dev) `[Max]`

> 🤖 НЕ для V0! Этот промпт я (Claude) применяю при сборке проекта. Запустится автоматически когда ты скажешь «собирай».

## Промпт (для контекста)

```
Create the API contract documentation that the WFM backend developer will use to extend svc_* microservices to support admin needs.

Product surface:

1. admin/backend/api-contracts.md (180 lines max):
   Group by domain. Каждый endpoint строкой с колонками:
   - Endpoint (REST path соответствует svc_* конвенции)
   - Method (GET / POST / PATCH / DELETE)
   - Request params/body (TS-shaped краткое)
   - Response type
   - Status (already exists in svc_* / новый)
   - Notes (бизнес-логика hints для backend)

   Domains:
   - Auth (Beyond Violet — переиспользует существующий, без новых endpoints)
   - Users / Permissions (расширения POST /users, PATCH /users/:id/permissions полный массив)
   - Tasks (existing + bulk-assign, bulk-archive, subtasks/pending, /subtasks/:id/approve|reject, /tasks/:id/transfer, /tasks/:id/archive, /tasks/:id/restore)
   - Shifts (existing + новые POST /shifts/plan, PATCH /shifts/plan/:id, DELETE /shifts/plan/:id, POST /shifts/import)
   - Stores / Zones / Positions / Categories / WorkTypes / Hints (CRUD)
   - Notifications (existing + GET /preferences, PATCH /preferences, POST /:id/archive)
   - Audit (новый GET /audit/list — собирается из task_events + расширенный audit_log таблицы)
   - Reports (новые: /reports/kpi, /reports/plan-fact, /reports/stores-compare, /reports/export)
   - Integrations (LAMA force sync, Excel upload, Webhooks CRUD, API keys CRUD)
   - Future (M1-M6) — отдельный раздел с placeholder endpoints

2. admin/backend/data-models.md (100 lines max):
   Bounded contexts с ключевыми изменениями:
   - User context: existing User + новый Position.role_id, computed FunctionalRole в JWT response
   - Task context: existing Task + добавить fields для админки (assigned_to_permission, history_brief)
   - Shift context: existing + CRUD endpoints
   - Subtask context: existing + GET /subtasks/pending + approve/reject + add/delete по задаче (для Subtasks Moderation Queue и Task Detail)
   - Hint context: existing
   - Notification context: existing + preferences + archive
   - Audit context: новый — таблица audit_log + middleware на admin actions
   - Report context: новый — агрегации из task_events
   - Future contexts (M1-M6): таблицы перечислить, без реализации

   Для каждого: ключевые fields, relationships, validation rules, что новое (Status: existing / extended / new).

3. admin/backend/integration-guide.md (100 lines max):
   Human-readable guide для backend dev:
   - Architecture: Next.js admin → REST API → svc_* microservices (FastAPI Python 3.12)
   - Как переключиться с моков на реальный API: changes только в lib/api/ (replace setTimeout + mock-data with fetch())
   - Endpoint naming convention: /api/{resource} для lists, /api/{resource}/:id для деталей
   - Standard response: { data, total, page, page_size } для lists, { data } для single
   - Auth: Bearer token из Beyond Violet, HttpOnly cookie или Authorization header
   - Pagination contract: page (1-based), page_size, total в response
   - Filtering: query params (?status=in_progress&store_id=42&page=2)
   - Error format: HTTP 4xx/5xx + body { error: { code: string, message: string } }
   - Multi-tenancy: каждый запрос фильтруется по NETWORK_OPS.organization_id (через JWT claim)
   - Rate limiting: TBD (рекомендация — 100 req/min per user)
   - WebSocket для real-time notifications: ws://.../notifications/ws?token={jwt}, существует
   - Что нового нужно реализовать (приоритеты для backend dev):
     · BLOCKER M0 (must have): subtasks moderation queue (/subtasks/pending + approve/reject + add/delete to task), task archive/restore (/tasks/:id/archive, /tasks/:id/restore + ArchiveReason), task transfer (/tasks/:id/transfer для CHAIN-сценариев), bulk operations (/tasks/bulk-assign, /tasks/bulk-archive, /users/bulk-permissions), goals API (/goals + /goals/:id/select), bonus tasks API (/bonus/tasks, /bonus/budgets), audit_log таблица + endpoint, notifications preferences/archive (без delete)
     · IMPORTANT M0: reports endpoints, integrations management (LAMA/Excel/Webhooks/API keys)
     · M0 priority (must-have): Goals (/goals), Bonus tasks (/bonus/tasks), Payouts (/payouts), Hints upload (/taxonomy/hints/manager)
     · STRETCH (post-MVP): AI Coach (/ai/*), Risk scoring (/risk/*), Leaderboards (/leaderboards/*)
   - Список mock files в lib/mock-data/ (что бэкенд должен заполнить реальными данными)
   - Список TS-types в lib/types/ (что бэкенд должен переиспользовать как контракт)

Constraints:
- Russian docs, English code
- Reference актуальные .memory_bank/backend/api_*.md где endpoint уже существует — не дублируй
- Mark NEW vs EXTENDED vs EXISTING explicitly
- Single source of truth for backend dev. Он должен мочь построить всё из этих 3 файлов + lib/types/index.ts.
```
