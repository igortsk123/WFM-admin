---
description: TypeScript/TSX coding standards. Loads when editing .ts/.tsx files.
paths:
  - "**/*.{ts,tsx}"
---

# Code Standards (TypeScript / TSX)

## Обязательно

- TypeScript strict, **никаких `any`**
- **Named exports** (не `default export`, кроме `page.tsx` / `layout.tsx` / Next.js конвенций)
- **Fetch только в `lib/api/`** — никаких raw fetch в компонентах
- Стейт только в хуках (`useXxx`)
- DTOs совпадают с mock/service контрактами в `lib/types/` или `lib/api/<feature>.ts`

## Импорты shadcn/ui

```tsx
// ПРАВИЛЬНО
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent } from "@/components/ui/dialog"

// ЗАПРЕЩЕНО
import * as Dialog from "@radix-ui/react-dialog"
```

## Именование

| Сущность | Конвенция | Пример |
|---|---|---|
| Компоненты | PascalCase | `EmployeeDetail` |
| Хуки | useXxx | `useTaskFilters` |
| API функции | camelCase | `getUsers`, `createTask` |
| Типы / DTO | PascalCase | `UserCreateData`, `ApiResponse` |
| Константы | SCREAMING_SNAKE | `ADMIN_ROUTES`, `MOCK_USERS` |
| Файлы компонентов | kebab-case | `employee-create-wizard.tsx` |

## Размер файлов

- Компонент >600 строк → план split на sub-components (+ записать в `wfm/admin/V0/TECH-DEBT.md`)
- API-функция >80 строк → выделить helpers в `lib/utils/`
- i18n keys для одного экрана >100 → поддерево namespace, не плоско

## prefer-const

Если переменная не переприсваивается — `const`, не `let`. ESLint warning через CI Vercel становится error в prod.

## Запреты

- НЕ дублировать код >10 строк — выносить в `components/shared/` или `lib/utils/`
- НЕ оставлять `console.log` в коммитах
- НЕ редактировать `components/ui/` напрямую (это shadcn — добавляй варианты в `components/shared/`)
- НЕ использовать `default export` (кроме Next.js `page.tsx` / `layout.tsx`)
- НЕ писать `any` — используй `unknown` или конкретный тип
- НЕ оставлять unused imports — eslint-warning, копится в TECH-DEBT
