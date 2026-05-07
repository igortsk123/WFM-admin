# lib/api — API client modules

Каждый модуль соответствует домену. Файл-к-файлу overview для backend-разработчика.

## Категории endpoints

- **🟢 backend-mirrored** — функция реально вызывает backend (через `*OnBackend()` / `*FromBackend()` raw wrappers) ИЛИ имитирует endpoint который backend уже имеет.
- **🟡 admin-only (proposed)** — endpoint которого на backend нет, но **бизнес-логика обоснована** — серверу хорошо бы дописать. См. `MIGRATION-NOTES.md` для деталей.
- **🔵 admin-mock** — чисто для демо/UI; в реальной системе не нужен (например vendor аналитика).

## Модули зеркалящие backend (🟢)

Имена и shape совпадают с FastAPI endpoints в `wfm-develop mobile/.../backend/`.

| Файл | Backend служба | Покрытие |
|---|---|---|
| `tasks.ts` | `svc_tasks/api/tasks.py` | get/list/v2/filters/users/my, byId, create/patch, start/pause/resume/complete (multipart), approve/reject, events |
| `shifts.ts` | `svc_tasks/api/shifts.py` | open, close, current, byId |
| `hints.ts` | `svc_tasks/api/hints.py` | get/create/update/delete |
| `operations.ts` | `svc_tasks/api/operations.py` | list (по wt+zone), pending, approve/reject |
| `users.ts` | `svc_users/api/users.py` | me, byId, update, updatePermissions |
| `stores.ts` | `svc_users/api/stores.py` | list, byId (под флагом USE_REAL_API) |
| `notifications.ts` | `svc_notifications` | list, mark-read (proxy через моки пока) |

В каждом файле два слоя:
1. **Mock-реализация** для admin-локально (живёт offline)
2. **Backend wrappers** с суффиксом `*OnBackend()` / `*FromBackend()` — настоящие fetch'и

## Модули admin-only (🟡 proposed)

Backend пока этих endpoints не имеет. Обоснование почему нужно — в `MIGRATION-NOTES.md`.

| Файл | Бизнес-смысл | Приоритет для backend |
|---|---|---|
| `goals.ts` | KPI/цели магазинов (OOS, списания, выкладка) | MEDIUM |
| `bonus.ts` | Бонусные задачи, начисление баллов сотрудникам | MEDIUM |
| `freelance-applications.ts` | Заявки на внештатные смены от менеджера | HIGH (если ритейлер использует freelance) |
| `freelance-services.ts` | Каталог сервисов внештата (типы работ) | HIGH |
| `freelance-agents.ts` | Кадровые агентства | MEDIUM |
| `freelance-freelancers.ts` | Реестр внештатников | HIGH |
| `freelance-offers.ts` | Прямые предложения работы внештатнику | LOW |
| `freelance-payouts.ts` | Расчёт выплат внештатникам | HIGH (раз есть заявки) |
| `freelance-budget.ts` | Бюджет внештата по магазину/сети | HIGH |
| `freelance-norms.ts` | Сервисные нормы (формат магазина → нормы трудозатрат) | LOW |
| `freelance-config.ts` | Настройки внештатного модуля | LOW |
| `payouts.ts` | Расчёт выплат штатным сотрудникам по бонусам | MEDIUM |
| `leaderboards.ts` | Рейтинги магазинов/сотрудников | LOW |
| `dashboard.ts` | KPI-карточки на главной | MEDIUM |
| `ai-suggestions.ts` | AI-подсказки задач | MEDIUM |
| `ai-coach.ts` | AI-тренер для рабочих | LOW |
| `ai-chat.ts` | Чат с AI-помощником | LOW |
| `ai-performance.ts` | KPI отчёт по AI-предложениям | LOW |
| `audit.ts` | Аудит-лог действий пользователей | HIGH (compliance) |
| `regulations.ts` | Регламенты (документы для сотрудников) | LOW |
| `risk.ts` | Риск-индикаторы (текучка, невыходы) | MEDIUM |
| `no-show.ts` | Невыходы на смену + причины | MEDIUM |
| `organization.ts` | CRUD organizations (multi-tenant) | LOW (если single-tenant — не нужно) |
| `integrations.ts` | Список внешних интеграций (LAMA, 1С, HR-системы) | MEDIUM |
| `data-connectors.ts` | Метаданные коннекторов | LOW |
| `external-hr-sync.ts` | Синхронизация с внешним HR-каталогом | MEDIUM |
| `agent-cabinet.ts` | Кабинет кадрового агентства (отдельная роль) | LOW |
| `taxonomy.ts` | CRUD work_types / zones / positions / ranks (admin) | MEDIUM (backend имеет references, не CRUD) |
| `hints-manager.ts` | Модерация подсказок | MEDIUM |
| `distribution.ts` | Распределение задач по сотрудникам и сменам (manager UI) | HIGH |
| `auth.ts` | Mock-auth flow (роль-переключатель в demo) | NO (admin demo only) |
| `reports.ts` | Отчёты plan-fact / store-compare / KPI | MEDIUM |

## Служебные модули (без endpoints)

- `_config.ts` — env vars (NEXT_PUBLIC_API_BASE_URL, USE_REAL_API)
- `_auth-token.ts` — JWT в localStorage
- `_client.ts` — fetch wrapper + envelope unwrap
- `_backend-types.ts` — TS-зеркала Pydantic schemas
- `_org-context.ts` — admin org-switcher (admin invent, multi-tenant)
- `_demo-stores.ts` — top-7 ЛАМА для демо-фильтров
- `types.ts` — общие ApiResponse/ApiListResponse/ApiMutationResponse
- `index.ts` — re-exports
- `README.md` — этот файл
