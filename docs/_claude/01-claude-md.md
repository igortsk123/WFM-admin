# Раздел 47 — CLAUDE.md (root репо) `[Pro]`

> 🤖 НЕ для V0! Этот промпт я (Claude) применяю при сборке проекта. Запустится автоматически когда ты скажешь «собирай».

## Промпт (для контекста)

```
Create CLAUDE.md in the project root — auto-read by Claude Code at every session start.

Product surface — file: CLAUDE.md (max 80 lines).

Content structure:

# WFM Admin — Web Portal
Веб-админка для системы управления задачами и персоналом FMCG-сети (РФ-контекст).

Стек: Next.js 15 (App Router) + React 19 + TypeScript strict + Tailwind v4 + shadcn/ui (new-york) + Lucide.
Бэкенд: микросервисы svc_tasks / svc_users / svc_shifts / svc_notifications (FastAPI, Python 3.12). Контракты — в .memory_bank/backend/api_*.md.
Auth: 3 способа входа — (1) Phone + код через Beyond Violet SSO с каналами Telegram/Max/Звонок/SMS-fallback; (2) Email magic link (для РФ — обходит SMS-блокировки); (3) TOTP authenticator (generic, любой app: Yandex Key/Authy/FreeOTP). НЕТ email/password, НЕТ hCaptcha, НЕТ Google Authenticator конкретно.

## Команды
(extract from package.json: dev, build, lint, type-check)
ВАЖНО: запускай lint и build после каждого изменения кода.

## Структура (frontend)
(real tree of app/ + components/ + lib/, after refactoring)

## Дизайн-система (КРИТИЧНО)
Tailwind v4 — токены через @theme inline в globals.css, OKLCH.
Цвета: ТОЛЬКО семантические токены (bg-primary, bg-card, bg-muted, bg-success, bg-warning, bg-destructive, text-foreground, text-muted-foreground, border-border).
ЗАПРЕЩЕНО: bg-white, bg-blue-500, text-gray-600, hex, inline стили.

## Critical rules
- TypeScript strict, никаких `any`
- Named exports (default только для page.tsx)
- Данные ТОЛЬКО через lib/api/ — единственный слой доступа
- При подключении бэкенда — меняется ТОЛЬКО lib/api/ (mock setTimeout → fetch())
- components/ui/ — НЕ ТРОГАТЬ (shadcn primitives)
- Compound shadcn (Dialog/Sheet/Popover/Command): Root+Trigger в parent, Content отдельно
- Каждый интерактивный компонент: 4 состояния (loading/error/empty/success)
- URL state via nuqs (filters, sort, pagination на list pages)

## API Layer Architecture
lib/api/ → стандартизированные ApiListResponse<T>, ApiResponse<T>
Каждая функция маппится 1:1 на REST endpoint (см. JSDoc в коде).
Полный API contract — admin/backend/api-contracts.md.

## Memory Bank
Перед задачей: @.memory_bank/README.md (доменные модели и flow)
Перед UI: @admin/v0-prompts.md (правила V0-промптинга)
Перед backend: @admin/backend/api-contracts.md (контракты)

## Roles in admin (UI-сценарные)
- NETWORK_OPS — расширенные права MANAGER, видит всю организацию
- HR_MANAGER — управление сотрудниками, должностями, привилегиями
- STORE_DIRECTOR — обычный MANAGER (role_id=2 в БД), scope = свой магазин
- WORKER не использует админку (мобильное приложение)

В БД только Position.role_id=1/2. Сценарные роли — это фильтрация фич/scope в UI.

Used by Claude Code on every session start.
Constraints: max 80 lines. Russian docs, English code. Only facts Claude Code cannot infer from code.
```
