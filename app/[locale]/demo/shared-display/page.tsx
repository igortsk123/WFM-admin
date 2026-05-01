"use client"

import { useState } from "react"
import { AlertDialog, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"

import { PageHeader } from "@/components/shared/page-header"
import { KpiCard } from "@/components/shared/kpi-card"
import { EntitySummaryCard } from "@/components/shared/entity-summary-card"
import { ActivityFeed, type ActivityItem } from "@/components/shared/activity-feed"
import { EmptyState } from "@/components/shared/empty-state"
import { DataTableShell } from "@/components/shared/data-table-shell"
import { FilterChip } from "@/components/shared/filter-chip"
import { UserCell } from "@/components/shared/user-cell"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { TaskStateBadge } from "@/components/shared/task-state-badge"
import { ReviewStateBadge } from "@/components/shared/review-state-badge"
import { ShiftStateBadge } from "@/components/shared/shift-state-badge"
import { PermissionPill } from "@/components/shared/permission-pill"
import { RoleBadge } from "@/components/shared/role-badge"

import { InboxIcon, AlertTriangle } from "lucide-react"
import type { ColumnDef } from "@tanstack/react-table"
import type { TaskState, TaskReviewState, ShiftStatus, Permission, FunctionalRole } from "@/lib/types"

// ═══════════════════════════════════════════════════════════════════
// MOCK DATA
// ═══════════════════════════════════════════════════════════════════

const ACTIVITY_ITEMS: ActivityItem[] = [
  {
    id: "1",
    timestamp: new Date(Date.now() - 5 * 60 * 1000),
    actor: "Иванова М. П.",
    action: "завершила задачу",
    type: "TASK_COMPLETED",
    link: "#",
  },
  {
    id: "2",
    timestamp: new Date(Date.now() - 45 * 60 * 1000),
    actor: "Петров С. И.",
    action: "создал новую задачу",
    type: "TASK_CREATED",
    link: "#",
  },
  {
    id: "3",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    actor: "Сидорова О. А.",
    action: "отклонила задачу",
    type: "TASK_BLOCKED",
  },
  {
    id: "4",
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
    actor: "Козлов А. В.",
    action: "добавил комментарий",
    type: "COMMENT",
  },
  {
    id: "5",
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    actor: "AI Assistant",
    action: "предложила новую цель",
    type: "AI",
  },
  {
    id: "6",
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    actor: "System",
    action: "создала напоминание",
    type: "SYSTEM",
  },
]

interface MockTableRow {
  id: string
  name: string
  store: string
  status: TaskState
  review: TaskReviewState
  zone: Permission
}

const TABLE_DATA: MockTableRow[] = [
  {
    id: "1",
    name: "Переоценить товары в отделе Fashion",
    store: "SPAR Томск",
    status: "IN_PROGRESS",
    review: "ON_REVIEW",
    zone: "SALES_FLOOR",
  },
  {
    id: "2",
    name: "Проверить остатки в хранилище",
    store: "SPAR Новосибирск",
    status: "NEW",
    review: "NONE",
    zone: "WAREHOUSE",
  },
  {
    id: "3",
    name: "Оформить приём товара",
    store: "Food City Томск",
    status: "COMPLETED",
    review: "ACCEPTED",
    zone: "WAREHOUSE",
  },
  {
    id: "4",
    name: "Провести инвентаризацию",
    store: "SPAR Томск",
    status: "PAUSED",
    review: "NONE",
    zone: "WAREHOUSE",
  },
  {
    id: "5",
    name: "Обслуживание касс самообслуживания",
    store: "SPAR Новосибирск",
    status: "NEW",
    review: "NONE",
    zone: "SELF_CHECKOUT",
  },
  {
    id: "6",
    name: "Подготовка производственной линии",
    store: "Food City Томск",
    status: "IN_PROGRESS",
    review: "REJECTED",
    zone: "PRODUCTION_LINE",
  },
]

const MOCK_USERS = [
  {
    first_name: "Мария",
    last_name: "Иванова",
    middle_name: "Петровна",
    position_name: "Супервайзер",
  },
  {
    first_name: "Сергей",
    last_name: "Петров",
    middle_name: "Иванович",
    position_name: "Директор магазина",
  },
  {
    first_name: "Ольга",
    last_name: "Сидорова",
    middle_name: "Алексеевна",
    position_name: "HR-менеджер",
  },
  {
    first_name: "Александр",
    last_name: "Козлов",
    middle_name: "Владимирович",
    position_name: "Оператор",
  },
]

// ═══════════════════════════════════════════════════════════════════
// TABLE COLUMNS
// ═══════════════════════════════════════════════════════════════════

const columns: ColumnDef<MockTableRow>[] = [
  {
    accessorKey: "name",
    header: "Задача",
    cell: ({ row }) => <span className="font-medium">{row.getValue("name")}</span>,
  },
  {
    accessorKey: "store",
    header: "Магазин",
    cell: ({ row }) => <span>{row.getValue("store")}</span>,
  },
  {
    accessorKey: "status",
    header: "Статус",
    cell: ({ row }) => (
      <TaskStateBadge state={row.getValue("status") as TaskState} size="sm" />
    ),
  },
  {
    accessorKey: "review",
    header: "Проверка",
    cell: ({ row }) => {
      const review = row.getValue("review") as TaskReviewState
      return review !== "NONE" ? (
        <ReviewStateBadge reviewState={review} size="sm" />
      ) : (
        <span className="text-xs text-muted-foreground">—</span>
      )
    },
  },
  {
    accessorKey: "zone",
    header: "Зона",
    cell: ({ row }) => (
      <PermissionPill permission={row.getValue("zone") as Permission} />
    ),
  },
]

// ═══════════════════════════════════════════════════════════════════
// PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════

export default function SharedDisplayPage() {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [filters, setFilters] = useState<{ zone: Permission; status: TaskState }>({
    zone: "SALES_FLOOR",
    status: "IN_PROGRESS",
  })

  return (
    <main className="min-h-screen bg-background p-6">
      <div className="space-y-8 max-w-7xl mx-auto">
        {/* ═══════════════════════════════════════════════════════════════════
            HEADER
            ═══════════════════════════════════════════════════════════════════ */}
        <PageHeader
          title="Демо: Общие компоненты"
          subtitle="Витрина переиспользуемых WFM компонентов для проверки визуальной консистентности"
          breadcrumbs={[
            { label: "Главная", href: "/" },
            { label: "Демо" },
          ]}
        />

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 1: STATUS BADGES
            ═══════════════════════════════════════════════════════════════════ */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">1. Значки статусов</h2>

          {/* Task State */}
          <div className="bg-card rounded-lg p-4 border border-border space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Статусы задач</p>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  "NEW",
                  "IN_PROGRESS",
                  "PAUSED",
                  "COMPLETED",
                ] as TaskState[]
              ).map((state) => (
                <TaskStateBadge key={state} state={state} />
              ))}
            </div>
          </div>

          {/* Review State */}
          <div className="bg-card rounded-lg p-4 border border-border space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Статусы проверки</p>
            <div className="flex flex-wrap gap-2">
              {(["ON_REVIEW", "ACCEPTED", "REJECTED"] as TaskReviewState[]).map(
                (state) => (
                  <ReviewStateBadge key={state} reviewState={state} />
                )
              )}
            </div>
          </div>

          {/* Shift Status */}
          <div className="bg-card rounded-lg p-4 border border-border space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Статусы смен</p>
            <div className="flex flex-wrap gap-2">
              {(["NEW", "OPENED", "CLOSED"] as ShiftStatus[]).map(
                (status) => (
                  <ShiftStateBadge key={status} status={status} />
                )
              )}
            </div>
          </div>

          {/* Permission Pills */}
          <div className="bg-card rounded-lg p-4 border border-border space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Зоны доступа</p>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  "CASHIER",
                  "SALES_FLOOR",
                  "SELF_CHECKOUT",
                  "WAREHOUSE",
                  "PRODUCTION_LINE",
                ] as Permission[]
              ).map((permission) => (
                <PermissionPill key={permission} permission={permission} />
              ))}
            </div>
          </div>

          {/* Role Badges */}
          <div className="bg-card rounded-lg p-4 border border-border space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Функциональные роли</p>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  "NETWORK_OPS",
                  "REGIONAL",
                  "SUPERVISOR",
                  "STORE_DIRECTOR",
                  "HR_MANAGER",
                  "OPERATOR",
                  "WORKER",
                  "AGENT",
                  "PLATFORM_ADMIN",
                ] as FunctionalRole[]
              ).map((role) => (
                <RoleBadge key={role} role={role} />
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 2: LAYOUT PRIMITIVES (KPI CARDS)
            ═══════════════════════════════════════════════════════════════════ */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">2. KPI-карточки</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="Продажи (РУБ)"
              value="1 245 600"
              diff={12}
              trend={[10, 12, 11, 15, 18, 20, 22]}
            />
            <KpiCard
              label="Остатки"
              value="3 847"
              diff={-5}
              trend={[100, 95, 92, 88, 85, 83, 80]}
            />
            <KpiCard label="Средний чек (РУБ)" value="2 350" diff={8} />
            <KpiCard label="Выполнение (%)" value="94%" diff={3} />
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 3: ENTITY CARDS
            ═══════════════════════════════════════════════════════════════════ */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">3. Карточки сущностей</h2>

          {/* Employee Cards */}
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">Сотрудники</p>
            <div className="space-y-2">
              {MOCK_USERS.map((user, idx) => (
                <EntitySummaryCard
                  key={idx}
                  title={`${user.last_name} ${user.first_name} ${user.middle_name || ""}`}
                  subtitle={user.position_name}
                  avatar={{ fallback: user.last_name[0] + user.first_name[0] }}
                  status={{ label: "Активен", className: "bg-success/10 text-success border-success/20" }}
                  link="#"
                />
              ))}
            </div>
          </div>

          {/* Store Cards */}
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">Магазины</p>
            <div className="space-y-2">
              {[
                { name: "SPAR Томск", addr: "пр. Ленина, 80" },
                { name: "SPAR Новосибирск", addr: "Красный пр., 200" },
                { name: "Food City Томск", addr: "Global Market" },
              ].map((store, idx) => (
                <EntitySummaryCard
                  key={idx}
                  title={store.name}
                  subtitle={store.addr}
                  badges={[{ label: "5 задач", variant: "secondary" }]}
                  status={{ label: "Откр��т", className: "bg-success/10 text-success border-success/20" }}
                  link="#"
                />
              ))}
            </div>
          </div>
        </section>

        {/* ═════════════════��═════════════════════════════════════════════════
            SECTION 4: ACTIVITY FEED
            ═══════════════════════════════════════════════════════════════════ */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">4. Лента активности</h2>
          <div className="bg-card rounded-lg p-6 border border-border">
            <ActivityFeed items={ACTIVITY_ITEMS} />
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 5: EMPTY STATES
            ═══════════════════════════════════════════════════════════════════ */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">5. Пустые состояния</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-card rounded-lg border border-border overflow-hidden">
              <EmptyState
                icon={InboxIcon}
                title="Нет данных"
                description="Здесь пока ничего нет. Начните с создания новой задачи."
                action={{ label: "Создать", onClick: () => {} }}
              />
            </div>

            <div className="bg-card rounded-lg border border-border overflow-hidden">
              <EmptyState
                icon={InboxIcon}
                title="Поиск пуст"
                description="По вашему запросу ничего не найдено. Попробуйте изменить фильтры."
              />
            </div>

            <div className="bg-card rounded-lg border border-border overflow-hidden">
              <EmptyState
                icon={AlertTriangle}
                title="Ошибка загрузки"
                description="Что-то пошло не так. Повторите попытку позже."
              />
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 6: FILTERS & TABLE
            ═══════════════════════════════════════════════════════════════════ */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">6. Фильтры и таблица</h2>

          {/* Filter Chips */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Активные фильтры</p>
            <div className="flex flex-wrap gap-2">
              <FilterChip
                label="Зона"
                value="Торговый зал"
                onRemove={() => setFilters({ ...filters, zone: "CASHIER" })}
              />
              <FilterChip
                label="Статус"
                value="В работе"
                onRemove={() => setFilters({ ...filters, status: "NEW" })}
              />
              <span className="text-xs text-muted-foreground pt-1.5">
                <button className="text-primary hover:underline">Очистить все</button>
              </span>
            </div>
          </div>

          {/* Data Table */}
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">Задачи</p>
            <DataTableShell columns={columns} data={TABLE_DATA} />
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 7: USER CELLS
            ═══════════════════════════════════════════════════════════════════ */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">7. Ячейки пользователей</h2>
          <div className="bg-card rounded-lg p-4 border border-border space-y-2">
            {MOCK_USERS.map((user, idx) => (
              <div key={idx} className="py-2">
                <UserCell user={user} />
              </div>
            ))}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 8: DIALOGS
            ═══════════════════════════════════════════════════════════════════ */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">8. Подтверждающие диалоги</h2>

          <div className="bg-card rounded-lg p-6 border border-border flex gap-3">
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="size-4 mr-2" />
                  Архивировать задачу
                </Button>
              </AlertDialogTrigger>
              <ConfirmDialog
                title="Архивировать задачу?"
                message="Эта задача будет перемещена в архив. Восстановить её смогут только супервайзеры."
                confirmLabel="Архивировать"
                cancelLabel="Отмена"
                variant="destructive"
                onConfirm={() => {}}
                onOpenChange={setDeleteDialogOpen}
              />
            </AlertDialog>
          </div>
        </section>

        {/* Spacer */}
        <div className="h-8" />
      </div>
    </main>
  )
}
