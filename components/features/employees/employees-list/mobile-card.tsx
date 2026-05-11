"use client"

import * as React from "react"
import { memo } from "react"
import { useTranslations } from "next-intl"

import type { UserWithAssignment } from "@/lib/api/users"

import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"

import { EntityMobileCard } from "@/components/shared/entity-mobile-card"
import { ShiftStateBadge } from "@/components/shared/shift-state-badge"
import { UserCell } from "@/components/shared/user-cell"

import { LAMA_EMPLOYEE_ZONES } from "@/lib/mock-data/_lama-employee-zones"
import { LAMA_EMPLOYEE_WORK_TYPES } from "@/lib/mock-data/_lama-employee-work-types"

import { formatShiftTime, shortenWorkType } from "./_shared"
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

export const MobileCard = memo(function MobileCard({
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
  const start = shift
    ? formatShiftTime(shift.actual_start ?? shift.planned_start)
    : ""
  const end = shift
    ? formatShiftTime(shift.actual_end ?? shift.planned_end)
    : ""
  const zones = LAMA_EMPLOYEE_ZONES[u.id] ?? []
  const visibleZones = zones.slice(0, 3)
  const extraZones = zones.length - 3
  const workTypes: string[] =
    u.preferred_work_types ?? LAMA_EMPLOYEE_WORK_TYPES[u.id] ?? []
  const visibleWts = workTypes.slice(0, 3)
  const extraWts = workTypes.length - 3

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
          <p
            key="store"
            className="text-xs text-muted-foreground truncate pl-[42px] w-full"
          >
            {u.assignment.store_name}
          </p>
        ) : null,
        zones.length > 0 ? (
          <div
            key="zones"
            className="flex flex-wrap items-center gap-1 pl-[42px]"
          >
            {visibleZones.map((z) => (
              <Badge
                key={z}
                variant="secondary"
                className="text-xs px-1.5 font-normal"
              >
                {z}
              </Badge>
            ))}
            {extraZones > 0 && (
              <Badge variant="secondary" className="text-xs px-1.5">
                {t("columns.more_zones", { n: extraZones })}
              </Badge>
            )}
          </div>
        ) : null,
        workTypes.length > 0 ? (
          <div
            key="work_types"
            className="flex flex-wrap items-center gap-1 pl-[42px]"
          >
            {visibleWts.map((wt) => (
              <Badge
                key={wt}
                variant="secondary"
                className="text-xs px-1.5 font-normal"
                title={wt}
              >
                {shortenWorkType(wt)}
              </Badge>
            ))}
            {extraWts > 0 && (
              <Badge variant="secondary" className="text-xs px-1.5">
                {t("columns.more_work_types", { n: extraWts })}
              </Badge>
            )}
          </div>
        ) : null,
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
})
