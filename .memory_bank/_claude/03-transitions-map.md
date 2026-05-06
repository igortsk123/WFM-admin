# Раздел 49 — Transitions map (карта переходов между экранами) `[Pro]`

> 🤖 НЕ для V0! Этот промпт я (Claude) применяю при сборке проекта. Запустится автоматически когда ты скажешь «собирай».

## Промпт (для контекста)

```
Generate the transitions map — single document showing all navigation between screens. This is critical for backend dev to understand business flow without reading every screen prompt.

Product surface — file: admin/backend/transitions-map.md (max 200 lines).

Content structure:

# WFM Admin — Transitions Map

Карта переходов между экранами админки. Каждая стрелка = real navigation в коде (Link, router.push). Backend dev: эта карта показывает где какие endpoints дёргаются, какие deep-links поддерживать, какие query params парсить.

## Entry points (откуда пользователь попадает в экран)

Table: Screen | Entry from | Trigger | Query params | Backend impact

Например:
- /tasks/:id | Dashboard | click activity_item | ?from=dashboard | GET /tasks/:id
- /tasks/:id | Tasks list | click row | ?from=tasks | GET /tasks/:id
- /tasks/:id | Notification | deep link | ?from=notification&notification_id=:nid | GET /tasks/:id + POST /notifications/:nid/read
- /tasks/:id | Review queue | click card | ?from=review | GET /tasks/:id
- /tasks/:id | Tasks bulk reassign | (нет — модалка inline) | — | POST /tasks/bulk-assign
- /employees/:id | Tasks list | click assignee_name | ?from=tasks | GET /users/:id
- /employees/:id | Task detail | click assignee | ?from=task&task_id=:tid | GET /users/:id
- /employees/:id | Permissions matrix | click ⋮ → «Открыть профиль» | — | GET /users/:id
- /stores/:id | Stores list | click row | — | GET /stores/:id
- /stores/:id | Task detail | click store_name | — | GET /stores/:id
- /stores/:id | Schedule | click store filter chip | — | GET /stores/:id
- /tasks/new | Dashboard | «Создать задачу» button | ?store_id=&zone_id= если был filter | POST /tasks при submit
- /tasks/new | Tasks list | «Создать» button | ?from=tasks | POST /tasks
- /tasks/new | Task detail | «Дублировать» menu | ?duplicate=:tid | GET /tasks/:tid (для prefill) + POST /tasks
- /tasks/new | Employee detail | «Назначить задачу» button | ?assignee_id=:uid&store_id=:sid | POST /tasks
- /tasks/new | Store detail | «Создать задачу» button | ?store_id=:sid | POST /tasks

## Critical user flows

Описать 5-7 ключевых end-to-end user journeys по ролям с диаграммой:

1. **STORE_DIRECTOR утро — проверка задач:**
   Dashboard → click «На проверке (9)» → /tasks/review → keyboard A/R на каждой → optimistic update → toast «Принято» → next task
   Endpoints: GET /tasks?review_state=ON_REVIEW, POST /tasks/:id/approve, POST /tasks/:id/reject

2. **STORE_DIRECTOR создаёт задачу с привилегией:**
   Dashboard → «Создать задачу» → /tasks/new → выбрать assigned_to_permission=CASHIER → POST /tasks → toast → redirect /tasks/:id
   Endpoints: GET /stores, GET /zones, GET /work-types, POST /tasks

3. **HR_MANAGER создаёт нового сотрудника:**
   Sidebar «Сотрудники» → /employees → «+ Добавить» → /employees/new wizard 4 steps → POST /users + POST /users/:id/permissions + POST /users/:id/invite → redirect /employees/:newId
   Endpoints: GET /stores, GET /positions, POST /users, PATCH /users/:id/permissions, POST /users/:id/invite

4. **NETWORK_OPS модерирует операции:**
   Dashboard alert «5 подзадач ждут модерации» → /subtasks/moderation → bulk approve → POST /subtasks/bulk-approve
   Endpoints: GET /subtasks/pending, POST /subtasks/:id/approve, POST /subtasks/:id/reject

5. **STORE_DIRECTOR force-close shift с активными задачами:**
   /schedule → click ShiftBlock → /schedule/:id → status=OPENED → «Принудительно закрыть» → AlertDialog warning «На смене 2 задачи в работе. Они будут переведены в PAUSED.» → POST /shifts/close { force: true }
   Endpoints: GET /shifts/:id, POST /shifts/close

6. **STORE_DIRECTOR массовое переназначение:**
   /tasks → select 3 rows → bulk bar «Переназначить» → Dialog Combobox исполнителей → POST /tasks/bulk-assign → toast → optimistic refresh
   Endpoints: GET /tasks, POST /tasks/bulk-assign

7. **NETWORK_OPS сравнивает магазины:**
   Sidebar «Сравнение магазинов» → /reports/compare → period=Месяц → ToggleGroup Heatmap → click cell → /stores/:id detail
   Endpoints: GET /reports/stores-compare?period=month, GET /stores/:id

## Cross-screen state

Что нужно сохранять в URL/store между экранами:
- Selected organization (NETWORK_OPS multi-tenant) — в JWT claim, повторно не выбирается
- Active store filter в TopBar Combobox — в URL searchParam ?store_id= (sticky на всех scoped pages)
- Period filter в Reports — в URL ?period=&from=&to= (sticky между Reports экранами)
- Active assignment (STORE_DIRECTOR в нескольких магазинах) — в /users/me response, при switch — POST /users/:id/switch-assignment + reload

## Permissions matrix per screen

Table: Screen | NETWORK_OPS | SUPERVISOR | STORE_DIRECTOR | HR_MANAGER | OPERATOR | WORKER

Пример:
- /dashboard | ✓ network | ✓ свой store | ✓ HR_MANAGER-вариант | — (моб. приложение)
- /tasks | ✓ all | ✓ свой store | — | —
- /tasks/:id | ✓ all | ✓ свой store (403 чужой) | — | —
- /tasks/new | ✓ | ✓ свой store | — | —
- /tasks/review | ✓ network | ✓ свой store | — | —
- /subtasks/moderation | ✓ network | ✓ свой scope | ✓ свой store | — | — | —
- /employees | ✓ network | ✓ свой store | ✓ network | —
- /employees/:id | ✓ all | ✓ свой store (403 чужой) | ✓ all | —
- /employees/new | ✓ | — | ✓ | —
- /employees/permissions | ✓ network | ✓ свой store | — | —
- /stores | ✓ | — (свой через TopBar switcher) | — | —
- /stores/:id | ✓ all | ✓ только свой (403 чужой) | — | —
- /schedule | ✓ network | ✓ свой store | — | —
- /taxonomy/* | ✓ | — | для positions ✓, остальное — | —
- /audit | ✓ полный | ✓ свой store | ✓ HR_MANAGER-actions | —
- /reports/* | ✓ network | ✓ свой store | — | —

## Used by:
- Backend dev WFM — понять какие endpoints должны принимать query params, какие deep-links поддерживать, какие RBAC checks нужны
- Frontend integration — заменить моки lib/api/ на реальные fetch с правильными params

## Constraints
- All paths согласуются с lib/constants/routes.ts (single source of truth)
- All endpoints согласуются с admin/backend/api-contracts.md
- Russian descriptions, English code identifiers
- Реальные RBAC scope rules из .memory_bank/domain/user_roles.md
```
