"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { Clock, MapPin, Wand2 } from "lucide-react"

import type { UnassignedTask, EmployeeUtilization, TaskDistributionAllocation } from "@/lib/api/distribution"
import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
// EmployeeSheet — взгляд «от сотрудника к задачам»: его план + add/remove
// ─────────────────────────────────────────────────────────────────────────────

export interface EmployeeSheetProps {
  employee: EmployeeUtilization | null
  tasks: UnassignedTask[]
  plan: Map<string, TaskDistributionAllocation[]>
  open: boolean
  onClose: () => void
  onPlanChange: (next: Map<string, TaskDistributionAllocation[]>) => void
  canEdit: boolean
  t: ReturnType<typeof useTranslations>
}

export function EmployeeSheet({
  employee, tasks, plan, open, onClose, onPlanChange, canEdit, t,
}: EmployeeSheetProps) {
  // Симметричный близнец DistributionSheet: список ВСЕХ задач со скроллом,
  // на каждой — HoursMinutesInput для быстрого ввода часов сотруднику.
  // Локальный state allocations: { taskId → minutes }; на Save обновляем
  // общий plan Map<taskId, allocation[]> заменяя записи только этого user'а.
  type EmployeeAllocations = Record<string, number>
  const [allocations, setAllocations] = React.useState<EmployeeAllocations>({})
  const [zoneFilterEnabled, setZoneFilterEnabled] = React.useState(true)

  // При открытии (или смене сотрудника) — заполняем initial из plan.
  React.useEffect(() => {
    if (employee) {
      const init: EmployeeAllocations = {}
      for (const [taskId, allocs] of plan) {
        const my = allocs.find((a) => a.userId === employee.user.id)
        if (my && my.minutes > 0) init[taskId] = my.minutes
      }
      setAllocations(init)
      setZoneFilterEnabled(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee?.user.id, open])

  if (!employee) return null

  const userId = employee.user.id
  const fullName = getFullName(employee.user.first_name, employee.user.last_name)

  const planMin = Object.values(allocations).reduce((sum, m) => sum + m, 0)
  const previewUtilization = employee.shift_total_min > 0
    ? Math.round(((employee.assigned_min + planMin) / employee.shift_total_min) * 100)
    : 0
  const overShiftBy = Math.max(0, planMin - (employee.shift_total_min - employee.assigned_min))

  const handleAllocationChange = (taskId: string, minutes: number) => {
    setAllocations((prev) => {
      if (minutes <= 0) {
        const next = { ...prev }
        delete next[taskId]
        return next
      }
      return { ...prev, [taskId]: minutes }
    })
  }

  const handleSave = () => {
    const next = new Map(plan)
    // Все задачи которые могли быть затронуты этим сотрудником: те что в state +
    // те что были в plan (нужно убрать, если minutes=0).
    const touchedTaskIds = new Set<string>([
      ...Object.keys(allocations),
      ...Array.from(next.keys()).filter((tid) =>
        (next.get(tid) ?? []).some((a) => a.userId === userId),
      ),
    ])
    for (const taskId of touchedTaskIds) {
      const existing = next.get(taskId) ?? []
      const withoutMe = existing.filter((a) => a.userId !== userId)
      const minutes = allocations[taskId] ?? 0
      const withMe = minutes > 0
        ? [...withoutMe, { userId, minutes }]
        : withoutMe
      if (withMe.length === 0) next.delete(taskId)
      else next.set(taskId, withMe)
    }
    onPlanChange(next)
    onClose()
  }

  // Z-фильтр iter#8: задачи где у emp есть И zone match И work_type match
  // (strict). Если strict пустой — relax до zone-only, потом wt-only.
  // Логика синхронна с distribution-sheet и autoDistribute.
  const empZones = employee.user.zones ?? []
  const empWtypes = employee.user.work_types ?? []
  const strictMatch = tasks.filter(
    (tt) =>
      (!tt.zone_name || empZones.includes(tt.zone_name)) &&
      (!tt.work_type_name || empWtypes.includes(tt.work_type_name)) &&
      (empZones.includes(tt.zone_name ?? "") || empWtypes.includes(tt.work_type_name ?? ""))
  )
  let matchedByZone: typeof tasks = strictMatch
  if (matchedByZone.length === 0 && empZones.length > 0) {
    matchedByZone = tasks.filter((tt) => tt.zone_name && empZones.includes(tt.zone_name))
  }
  if (matchedByZone.length === 0 && empWtypes.length > 0) {
    matchedByZone = tasks.filter((tt) => tt.work_type_name && empWtypes.includes(tt.work_type_name))
  }
  const filterAvailable = empZones.length > 0 || empWtypes.length > 0
  const visibleTasks = zoneFilterEnabled && filterAvailable
    ? matchedByZone
    : tasks

  // Sort: задачи где у этого сотрудника уже есть alloc — сверху, потом по
  // priority, потом по zone alpha. Так его текущий план виден сразу.
  const sortedVisible = [...visibleTasks].sort((a, b) => {
    const ah = allocations[a.id] ? 0 : 1
    const bh = allocations[b.id] ? 0 : 1
    if (ah !== bh) return ah - bh
    const ap = a.priority ?? 50
    const bp = b.priority ?? 50
    if (ap !== bp) return ap - bp
    return (a.zone_name ?? "").localeCompare(b.zone_name ?? "")
  })

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col h-full max-h-screen">
        <SheetHeader className="px-4 pt-4 pb-3 border-b shrink-0">
          <div className="flex items-center gap-3">
            <Avatar className="size-10">
              <AvatarImage src={employee.user.avatar_url} alt={fullName} />
              <AvatarFallback className="bg-accent text-accent-foreground">
                {getInitials(employee.user.first_name, employee.user.last_name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-base text-left truncate">{fullName}</SheetTitle>
              <p className="text-xs text-muted-foreground truncate">
                {t("employeeSheet.shift_label", {
                  shift: formatShiftTime(employee.shift_start, employee.shift_end),
                })}
              </p>
            </div>
          </div>
        </SheetHeader>

        {/* Utilization preview — live, обновляется при редактировании */}
        <div className="px-4 py-3 bg-muted/50 border-b shrink-0">
          <div className="flex items-center justify-between mb-2 text-sm">
            <span className="text-muted-foreground">
              {t("employeeSheet.utilization_label")}
            </span>
            <span className={cn("font-medium", getUtilizationTextColor(previewUtilization))}>
              {previewUtilization}%
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn("h-full transition-all", getUtilizationColor(previewUtilization))}
              style={{ width: `${Math.min(previewUtilization, 100)}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">
            {t("employeeSheet.hours_breakdown", {
              assigned: formatHM(employee.assigned_min, t),
              plan: formatHM(planMin, t),
              total: formatHM(employee.shift_total_min, t),
            })}
          </p>
          {overShiftBy > 0 && (
            <p className="text-xs text-destructive flex items-center gap-1.5 mt-1.5">
              <Wand2 className="size-3 shrink-0" />
              {t("employeeSheet.over_shift_warning", {
                time: formatHM(overShiftBy, t),
              })}
            </p>
          )}
        </div>

        {/* Filter toggle iter#8: zone+wt strict → relax cascade */}
        {filterAvailable && (
          <div className="px-4 py-2 border-b shrink-0 flex items-center justify-between gap-2 text-xs">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={zoneFilterEnabled}
                onChange={(e) => setZoneFilterEnabled(e.target.checked)}
                className="size-4"
              />
              <span>Только подходящие задачи</span>
            </label>
            <span className="text-muted-foreground">
              {zoneFilterEnabled
                ? `${matchedByZone.length} из ${tasks.length}`
                : `${tasks.length} всего`}
            </span>
          </div>
        )}

        {/* Tasks list — ScrollArea с per-task input */}
        <ScrollArea className="flex-1 min-h-0 px-4 py-3">
          <p className="text-xs font-medium text-muted-foreground mb-3">
            Назначить задачи сотруднику
          </p>
          {sortedVisible.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">
              Нет задач в подходящих зонах
            </p>
          ) : (
            <div className="space-y-3">
              {sortedVisible.map((task) => {
                const currentAllocation = allocations[task.id] || 0
                const taskOtherDistributed = task.distributed_minutes - (
                  // если в server-state у этой пары уже было сохранение — учли
                  plan.get(task.id)?.find((a) => a.userId === userId)?.minutes ?? 0
                )
                const taskRemainingForThis = Math.max(0, task.planned_minutes - taskOtherDistributed)
                const overTaskBy = Math.max(0, currentAllocation - taskRemainingForThis)
                const isInPlan = currentAllocation > 0

                return (
                  <div
                    key={task.id}
                    className={cn(
                      "p-3 rounded-lg border transition-colors",
                      isInPlan ? "border-primary ring-1 ring-primary/30 bg-primary/5" : "bg-card",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium line-clamp-2">{task.title}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                          <span className="flex items-center gap-1">
                            <MapPin className="size-3" />
                            {task.zone_name}
                          </span>
                          <span className="text-border">·</span>
                          <span className="flex items-center gap-1">
                            <Clock className="size-3" />
                            {formatHM(task.planned_minutes, t)}
                          </span>
                          {taskRemainingForThis !== task.planned_minutes && (
                            <>
                              <span className="text-border">·</span>
                              <span>
                                осталось {formatHM(taskRemainingForThis, t)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <HoursMinutesInput
                        value={currentAllocation}
                        onChange={(min) => handleAllocationChange(task.id, min)}
                        disabled={!canEdit}
                        invalid={overTaskBy > 0}
                        className="shrink-0"
                        t={t}
                      />
                    </div>
                    {overTaskBy > 0 && (
                      <p className="text-xs text-destructive flex items-center gap-1.5">
                        <Wand2 className="size-3 shrink-0" />
                        {t("employeeSheet.over_task_warning", {
                          time: formatHM(overTaskBy, t),
                        })}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>

        <SheetFooter className="border-t px-4 py-3 gap-2 sm:gap-2 shrink-0">
          <Button variant="outline" onClick={onClose} className="flex-1">
            {t("sheet.save_later")}
          </Button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex-1">
                  <Button
                    onClick={handleSave}
                    disabled={!canEdit}
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
