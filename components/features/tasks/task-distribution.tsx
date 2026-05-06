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
  ListChecks,
  UsersRound,
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
type ViewMode = "by-task" | "by-employee"

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
  planMin?: number
  onSelect?: () => void
  t: ReturnType<typeof useTranslations>
}

function EmployeeUtilizationRow({ employee, planMin = 0, onSelect, t }: EmployeeUtilizationRowProps) {
  const fullName = getFullName(employee.user.first_name, employee.user.last_name)
  const assignedHours = minutesToHours(employee.assigned_min)
  const totalHours = minutesToHours(employee.shift_total_min)

  const content = (
    <>
      <Avatar className="size-8 shrink-0">
        <AvatarImage src={employee.user.avatar_url} alt={fullName} />
        <AvatarFallback className="text-xs bg-accent text-accent-foreground">
          {getInitials(employee.user.first_name, employee.user.last_name)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium truncate">{fullName}</span>
          {planMin > 0 && (
            <Badge variant="outline" className="text-[10px] px-1 py-0 border-warning text-warning">
              <Wand2 className="size-2.5 mr-0.5" />
              +{minutesToHours(planMin)} ч
            </Badge>
          )}
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
    </>
  )

  if (onSelect) {
    return (
      <button
        type="button"
        onClick={onSelect}
        className="w-full flex items-center gap-3 py-2 px-1 -mx-1 rounded-md text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {content}
      </button>
    )
  }

  return <div className="flex items-center gap-3 py-2">{content}</div>
}

// ─────────────────────────────────────────────────────────────────────────────
// TeamUtilizationPanel
// ─────────────────────────────────────────────────────────────────────────────

interface TeamUtilizationPanelProps {
  employees: EmployeeUtilization[]
  planMinByUser: Map<number, number>
  onSelectEmployee: (emp: EmployeeUtilization) => void
  isLoading: boolean
  date: string
  t: ReturnType<typeof useTranslations>
  locale: string
}

function TeamUtilizationPanel({ employees, planMinByUser, onSelectEmployee, isLoading, date, t, locale }: TeamUtilizationPanelProps) {
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
              <EmployeeUtilizationRow
                key={emp.user.id}
                employee={emp}
                planMin={planMinByUser.get(emp.user.id) ?? 0}
                onSelect={() => onSelectEmployee(emp)}
                t={t}
              />
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
  planMinByUser: Map<number, number>
  onSelectEmployee: (emp: EmployeeUtilization) => void
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
                  <EmployeeUtilizationRow
                    key={emp.user.id}
                    employee={emp}
                    planMin={props.planMinByUser.get(emp.user.id) ?? 0}
                    onSelect={() => props.onSelectEmployee(emp)}
                    t={props.t}
                  />
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
// TaskZoneGroup — collapsible секция по зоне с summary в шапке
// ─────────────────────────────────────────────────────────────────────────────

interface TaskZoneGroupProps {
  zoneName: string
  tasks: UnassignedTask[]
  plan: Map<string, TaskDistributionAllocation[]>
  onDistribute: (task: UnassignedTask) => void
  disabled: boolean
  t: ReturnType<typeof useTranslations>
}

function TaskZoneGroup({ zoneName, tasks, plan, onDistribute, disabled, t }: TaskZoneGroupProps) {
  // Collapsed by default — при 25+ задач на 11+ зон открытый список заваливает экран.
  // User раскроет нужные зоны.
  const [open, setOpen] = React.useState(false)

  const totalPlanned = tasks.reduce((s, tt) => s + tt.planned_minutes, 0)
  const totalDistributed = tasks.reduce((s, tt) => s + tt.distributed_minutes, 0)
  const totalInPlan = tasks.reduce((s, tt) => {
    const planAllocs = plan.get(tt.id) ?? []
    return s + planAllocs.reduce((ss, a) => ss + a.minutes, 0)
  }, 0)
  const fullyCovered = totalDistributed + totalInPlan >= totalPlanned
  const coveragePct = totalPlanned > 0
    ? Math.min(100, Math.round(((totalDistributed + totalInPlan) / totalPlanned) * 100))
    : 0

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="border rounded-lg overflow-hidden">
      <CollapsibleTrigger asChild>
        <button className="w-full flex items-center gap-3 px-3 py-2.5 bg-muted/30 hover:bg-muted/50 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {open ? (
            <ChevronDown className="size-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="size-4 text-muted-foreground shrink-0" />
          )}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <MapPin className="size-3.5 text-muted-foreground shrink-0" />
            <span className="text-sm font-medium truncate">{zoneName}</span>
            <Badge variant="secondary" className="text-xs shrink-0">
              {tasks.length}
            </Badge>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {t("zone_group.summary", {
                distributed: minutesToHours(totalDistributed + totalInPlan),
                planned: minutesToHours(totalPlanned),
              })}
            </span>
            <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all",
                  fullyCovered ? "bg-success" : "bg-primary"
                )}
                style={{ width: `${coveragePct}%` }}
              />
            </div>
            <span className={cn(
              "text-xs font-medium shrink-0 w-10 text-right",
              fullyCovered ? "text-success" : "text-muted-foreground"
            )}>
              {coveragePct}%
            </span>
          </div>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="grid gap-3 p-3 sm:grid-cols-2">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              planAllocations={plan.get(task.id) ?? []}
              onDistribute={() => onDistribute(task)}
              disabled={disabled}
              t={t}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// EmployeeSheet — взгляд «от сотрудника к задачам»: его план + add/remove
