# Memory Bank — INDEX для веб-админки (Tier 0)

> Pointer для работы Claude над `WFM-admin` репо (web admin app, генерируется V0 + Claude).
> НЕ перезаписывает основной `README.md` / `CLAUDE.md`. Только указатель что РЕЛЕВАНТНО для веб-части.

## Что читать для веб-админки

### Доменные модели (read-only)

| Файл | Зачем веб-админке |
|---|---|
| `domain/task_model.md` | Task interface, fields, типы (PLANNED/ADDITIONAL/BONUS), state machine |
| `domain/task_states.md` | NEW → IN_PROGRESS → PAUSED → COMPLETED + review states |
| `domain/user_model.md` | User interface, базовые поля |
| `domain/user_roles.md` | MANAGER vs WORKER, FunctionalRole, привилегии (CASHIER / SALES_FLOOR / SELF_CHECKOUT / WAREHOUSE) |
| `domain/shift_model.md` | Shift модель (план/факт), статусы NEW/OPENED/CLOSED |

### API контракты (моделируем в `lib/api/`)

| Файл | Соответствует |
|---|---|
| `backend/apis/api_tasks.md` | `lib/api/tasks.ts` |
| `backend/apis/api_users.md` | `lib/api/users.ts` |
| `backend/apis/api_shifts.md` | `lib/api/shifts.ts` |
| `backend/apis/api_notifications.md` | `lib/api/notifications.ts` |
| `backend/apis/api_roles.md` | `lib/api/users.ts` (permissions endpoints) |
| `backend/apis/api_hints.md` | `lib/api/hints.ts` |
| `backend/apis/api_operations.md` | `lib/api/tasks.ts` (subtasks API) |

### Веб-специфика

| Файл | Содержание |
|---|---|
| `web/admin/tech_stack.md` | Версии, рекомендации стека для админки |
| `product_brief.md` | Бизнес-контекст (FMCG ритейл, целевые роли) |

## Что НЕ читать для веб-работы

- `mobile/**/*` — мобильное приложение работника (другой проект)
- `backend/patterns/`, `backend/services/`, `backend/architecture.md` — внутренняя реализация бэка (контракты в `apis/` достаточно)
- `analytics/` — аналитика приложения
- `domain/auth/auth_validation.md` — внутренняя валидация (есть отдельная mock-логика на фронте)
- `completed_plans/` — архив (только если нужен исторический контекст)

## Поток работы для Claude в WFM-admin

1. **Старт сессии:** читать `C:/Users/SPECTRE/wfm/admin/V0/_claude-only/INDEX.md` (Tier 0 для playbook)
2. **При работе с TS/TSX:** auto-load из `WFM-admin/.claude/rules/` (Claude Code сам грузит)
3. **При вопросе по domain:** этот файл → потом конкретный `domain/*.md`
4. **При вопросе по API:** этот файл → потом `backend/apis/api_*.md`
5. **Mobile-вопросы:** не наша область, пропускать или передавать другой команде

## Обновлять этот файл

- Если в `WFM-admin/lib/api/` появляется новый feature — добавить строку «соответствует backend/apis/...»
- Если backend renames API файл — обновить мэппинг
- Не более 80 строк суммарно
