"use client"

import * as React from "react"
import { type ColumnDef } from "@tanstack/react-table"
import { FileWarning } from "lucide-react"

import type { Permission } from "@/lib/types"
import type { UserWithAssignment } from "@/lib/api/users"
import { cn } from "@/lib/utils"

import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

import { FreelancerStatusBadge } from "@/components/shared/freelancer-status-badge"
import { PermissionPill } from "@/components/shared/permission-pill"
import { RoleBadge } from "@/components/shared/role-badge"
import { ShiftStateBadge } from "@/components/shared/shift-state-badge"
import { UserCell } from "@/components/shared/user-cell"

import { formatHiredAt, formatShiftTime } from "./_shared"
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

export function buildColumns({
  t,
  locale,
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
      id: "position",
      header: t("columns.position"),
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.assignment?.position_name ?? "—"}
        </span>
      ),
    },
    {
      id: "functional_role",
      header: t("columns.functional_role"),
      cell: ({ row }) =>
        row.original.functional_role ? (
          <RoleBadge role={row.original.functional_role} size="sm" />
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    {
      id: "permissions",
      header: t("columns.permissions"),
      cell: ({ row }) => {
        const perms: Permission[] = row.original.permissions ?? []
        const visible = perms.slice(0, 3)
        const extra = perms.length - 3
        return (
          <div className="flex flex-wrap items-center gap-1">
            {visible.map((p) => (
              <PermissionPill key={p} permission={p} />
            ))}
            {extra > 0 && (
              <Badge variant="secondary" className="text-xs px-1.5">
                {t("columns.more_permissions", { n: extra })}
              </Badge>
            )}
            {perms.length === 0 && (
              <span className="text-xs text-muted-foreground">—</span>
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
      id: "employment",
      header: t("columns.employment"),
      cell: ({ row }) => {
        const isFreelance = row.original.type === "FREELANCE"
        const noDocs =
          isFreelance &&
          (row.original.freelance_documents_count ?? 0) === 0
        return (
          <div className="flex items-center gap-1.5">
            <Badge
              className={cn(
                "text-xs",
                isFreelance
                  ? "bg-warning/10 text-warning border-warning/20"
                  : "bg-muted text-muted-foreground border-transparent"
              )}
            >
              {isFreelance
                ? t("employment.freelance")
                : t("employment.staff")}
            </Badge>
            {noDocs && (
              <FileWarning
                className="size-3.5 text-warning shrink-0"
                aria-label={t("employment.no_documents")}
              />
            )}
          </div>
        )
      },
    },
    {
      id: "hired_at",
      header: t("columns.hired_at"),
      size: 110,
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {formatHiredAt(row.original.hired_at, locale)}
        </span>
      ),
    },
    {
      id: "freelancer_status",
      header: t("columns.freelancer_status"),
      cell: ({ row }) => {
        const u = row.original
        if (u.type !== "FREELANCE" || !u.freelancer_status) return null
        return <FreelancerStatusBadge status={u.freelancer_status} size="sm" />
      },
    },
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
