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
  X,
  Pencil,
  ChevronUp,
} from "lucide-react"

import type { FunctionalRole, Store } from "@/lib/types"
import type { UnassignedTask, EmployeeUtilization, TaskDistributionAllocation } from "@/lib/api/distribution"
import type { UnassignedTaskBlock } from "@/lib/types"
import {
  getStoreUnassignedTasks,
  getStoreEmployeesUtilization,
  getStoreUnassignedBlocks,
  distributeBlock,
  assignTaskToUser,
  autoDistribute,
  notifyOverShiftAssignment,
  type OverShiftEntry,
  type BlockAllocation,
} from "@/lib/api/distribution"
import { getStores } from "@/lib/api/stores"
import { ADMIN_ROUTES } from "@/lib/constants/routes"
import { useAuth } from "@/lib/contexts/auth-context"
import { useStoreContext } from "@/lib/hooks/use-store-context"
import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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

/**
 * Форматирует минуты в человеко-читаемое «1 ч 15 мин».
 * Никаких дробей — точность до минуты.
 * Через i18n keys hm.zero / h_only / m_only / h_m чтобы локаль управлялась
 * центрально (ru: «ч/мин», en: «h/min»).
 */
function formatHM(min: number, t: ReturnType<typeof useTranslations>): string {
  const safeMin = Math.max(0, Math.round(min))
  const h = Math.floor(safeMin / 60)
  const m = safeMin % 60
  if (h === 0 && m === 0) return t("hm.zero")
  if (m === 0) return t("hm.h_only", { h })
  if (h === 0) return t("hm.m_only", { m })
  return t("hm.h_m", { h, m })
}

/**
 * Композитный «X ч Y мин» picker:
 * - Одна обводка вокруг двух inline input'ов (часы и минуты) + ChevronUp/Down
 *   справа для шага по 15 мин.
 * - Юниты «ч» и «мин» — статика (mask), в тексте не редактируются.
 * - Курсор кликом ставится в нужное поле (часы или минуты), цифры заменяются
 *   inline. Точность до минуты (0-59).
 * - Стрелки клавиатуры ↑/↓ внутри любого поля = ±15 мин (snap к multiple).
 * - Кнопки ▲▼ справа делают то же самое мышью.
 *
 * value/onChange работают в минутах (целое).
 */
interface HoursMinutesInputProps {
  value: number
  onChange: (totalMin: number) => void
  disabled?: boolean
  invalid?: boolean
  className?: string
  t: ReturnType<typeof useTranslations>
}

