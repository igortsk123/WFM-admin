# Sync admin with live backend + mobile

> User: «mobile/ + backend/ это живой проект — справочник чтобы admin не был оторван от реальности»

## Контекст

WFM существует как 3 коннектающихся продукта:
- **WFM admin (наш)** — Next.js 15, мокированный, я сейчас работаю над ним
- **WFM mobile (живой)** — iOS + Android, в production. Используется работниками магазинов и менеджерами на торговом зале
- **WFM backend (живой)** — FastAPI микросервисы (svc_tasks, svc_users, svc_shifts, svc_notifications), Python 3.12

Mobile + backend описаны в `.memory_bank/`:
- `mobile/` — iOS+Android architecture, UI patterns, feature screens
- `backend/apis/` — живые API contracts (api_tasks.md, api_users.md, api_shifts.md, api_notifications.md, ...)
- `backend/services/` — описание каждого svc
- `backend/patterns/` — inter-service communication, api response format
- `domain/` — единые domain модели (task_model, user_model, user_roles, shift_model, auth/) — общие для всех платформ

## Принцип

⚠️ **Admin не должен быть оторван от реальности.** Когда добавляю новые типы / API / поля / state machine — синхронизирую с `domain/` и `backend/apis/`.

Цель: когда бэкендер придёт подключать реальное API к admin, изменений минимум — потому что наши моки уже соответствуют его контрактам.

## Как использовать справочник

### При создании новых mock данных

**Сначала** заглянуть в:
1. `../domain/<entity>.md` — смотрим какие поля у entity по правде
2. `../backend/apis/api_<entity>.md` — формат API запросов/ответов

Только после этого писать `lib/mock-data/<entity>.ts` и `lib/api/<entity>.ts`.

### При добавлении нового поля в Task / User / Shift

**Не выдумывать.** Сверять с `domain/`:
- Если поле уже есть — использовать его имя, тип, enum-values
- Если нет — добавить как admin-only (с suffix или комментарием) либо предложить расширение domain (PR в `domain/<entity>.md`)

### При создании API endpoint в моках

Сверить с `backend/apis/api_<entity>.md`:
- Тот же base URL формат: `/tasks/`, `/users/`, `/shifts/`, `/notifications/`
- Те же status codes (200, 400, 409 для invalid state transition)
- Те же query params, payload shapes

### При работе с auth

`../domain/auth/` — единственная правда. SSO Beyond Violet, каналы доставки кода, error codes.

## Конкретные «связи admin ↔ backend»

| Admin (моки) | Backend (живое) |
|---|---|
| `Task.state: NEW \| IN_PROGRESS \| PAUSED \| COMPLETED` | `domain/task_states.md` — те же 4 + transitions с 409 при invalid |
| `Task.review_state: NONE \| ON_REVIEW \| ACCEPTED \| REJECTED` | `domain/task_model.md` |
| `User.role: WORKER \| MANAGER` (DB) + FunctionalRole в коде | `domain/user_roles.md` |
| `Shift` read-only (всё из LAMA) | `backend/apis/api_shifts.md` + `backend/apis/external/api_lama.md` |
| `lib/api/users.ts` mock | `backend/apis/api_users.md` |
| `lib/api/tasks.ts` mock | `backend/apis/api_tasks.md` |

## Разногласия (нормально)

Иногда admin расширяет domain (например, `priority`, `editable_by_store`, `shift_kind=SUBSTITUTE`) которых ещё нет в backend. Это OK если:
- Поле помечено optional (`?:`) или с default
- В comment пометка «admin-extension, не во всех backend ответах»
- Когда backend дойдёт — добавит, или admin откроет PR в `domain/`

## Mobile секция

`mobile/` — iOS + Android архитектура и UI patterns живого приложения. Не моя область, но **полезно**:
- Если делаю feature которая ДОЛЖНА синхронизироваться с mobile (например shift-detail, task-detail flow), смотрю `mobile/feature_managertasks/` чтобы UI-flow был совместим (одни и те же termы, статусы, actions)
- Domain decisions (как worker сабмитит фото, какие state transitions есть) — единые между admin и mobile

## Как не нарушить

✅ **Перед каждой фичей** заглянуть в `../domain/` и `../backend/apis/`
✅ **Расхождения** документировать в коде (комментарий `// admin-extension`)
✅ **Если меняю канонический контракт** — открыть отдельный PR обновляющий `domain/` или `backend/apis/`, чтобы у других команд была актуальная правда

❌ **Не выдумывать** новые статусы, поля, enum-values без проверки domain
❌ **Не дублировать** mobile UI patterns в admin без commune (admin desktop-first, mobile = phone)
