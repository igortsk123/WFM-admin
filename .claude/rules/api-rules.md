---
description: API layer rules — single integration point, ApiResponse shape, mock-data isolation. Loads when editing lib/api or lib/types.
paths:
  - "lib/api/**/*.ts"
  - "lib/types/**/*.ts"
  - "lib/mock-data/**/*.ts"
---

# API Layer Rules

## Single integration point

Все вызовы данных ТОЛЬКО через `lib/api/`. Каждая функция:
- `async`, returns `Promise<T>`
- принимает один params object `{filters?, pagination?, id?}`
- возвращает `{data, total?, page?}` через `ApiResponse<T>` / `ApiListResponse<T>` / `ApiMutationResponse`
- маппится 1:1 на будущий REST endpoint (JSDoc `@endpoint`)

## Re-export через `lib/api/index.ts`

Каждая функция и тип НОВОГО fearure — экспортируется из `lib/api/index.ts`. Компоненты импортируют через `@/lib/api`, не из `@/lib/api/<feature>` напрямую (исключение — внутри самого feature).

```ts
// lib/api/index.ts
export {
  type UserDetail,
  type UserCreateData,
  getUserById,
  createUser,
  archiveUser,
} from "./users"
```

## Response shapes — обязательно

```ts
// Single
interface ApiResponse<T> {
  data: T
  meta?: { ... }
}

// List
interface ApiListResponse<T> {
  data: T[]
  total: number
  page: number
  page_size: number
}

// Mutation (create / update / delete actions)
interface ApiMutationResponse<T = void> {
  success: boolean
  data?: T
  error?: { code: string, message: string }
}
```

Никаких `throw new Error(...)` где должен быть `{success: false, error: {...}}`. Унификация важна для будущего REST migration.

## JSDoc @endpoint — обязательно

```ts
/**
 * Get paginated list of users with filtering.
 * @endpoint GET /users/list
 * @roles MANAGER, NETWORK_OPS, HR_MANAGER
 */
export async function getUsers(...) { ... }
```

## Mock-data — read-only

`lib/mock-data/` импортируется ТОЛЬКО в `lib/api/`. Из page или component — НИКОГДА.

```ts
// ПРАВИЛЬНО (внутри lib/api/users.ts)
import { MOCK_USERS } from "@/lib/mock-data"

// ЗАПРЕЩЕНО (в компоненте)
import { MOCK_USERS } from "@/lib/mock-data"
```

Если компоненту нужны данные — он вызывает `getUsers()` через `lib/api`.

## ID типы

| Тип | Field | Пример |
|---|---|---|
| `number` (int) | `User.id`, `Store.id`, `Subtask.id`, `assignee_id`, `creator_id` | `15` |
| `string` (UUID) | `Task.id`, `Goal.id` | `"t-1042"` |

При вызове API с числовым ID куда signature принимает string — кастуй через `String(id)`:

```ts
approveSubtask(String(subtask.id))   // Subtask.id = number, function принимает string
```

## Не дублировать существующие функции

ПЕРЕД созданием новой функции — `Grep` в `lib/api/index.ts` есть ли уже похожая. Известные пары:

| Было | Не создавай |
|---|---|
| `addSubtaskToTask(taskId, name, hint?)` | `addSubtask(...)` |
| `removeSubtask(id: string)` | `deleteSubtask(...)` |
| `approveSubtask(id: string)` | `approveSubtaskById(...)` |
| `rejectSubtask(id: string, reason)` | `rejectSubtaskById(...)` |

## Type imports — правильные пути

| Что | Импорт из |
|---|---|
| Domain types (`User`, `Task`, `Store`, `Goal`, `FunctionalRole`, `Permission`, `EmployeeType`, `Shift`, ...) | `@/lib/types` |
| API-shape types (`UserDetail`, `UserCreateData`, `UserStats`, `OfertaChannel`, `InviteMethod`) | `@/lib/api` (re-export из `@/lib/api/users`) |
| Shared component types (`ActivityItem`, `ActivityType`) | `@/components/shared/<file>` (НЕ из `@/lib/types`) |

Известный баг: `ActivityType` ЕСТЬ в `@/components/shared/activity-feed`, но НЕТ в `@/lib/types`. V0 иногда импортирует из `lib/types` → build error.
