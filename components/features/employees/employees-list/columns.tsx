"use client"

import * as React from "react"
import { type ColumnDef } from "@tanstack/react-table"
import { FileWarning } from "lucide-react"

import type { UserWithAssignment } from "@/lib/api/users"

import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

import { ShiftStateBadge } from "@/components/shared/shift-state-badge"
import { UserCell } from "@/components/shared/user-cell"

import { LAMA_EMPLOYEE_ZONES } from "@/lib/mock-data/_lama-employee-zones"
import { LAMA_EMPLOYEE_WORK_TYPES } from "@/lib/mock-data/_lama-employee-work-types"

import { formatShiftTime, shortenWorkType } from "./_shared"
import { RowActions } from "./row-actions"

interface BuildColumnsArgs {
  t: (key: string, vars?: Record<string, unknown>) => string
  locale: string
  hideStore: boolean
  canFullCRUD: boolean
  canArchiveBulk: boolean
  canImpersonate: boolean
  selectedIds: Set<number>
  allSelected: boolean
  toggleAll: () => void
  toggleRow: (id: number) => void
  onOpenPermissions: (userId: number) => void
  onArchive: (userId: number) => void
}

// Сокращения зон чтобы влезали в колонку.
const ZONE_SHORT_LABELS: Record<string, string> = {
  "Кондитерка, чай, кофе": "Кондитерка",
  "Молочные продукты": "Молочка",
  "Фрукты, овощи": "Овощи",
  Хозтовары: "Хоз.",
  Менеджерские: "Менедж.",
  Бакалея: "Бакалея",
}

function shortenZone(z: string): string {
  return ZONE_SHORT_LABELS[z] ?? (z.length > 12 ? `${z.slice(0, 11)}…` : z)
}

export function buildColumns({
  t,
  locale: _locale,
  hideStore,
  canFullCRUD,
  canArchiveBulk,
  canImpersonate,
  selectedIds,
  allSelected,
  toggleAll,
  toggleRow,
  onOpenPermissions,
  onArchive,
}: BuildColumnsArgs): ColumnDef<UserWithAssignment>[] {
  const columns: ColumnDef<UserWithAssignment>[] = [
    {
      id: "select",
      header: () => (
        <Checkbox
          checked={allSelected}
          onCheckedChange={toggleAll}
          aria-label="Select all"
          className="translate-y-[1px]"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={selectedIds.has(row.original.id)}
          onCheckedChange={() => toggleRow(row.original.id)}
          onClick={(e) => e.stopPropagation()}
          aria-label="Select row"
          className="translate-y-[1px]"
        />
      ),
      enableSorting: false,
    },
    {
      id: "fio",
      header: t("columns.fio"),
      cell: ({ row }) => {
        const u = row.original
        const hasUnsignedOferta =
          u.type === "FREELANCE" && !u.oferta_accepted_at
        return (
          <div className="flex items-center gap-1.5">
            <UserCell
              user={{
                first_name: u.first_name,
                last_name: u.last_name,
                middle_name: u.middle_name,
                avatar_url: u.avatar_url,
                position_name: u.assignment?.position_name,
              }}
            />
            {hasUnsignedOferta && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <FileWarning
                      className="size-3.5 text-warning shrink-0"
                      aria-label={t("employment.no_oferta")}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    {t("employment.no_oferta")}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        )
      },
    },
    {
      id: "position",
      header: t("columns.position"),
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.assignment?.position_name ?? "—"}
        </span>
      ),
    },
    {
      id: "zones",
      header: t("columns.zones"),
      cell: ({ row }) => {
        const zones = LAMA_EMPLOYEE_ZONES[row.original.id] ?? []
        if (zones.length === 0) {
          return <span className="text-xs text-muted-foreground">—</span>
        }
        const visible = zones.slice(0, 2)
        const extra = zones.length - 2
        return (
          <div className="flex flex-wrap items-center gap-1 max-w-[180px]">
            {visible.map((z) => (
              <Badge
                key={z}
                variant="secondary"
                className="text-xs px-1.5 font-normal"
                title={z}
              >
                {shortenZone(z)}
              </Badge>
            ))}
            {extra > 0 && (
              <Badge
                variant="secondary"
                className="text-xs px-1.5"
                title={zones.slice(2).join(", ")}
              >
                {t("columns.more_zones", { n: extra })}
              </Badge>
            )}
          </div>
        )
      },
    },
    {
      id: "current_shift",
      header: t("columns.current_shift"),
      cell: ({ row }) => {
        const shift = row.original.current_shift
        if (!shift) {
          return (
            <span className="text-xs italic text-muted-foreground">
              {t("shift.no_shift")}
            </span>
          )
        }
        const start = formatShiftTime(shift.actual_start ?? shift.planned_start)
        const end = formatShiftTime(shift.actual_end ?? shift.planned_end)
        return (
          <div className="flex items-center gap-1.5">
            <ShiftStateBadge status={shift.status} size="sm" />
            {shift.status === "OPENED" && start && end && (
              <span className="text-xs text-muted-foreground">
                {t("shift.time_range", { start, end })}
              </span>
            )}
          </div>
        )
      },
    },
    {
      id: "work_types",
      header: t("columns.work_types"),
      cell: ({ row }) => {
        const u = row.original
        const wts: string[] =
          u.preferred_work_types ?? LAMA_EMPLOYEE_WORK_TYPES[u.id] ?? []
        if (wts.length === 0) {
          return <span className="text-xs text-muted-foreground">—</span>
        }
        const visible = wts.slice(0, 2)
        const extra = wts.length - 2
        return (
          <div className="flex flex-wrap items-center gap-1 max-w-[180px]">
            {visible.map((wt) => (
              <Badge
                key={wt}
                variant="secondary"
                className="text-xs px-1.5 font-normal"
                title={wt}
              >
                {shortenWorkType(wt)}
              </Badge>
            ))}
            {extra > 0 && (
              <Badge
                variant="secondary"
                className="text-xs px-1.5"
                title={wts.slice(2).join(", ")}
              >
                {t("columns.more_work_types", { n: extra })}
              </Badge>
            )}
          </div>
        )
      },
    },
    ...(!hideStore
      ? [
          {
            id: "store",
            header: t("columns.store"),
            cell: ({ row }: { row: { original: UserWithAssignment } }) => (
              <span className="text-sm text-muted-foreground truncate max-w-[180px] block">
                {row.original.assignment?.store_name ?? "—"}
              </span>
            ),
          } as ColumnDef<UserWithAssignment>,
        ]
      : []),
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <RowActions
          user={row.original}
          variant="desktop"
          canFullCRUD={canFullCRUD}
          canArchiveBulk={canArchiveBulk}
          canImpersonate={canImpersonate}
          onOpenPermissions={() => onOpenPermissions(row.original.id)}
          onArchive={() => onArchive(row.original.id)}
        />
      ),
      enableSorting: false,
    },
  ]

  return columns
}
