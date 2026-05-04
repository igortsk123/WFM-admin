---
description: Verify before import — props known gotchas для shared компонентов. Loads when editing feature components.
paths:
  - "components/features/**/*.tsx"
  - "components/shared/**/*.tsx"
---

# Shared Components — Verify Before Import

ПЕРЕД использованием компонента из `components/shared/` — открой файл и сверь точные имена пропов. НЕ угадывай по shadcn/Material/Ant конвенциям.

## Известные prop-сигнатуры

| Компонент | Главный проп | НЕ путай с |
|---|---|---|
| `TaskStateBadge` | `state` (TaskState) | ❌ status |
| `ReviewStateBadge` | `reviewState` (TaskReviewState) | ❌ state |
| `ShiftStateBadge` | (открой файл) | — |
| `PermissionPill` | `permission` (Permission) | — |
| `RoleBadge` | `role` (FunctionalRole) | — |
| `UserCell` | `user` (User или подмножество) + опц. `subtitle` | — |
| `KpiCard` | `value`, `diff` (number, не string), `trend` (sparkline number[]) | — |
| `ActivityFeed` | `items: ActivityItem[]` (ActivityItem из этого же файла, НЕ из lib/types) | — |
| `ConfirmDialog` | (compound) `Root` + `Trigger` + `Content` или single-prop API — открой файл | — |
| `ResponsiveDataTable` | `columns: ColumnDef<T>[]`, `data: T[]`, `mobileCardRender(row)` | — |
| `MobileFilterSheet` | `activeCount`, `onClearAll`, `onApply` (НЕ `open`/`onOpenChange`) | ❌ open |
| `EmptyState` | `icon`, `title`, `description`, `action?` | — |
| `FilterChip` | `label`, `onRemove` | — |
| `LanguageSwitcher` | `variant: 'compact' \| 'full'` | — |
| `TouchInlineEdit` | `value`, `onSave`, `placeholder?` | — |
| `HealthGauge` | `value`, `min`, `max`, `status: 'danger'\|'warning'\|'success'`, `valueSuffix?`, `statusLabel?`, `locale?`, `size?` | — |

## Локальные types из shared/

```tsx
// ПРАВИЛЬНО
import { ActivityFeed, type ActivityItem, type ActivityType } from "@/components/shared/activity-feed"

// ЗАПРЕЩЕНО
import type { ActivityType } from "@/lib/types"  // нет такого
```

Generic re-export тоже работает:
```tsx
import { ActivityFeed, type ActivityItem, type ActivityType } from "@/components/shared"
```

## Domain types — отдельная папка

`Task`, `User`, `Store`, `Goal`, `Permission`, `FunctionalRole`, `EmployeeType`, `Shift`, `ObjectFormat`, `ArchiveReason`, `SubtaskReviewState` — всё в `@/lib/types`.

API-shape (`UserDetail`, `UserCreateData`, `OfertaChannel`, `InviteMethod`, `UserStats`) — в `@/lib/api` (re-export из `@/lib/api/users`).

## BonusTaskWithSource — gotcha

`BonusTaskWithSource extends Task`. У него поле bonus-источника называется **`bonus_source`** (НЕ `source`), потому что `Task.source` уже занят. См. `lib/api/bonus.ts`.

## getPayoutById naming

В `lib/api/index.ts` существует **два разных** `getPayoutById`:
- `getPayoutById` из `./payouts` (выплаты по бонусам)
- `getBonusPayoutById` (alias) из `./payouts` — для bonus-payouts secondary
- `getPayoutById` из `./freelance-payouts` (внештатные выплаты)

Если оба нужны в одном файле — используй re-name imports.

## Verify procedure

```
1. import { X } from "@/components/shared/x"  ← планируешь использовать
2. ПЕРЕД написанием JSX: Read components/shared/x.tsx
3. Найди `interface XProps` или `function X({ ... }: { ... })` — скопируй prop names в голову
4. Используй точно теми же именами
```

Это правило существует потому что V0 регулярно угадывает props по тренинговым данным и пишет `<ReviewStateBadge state="..." />` вместо `reviewState`. Build падает на TS-error.
