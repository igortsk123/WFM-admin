"use client"

import { type ColumnDef } from "@tanstack/react-table"

import type { StoreWithStats } from "@/lib/api/stores"

import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { UserCell } from "@/components/shared/user-cell"

import { LamaSyncCell } from "./lama-sync-cell"
import { RowActions } from "./row-actions"

interface BuildColumnsParams {
  t: (key: string) => string
  selectedIds: Set<number>
  allSelected: boolean
  onToggleAll: () => void
  onToggleRow: (id: number) => void
  onOpen: (store: StoreWithStats) => void
  onEdit: (store: StoreWithStats) => void
  onChangeDirector: (store: StoreWithStats) => void
  onSync: (store: StoreWithStats) => void
  onArchive: (store: StoreWithStats) => void
}

export function buildStoreColumns({
  t,
  selectedIds,
  allSelected,
  onToggleAll,
  onToggleRow,
  onOpen,
  onEdit,
  onChangeDirector,
  onSync,
  onArchive,
}: BuildColumnsParams): ColumnDef<StoreWithStats>[] {
  return [
    {
      id: "select",
      header: () => (
        <Checkbox
          checked={allSelected}
          onCheckedChange={onToggleAll}
          aria-label="Выбрать всё"
          className="translate-y-[2px]"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={selectedIds.has(row.original.id)}
          onCheckedChange={() => onToggleRow(row.original.id)}
          aria-label={`Выбрать ${row.original.name}`}
          className="translate-y-[2px]"
          onClick={(e) => e.stopPropagation()}
        />
      ),
      enableSorting: false,
    },
    {
      id: "code",
      header: t("columns.code"),
      cell: ({ row }) => (
        <Badge
          variant="secondary"
          className="font-mono text-xs uppercase px-1.5 py-0 tabular-nums"
        >
          {row.original.external_code}
        </Badge>
      ),
    },
    {
      id: "name",
      header: t("columns.name"),
      cell: ({ row }) => (
        <span className="text-sm font-medium text-primary hover:underline cursor-pointer truncate max-w-[180px] block">
          {row.original.name}
        </span>
      ),
    },
    {
      id: "address",
      header: t("columns.address"),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground truncate max-w-[160px] block">
          {row.original.address}
        </span>
      ),
    },
    {
      id: "city",
      header: t("columns.city"),
      cell: ({ row }) => <span className="text-sm">{row.original.city}</span>,
    },
    {
      id: "director",
      header: t("columns.director"),
      cell: ({ row }) => {
        const store = row.original
        if (store.manager_id && store.manager_name) {
          const nameParts = store.manager_name.split(" ")
          return (
            <UserCell
              user={{
                first_name: nameParts[1] ?? "",
                last_name: nameParts[0] ?? store.manager_name,
              }}
            />
          )
        }
        return (
          <div className="flex items-center gap-2">
            <span className="text-sm italic text-muted-foreground">
              {t("director.unassigned")}
            </span>
            <button className="text-xs text-primary hover:underline shrink-0">
              {t("director.assign")}
            </button>
          </div>
        )
      },
    },
    {
      id: "staff",
      header: () => <span className="block text-right">{t("columns.staff")}</span>,
      cell: ({ row }) => (
        <span className="block text-right text-sm tabular-nums">
          {row.original.staff_count}
        </span>
      ),
    },
    {
      id: "tasks_today",
      header: t("columns.tasks_today"),
      cell: ({ row }) => (
        <span className="text-sm tabular-nums">{row.original.tasks_today_count}</span>
      ),
    },
    {
      id: "lama_sync",
      header: t("columns.lama_sync"),
      cell: ({ row }) => <LamaSyncCell lama_synced_at={row.original.lama_synced_at} />,
    },
    {
      id: "status",
      header: t("columns.status"),
      cell: ({ row }) => (
        <Badge
          variant={row.original.archived ? "secondary" : "outline"}
          className={cn(
            !row.original.archived && "text-success border-success/30 bg-success/10",
          )}
        >
          {row.original.archived ? t("status.archived") : t("status.active")}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <RowActions
          store={row.original}
          onOpen={() => onOpen(row.original)}
          onEdit={() => onEdit(row.original)}
          onChangeDirector={() => onChangeDirector(row.original)}
          onSync={() => onSync(row.original)}
          onArchive={() => onArchive(row.original)}
        />
      ),
      enableSorting: false,
    },
  ]
}
