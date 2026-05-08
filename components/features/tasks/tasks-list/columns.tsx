"use client"

import { useTranslations, useLocale } from "next-intl"
import { useRouter } from "@/i18n/navigation"
import type { ColumnDef } from "@tanstack/react-table"
import { Shield } from "lucide-react"

import { Checkbox } from "@/components/ui/checkbox"
import { TaskStateBadge } from "@/components/shared/task-state-badge"
import { ReviewStateBadge } from "@/components/shared/review-state-badge"
import { UserCell } from "@/components/shared/user-cell"
import type { TaskWithAvatar } from "@/lib/api/tasks"
import { ADMIN_ROUTES } from "@/lib/constants/routes"

import { formatRelativeDate } from "./_shared"
import { SourceBadge } from "./source-badge"
import { RowActions } from "./row-actions"

interface BuildColumnsParams {
  data: TaskWithAvatar[]
  selectedIds: Set<string>
  onToggleAll: () => void
  onToggleOne: (id: string) => void
  isArchiveTab: boolean
}

export function useTasksColumns({
  data,
  selectedIds,
  onToggleAll,
  onToggleOne,
  isArchiveTab,
}: BuildColumnsParams): ColumnDef<TaskWithAvatar>[] {
  const t = useTranslations("screen.tasks")
  const tArchive = useTranslations("task.archive_reason")
  const locale = useLocale()
  const router = useRouter()

  const columns: ColumnDef<TaskWithAvatar>[] = [
    {
      id: "select",
      header: () => (
        <Checkbox
          checked={data.length > 0 && selectedIds.size === data.length}
          onCheckedChange={onToggleAll}
          aria-label="Выбрать все"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={selectedIds.has(row.original.id)}
          onCheckedChange={() => onToggleOne(row.original.id)}
          aria-label={`Выбрать задачу ${row.original.title}`}
          onClick={(e) => e.stopPropagation()}
        />
      ),
      enableSorting: false,
    },
    {
      accessorKey: "title",
      header: t("table.name"),
      cell: ({ row }) => {
        const task = row.original
        return (
          <div className="flex flex-col gap-0.5 min-w-0 max-w-[260px]">
            <span className="font-medium text-sm text-foreground truncate">{task.title}</span>
            <span className="text-xs text-muted-foreground truncate">
              {task.zone_name} · {task.work_type_name}
            </span>
          </div>
        )
      },
    },
    {
      accessorKey: "store_name",
      header: t("table.store"),
      cell: ({ row }) => (
        <span className="text-sm text-foreground truncate max-w-[160px] block">
          {row.original.store_name}
        </span>
      ),
    },
    {
      id: "assignee",
      header: t("table.assignee"),
      cell: ({ row }) => {
        const task = row.original
        if (task.assignee_id && task.assignee_name) {
          const nameParts = task.assignee_name.split(" ")
          return (
            <UserCell
              user={{
                first_name: nameParts[1] ?? "",
                last_name: nameParts[0] ?? task.assignee_name,
                avatar_url: task.assignee_avatar,
              }}
              className="min-w-[120px]"
            />
          )
        }
        if (task.assigned_to_permission) {
          return (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Shield className="size-3.5 shrink-0" />
              {task.assigned_to_permission}
            </div>
          )
        }
        return <span className="text-sm text-muted-foreground">—</span>
      },
    },
    {
      id: "status",
      header: t("table.status"),
      cell: ({ row }) => {
        const task = row.original
        return (
          <div className="flex items-center gap-1.5 flex-wrap">
            <TaskStateBadge state={task.state} size="sm" />
            {task.review_state !== "NONE" && (
              <ReviewStateBadge reviewState={task.review_state} size="sm" />
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "planned_minutes",
      header: t("table.planned_min"),
      cell: ({ row }) => (
        <span className="tabular-nums text-sm text-right block">{row.original.planned_minutes}</span>
      ),
    },
    {
      accessorKey: "source",
      header: t("table.source"),
      cell: ({ row }) => (
        <SourceBadge
          task={row.original}
          onAiClick={(id) =>
            router.push(
              `${ADMIN_ROUTES.aiSuggestions}?id=${id}` as Parameters<typeof router.push>[0],
            )
          }
        />
      ),
      enableSorting: false,
    },
    ...(isArchiveTab
      ? [
          {
            accessorKey: "archive_reason",
            header: t("table.archive_reason"),
            cell: ({ row }: { row: { original: TaskWithAvatar } }) => (
              <span className="text-sm text-muted-foreground">
                {row.original.archive_reason
                  ? tArchive(
                      row.original.archive_reason as Parameters<typeof tArchive>[0],
                    )
                  : "—"}
              </span>
            ),
          } satisfies ColumnDef<TaskWithAvatar>,
        ]
      : []),
    {
      accessorKey: "created_at",
      header: t("table.created_at"),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {formatRelativeDate(row.original.created_at, locale)}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <RowActions task={row.original} isArchiveTab={isArchiveTab} triggerSize="size-8" />
      ),
      enableSorting: false,
    },
  ]

  return columns
}
