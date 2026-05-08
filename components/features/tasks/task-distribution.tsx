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
import {
  getStoreUnassignedTasks,
  getStoreEmployeesUtilization,
  assignTaskToUser,
  autoDistribute,
  notifyOverShiftAssignment,
  getActiveLamaStoreIds,
  type OverShiftEntry,
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
// TaskRow — компактная строка для задачи (визуальный близнец EmployeeUtilizationRow).
// Используется во всех 4 квадрантах /tasks/distribute (LEFT кликабельная,
// RIGHT read-only). Структура: иконка-индикатор · title+badges · progress+% · meta
// ─────────────────────────────────────────────────────────────────────────────

interface TaskRowProps {
  task: UnassignedTask
  planAllocations: TaskDistributionAllocation[]
  onSelect?: () => void
  disabled?: boolean
  t: ReturnType<typeof useTranslations>
}

function TaskRow({ task, planAllocations, onSelect, disabled, t }: TaskRowProps) {
  const totalLabel = formatHM(task.planned_minutes, t)
  const planMin = planAllocations.reduce((sum, a) => sum + a.minutes, 0)
  const effectiveDistributed = task.distributed_minutes + planMin
  const isFullyDistributed = effectiveDistributed >= task.planned_minutes
  const distributedPct = task.planned_minutes > 0
    ? (task.distributed_minutes / task.planned_minutes) * 100
    : 0
  const planPct = task.planned_minutes > 0
    ? (planMin / task.planned_minutes) * 100
    : 0
  const totalPct = Math.min(100, Math.round(distributedPct + planPct))

  const interactive = !!onSelect
  const rowDisabled = disabled || (isFullyDistributed && planMin === 0)

  const content = (
    <>
      {/* Иконка-индикатор: ListChecks как универсальный «task» аналог Avatar */}
      <div
        className={cn(
          "size-8 shrink-0 rounded-full flex items-center justify-center",
          isFullyDistributed ? "bg-success/15 text-success" : "bg-accent text-accent-foreground",
        )}
      >
        <ListChecks className="size-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium truncate">{task.title}</span>
          {task.source === "AI" && (
            <Badge variant="secondary" className="text-[10px] px-1 py-0">
              <Sparkles className="size-2.5 mr-0.5" />
              ИИ
            </Badge>
          )}
          {planMin > 0 && (
            <Badge variant="outline" className="text-[10px] px-1 py-0 border-primary text-primary">
              <Wand2 className="size-2.5 mr-0.5" />
              +{formatHM(planMin, t)}
            </Badge>
          )}
        </div>
        {/* Stacked bar: saved (primary) + planned (primary/40) */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden flex">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${distributedPct}%` }}
            />
            <div
              className="h-full bg-primary/40 transition-all"
              style={{ width: `${planPct}%` }}
            />
          </div>
          <span
            className={cn(
              "text-xs font-medium shrink-0",
              isFullyDistributed ? "text-success" : "text-muted-foreground",
            )}
          >
            {totalPct}%
          </span>
        </div>
        <span className="text-xs text-muted-foreground truncate block">
          {task.zone_name} · {formatHM(effectiveDistributed, t)} / {totalLabel}
        </span>
      </div>
    </>
  )

  if (interactive) {
    // Карточка во всю ширину — primary action в LEFT-панели.
    // Border + hover ring + ChevronRight = сильный visual affordance.
    return (
      <Card
        role="button"
        tabIndex={rowDisabled ? -1 : 0}
        onClick={() => {
          if (!rowDisabled && onSelect) onSelect()
        }}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !rowDisabled && onSelect) {
            e.preventDefault()
            onSelect()
          }
        }}
        aria-disabled={rowDisabled}
        className={cn(
          "group transition-all",
          rowDisabled
            ? "cursor-not-allowed opacity-60"
            : "cursor-pointer hover:shadow-md hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          planMin > 0 && "ring-1 ring-primary",
        )}
      >
        <CardContent className="flex items-center gap-3 p-3">
          {content}
          <ChevronRight
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-all",
              !rowDisabled && "group-hover:text-primary group-hover:translate-x-0.5",
            )}
          />
        </CardContent>
      </Card>
    )
  }

  // Read-only — компактная строка для RIGHT-панели.
  return <div className="flex items-center gap-3 py-2">{content}</div>
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
    // Карточка во всю ширину — primary action в LEFT-панели.
    return (
      <Card
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            onSelect()
          }
        }}
        className={cn(
          "group cursor-pointer transition-all hover:shadow-md hover:border-primary/40",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          planMin > 0 && "ring-1 ring-primary",
        )}
      >
        <CardContent className="flex items-center gap-3 p-3">
          {content}
          <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-all group-hover:text-primary group-hover:translate-x-0.5" />
        </CardContent>
      </Card>
    )
  }

  // Read-only — компактная строка для RIGHT-панели.
  return <div className="flex items-center gap-3 py-2">{content}</div>
}

