"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { FileWarning } from "lucide-react"

import type { UserWithAssignment } from "@/lib/api/users"
import { cn } from "@/lib/utils"

import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"

import { EntityMobileCard } from "@/components/shared/entity-mobile-card"
import { PermissionPill } from "@/components/shared/permission-pill"
import { RoleBadge } from "@/components/shared/role-badge"
import { ShiftStateBadge } from "@/components/shared/shift-state-badge"
import { UserCell } from "@/components/shared/user-cell"

import { formatShiftTime } from "./_shared"
import { RowActions } from "./row-actions"

interface MobileCardProps {
  user: UserWithAssignment
  hideStore: boolean
  canFullCRUD: boolean
  canArchiveBulk: boolean
  canImpersonate: boolean
  selectedIds: Set<number>
  toggleRow: (id: number) => void
  onOpenPermissions: (userId: number) => void
  onArchive: (userId: number) => void
}

export function MobileCard({
  user,
  hideStore,
  canFullCRUD,
  canArchiveBulk,
  canImpersonate,
  selectedIds,
  toggleRow,
  onOpenPermissions,
  onArchive,
}: MobileCardProps) {
  const t = useTranslations("screen.employees")
  const u = user
  const shift = u.current_shift
  const isFreelance = u.type === "FREELANCE"
  const noDocs = isFreelance && (u.freelance_documents_count ?? 0) === 0
  const start = shift
    ? formatShiftTime(shift.actual_start ?? shift.planned_start)
    : ""
  const end = shift
    ? formatShiftTime(shift.actual_end ?? shift.planned_end)
    : ""
  const visiblePerms = (u.permissions ?? []).slice(0, 2)
  const extraPerms = (u.permissions ?? []).length - 2

  return (
    <EntityMobileCard
      title={
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <UserCell
            user={{
              first_name: u.first_name,
              last_name: u.last_name,
              middle_name: u.middle_name,
              avatar_url: u.avatar_url,
              position_name: u.assignment?.position_name,
            }}
            className="flex-1"
          />
          {noDocs && (
            <FileWarning
              className="size-4 text-warning shrink-0"
              aria-label={t("employment.no_documents")}
            />
          )}
        </div>
      }
      actions={
        <>
          <Checkbox
            checked={selectedIds.has(u.id)}
            onCheckedChange={() => toggleRow(u.id)}
            onClick={(e) => e.stopPropagation()}
            aria-label="Select"
            className="size-5"
          />
          <RowActions
            user={u}
            variant="mobile"
            canFullCRUD={canFullCRUD}
            canArchiveBulk={canArchiveBulk}
            canImpersonate={canImpersonate}
            onOpenPermissions={() => onOpenPermissions(u.id)}
            onArchive={() => onArchive(u.id)}
          />
        </>
      }
      meta={[
        !hideStore && u.assignment?.store_name ? (
          <p className="text-xs text-muted-foreground truncate pl-[42px] w-full">
            {u.assignment.store_name}
          </p>
        ) : null,
        <div key="role" className="flex items-center gap-2 pl-[42px] flex-wrap">
          {u.functional_role && (
            <RoleBadge role={u.functional_role} size="sm" />
          )}
          <Badge
            className={cn(
              "text-xs",
              isFreelance
                ? "bg-warning/10 text-warning border-warning/20"
                : "bg-muted text-muted-foreground border-transparent",
            )}
          >
            {isFreelance ? t("employment.freelance") : t("employment.staff")}
          </Badge>
        </div>,
        <div key="perms" className="flex flex-wrap items-center gap-1 pl-[42px]">
          {visiblePerms.map((p) => (
            <PermissionPill key={p} permission={p} />
          ))}
          {extraPerms > 0 && (
            <Badge variant="secondary" className="text-xs px-1.5">
              {t("columns.more_permissions", { n: extraPerms })}
            </Badge>
          )}
        </div>,
        <div key="shift" className="flex items-center gap-2 pl-[42px]">
          {shift ? (
            <>
              <ShiftStateBadge status={shift.status} size="sm" />
              {shift.status === "OPENED" && start && end && (
                <span className="text-xs text-muted-foreground">
                  {t("shift.time_range", { start, end })}
                </span>
              )}
            </>
          ) : (
            <span className="text-xs italic text-muted-foreground">
              {t("shift.no_shift")}
            </span>
          )}
        </div>,
      ]}
    />
  )
}
