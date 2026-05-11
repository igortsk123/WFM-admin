"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { Clock, MapPin } from "lucide-react"

import type { UnassignedTask, EmployeeUtilization, TaskDistributionAllocation } from "@/lib/api/distribution"
import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

import { HoursMinutesInput } from "./hours-minutes-input"
import {
  formatHM,
  formatShiftTime,
  getFullName,
  getInitials,
  getUtilizationColor,
  getUtilizationTextColor,
} from "./_utils"

// ─────────────────────────────────────────────────────────────────────────────
// DistributionSheet
// ─────────────────────────────────────────────────────────────────────────────

interface AllocationState {
  [userId: number]: number // minutes allocated
}

export interface DistributionSheetProps {
  task: UnassignedTask | null
  employees: EmployeeUtilization[]
  initialAllocations: TaskDistributionAllocation[]
  open: boolean
  onClose: () => void
  onSave: (allocations: TaskDistributionAllocation[]) => void
  canEdit: boolean
  t: ReturnType<typeof useTranslations>
}

export function DistributionSheet({
  task,
  employees,
  initialAllocations,
  open,
  onClose,
  onSave,
  canEdit,
  t,
}: DistributionSheetProps) {
  const [allocations, setAllocations] = React.useState<AllocationState>({})
  // Фильтр «только подходящие зоны» — показывать сотрудников у кого есть
  // зона задачи в их zones (включая историю работы). По умолчанию включен
  // если у задачи есть zone_name.
  const [zoneFilterEnabled, setZoneFilterEnabled] = React.useState(true)

  // Заполняем sheet существующим планом для этой задачи (если есть).
  // Без этого user открыл бы пустой editor поверх уже наколдованного auto-плана.
  React.useEffect(() => {
    if (task) {
      const initial: AllocationState = {}
      for (const a of initialAllocations) {
        initial[a.userId] = a.minutes
      }
      setAllocations(initial)
      setZoneFilterEnabled(true) // reset на каждый новый task
    }
  }, [task?.id, initialAllocations])

  if (!task) return null

  const totalTaskMinutes = task.planned_minutes
  const distributedMinutes = Object.values(allocations).reduce((sum, min) => sum + min, 0)
  const remainingMinutes = totalTaskMinutes - distributedMinutes

  const handleAllocationChange = (userId: number, minutes: number) => {
    setAllocations((prev) => {
      if (minutes <= 0) {
        const next = { ...prev }
        delete next[userId]
        return next
      }
      return { ...prev, [userId]: minutes }
    })
  }

  const handleSave = () => {
    const allocationsList: TaskDistributionAllocation[] = Object.entries(allocations)
      .filter(([, minutes]) => minutes > 0)
      .map(([userId, minutes]) => ({
        userId: parseInt(userId),
        minutes,
      }))

    onSave(allocationsList)
  }

  // Cap removed: директор может назначить сверх плана задачи (warning UI ниже).
  const canSave = distributedMinutes > 0
  const overTaskMinutes = Math.max(0, distributedMinutes - totalTaskMinutes)

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col h-full max-h-screen">
        <SheetHeader className="px-4 pt-4 pb-3 border-b shrink-0">
          <SheetTitle className="text-base text-left pr-8">
            {t("sheet.title", { taskTitle: task.title })}
          </SheetTitle>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="size-3" />
            <span>{task.zone_name}</span>
            <span className="text-border">·</span>
            <Clock className="size-3" />
            <span>{formatHM(totalTaskMinutes, t)}</span>
          </div>
        </SheetHeader>

        {/* Distribution summary */}
        <div className="px-4 py-3 bg-muted/50 border-b shrink-0">
          <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
            <span className="text-sm font-medium">
              {t("sheet.distributed_summary", {
                distributed: formatHM(distributedMinutes, t),
                total: formatHM(totalTaskMinutes, t),
              })}
            </span>
            {remainingMinutes > 0 && (
              <Badge variant="outline" className="text-xs">
                {t("sheet.remaining", { remaining: formatHM(remainingMinutes, t) })}
              </Badge>
            )}
            {overTaskMinutes > 0 && (
              <Badge variant="destructive" className="text-xs">
                {t("sheet.over_task", { over: formatHM(overTaskMinutes, t) })}
              </Badge>
            )}
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full transition-all",
                distributedMinutes > totalTaskMinutes ? "bg-destructive" : "bg-primary"
              )}
              style={{ width: `${Math.min((distributedMinutes / totalTaskMinutes) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Filter «только подходящие сотрудники» — три-уровневый каскад:
            1. Strict: zone И work_type оба совпадают с историей emp.
            2. Relax: только zone (если strict пустой и зона есть).
            3. Relax: только work_type (если zone нет или относится к Касса/КСО).
            Совместно zone+wtype = «бригадный» match — то что предпочитает алго iter#8. */}
        {(() => {
          const hasZone = !!task.zone_name && task.zone_name !== "Без зоны"
          const hasWorkType = !!task.work_type_name
          const filterAvailable = hasZone || hasWorkType
          const matchEmp = (e: typeof employees[number]): boolean => {
            const inZone = !hasZone || (e.user.zones?.includes(task.zone_name) ?? false)
            const inWtype = !hasWorkType || (e.user.work_types?.includes(task.work_type_name!) ?? false)
            // Strict: обе галочки должны совпадать (когда они применимы).
            if (hasZone && hasWorkType) return inZone && inWtype
            if (hasZone) return inZone
            if (hasWorkType) return inWtype
            return true
          }
          let matched = employees.filter(matchEmp)
          let matchKind = hasZone && hasWorkType ? "по зоне и типу работ" : hasZone ? "по зоне" : "по типу работ"
          // Если strict zone+wt пустой — relax до zone-only.
          if (matched.length === 0 && hasZone && hasWorkType) {
            matched = employees.filter((e) => e.user.zones?.includes(task.zone_name) ?? false)
            matchKind = "по зоне"
          }
          // Если ещё пусто — relax до wt-only.
          if (matched.length === 0 && hasWorkType) {
            matched = employees.filter((e) => e.user.work_types?.includes(task.work_type_name!) ?? false)
            matchKind = "по типу работ"
          }
          return (
            <div className="px-4 py-2 border-b shrink-0 flex items-center justify-between gap-2 text-xs">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={zoneFilterEnabled && filterAvailable}
                  onChange={(e) => setZoneFilterEnabled(e.target.checked)}
                  disabled={!filterAvailable}
                  className="size-4"
                />
                <span className={cn(!filterAvailable && "text-muted-foreground")}>
                  Только подходящие сотрудники
                  {matchKind && (
                    <span className="text-muted-foreground"> ({matchKind})</span>
                  )}
                </span>
              </label>
              <span className="text-muted-foreground">
                {zoneFilterEnabled && filterAvailable
                  ? `${matched.length} из ${employees.length}`
                  : `${employees.length} всего`}
              </span>
            </div>
          )
        })()}

        {/* Cashier hard-constraint warning. Касса = материальная
            ответственность — отдавать можно ТОЛЬКО тем у кого «Касса» уже
            в истории. Если 0 таких на смене — показываем директору alert
            с просьбой добавить зону. (КСО — касса самообслуживания — не
            попадает под это правило). */}
        {task.work_type_name === "Касса" && (() => {
          const cashiers = employees.filter((e) => e.user.work_types?.includes("Касса"))
          if (cashiers.length > 0) return null
          return (
            <div className="mx-4 my-3 px-3 py-2 rounded-md border border-warning/40 bg-warning/10 text-warning text-xs">
              <strong>Касса = материальная ответственность.</strong> Сегодня на смене
              нет сотрудников с подтверждённой работой на кассе. Откройте
              карточку нужного сотрудника и поставьте галочку «Касса» в
              разделе «Типы задач».
            </div>
          )
        })()}

        {/* Employee list */}
        <ScrollArea className="flex-1 min-h-0 px-4 py-3">
          <p className="text-xs font-medium text-muted-foreground mb-3">
            {t("sheet.employee_list_header")}
          </p>
          <div className="space-y-3">
            {(() => {
              if (!zoneFilterEnabled) return employees
              const hasZone = !!task.zone_name && task.zone_name !== "Без зоны"
              const hasWorkType = !!task.work_type_name
              // Касса = hard constraint, без relax.
              if (task.work_type_name === "Касса") {
                return employees.filter((e) => e.user.work_types?.includes("Касса"))
              }
              // Strict zone+wt
              if (hasZone && hasWorkType) {
                const strict = employees.filter(
                  (e) =>
                    e.user.zones?.includes(task.zone_name) &&
                    e.user.work_types?.includes(task.work_type_name!)
                )
                if (strict.length > 0) return strict
                // relax to zone-only
                return employees.filter((e) => e.user.zones?.includes(task.zone_name))
              }
              if (hasZone) {
                return employees.filter((e) => e.user.zones?.includes(task.zone_name))
              }
              if (hasWorkType) {
                return employees.filter((e) => e.user.work_types?.includes(task.work_type_name!))
              }
              return employees
            })().map((emp) => {
              const currentAllocation = allocations[emp.user.id] || 0
              const fullName = getFullName(emp.user.first_name, emp.user.last_name)
              const freeMinutes = emp.shift_total_min - emp.assigned_min
              const previewUtilization = emp.shift_total_min > 0
                ? Math.round(((emp.assigned_min + currentAllocation) / emp.shift_total_min) * 100)
                : 0

              return (
                <div key={emp.user.id} className="p-3 rounded-lg border bg-card">
                  <div className="flex items-start gap-3">
                    <Avatar className="size-9 shrink-0">
                      <AvatarImage src={emp.user.avatar_url} alt={fullName} />
                      <AvatarFallback className="text-xs bg-accent text-accent-foreground">
                        {getInitials(emp.user.first_name, emp.user.last_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{fullName}</p>
                          <p className="text-xs text-muted-foreground">
                            {t("sheet.shift_time", {
                              start: formatShiftTime(emp.shift_start, emp.shift_end).split("–")[0],
                              end: formatShiftTime(emp.shift_start, emp.shift_end).split("–")[1],
                            })}
                          </p>
                        </div>
                        <HoursMinutesInput
                          value={currentAllocation}
                          onChange={(min) => handleAllocationChange(emp.user.id, min)}
                          disabled={!canEdit}
                          invalid={currentAllocation > freeMinutes + 1}
                          className="shrink-0"
                          t={t}
                        />
                      </div>
                      {/* Utilization bar */}
                      <div className="mt-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className={cn(
                                "h-full transition-all",
                                getUtilizationColor(previewUtilization)
                              )}
                              style={{ width: `${Math.min(previewUtilization, 100)}%` }}
                            />
                          </div>
                          <span className={cn("text-xs font-medium shrink-0 w-8 text-right", getUtilizationTextColor(previewUtilization))}>
                            {previewUtilization}%
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {t("utilization.available")}: {formatHM(freeMinutes, t)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </ScrollArea>

        {/* Footer */}
        <SheetFooter className="border-t px-4 py-3 gap-2 sm:gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            {t("sheet.save_later")}
          </Button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex-1">
                  <Button
                    onClick={handleSave}
                    disabled={!canSave || !canEdit}
                    className="w-full"
                  >
                    {t("sheet.save")}
                  </Button>
                </div>
              </TooltipTrigger>
              {!canEdit && (
                <TooltipContent>{t("forbidden.tooltip")}</TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