// ─────────────────────────────────────────────────────────────────────────────
// TeamUtilizationPanel
// ─────────────────────────────────────────────────────────────────────────────

interface TeamUtilizationPanelProps {
  employees: EmployeeUtilization[]
  planMinByUser: Map<number, number>
  isLoading: boolean
  date: string
  t: ReturnType<typeof useTranslations>
  locale: string
}

// ─────────────────────────────────────────────────────────────────────────────
// TasksSummaryPanel — правая панель «Сводка по задачам» в by-employee режиме.
// Симметричный близнец TeamUtilizationPanel — те же sticky/scroll, тот же
// layout (header → scroll list of rows → footer summary).
// ─────────────────────────────────────────────────────────────────────────────

interface TasksSummaryPanelProps {
  tasks: UnassignedTask[]
  plan: Map<string, TaskDistributionAllocation[]>
  date: string
  locale: string
  t: ReturnType<typeof useTranslations>
}

function TasksSummaryPanel({ tasks, plan, date, locale, t }: TasksSummaryPanelProps) {
  const dateLocale = locale === "en" ? enUS : ru
  const formattedDate = format(new Date(date), "d MMMM", { locale: dateLocale })
  const taskNoun = (n: number) =>
    n === 1 ? "задача" : n >= 2 && n <= 4 ? "задачи" : "задач"
  const totalPlanned = tasks.reduce((s, t) => s + t.planned_minutes, 0)
  const totalDistributed = tasks.reduce((s, t) => s + t.distributed_minutes, 0)
  const totalPlanMin = Array.from(plan.values()).reduce(
    (sum, allocs) => sum + allocs.reduce((s, a) => s + a.minutes, 0),
    0,
  )
  const totalCovered = totalDistributed + totalPlanMin
  const remaining = Math.max(0, totalPlanned - totalCovered)

  if (tasks.length === 0) {
    return (
      <Card className="lg:sticky lg:top-4">
        <CardContent className="py-8">
          <EmptyState
            icon={ListChecks}
            title={t("empty.no_tasks_title")}
            description={t("empty.no_tasks_description")}
            className="py-4"
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <ListChecks className="size-4" />
          Сводка по задачам
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          на {formattedDate} · {tasks.length} {taskNoun(tasks.length)} на сегодня
          {plan.size > 0 && ` · ${plan.size} в плане`}
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              planAllocations={plan.get(task.id) ?? []}
              t={t}
            />
          ))}
        </div>
        <div className="mt-4 pt-3 border-t">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              Покрыто: {formatHM(totalCovered, t)} / {formatHM(totalPlanned, t)}
              {remaining > 0 && ` · осталось ${formatHM(remaining, t)}`}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function TeamUtilizationPanel({ employees, planMinByUser, isLoading, date, t, locale }: TeamUtilizationPanelProps) {
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
    <Card>
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
        <div className="space-y-1">
          {employees.map((emp) => (
            <EmployeeUtilizationRow
              key={emp.user.id}
              employee={emp}
              planMin={planMinByUser.get(emp.user.id) ?? 0}
              t={t}
            />
          ))}
        </div>
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

        {/* Filter «только подходящие сотрудники» — двух-уровневый match:
            1. Если у задачи есть зона → match по zones (история зон сотрудника).
            2. Если зоны нет (Касса/КСО/Менеджерские) → match по work_types
               (тот же тип работы у сотрудника в LAMA history).
            Чекбокс активен в обоих случаях, disabled только если ни zone ни
            work_type у задачи нет. */}
        {(() => {
          const hasZone = !!task.zone_name && task.zone_name !== "Без зоны"
          const hasWorkType = !!task.work_type_name
          const filterAvailable = hasZone || hasWorkType
          const matched = hasZone
            ? employees.filter((e) => e.user.zones?.includes(task.zone_name))
            : hasWorkType
              ? employees.filter((e) => e.user.work_types?.includes(task.work_type_name!))
              : employees
          const matchKind = hasZone ? "по зоне" : hasWorkType ? "по типу работ" : ""
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

        {/* Employee list */}
        <ScrollArea className="flex-1 min-h-0 px-4 py-3">
          <p className="text-xs font-medium text-muted-foreground mb-3">
            {t("sheet.employee_list_header")}
          </p>
          <div className="space-y-3">
            {(() => {
              if (!zoneFilterEnabled) return employees
              const hasZone = !!task.zone_name && task.zone_name !== "Без зоны"
              if (hasZone) {
                return employees.filter((e) => e.user.zones?.includes(task.zone_name))
              }
              if (task.work_type_name) {
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

// ─────────────────────────────────────────────────────────────────────────────
// MobileUtilizationCollapsible
// ─────────────────────────────────────────────────────────────────────────────

interface MobileUtilizationCollapsibleProps {
  employees: EmployeeUtilization[]
  planMinByUser: Map<number, number>
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
  const freeMin = Math.max(0, employee.shift_total_min - employee.assigned_min - planMin)
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

  // Z-фильтр: задачи в зонах сотрудника. Если у сотрудника нет zones —
  // показываем все (зон нет → matched.length=0 → бесполезно фильтровать).
  const empZones = employee.user.zones ?? []
  const matchedByZone = empZones.length > 0
    ? tasks.filter((tt) => tt.zone_name && empZones.includes(tt.zone_name))
    : tasks
  const visibleTasks = zoneFilterEnabled && empZones.length > 0
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

        {/* Zone filter toggle (если у сотрудника есть зоны) */}
        {empZones.length > 0 && (
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
        // Фильтр /tasks/distribute: показываем только магазины у которых есть
        // реальные LAMA-блоки (получены через snapshot fetch). Магазины без
        // данных скрываем — они всё равно покажут только generated fallback,
        // что менее интересно для оператора.
        const activeIds = getActiveLamaStoreIds()
        const lamaStores = response.data.filter((s) => activeIds.has(s.id))
        setStores(lamaStores)
        if (lamaStores.length > 0) {
          const fromUrl = ctxStoreId !== null
            ? lamaStores.find((s) => s.id === ctxStoreId) ?? null
            : null
          const defaultStore = fromUrl ?? lamaStores[0]
          setSelectedStoreIdLocal(defaultStore.id)
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
              <Card>
                <CardContent className="p-2">
                  <div className="space-y-1">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-3 py-2">
                        <Skeleton className="size-8 rounded-full shrink-0" />
                        <div className="flex-1 space-y-1.5">
                          <Skeleton className="h-3 w-32" />
                          <Skeleton className="h-1.5 w-full rounded-full" />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
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
              // Список full-width карточек — каждая TaskRow уже Card в interactive
              // режиме. Клик по карточке → DistributionSheet.
              // Сортировка: сначала нераспределённые → по priority → по зоне.
              <div className="space-y-2">
                {[...tasks]
                  .sort((a, b) => {
                    const ar = a.remaining_minutes > 0 ? 0 : 1
                    const br = b.remaining_minutes > 0 ? 0 : 1
                    if (ar !== br) return ar - br
                    const ap = a.priority ?? 50
                    const bp = b.priority ?? 50
                    if (ap !== bp) return ap - bp
                    return (a.zone_name ?? "").localeCompare(b.zone_name ?? "")
                  })
                  .map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      planAllocations={plan.get(task.id) ?? []}
                      onSelect={() => handleDistribute(task)}
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
              isLoading={isLoadingEmployees}
              date={currentDate}
              t={t}
              locale={locale}
            />
          </div>
        </div>
      ) : (
        // ── By Employee mode ──────────────────────────────────────────
        // Зеркальный layout к by-task: слева компактные карточки сотрудников
        // (плоский список без группировки), справа — сводка задач с прогрессом.
        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          {/* Левая колонка: список сотрудников */}
          <div className="space-y-2">
            <h2 className="text-sm font-medium text-muted-foreground">
              {t("by_employee.section_title")}
              {employees.length > 0 && (
                <span className="ml-1.5 text-foreground">({employees.length})</span>
              )}
            </h2>
            {isLoadingEmployees ? (
              <div className="space-y-1">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <Skeleton className="size-8 rounded-full shrink-0" />
                        <div className="flex-1 space-y-1.5">
                          <Skeleton className="h-3 w-32" />
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
              // Список full-width карточек — каждая EmployeeUtilizationRow
              // уже Card в interactive режиме. Клик → EmployeeSheet.
              <div className="space-y-2">
                {employees.map((emp) => (
                  <EmployeeUtilizationRow
                    key={emp.user.id}
                    employee={emp}
                    planMin={planMinByUser.get(emp.user.id) ?? 0}
                    onSelect={() => handleSelectEmployee(emp)}
                    t={t}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Правая колонка: сводка задач — компактный read-only список,
              визуально идентичный «Сводке по команде» (TeamUtilizationPanel).
              Тот же flex-col + sticky max-h pattern, тот же row-format. */}
          <div className="hidden lg:block">
            <TasksSummaryPanel
              tasks={tasks}
              plan={plan}
              date={currentDate}
              locale={locale}
              t={t}
            />
          </div>
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