// ─────────────────────────────────────────────────────────────────────────────

interface EmployeeSheetProps {
  employee: EmployeeUtilization | null
  tasks: UnassignedTask[]
  plan: Map<string, TaskDistributionAllocation[]>
  open: boolean
  onClose: () => void
  onPlanChange: (next: Map<string, TaskDistributionAllocation[]>) => void
  canEdit: boolean
  t: ReturnType<typeof useTranslations>
}

function EmployeeSheet({
  employee, tasks, plan, open, onClose, onPlanChange, canEdit, t,
}: EmployeeSheetProps) {
  const [addTaskId, setAddTaskId] = React.useState<string>("")
  const [addMinutes, setAddMinutes] = React.useState<number>(60)
  const [pickerOpen, setPickerOpen] = React.useState(false)

  React.useEffect(() => {
    if (employee) {
      setAddTaskId("")
      setAddMinutes(60)
    }
  }, [employee?.user.id])

  if (!employee) return null

  const userId = employee.user.id
  const fullName = getFullName(employee.user.first_name, employee.user.last_name)

  // Задачи в плане для этого сотрудника
  const planItems: { task: UnassignedTask; minutes: number }[] = []
  for (const [taskId, allocs] of plan) {
    const myAlloc = allocs.find((a) => a.userId === userId)
    if (myAlloc) {
      const task = tasks.find((tt) => tt.id === taskId)
      if (task) planItems.push({ task, minutes: myAlloc.minutes })
    }
  }
  const planMin = planItems.reduce((sum, item) => sum + item.minutes, 0)

  // Задачи доступные для добавления — те у которых есть остаток и сотрудник
  // ещё не в плане этой задачи
  const availableTasks = tasks.filter(
    (task) =>
      task.remaining_minutes > 0 &&
      !planItems.some((item) => item.task.id === task.id)
  )

  // Free time с учётом плана (server assigned + plan)
  const freeMin = Math.max(0, employee.shift_total_min - employee.assigned_min - planMin)
  const previewUtilization = employee.shift_total_min > 0
    ? Math.round(((employee.assigned_min + planMin) / employee.shift_total_min) * 100)
    : 0

  const handleRemoveFromPlan = (taskId: string) => {
    const next = new Map(plan)
    const allocs = next.get(taskId)
    if (!allocs) return
    const filtered = allocs.filter((a) => a.userId !== userId)
    if (filtered.length === 0) {
      next.delete(taskId)
    } else {
      next.set(taskId, filtered)
    }
    onPlanChange(next)
  }

  const handleAddToPlan = () => {
    if (!addTaskId) return
    const task = tasks.find((tt) => tt.id === addTaskId)
    if (!task) return
    const minutes = Math.min(addMinutes, task.remaining_minutes, freeMin)
    if (minutes <= 0) return
    const next = new Map(plan)
    const existing = next.get(addTaskId) ?? []
    // Не должен дублироваться (availableTasks отфильтровал) — но guard
    const withoutMe = existing.filter((a) => a.userId !== userId)
    next.set(addTaskId, [...withoutMe, { userId, minutes }])
    onPlanChange(next)
    setAddTaskId("")
    setAddMinutes(60)
  }

  const selectedTask = tasks.find((tt) => tt.id === addTaskId)
  const maxAddMinutes = selectedTask
    ? Math.min(selectedTask.remaining_minutes, freeMin)
    : freeMin

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="px-4 pt-4 pb-3 border-b">
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

        {/* Utilization preview */}
        <div className="px-4 py-3 bg-muted/50 border-b">
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
              assigned: minutesToHours(employee.assigned_min),
              plan: minutesToHours(planMin),
              total: minutesToHours(employee.shift_total_min),
            })}
          </p>
        </div>

        <ScrollArea className="flex-1 px-4 py-3">
          {/* Plan section */}
          <p className="text-xs font-medium text-muted-foreground mb-2">
            {t("employeeSheet.plan_section")}
          </p>
          {planItems.length === 0 ? (
            <p className="text-xs text-muted-foreground italic mb-4">
              {t("employeeSheet.plan_empty")}
            </p>
          ) : (
            <div className="space-y-2 mb-4">
              {planItems.map((item) => (
                <div
                  key={item.task.id}
                  className="flex items-start gap-2 p-2 rounded-md border border-warning/30 bg-warning/5"
                >
                  <Wand2 className="size-3.5 text-warning shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-2">{item.task.title}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <span className="flex items-center gap-1">
                        <MapPin className="size-3" />
                        {item.task.zone_name}
                      </span>
                      <span className="text-border">·</span>
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" />
                        {minutesToHours(item.minutes)} ч
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => handleRemoveFromPlan(item.task.id)}
                    disabled={!canEdit}
                    aria-label={t("employeeSheet.remove_aria")}
                  >
                    <RotateCcw className="size-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Add task */}
          <div className="border-t pt-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              {t("employeeSheet.add_section")}
            </p>
            {availableTasks.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                {t("employeeSheet.add_empty")}
              </p>
            ) : freeMin === 0 ? (
              <p className="text-xs text-warning italic">
                {t("employeeSheet.add_no_time")}
              </p>
            ) : (
              <div className="space-y-2">
                <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between font-normal h-9"
                      disabled={!canEdit}
                    >
                      <span className="truncate text-left text-sm">
                        {selectedTask ? selectedTask.title : (
                          <span className="text-muted-foreground">
                            {t("employeeSheet.add_picker_placeholder")}
                          </span>
                        )}
                      </span>
                      <ChevronsUpDown className="ml-2 size-3.5 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <Command>
                      <CommandInput placeholder={t("employeeSheet.add_picker_search")} className="h-8 text-sm" />
                      <CommandList className="max-h-64">
                        <CommandEmpty>{t("employeeSheet.add_picker_empty")}</CommandEmpty>
                        <CommandGroup>
                          {availableTasks.map((task) => (
                            <CommandItem
                              key={task.id}
                              value={`${task.title} ${task.zone_name ?? ""}`}
                              onSelect={() => {
                                setAddTaskId(task.id)
                                setAddMinutes(Math.min(60, task.remaining_minutes, freeMin))
                                setPickerOpen(false)
                              }}
                            >
                              <div className="flex flex-col gap-0.5 min-w-0">
                                <span className="text-sm font-medium truncate">{task.title}</span>
                                <span className="text-xs text-muted-foreground">
                                  {task.zone_name} · {t("employeeSheet.add_picker_remaining", {
                                    hours: minutesToHours(task.remaining_minutes),
                                  })}
                                </span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>

                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.25"
                    min="0"
                    max={minutesToHours(maxAddMinutes)}
                    value={addMinutes / 60 || ""}
                    onChange={(e) =>
                      setAddMinutes(hoursToMinutes(parseFloat(e.target.value) || 0))
                    }
                    className="h-9 w-24 text-sm text-center"
                    placeholder="0"
                    disabled={!canEdit || !selectedTask}
                  />
                  <span className="text-xs text-muted-foreground">ч</span>
                  <Button
                    size="sm"
                    onClick={handleAddToPlan}
                    disabled={
                      !canEdit ||
                      !addTaskId ||
                      addMinutes <= 0 ||
                      addMinutes > maxAddMinutes
                    }
                    className="ml-auto"
                  >
                    {t("employeeSheet.add_button")}
                  </Button>
                </div>
                {selectedTask && (
                  <p className="text-xs text-muted-foreground">
                    {t("employeeSheet.add_max_hint", {
                      hours: minutesToHours(maxAddMinutes),
                    })}
                  </p>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        <SheetFooter className="border-t px-4 py-3">
          <Button variant="outline" onClick={onClose} className="w-full">
            {t("employeeSheet.close")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// EmployeeBigCard — карточка для режима «По сотрудникам»: имя/смена/загрузка
// + чипы задач (план + сохранённые). Клик по карточке → EmployeeSheet.
// ─────────────────────────────────────────────────────────────────────────────

interface EmployeeBigCardProps {
  employee: EmployeeUtilization
  planMin: number
  planTasks: { taskId: string; title: string; minutes: number }[]
  onClick: () => void
  t: ReturnType<typeof useTranslations>
}

function EmployeeBigCard({ employee, planMin, planTasks, onClick, t }: EmployeeBigCardProps) {
  const fullName = getFullName(employee.user.first_name, employee.user.last_name)
  const previewUtilization = employee.shift_total_min > 0
    ? Math.round(((employee.assigned_min + planMin) / employee.shift_total_min) * 100)
    : 0
  const freeMin = Math.max(0, employee.shift_total_min - employee.assigned_min - planMin)
  const isOverloaded = previewUtilization > 100

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-lg border bg-card p-3 transition-colors",
        "hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        planMin > 0 && "ring-1 ring-warning",
        isOverloaded && "ring-1 ring-destructive"
      )}
    >
      <div className="flex items-start gap-3">
        <Avatar className="size-10 shrink-0">
          <AvatarImage src={employee.user.avatar_url} alt={fullName} />
          <AvatarFallback className="bg-accent text-accent-foreground">
            {getInitials(employee.user.first_name, employee.user.last_name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-0.5">
            <span className="text-sm font-medium truncate">{fullName}</span>
            <div className="flex items-center gap-1 shrink-0">
              {employee.has_bonus_task && (
                <Badge variant="secondary" className="text-[10px] px-1 py-0">
                  <Star className="size-2.5 mr-0.5" />
                  {t("utilization.bonus_badge")}
                </Badge>
              )}
              {planMin > 0 && (
                <Badge variant="outline" className="text-[10px] px-1 py-0 border-warning text-warning">
                  <Wand2 className="size-2.5 mr-0.5" />
                  +{minutesToHours(planMin)} ч
                </Badge>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground mb-2 truncate">
            {employee.user.position_name ?? "—"} ·{" "}
            {formatShiftTime(employee.shift_start, employee.shift_end)}
          </p>

          {/* Utilization bar */}
          <div className="flex items-center gap-2 mb-2">
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={cn("h-full transition-all", getUtilizationColor(previewUtilization))}
                style={{ width: `${Math.min(previewUtilization, 100)}%` }}
              />
            </div>
            <span className={cn("text-xs font-medium shrink-0 w-10 text-right", getUtilizationTextColor(previewUtilization))}>
              {previewUtilization}%
            </span>
          </div>
          <p className="text-xs text-muted-foreground mb-2">
            {t("by_employee.free_label", { hours: minutesToHours(freeMin) })}
          </p>

          {/* Plan tasks chips */}
          {planTasks.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {planTasks.map((pt) => (
                <span
                  key={pt.taskId}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-warning/10 text-warning border border-warning/30 max-w-[200px]"
                  title={pt.title}
                >
                  <Wand2 className="size-2.5 shrink-0" />
                  <span className="truncate">{pt.title}</span>
                  <span className="shrink-0">· {minutesToHours(pt.minutes)} ч</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </button>
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

  // bottom-16 на mobile (64px) чтобы не перекрываться с MobileBottomNav (h-16, fixed),
  // bottom-0 на md+ (нет mobile nav)
  return (
    <div className="sticky bottom-16 md:bottom-0 -mx-4 md:-mx-6 px-4 md:px-6 py-3 bg-card/95 backdrop-blur border-t shadow-lg z-30">
      <div className="flex items-center gap-2 sm:gap-3">
        <Wand2 className="size-4 text-warning shrink-0" />
        <span className="text-xs sm:text-sm font-medium truncate min-w-0 flex-1">
          {t("plan_bar.summary", {
            tasks: taskCount,
            hours: minutesToHours(totalMinutes),
          })}
        </span>
        {/* Reset: на узких icon-only с tooltip; sm+ обычная */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={onReset}
                disabled={isConfirming}
                className="shrink-0 gap-1.5"
                aria-label={t("plan_bar.reset")}
              >
                <RotateCcw className="size-3.5" />
                <span className="hidden sm:inline">{t("plan_bar.reset")}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent className="sm:hidden">{t("plan_bar.reset")}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <Button
          size="sm"
          onClick={onConfirm}
          disabled={!canEdit || isConfirming}
          className="shrink-0 gap-1.5"
        >
          <CheckCircle2 className="size-3.5" />
          <span>{isConfirming ? t("plan_bar.confirming") : t("plan_bar.confirm")}</span>
        </Button>
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

  // Task sheet state (per-task editor)
  const [selectedTask, setSelectedTask] = React.useState<UnassignedTask | null>(null)
  const [sheetOpen, setSheetOpen] = React.useState(false)
  // Employee sheet state (per-employee editor — взгляд от сотрудника)
  const [selectedEmployee, setSelectedEmployee] = React.useState<EmployeeUtilization | null>(null)
  const [employeeSheetOpen, setEmployeeSheetOpen] = React.useState(false)
  const [isAutoRunning, setIsAutoRunning] = React.useState(false)
  const [isConfirming, setIsConfirming] = React.useState(false)
  // Какой ракурс показываем: список задач (по дефолту) или список сотрудников
  const [viewMode, setViewMode] = React.useState<ViewMode>("by-task")

  // Локальный план — staged allocations не закоммичены на сервер.
  // Map<taskId, allocations[]>. Подтверждается через StickyPlanBar.
  const [plan, setPlan] = React.useState<Map<string, TaskDistributionAllocation[]>>(new Map())

  // Plan minutes по сотрудникам — для бейджа в EmployeeUtilizationRow
  const planMinByUser = React.useMemo(() => {
    const m = new Map<number, number>()
    for (const allocs of plan.values()) {
      for (const a of allocs) {
        m.set(a.userId, (m.get(a.userId) ?? 0) + a.minutes)
      }
    }
    return m
  }, [plan])

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

  // Handle distribute button click — закрываем employee sheet если открыт
  const handleDistribute = (task: UnassignedTask) => {
    setEmployeeSheetOpen(false)
    setSelectedTask(task)
    setSheetOpen(true)
  }

  // Handle employee row click — закрываем task sheet если открыт
  const handleSelectEmployee = (emp: EmployeeUtilization) => {
    setSheetOpen(false)
    setSelectedEmployee(emp)
    setEmployeeSheetOpen(true)
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
    setSheetOpen(false)
    setEmployeeSheetOpen(false)
    toast.info(t("toast.plan_reset"))
  }

  // Подтвердить план — применяем все allocations через assignTaskToUser
  const handleConfirmPlan = async () => {
    if (!selectedStoreId || !canEdit || plan.size === 0) return
    // Закрываем оба sheet'а — данные under них становятся stale после refresh
    setSheetOpen(false)
    setEmployeeSheetOpen(false)
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
        <div className="w-full sm:w-auto sm:ml-auto">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="block w-full sm:w-auto">
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
                    className="gap-1.5 w-full sm:w-auto"
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

      {/* View mode tabs — выбор ракурса */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
        <TabsList className="grid w-full sm:w-auto sm:inline-grid grid-cols-2">
          <TabsTrigger value="by-task" className="gap-1.5">
            <ListChecks className="size-3.5" />
            <span>{t("view_mode.by_task")}</span>
          </TabsTrigger>
          <TabsTrigger value="by-employee" className="gap-1.5">
            <UsersRound className="size-3.5" />
            <span>{t("view_mode.by_employee")}</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Mobile utilization collapsible — только в by-task режиме (в by-employee
          сотрудники = основной контент) */}
      {viewMode === "by-task" && (
        <MobileUtilizationCollapsible
          employees={employees}
          planMinByUser={planMinByUser}
          onSelectEmployee={handleSelectEmployee}
          isLoading={isLoadingEmployees}
          date={currentDate}
          t={t}
          locale={locale}
        />
      )}

      {/* Main layout */}
      {viewMode === "by-task" ? (
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
              <div className="space-y-3">
                {Array.from(
                  tasks.reduce((acc, task) => {
                    const zone = task.zone_name ?? t("zone_group.no_zone")
                    if (!acc.has(zone)) acc.set(zone, [])
                    acc.get(zone)!.push(task)
                    return acc
                  }, new Map<string, UnassignedTask[]>())
                )
                  .sort(([za, ta], [zb, tb]) => {
                    const ra = ta.some((t) => t.remaining_minutes > 0)
                    const rb = tb.some((t) => t.remaining_minutes > 0)
                    if (ra !== rb) return ra ? -1 : 1
                    return za.localeCompare(zb)
                  })
                  .map(([zone, zoneTasks]) => (
                    <TaskZoneGroup
                      key={zone}
                      zoneName={zone}
                      tasks={zoneTasks}
                      plan={plan}
                      onDistribute={handleDistribute}
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
              planMinByUser={planMinByUser}
              onSelectEmployee={handleSelectEmployee}
              isLoading={isLoadingEmployees}
              date={currentDate}
              t={t}
              locale={locale}
            />
          </div>
        </div>
      ) : (
        // ── By Employee mode ──────────────────────────────────────────
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground">
            {t("by_employee.section_title")}
            {employees.length > 0 && (
              <span className="ml-1.5 text-foreground">({employees.length})</span>
            )}
          </h2>
          {isLoadingEmployees ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-3 space-y-2">
                    <div className="flex gap-3">
                      <Skeleton className="size-10 rounded-full shrink-0" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-2 w-32" />
                        <Skeleton className="h-1.5 w-full rounded-full" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : employees.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <EmptyState
                  icon={Calendar}
                  title={t("empty.no_shifts_title")}
                  description={t("empty.no_shifts_description")}
                />
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {employees.map((emp) => {
                const empPlanTasks: { taskId: string; title: string; minutes: number }[] = []
                for (const [tid, allocs] of plan) {
                  const myAlloc = allocs.find((a) => a.userId === emp.user.id)
                  if (myAlloc) {
                    const task = tasks.find((tt) => tt.id === tid)
                    if (task) {
                      empPlanTasks.push({
                        taskId: tid,
                        title: task.title,
                        minutes: myAlloc.minutes,
                      })
                    }
                  }
                }
                return (
                  <EmployeeBigCard
                    key={emp.user.id}
                    employee={emp}
                    planMin={planMinByUser.get(emp.user.id) ?? 0}
                    planTasks={empPlanTasks}
                    onClick={() => handleSelectEmployee(emp)}
                    t={t}
                  />
                )
              })}
            </div>
          )}
        </div>
      )}

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

      {/* Distribution Sheet — взгляд «от задачи к сотрудникам» */}
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

      {/* Employee Sheet — взгляд «от сотрудника к задачам» */}
      <EmployeeSheet
        employee={selectedEmployee}
        tasks={tasks}
        plan={plan}
        open={employeeSheetOpen}
        onClose={() => setEmployeeSheetOpen(false)}
        onPlanChange={setPlan}
        canEdit={canEdit}
        t={t}
      />
    </div>
  )
}