function HoursMinutesInput({
  value, onChange, disabled, invalid, className, t,
}: HoursMinutesInputProps) {
  const safeVal = Math.max(0, Math.round(value))
  const h = Math.floor(safeVal / 60)
  const m = safeVal % 60

  // Локальный edit-state для inline ввода (sync from external через effect)
  const [hStr, setHStr] = React.useState(() => String(h))
  const [mStr, setMStr] = React.useState(() => String(m).padStart(2, "0"))

  React.useEffect(() => {
    setHStr(String(h))
    setMStr(String(m).padStart(2, "0"))
  }, [h, m])

  const commitHours = (raw: string) => {
    const num = Math.max(0, parseInt(raw, 10) || 0)
    onChange(num * 60 + m)
  }
  const commitMinutes = (raw: string) => {
    let num = parseInt(raw, 10) || 0
    num = Math.max(0, Math.min(59, num))
    onChange(h * 60 + num)
  }

  const stepBy15 = (delta: 1 | -1) => {
    const next =
      delta > 0
        ? Math.floor(safeVal / 15) * 15 + 15
        : Math.max(0, Math.ceil(safeVal / 15) * 15 - 15)
    onChange(next)
  }

  const handleKeyDown =
    (commit: (raw: string) => void) =>
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "ArrowUp") {
        e.preventDefault()
        stepBy15(1)
      } else if (e.key === "ArrowDown") {
        e.preventDefault()
        stepBy15(-1)
      } else if (e.key === "Enter") {
        e.preventDefault()
        commit((e.target as HTMLInputElement).value)
        ;(e.target as HTMLInputElement).blur()
      }
    }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 px-2 h-9 rounded-md border bg-background text-sm transition-colors",
        "focus-within:ring-2 focus-within:ring-ring focus-within:border-ring",
        invalid && "border-destructive focus-within:ring-destructive focus-within:border-destructive",
        disabled && "opacity-50 pointer-events-none",
        className
      )}
      title={t("hm.step_hint")}
    >
      <input
        type="text"
        inputMode="numeric"
        className="w-7 bg-transparent text-center outline-none p-0 tabular-nums"
        value={hStr}
        onChange={(e) =>
          setHStr(e.target.value.replace(/\D/g, "").slice(0, 2))
        }
        onFocus={(e) => e.target.select()}
        onBlur={(e) => commitHours(e.target.value)}
        onKeyDown={handleKeyDown(commitHours)}
        disabled={disabled}
        aria-label={t("hm.h_aria")}
      />
      <span className="text-muted-foreground select-none text-xs">ч</span>
      <input
        type="text"
        inputMode="numeric"
        className="w-7 bg-transparent text-center outline-none p-0 tabular-nums"
        value={mStr}
        onChange={(e) =>
          setMStr(e.target.value.replace(/\D/g, "").slice(0, 2))
        }
        onFocus={(e) => e.target.select()}
        onBlur={(e) => commitMinutes(e.target.value)}
        onKeyDown={handleKeyDown(commitMinutes)}
        disabled={disabled}
        aria-label={t("hm.m_aria")}
      />
      <span className="text-muted-foreground select-none text-xs">мин</span>
      <div className="flex flex-col ml-1 -my-px">
        <button
          type="button"
          onClick={() => stepBy15(1)}
          disabled={disabled}
          className="flex items-center justify-center h-3.5 w-5 rounded-sm hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label={t("hm.step_up_aria")}
          tabIndex={-1}
        >
          <ChevronUp className="size-3" />
        </button>
        <button
          type="button"
          onClick={() => stepBy15(-1)}
          disabled={disabled || safeVal === 0}
          className="flex items-center justify-center h-3.5 w-5 rounded-sm hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label={t("hm.step_down_aria")}
          tabIndex={-1}
        >
          <ChevronDown className="size-3" />
        </button>
      </div>
    </div>
  )
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
  const totalLabel = formatHM(task.planned_minutes, t)
  const planMin = planAllocations.reduce((sum, a) => sum + a.minutes, 0)
  const effectiveDistributed = task.distributed_minutes + planMin
  const effectiveRemaining = Math.max(0, task.planned_minutes - effectiveDistributed)
  const remainingLabel = formatHM(effectiveRemaining, t)
  const isFullyDistributed = effectiveRemaining === 0
  const distributedPct = (task.distributed_minutes / task.planned_minutes) * 100
  const planPct = (planMin / task.planned_minutes) * 100

  return (
    <Card className={cn(
      "transition-shadow hover:shadow-md",
      isFullyDistributed && planMin === 0 && "opacity-60",
      planMin > 0 && "ring-1 ring-primary"
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
              <Badge variant="outline" className="text-xs border-primary text-primary gap-1">
                <Wand2 className="size-3" />
                {t("taskCard.in_plan_badge", { time: formatHM(planMin, t) })}
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
            {totalLabel}
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
                : t("taskCard.unassigned_hours", { remaining: remainingLabel, total: totalLabel })}
            </span>
          </div>
          {/* Saved (primary) + staged (primary/40) — обе заливки одного hue,
              разная opacity чтоб не конфликтовать. */}
          <div className="h-1.5 bg-muted rounded-full overflow-hidden flex">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${distributedPct}%` }}
            />
            <div
              className="h-full bg-primary/40 transition-all"
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
  const effectiveAssigned = employee.assigned_min + planMin
  const effectivePct = employee.shift_total_min > 0
    ? Math.round((effectiveAssigned / employee.shift_total_min) * 100)
    : 0
  const serverPct = employee.shift_total_min > 0
    ? (employee.assigned_min / employee.shift_total_min) * 100
    : 0
  const planPct = employee.shift_total_min > 0
    ? (planMin / employee.shift_total_min) * 100
    : 0
  const assignedLabel = formatHM(effectiveAssigned, t)
  const totalLabel = formatHM(employee.shift_total_min, t)

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
            <Badge variant="outline" className="text-[10px] px-1 py-0 border-primary text-primary">
              <Wand2 className="size-2.5 mr-0.5" />
              +{formatHM(planMin, t)}
            </Badge>
          )}
          {employee.has_bonus_task && (
            <Badge variant="secondary" className="text-[10px] px-1 py-0">
              <Star className="size-2.5 mr-0.5" />
              {t("utilization.bonus_badge")}
            </Badge>
          )}
        </div>
        {/* Stacked bar: saved (primary) + planned (primary/40), как в TaskCard.
            Цвет fill отражает effectivePct (saved+plan) — после auto бар сразу
            визуально показывает «как будет после подтверждения». */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden flex">
            <div
              className={cn("h-full transition-all", getUtilizationColor(effectivePct))}
              style={{ width: `${Math.min(serverPct, 100)}%` }}
            />
            <div
              className="h-full bg-primary/40 transition-all"
              style={{ width: `${Math.max(0, Math.min(planPct, 100 - serverPct))}%` }}
            />
          </div>
          <span className={cn("text-xs font-medium shrink-0", getUtilizationTextColor(effectivePct))}>
            {effectivePct}%
          </span>
        </div>
        <span className="text-xs text-muted-foreground">
          {t("utilization.hours_format", { assigned: assignedLabel, total: totalLabel })}
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
  const totalPlanMinutes = Array.from(planMinByUser.values()).reduce(
    (sum, n) => sum + n,
    0
  )
  // Свободное время с учётом плана — auto-распределение сразу должно показать
  // что свободного времени стало меньше.
  const freeMinutes = Math.max(
    0,
    totalShiftMinutes - totalAssignedMinutes - totalPlanMinutes
  )

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
              free: formatHM(freeMinutes, t),
              total: formatHM(totalShiftMinutes, t),
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
            <span>{formatHM(totalTaskMinutes, t)}</span>
          </div>
        </SheetHeader>

        {/* Distribution summary */}
        <div className="px-4 py-3 bg-muted/50 border-b">
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

        {/* Employee list */}
        <ScrollArea className="flex-1 px-4 py-3">
          <p className="text-xs font-medium text-muted-foreground mb-3">
            {t("sheet.employee_list_header")}
          </p>
          <div className="space-y-3">
            {employees.map((emp) => {
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
                distributed: formatHM(totalDistributed + totalInPlan, t),
                planned: formatHM(totalPlanned, t),
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

  // Задачи доступные для picker'а: с остатком + не в плане сотрудника
  // (исключение — текущая выбранная задача в edit-mode, чтоб combobox показал её)
  const availableTasks = tasks.filter(
    (task) =>
      task.remaining_minutes > 0 &&
      (!planItems.some((item) => item.task.id === task.id) || task.id === addTaskId)
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
    // Не клампим: директор может назначить сверх плана (warning UI).
    // Гарантируем только positive.
    if (addMinutes <= 0) return
    const next = new Map(plan)
    const existing = next.get(addTaskId) ?? []
    const withoutMe = existing.filter((a) => a.userId !== userId)
    next.set(addTaskId, [...withoutMe, { userId, minutes: addMinutes }])
    onPlanChange(next)
    setAddTaskId("")
    setAddMinutes(60)
  }

  const selectedTask = tasks.find((tt) => tt.id === addTaskId)
  // Edit mode = выбранная в picker'е задача уже в плане сотрудника
  const isEditMode = !!addTaskId && planItems.some((p) => p.task.id === addTaskId)
  // Hint только — не блокируем ввод. Реальная позитивная проверка на > 0.
  // freeMin для edit-режима учитывает что текущее значение уже включено
  // в planMin → надо «вернуть» его обратно для корректного hint.
  const editingItemMinutes = isEditMode
    ? planItems.find((p) => p.task.id === addTaskId)?.minutes ?? 0
    : 0
  const adjustedFreeMin = freeMin + editingItemMinutes
  const overShiftBy = Math.max(0, addMinutes - adjustedFreeMin)
  const overTaskBy = selectedTask ? Math.max(0, addMinutes - selectedTask.remaining_minutes) : 0

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
              assigned: formatHM(employee.assigned_min, t),
              plan: formatHM(planMin, t),
              total: formatHM(employee.shift_total_min, t),
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
              {planItems.map((item) => {
                const isSelected = addTaskId === item.task.id
                return (
                  <div
                    key={item.task.id}
                    className={cn(
                      "flex items-start gap-2 p-2 rounded-md border bg-primary/5 transition-colors",
                      isSelected ? "border-primary ring-1 ring-primary/40" : "border-primary/30"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setAddTaskId(item.task.id)
                        setAddMinutes(item.minutes)
                      }}
                      className="flex-1 flex items-start gap-2 min-w-0 text-left focus-visible:outline-none rounded -mx-1 -my-0.5 px-1 py-0.5 hover:bg-primary/10 focus-visible:bg-primary/10 transition-colors"
                      aria-label={t("employeeSheet.edit_aria")}
                    >
                      <div className="flex items-center gap-1 shrink-0 mt-0.5">
                        <Wand2 className="size-3.5 text-primary" />
                        <Pencil className="size-3 text-primary/60" />
                      </div>
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
                            {formatHM(item.minutes, t)}
                          </span>
                        </div>
                      </div>
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRemoveFromPlan(item.task.id)
                      }}
                      disabled={!canEdit}
                      aria-label={t("employeeSheet.remove_aria")}
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>
                )
              })}
            </div>
          )}

          {/* Add / Edit task */}
          <div className="border-t pt-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              {isEditMode ? t("employeeSheet.edit_section") : t("employeeSheet.add_section")}
            </p>
            {availableTasks.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                {t("employeeSheet.add_empty")}
              </p>
            ) : (
              <div className="space-y-2">
                {isEditMode && (
                  <p className="text-xs text-primary flex items-center gap-1.5">
                    <Pencil className="size-3 shrink-0" />
                    {t("employeeSheet.edit_mode_hint")}
                  </p>
                )}
                {freeMin === 0 && !isEditMode && (
                  <p className="text-xs text-destructive flex items-center gap-1.5">
                    <Wand2 className="size-3 shrink-0" />
                    {t("employeeSheet.over_shift_warning_full")}
                  </p>
                )}
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
                                // Suggested: реалистичный default — task remaining
                                // или 60 мин, что меньше. НЕ ограничиваем freeMin.
                                setAddMinutes(Math.min(60, task.remaining_minutes))
                                setPickerOpen(false)
                              }}
                            >
                              <div className="flex flex-col gap-0.5 min-w-0">
                                <span className="text-sm font-medium truncate">{task.title}</span>
                                <span className="text-xs text-muted-foreground">
                                  {task.zone_name} · {t("employeeSheet.add_picker_remaining", {
                                    time: formatHM(task.remaining_minutes, t),
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

                <div className="flex items-center gap-2 flex-wrap">
                  <HoursMinutesInput
                    value={addMinutes}
                    onChange={setAddMinutes}
                    disabled={!canEdit || !selectedTask}
                    invalid={overShiftBy > 0 || overTaskBy > 0}
                    t={t}
                  />
                  <Button
                    size="sm"
                    onClick={handleAddToPlan}
                    disabled={!canEdit || !addTaskId || addMinutes <= 0}
                    className="ml-auto"
                  >
                    {t(isEditMode ? "employeeSheet.update_button" : "employeeSheet.add_button")}
                  </Button>
                  {isEditMode && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setAddTaskId("")
                        setAddMinutes(60)
                      }}
                    >
                      {t("employeeSheet.cancel_edit")}
                    </Button>
                  )}
                </div>
                {selectedTask && overShiftBy === 0 && overTaskBy === 0 && (
                  <p className="text-xs text-muted-foreground">
                    {t("employeeSheet.add_free_hint", {
                      time: formatHM(adjustedFreeMin, t),
                    })}
                  </p>
                )}
                {overShiftBy > 0 && (
                  <p className="text-xs text-destructive flex items-center gap-1.5">
                    <Wand2 className="size-3 shrink-0" />
                    {t("employeeSheet.over_shift_warning", {
                      time: formatHM(overShiftBy, t),
                    })}
                  </p>
                )}
                {overTaskBy > 0 && (
                  <p className="text-xs text-destructive flex items-center gap-1.5">
                    <Wand2 className="size-3 shrink-0" />
                    {t("employeeSheet.over_task_warning", {
                      time: formatHM(overTaskBy, t),
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
        planMin > 0 && "ring-1 ring-primary",
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
                <Badge variant="outline" className="text-[10px] px-1 py-0 border-primary text-primary bg-primary/5">
                  <Wand2 className="size-2.5 mr-0.5" />
                  +{formatHM(planMin, t)}
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
            {t("by_employee.free_label", { time: formatHM(freeMin, t) })}
          </p>

          {/* Plan tasks chips */}
          {planTasks.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {planTasks.map((pt) => (
                <span
                  key={pt.taskId}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-primary/10 text-primary border border-primary/30 max-w-[200px]"
                  title={pt.title}
                >
                  <Wand2 className="size-2.5 shrink-0" />
                  <span className="truncate">{pt.title}</span>
                  <span className="shrink-0">· {formatHM(pt.minutes, t)}</span>
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
        <Wand2 className="size-4 text-primary shrink-0" />
        <span className="text-xs sm:text-sm font-medium truncate min-w-0 flex-1">
          {t("plan_bar.summary", {
            tasks: taskCount,
            time: formatHM(totalMinutes, t),
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

  // Store-context (URL ?store=N, persists across screens)
  const { storeId: ctxStoreId, setStoreId: setCtxStoreId } = useStoreContext()

  // State
  const [stores, setStores] = React.useState<Store[]>([])
  const [selectedStoreId, setSelectedStoreIdLocal] = React.useState<number | null>(null)
  // Wrap setter — sync local + URL context
  const setSelectedStoreId = React.useCallback((id: number | null) => {
    setSelectedStoreIdLocal(id)
    void setCtxStoreId(id === null ? "all" : String(id))
  }, [setCtxStoreId])
  const [period, setPeriod] = React.useState<PeriodTab>("today")
  const [tasks, setTasks] = React.useState<UnassignedTask[]>([])
  const [employees, setEmployees] = React.useState<EmployeeUtilization[]>([])
  // Нераспределённые блоки задач из LAMA — основная сущность для распределения.
  // Когда блок распределяется, он лопается на N Task'ов в MOCK_TASKS.
  const [blocks, setBlocks] = React.useState<UnassignedTaskBlock[]>([])
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
    // Mock TODAY синхронизируется с LAMA snapshot (2026-05-07).
    // На «завтра» (2026-05-08) у нас лежат нераспределённые LAMA-блоки.
    const today = new Date("2026-05-07")
    return period === "tomorrow" ? format(addDays(today, 1), "yyyy-MM-dd") : format(today, "yyyy-MM-dd")
  }, [period])

  // Load stores on mount
  React.useEffect(() => {
    async function loadStores() {
      setIsLoadingStores(true)
      try {
        const response = await getStores({})
        setStores(response.data)
        // Default: URL ?store=N если он валидный для текущего org-scope, иначе
        // первый магазин из загруженных (распределение «по сети» бессмысленно —
        // распределяем задачи в один конкретный магазин).
        if (response.data.length > 0) {
          const fromUrl = ctxStoreId !== null
            ? response.data.find((s) => s.id === ctxStoreId) ?? null
            : null
          const defaultStore = fromUrl ?? response.data[0]
          setSelectedStoreIdLocal(defaultStore.id)
          // Persist в URL чтобы next-screen открылся на том же магазине
          if (!fromUrl) void setCtxStoreId(String(defaultStore.id))
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
        const [tasksRes, employeesRes, blocksRes] = await Promise.all([
          getStoreUnassignedTasks(selectedStoreId, currentDate),
          getStoreEmployeesUtilization(selectedStoreId, currentDate),
          getStoreUnassignedBlocks(selectedStoreId, currentDate),
        ])

        setTasks(tasksRes.data)
        setEmployees(employeesRes.data)
        setBlocks(blocksRes.data)
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

  // Подтвердить план — применяем все allocations через assignTaskToUser.
  // Дополнительно детектим over-shift и уведомляем supervisor+ если директор
  // назначил сотруднику работы сверх его смены.
  const handleConfirmPlan = async () => {
    if (!selectedStoreId || !canEdit || plan.size === 0) return
    // Закрываем оба sheet'а — данные under них становятся stale после refresh
    setSheetOpen(false)
    setEmployeeSheetOpen(false)
    setIsConfirming(true)

    // Детектим over-shift ДО применения (по текущему snapshot employees).
    // Сумма plan-минут per user → emp.assigned_min + extra > shift_total_min.
    const allocByUser = new Map<number, number>()
    for (const allocs of plan.values()) {
      for (const a of allocs) {
        allocByUser.set(a.userId, (allocByUser.get(a.userId) ?? 0) + a.minutes)
      }
    }
    // Threshold уведомления: >20% сверх плановой смены (per user requirement
    // «при превышении более чем на 20% от плана»). Меньшие over-shift
    // допустимы директором без эскалации supervisor.
    const overShifts: OverShiftEntry[] = []
    for (const emp of employees) {
      const additional = allocByUser.get(emp.user.id) ?? 0
      const totalAfter = emp.assigned_min + additional
      const threshold =
        emp.shift_total_min > 0 ? emp.shift_total_min * 1.2 : 0
      if (totalAfter > threshold) {
        overShifts.push({
          userId: emp.user.id,
          userName: getFullName(
            emp.user.first_name,
            emp.user.last_name,
            emp.user.middle_name
          ),
          shiftMin: emp.shift_total_min,
          totalAfterMin: totalAfter,
        })
      }
    }

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

    // Уведомляем supervisor+ если директор назначил сверх плана.
    // Только для STORE_DIRECTOR — supervisor и выше сами не триггерят notification на себя.
    if (overShifts.length > 0 && user?.role === "STORE_DIRECTOR") {
      try {
        await notifyOverShiftAssignment(selectedStoreId, overShifts, {
          id: user.id,
          name: getFullName(user.first_name, user.last_name, user.middle_name),
          role: user.role,
        })
      } catch {
        // notification не критична — toast информирует пользователя
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
    } else if (overShifts.length > 0) {
      toast.warning(t("toast.confirm_over_shift", { count: okCount, over: overShifts.length }))
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
            ) : tasks.length === 0 && blocks.length === 0 ? (
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
              <div className="space-y-4">
                {/* Нераспределённые блоки от LAMA — приходят сводками
                    (например «Выкладка ФРОВ — 480 мин»). Директор/ИИ
                    распределяет эти блоки на сотрудников. */}
                {blocks.length > 0 && (
                  <Card className="border-primary/30 bg-primary/5">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-semibold flex items-center gap-2">
                            <Wand2 className="size-4 text-primary" />
                            Блоки от ЛАМА (нераспределённые)
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            Сводка трудозатрат на день — нужно разбить на конкретные задачи сотрудникам
                          </div>
                        </div>
                        <Badge variant="secondary">{blocks.length} блоков · {blocks.reduce((s, b) => s + b.remaining_minutes, 0)} мин</Badge>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {blocks.slice(0, 12).map((block) => (
                          <div
                            key={block.id}
                            className={cn(
                              "rounded-md border bg-card p-3 text-sm transition hover:border-primary/50",
                              block.priority && block.priority <= 3 && "border-destructive/40",
                            )}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="font-medium leading-tight">{block.title}</div>
                              {block.priority && block.priority <= 3 && (
                                <Badge variant="destructive" className="shrink-0 text-[10px]">P{block.priority}</Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {Math.floor(block.remaining_minutes / 60)}ч {block.remaining_minutes % 60}мин
                              {block.distributed_minutes > 0 && (
                                <span className="text-primary"> · {block.distributed_minutes} мин уже разложено</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      {blocks.length > 12 && (
                        <div className="text-xs text-muted-foreground text-center">
                          и ещё {blocks.length - 12} блоков
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Уже распределённые задачи (для редактирования назначений) */}
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
