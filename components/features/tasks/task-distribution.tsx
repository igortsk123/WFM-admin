"use client"

import * as React from "react"
import { useTranslations, useLocale } from "next-intl"
import { toast } from "sonner"
import { format, addDays } from "date-fns"
import { ru, enUS } from "date-fns/locale"
import {
  Sparkles,
  Calendar,
  Clock,
  MapPin,
  Briefcase,
  Check,
  ChevronsUpDown,
  Star,
  Users,
  ChevronRight,
  ChevronDown,
  Wand2,
  RotateCcw,
  CheckCircle2,
} from "lucide-react"

import type { FunctionalRole, Store } from "@/lib/types"
import type { UnassignedTask, EmployeeUtilization, TaskDistributionAllocation } from "@/lib/api/distribution"
import {
  getStoreUnassignedTasks,
  getStoreEmployeesUtilization,
  assignTaskToUser,
  autoDistribute,
} from "@/lib/api/distribution"
import { getStores } from "@/lib/api/stores"
import { ADMIN_ROUTES } from "@/lib/constants/routes"
import { useAuth } from "@/lib/contexts/auth-context"
import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type PeriodTab = "today" | "tomorrow"

interface AllocationState {
  [userId: number]: number // minutes allocated
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getInitials(firstName: string, lastName: string): string {
  return `${lastName.charAt(0)}${firstName.charAt(0)}`.toUpperCase()
}

function getFullName(firstName: string, lastName: string, middleName?: string): string {
  const parts = [lastName, firstName]
  if (middleName) parts.push(middleName)
  return parts.join(" ")
}

function minutesToHours(min: number): string {
  const h = min / 60
  if (h === Math.floor(h)) return `${h}`
  return h.toFixed(2).replace(/\.?0+$/, "")
}

function hoursToMinutes(hours: number): number {
  return Math.round(hours * 60)
}

function getUtilizationColor(pct: number): string {
  if (pct < 80) return "bg-success"
  if (pct < 95) return "bg-warning"
  return "bg-destructive"
}

function getUtilizationTextColor(pct: number): string {
  if (pct < 80) return "text-success"
  if (pct < 95) return "text-warning"
  return "text-destructive"
}

function formatShiftTime(isoStart: string, isoEnd: string): string {
  const start = new Date(isoStart)
  const end = new Date(isoEnd)
  const fmt = (d: Date) => d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
  return `${fmt(start)}–${fmt(end)}`
}

// ─────────────────────────────────────────────────────────────────────────────
// StoreCombobox
// ─────────────────────────────────────────────────────────────────────────────

interface StoreComboboxProps {
  stores: Store[]
  value: number | null
  onChange: (id: number) => void
  placeholder: string
  className?: string
}

function StoreCombobox({ stores, value, onChange, placeholder, className }: StoreComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const selected = stores.find((s) => s.id === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className={cn("h-9 justify-between font-normal truncate", className)}
        >
          <span className="truncate text-left text-sm">
            {selected ? selected.name : <span className="text-muted-foreground">{placeholder}</span>}
          </span>
          <ChevronsUpDown className="ml-2 size-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Поиск..." className="h-8 text-sm" />
          <CommandList className="max-h-52">
            <CommandEmpty>Не найдено</CommandEmpty>
            <CommandGroup>
              {stores.map((store) => (
                <CommandItem
                  key={store.id}
                  value={store.name}
                  onSelect={() => {
                    onChange(store.id)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 size-3.5",
                      value === store.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="text-sm truncate">{store.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TaskCard
// ─────────────────────────────────────────────────────────────────────────────

interface TaskCardProps {
  task: UnassignedTask
  planAllocations: TaskDistributionAllocation[]
  onDistribute: () => void
  disabled: boolean
  t: ReturnType<typeof useTranslations>
}

function TaskCard({ task, planAllocations, onDistribute, disabled, t }: TaskCardProps) {
  const totalHours = minutesToHours(task.planned_minutes)
  const planMin = planAllocations.reduce((sum, a) => sum + a.minutes, 0)
  const effectiveDistributed = task.distributed_minutes + planMin
  const effectiveRemaining = Math.max(0, task.planned_minutes - effectiveDistributed)
  const remainingHours = minutesToHours(effectiveRemaining)
  const isFullyDistributed = effectiveRemaining === 0
  const distributedPct = (task.distributed_minutes / task.planned_minutes) * 100
  const planPct = (planMin / task.planned_minutes) * 100

  return (
    <Card className={cn(
      "transition-shadow hover:shadow-md",
      isFullyDistributed && planMin === 0 && "opacity-60",
      planMin > 0 && "ring-1 ring-warning"
    )}>
      <CardContent className="p-4">
        {/* Title and source badge */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-sm font-medium line-clamp-2 text-foreground">{task.title}</h3>
          <div className="flex items-center gap-1 shrink-0">
            {task.source === "AI" && (
              <Badge variant="secondary" className="text-xs gap-1">
                <Sparkles className="size-3" />
                ИИ
              </Badge>
            )}
            {planMin > 0 && (
              <Badge variant="outline" className="text-xs border-warning text-warning gap-1">
                <Wand2 className="size-3" />
                {t("taskCard.in_plan_badge", { hours: minutesToHours(planMin) })}
              </Badge>
            )}
          </div>
        </div>

        {/* Meta info */}
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mb-3">
          <span className="flex items-center gap-1">
            <MapPin className="size-3" />
            {task.zone_name}
          </span>
          <span className="flex items-center gap-1">
            <Briefcase className="size-3" />
            {task.work_type_name}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="size-3" />
            {totalHours} ч
          </span>
        </div>

        {/* Distribution progress — две полосы стэком: уже сохранено (primary)
            + в плане (warning). Полная заливка = task будет полностью разнесена
            после подтверждения плана. */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-muted-foreground">
              {isFullyDistributed
                ? planMin > 0
                  ? t("taskCard.full_after_confirm")
                  : t("taskCard.fully_distributed")
                : t("taskCard.unassigned_hours", { remaining: remainingHours, total: totalHours })}
            </span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden flex">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${distributedPct}%` }}
            />
            <div
              className="h-full bg-warning transition-all"
              style={{ width: `${planPct}%` }}
            />
          </div>
        </div>

        {/* Distribute button */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <Button
                  size="sm"
                  variant={isFullyDistributed && planMin === 0 ? "outline" : "default"}
                  className="w-full"
                  onClick={onDistribute}
                  disabled={disabled || (isFullyDistributed && planMin === 0)}
                >
                  {isFullyDistributed && planMin === 0 ? (
                    <>
                      <Check className="size-4 mr-1.5" />
                      {t("taskCard.fully_distributed")}
                    </>
                  ) : planMin > 0 ? (
                    t("taskCard.edit_plan")
                  ) : (
                    t("taskCard.distribute")
                  )}
                </Button>
              </div>
            </TooltipTrigger>
            {disabled && (
              <TooltipContent>{t("forbidden.tooltip")}</TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </CardContent>
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// EmployeeUtilizationRow
// ─────────────────────────────────────────────────────────────────────────────

interface EmployeeUtilizationRowProps {
  employee: EmployeeUtilization
  t: ReturnType<typeof useTranslations>
}

function EmployeeUtilizationRow({ employee, t }: EmployeeUtilizationRowProps) {
  const fullName = getFullName(employee.user.first_name, employee.user.last_name)
  const assignedHours = minutesToHours(employee.assigned_min)
  const totalHours = minutesToHours(employee.shift_total_min)

  return (
    <div className="flex items-center gap-3 py-2">
      <Avatar className="size-8 shrink-0">
        <AvatarImage src={employee.user.avatar_url} alt={fullName} />
        <AvatarFallback className="text-xs bg-accent text-accent-foreground">
          {getInitials(employee.user.first_name, employee.user.last_name)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium truncate">{fullName}</span>
          {employee.has_bonus_task && (
            <Badge variant="secondary" className="text-[10px] px-1 py-0">
              <Star className="size-2.5 mr-0.5" />
              {t("utilization.bonus_badge")}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={cn("h-full transition-all", getUtilizationColor(employee.utilization_pct))}
              style={{ width: `${Math.min(employee.utilization_pct, 100)}%` }}
            />
          </div>
          <span className={cn("text-xs font-medium shrink-0", getUtilizationTextColor(employee.utilization_pct))}>
            {employee.utilization_pct}%
          </span>
        </div>
        <span className="text-xs text-muted-foreground">
          {t("utilization.hours_format", { assigned: assignedHours, total: totalHours })}
        </span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TeamUtilizationPanel
// ─────────────────────────────────────────────────────────────────────────────

interface TeamUtilizationPanelProps {
  employees: EmployeeUtilization[]
  isLoading: boolean
  date: string
  t: ReturnType<typeof useTranslations>
  locale: string
}

function TeamUtilizationPanel({ employees, isLoading, date, t, locale }: TeamUtilizationPanelProps) {
  const dateLocale = locale === "en" ? enUS : ru
  const formattedDate = format(new Date(date), "d MMMM", { locale: dateLocale })

  const totalShiftMinutes = employees.reduce((sum, e) => sum + e.shift_total_min, 0)
  const totalAssignedMinutes = employees.reduce((sum, e) => sum + e.assigned_min, 0)
  const freeMinutes = totalShiftMinutes - totalAssignedMinutes

  if (isLoading) {
    return (
      <Card className="lg:sticky lg:top-4">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3 w-24 mt-1" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="size-8 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-1.5 w-full rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (employees.length === 0) {
    return (
      <Card className="lg:sticky lg:top-4">
        <CardContent className="py-8">
          <EmptyState
            icon={Calendar}
            title={t("empty.no_shifts_title")}
            description={t("empty.no_shifts_description")}
            className="py-4"
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="lg:sticky lg:top-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="size-4" />
          {t("utilization.title")}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {t("utilization.date_label", { date: formattedDate })} · {t("utilization.employees_count", { count: employees.length })}
        </p>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-[400px] lg:max-h-[calc(100vh-300px)]">
          <div className="space-y-1">
            {employees.map((emp) => (
              <EmployeeUtilizationRow key={emp.user.id} employee={emp} t={t} />
            ))}
          </div>
        </ScrollArea>
        {/* Summary */}
        <div className="mt-4 pt-3 border-t">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("utilization.summary", {
              free: minutesToHours(freeMinutes),
              total: minutesToHours(totalShiftMinutes),
            })}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// DistributionSheet
// ─────────────────────────────────────────────────────────────────────────────

interface DistributionSheetProps {
  task: UnassignedTask | null
  employees: EmployeeUtilization[]
  initialAllocations: TaskDistributionAllocation[]
  open: boolean
  onClose: () => void
  onSave: (allocations: TaskDistributionAllocation[]) => void
  canEdit: boolean
  t: ReturnType<typeof useTranslations>
}

function DistributionSheet({
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

  // Заполняем sheet существующим планом для этой задачи (если есть).
  // Без этого user открыл бы пустой editor поверх уже наколдованного auto-плана.
  React.useEffect(() => {
    if (task) {
      const initial: AllocationState = {}
      for (const a of initialAllocations) {
        initial[a.userId] = a.minutes
      }
      setAllocations(initial)
    }
  }, [task?.id, initialAllocations])

  if (!task) return null

  const totalTaskMinutes = task.planned_minutes
  const distributedMinutes = Object.values(allocations).reduce((sum, min) => sum + min, 0)
  const remainingMinutes = totalTaskMinutes - distributedMinutes

  const handleAllocationChange = (userId: number, hours: number) => {
    const minutes = hoursToMinutes(hours)
    setAllocations((prev) => {
      if (minutes <= 0) {
        const { [userId]: _, ...rest } = prev
        return rest
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

  const canSave = distributedMinutes > 0 && distributedMinutes <= totalTaskMinutes

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="px-4 pt-4 pb-3 border-b">
          <SheetTitle className="text-base text-left pr-8">
            {t("sheet.title", { taskTitle: task.title })}
          </SheetTitle>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="size-3" />
            <span>{task.zone_name}</span>
            <span className="text-border">·</span>
            <Clock className="size-3" />
            <span>{minutesToHours(totalTaskMinutes)} ч</span>
          </div>
        </SheetHeader>

        {/* Distribution summary */}
        <div className="px-4 py-3 bg-muted/50 border-b">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              {t("sheet.distributed_summary", {
                distributed: minutesToHours(distributedMinutes),
                total: minutesToHours(totalTaskMinutes),
              })}
            </span>
            {remainingMinutes > 0 && (
              <Badge variant="outline" className="text-xs">
                {t("sheet.remaining", { remaining: minutesToHours(remainingMinutes) })}
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

        {/* Employee list */}
        <ScrollArea className="flex-1 px-4 py-3">
          <p className="text-xs font-medium text-muted-foreground mb-3">
            {t("sheet.employee_list_header")}
          </p>
          <div className="space-y-3">
            {employees.map((emp) => {
              const currentAllocation = allocations[emp.user.id] || 0
              const currentHours = currentAllocation / 60
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
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{fullName}</p>
                          <p className="text-xs text-muted-foreground">
                            {t("sheet.shift_time", {
                              start: formatShiftTime(emp.shift_start, emp.shift_end).split("–")[0],
                              end: formatShiftTime(emp.shift_start, emp.shift_end).split("–")[1],
                            })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Input
                            type="number"
                            step="0.25"
                            min="0"
                            max={minutesToHours(freeMinutes + currentAllocation)}
                            value={currentHours || ""}
                            onChange={(e) => handleAllocationChange(emp.user.id, parseFloat(e.target.value) || 0)}
                            className="w-20 h-8 text-sm text-center"
                            placeholder="0"
                            disabled={!canEdit}
                          />
                          <span className="text-xs text-muted-foreground w-4">ч</span>
                        </div>
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
                          {t("utilization.available")}: {minutesToHours(freeMinutes)} ч
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

// ─────────────────────────────────────────────────────────────────────────────
// MobileUtilizationCollapsible
// ─────────────────────────────────────────────────────────────────────────────

interface MobileUtilizationCollapsibleProps {
  employees: EmployeeUtilization[]
  isLoading: boolean
  date: string
  t: ReturnType<typeof useTranslations>
  locale: string
}

function MobileUtilizationCollapsible(props: MobileUtilizationCollapsibleProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="lg:hidden">
      <Card>
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between p-4 text-left">
            <div className="flex items-center gap-2">
              <Users className="size-4" />
              <span className="text-sm font-medium">{props.t("utilization.title")}</span>
              <Badge variant="secondary" className="text-xs">
                {props.employees.length}
              </Badge>
            </div>
            {open ? (
              <ChevronDown className="size-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="size-4 text-muted-foreground" />
            )}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4 border-t pt-3">
            <ScrollArea className="max-h-[300px]">
              <div className="space-y-1">
                {props.employees.map((emp) => (
                  <EmployeeUtilizationRow key={emp.user.id} employee={emp} t={props.t} />
                ))}
              </div>
            </ScrollArea>
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// StickyPlanBar — нижняя панель «N задач в плане → подтвердить/сбросить»
// Показывается только когда план непустой.
// ─────────────────────────────────────────────────────────────────────────────

interface StickyPlanBarProps {
  taskCount: number
  totalMinutes: number
  isConfirming: boolean
  canEdit: boolean
  onConfirm: () => void
  onReset: () => void
  t: ReturnType<typeof useTranslations>
}

function StickyPlanBar({
  taskCount, totalMinutes, isConfirming, canEdit, onConfirm, onReset, t,
}: StickyPlanBarProps) {
  if (taskCount === 0) return null

  return (
    <div className="sticky bottom-0 -mx-4 md:-mx-6 px-4 md:px-6 py-3 bg-card/95 backdrop-blur border-t shadow-lg z-10">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Wand2 className="size-4 text-warning shrink-0" />
          <span className="text-sm font-medium truncate">
            {t("plan_bar.summary", {
              tasks: taskCount,
              hours: minutesToHours(totalMinutes),
            })}
          </span>
        </div>
        <div className="flex items-center gap-2 sm:ml-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={onReset}
            disabled={isConfirming}
            className="gap-1.5"
          >
            <RotateCcw className="size-3.5" />
            {t("plan_bar.reset")}
          </Button>
          <Button
            size="sm"
            onClick={onConfirm}
            disabled={!canEdit || isConfirming}
            className="gap-1.5"
          >
            <CheckCircle2 className="size-3.5" />
            {isConfirming ? t("plan_bar.confirming") : t("plan_bar.confirm")}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TaskDistribution (Main Component)
// ─────────────────────────────────────────────────────────────────────────────

export function TaskDistribution() {
  const t = useTranslations("screen.taskDistribution")
  const locale = useLocale()
  const { user } = useAuth()

  // State
  const [stores, setStores] = React.useState<Store[]>([])
  const [selectedStoreId, setSelectedStoreId] = React.useState<number | null>(null)
  const [period, setPeriod] = React.useState<PeriodTab>("today")
  const [tasks, setTasks] = React.useState<UnassignedTask[]>([])
  const [employees, setEmployees] = React.useState<EmployeeUtilization[]>([])
  const [isLoadingStores, setIsLoadingStores] = React.useState(true)
  const [isLoadingTasks, setIsLoadingTasks] = React.useState(false)
  const [isLoadingEmployees, setIsLoadingEmployees] = React.useState(false)

  // Sheet state
  const [selectedTask, setSelectedTask] = React.useState<UnassignedTask | null>(null)
  const [sheetOpen, setSheetOpen] = React.useState(false)
  const [isAutoRunning, setIsAutoRunning] = React.useState(false)
  const [isConfirming, setIsConfirming] = React.useState(false)

  // Локальный план — staged allocations не закоммичены на сервер.
  // Map<taskId, allocations[]>. Подтверждается через StickyPlanBar.
  const [plan, setPlan] = React.useState<Map<string, TaskDistributionAllocation[]>>(new Map())

  // Распределять может директор магазина и выше по иерархии
  const DISTRIBUTOR_ROLES: FunctionalRole[] = [
    "STORE_DIRECTOR",
    "SUPERVISOR",
    "REGIONAL",
    "NETWORK_OPS",
    "PLATFORM_ADMIN",
  ]
  const canEdit = !!user?.role && DISTRIBUTOR_ROLES.includes(user.role)

  // Get current date based on period
  const currentDate = React.useMemo(() => {
    const today = new Date("2026-05-01") // Mock date
    return period === "tomorrow" ? format(addDays(today, 1), "yyyy-MM-dd") : format(today, "yyyy-MM-dd")
  }, [period])

  // Load stores on mount
  React.useEffect(() => {
    async function loadStores() {
      setIsLoadingStores(true)
      try {
        const response = await getStores({})
        setStores(response.data)
        // Default = первый СПАР Томск (наш «хедлайн» магазин с реалистичными моками
        // tasks и shifts). Если нет СПАР — берём первый.
        if (response.data.length > 0) {
          const defaultStore = response.data.find(
            (s) => /спар|spar/i.test(s.name) && /томск/i.test(s.name),
          ) ?? response.data.find((s) => /спар|spar/i.test(s.name)) ?? response.data[0]
          setSelectedStoreId(defaultStore.id)
        }
      } catch (error) {
        console.error("Failed to load stores:", error)
      } finally {
        setIsLoadingStores(false)
      }
    }
    loadStores()
  }, [])

  // Load tasks and employees when store or date changes
  React.useEffect(() => {
    if (!selectedStoreId) return

    async function loadData() {
      // selectedStoreId guarded by `if (!selectedStoreId) return` выше
      if (selectedStoreId === null) return
      setIsLoadingTasks(true)
      setIsLoadingEmployees(true)

      try {
        const [tasksRes, employeesRes] = await Promise.all([
          getStoreUnassignedTasks(selectedStoreId, currentDate),
          getStoreEmployeesUtilization(selectedStoreId, currentDate),
        ])

        setTasks(tasksRes.data)
        setEmployees(employeesRes.data)
      } catch (error) {
        console.error("Failed to load data:", error)
        toast.error(t("toast.distributed_error"))
      } finally {
        setIsLoadingTasks(false)
        setIsLoadingEmployees(false)
      }
    }

    loadData()
  }, [selectedStoreId, currentDate, t])

  // Handle distribute button click
  const handleDistribute = (task: UnassignedTask) => {
    setSelectedTask(task)
    setSheetOpen(true)
  }

  // Auto-distribute: алгоритм предлагает план, кладём в локальный state.
  // НЕ коммитит на сервер — директор подтверждает через StickyPlanBar.
  const handleAutoDistribute = () => {
    if (!selectedStoreId || !canEdit) return
    setIsAutoRunning(true)
    // Минимальный delay для UX чтоб кнопка показала «Распределяю…»
    setTimeout(() => {
      const proposal = autoDistribute(tasks, employees)
      if (proposal.size === 0) {
        toast.info(t("toast.auto_nothing"))
      } else {
        setPlan(proposal)
        toast.success(t("toast.auto_proposed", { count: proposal.size }))
      }
      setIsAutoRunning(false)
    }, 200)
  }

  // Sheet save → обновляем план для конкретной задачи (sync, без API)
  const handleSaveAllocation = (allocations: TaskDistributionAllocation[]) => {
    if (!selectedTask) return
    setPlan((prev) => {
      const next = new Map(prev)
      if (allocations.length === 0) {
        next.delete(selectedTask.id)
      } else {
        next.set(selectedTask.id, allocations)
      }
      return next
    })
    toast.success(t("toast.added_to_plan", { task: selectedTask.title }))
    setSheetOpen(false)
  }

  // Сбросить весь локальный план (server state не трогается)
  const handleResetPlan = () => {
    if (plan.size === 0) return
    setPlan(new Map())
    toast.info(t("toast.plan_reset"))
  }

  // Подтвердить план — применяем все allocations через assignTaskToUser
  const handleConfirmPlan = async () => {
    if (!selectedStoreId || !canEdit || plan.size === 0) return
    setIsConfirming(true)
    let okCount = 0
    let errCount = 0
    for (const [taskId, allocations] of plan) {
      try {
        const res = await assignTaskToUser(taskId, allocations)
        if (res.success) okCount++
        else errCount++
      } catch {
        errCount++
      }
    }
    // Refresh из источника
    try {
      const [tasksRes, employeesRes] = await Promise.all([
        getStoreUnassignedTasks(selectedStoreId, currentDate),
        getStoreEmployeesUtilization(selectedStoreId, currentDate),
      ])
      setTasks(tasksRes.data)
      setEmployees(employeesRes.data)
    } catch {
      // ignore — toast покажет результат
    }
    setPlan(new Map())
    if (errCount > 0) {
      toast.error(t("toast.confirm_partial", { ok: okCount, err: errCount }))
    } else {
      toast.success(t("toast.confirm_done", { count: okCount }))
    }
    setIsConfirming(false)
  }

  const selectedStore = stores.find((s) => s.id === selectedStoreId)

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        breadcrumbs={[
          { label: t("breadcrumb_home"), href: ADMIN_ROUTES.dashboard },
          { label: t("breadcrumb_tasks"), href: ADMIN_ROUTES.tasks },
          { label: t("breadcrumb_distribute") },
        ]}
      />

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <StoreCombobox
          stores={stores}
          value={selectedStoreId}
          onChange={setSelectedStoreId}
          placeholder={t("toolbar.store_placeholder")}
          className="w-full sm:w-[280px]"
        />
        <Tabs value={period} onValueChange={(v) => setPeriod(v as PeriodTab)} className="w-full sm:w-auto">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="today" className="flex-1 sm:flex-initial">
              {t("toolbar.period.today")}
            </TabsTrigger>
            <TabsTrigger value="tomorrow" className="flex-1 sm:flex-initial">
              {t("toolbar.period.tomorrow")}
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="sm:ml-auto">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleAutoDistribute}
                    disabled={
                      !canEdit ||
                      isAutoRunning ||
                      isLoadingTasks ||
                      isLoadingEmployees ||
                      tasks.length === 0 ||
                      employees.length === 0
                    }
                    className="gap-1.5"
                  >
                    <Wand2 className="size-4" />
                    {isAutoRunning ? t("toolbar.auto_running") : t("toolbar.auto")}
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {canEdit ? t("toolbar.auto_hint") : t("forbidden.tooltip")}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Mobile utilization collapsible */}
      <MobileUtilizationCollapsible
        employees={employees}
        isLoading={isLoadingEmployees}
        date={currentDate}
        t={t}
        locale={locale}
      />

      {/* Main layout */}
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Left: Tasks */}
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground">
            {t("sections.unassigned")}
            {tasks.length > 0 && (
              <span className="ml-1.5 text-foreground">({tasks.filter(t => t.remaining_minutes > 0).length})</span>
            )}
          </h2>

          {isLoadingTasks ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4 space-y-3">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-1.5 w-full rounded-full" />
                    <Skeleton className="h-9 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : tasks.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <EmptyState
                  icon={Sparkles}
                  title={t("empty.no_tasks_title")}
                  description={t("empty.no_tasks_description")}
                />
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  planAllocations={plan.get(task.id) ?? []}
                  onDistribute={() => handleDistribute(task)}
                  disabled={!canEdit}
                  t={t}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right: Team utilization (desktop only) */}
        <div className="hidden lg:block">
          <TeamUtilizationPanel
            employees={employees}
            isLoading={isLoadingEmployees}
            date={currentDate}
            t={t}
            locale={locale}
          />
        </div>
      </div>

      {/* Sticky bottom bar — план для подтверждения */}
      <StickyPlanBar
        taskCount={plan.size}
        totalMinutes={Array.from(plan.values()).reduce(
          (sum, allocs) => sum + allocs.reduce((s, a) => s + a.minutes, 0),
          0
        )}
        isConfirming={isConfirming}
        canEdit={canEdit}
        onConfirm={handleConfirmPlan}
        onReset={handleResetPlan}
        t={t}
      />

      {/* Distribution Sheet */}
      <DistributionSheet
        task={selectedTask}
        employees={employees}
        initialAllocations={selectedTask ? plan.get(selectedTask.id) ?? [] : []}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSave={handleSaveAllocation}
        canEdit={canEdit}
        t={t}
      />
    </div>
  )
}
