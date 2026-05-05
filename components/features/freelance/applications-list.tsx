"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "@/i18n/navigation"
import { useTranslations } from "next-intl"
import {
  useQueryState,
  parseAsString,
  parseAsInteger,
  parseAsBoolean,
} from "nuqs"
import { type ColumnDef } from "@tanstack/react-table"
import {
  Calendar,
  Check,
  ChevronsUpDown,
  ExternalLink,
  MoreVertical,
  Plus,
  RefreshCw,
  ServerCrash,
  ToggleLeft,
  ToggleRight,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { format, formatDistanceToNow, parseISO, isToday, isTomorrow, isPast } from "date-fns"
import { ru, enUS } from "date-fns/locale"
import { useLocale } from "next-intl"

import type { FreelanceApplication, ApplicationStatus, ApplicationSource } from "@/lib/types"
import {
  getFreelanceApplications,
  cancelApplication,
} from "@/lib/api/freelance-applications"
import { ADMIN_ROUTES } from "@/lib/constants/routes"
import { useAuth } from "@/lib/contexts/auth-context"
import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { AlertDialog } from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

import { PageHeader } from "@/components/shared/page-header"
import { FilterChip } from "@/components/shared/filter-chip"
import { RoleBadge } from "@/components/shared/role-badge"
import { EmptyState } from "@/components/shared/empty-state"
import { ResponsiveDataTable } from "@/components/shared/responsive-data-table"
import { MobileFilterSheet } from "@/components/shared/mobile-filter-sheet"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { ApplicationStatusBadge } from "@/components/shared/application-status-badge"

// ─────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────

const STORE_OPTIONS = [
  { id: "1",  name: "СПАР Томск, пр. Ленина 80" },
  { id: "2",  name: "СПАР Томск, ул. Красноармейская 99" },
  { id: "4",  name: "СПАР Новосибирск, ул. Ленина 55" },
  { id: "5",  name: "СПАР Новосибирск, Красный пр. 200" },
  { id: "6",  name: "СПАР Кемерово, пр. Советский 50" },
  { id: "7",  name: "Food City Томск Global Market, пр. Ленина 217" },
  { id: "8",  name: "Food City Томск, ул. Учебная 39" },
  { id: "10", name: "Магазин одежды Альфа, Томск, пр. Ленина 50" },
]

const WORK_TYPE_OPTIONS = [
  { id: "2",  name: "Касса" },
  { id: "4",  name: "Выкладка" },
  { id: "5",  name: "Переоценка" },
  { id: "6",  name: "Инвентаризация" },
  { id: "12", name: "Уборка" },
  { id: "13", name: "Складские работы" },
]

/** Tab → ApplicationStatus mapping; "archive" means CANCELLED + REPLACED_WITH_BONUS archive */
const TAB_STATUS_MAP: Record<string, ApplicationStatus[]> = {
  pending:  ["PENDING", "DRAFT"],
  approved: ["APPROVED_FULL", "APPROVED_PARTIAL"],
  rejected: ["REJECTED"],
  bonus:    ["REPLACED_WITH_BONUS"],
  archive:  ["CANCELLED", "MIXED"],
}

// ─────────────────────────────────────────────────────────────────
// DATE HELPERS
// ─────────────────────────────────────────────────────────────────

function formatPlannedDate(dateStr: string, locale: string): string {
  try {
    const d = parseISO(dateStr)
    if (isToday(d)) return locale === "ru" ? "Сегодня" : "Today"
    if (isTomorrow(d)) return locale === "ru" ? "Завтра" : "Tomorrow"
    return format(d, "d MMM", { locale: locale === "ru" ? ru : enUS })
  } catch {
    return dateStr
  }
}

function isUrgentDate(dateStr: string): boolean {
  try {
    const d = parseISO(dateStr)
    return isToday(d) || (isPast(d) === false && (d.getTime() - Date.now()) < 48 * 60 * 60 * 1000)
  } catch {
    return false
  }
}

function formatRelativeTime(isoStr: string, locale: string): string {
  try {
    return formatDistanceToNow(parseISO(isoStr), {
      addSuffix: true,
      locale: locale === "ru" ? ru : enUS,
    })
  } catch {
    return isoStr
  }
}

// ─────────────────────────────────────────────────────────────────
// MULTI-SELECT COMBOBOX
// ─────────────────────────────────────────────────────────────────

interface MultiSelectComboboxProps {
  options: { value: string; label: string }[]
  selected: string[]
  onSelectionChange: (values: string[]) => void
  placeholder: string
  className?: string
}

function MultiSelectCombobox({
  options,
  selected,
  onSelectionChange,
  placeholder,
  className,
}: MultiSelectComboboxProps) {
  const [open, setOpen] = React.useState(false)

  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onSelectionChange(selected.filter((v) => v !== value))
    } else {
      onSelectionChange([...selected, value])
    }
  }

  const displayLabel =
    selected.length === 0
      ? placeholder
      : selected.length === 1
      ? options.find((o) => o.value === selected[0])?.label ?? placeholder
      : `${selected.length} выбрано`

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "h-9 justify-between font-normal text-sm min-w-[160px]",
            selected.length > 0 ? "text-foreground" : "text-muted-foreground",
            className
          )}
        >
          <span className="truncate">{displayLabel}</span>
          <ChevronsUpDown className="ml-2 size-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          <CommandInput placeholder="Поиск..." className="h-9" />
          <CommandList>
            <CommandEmpty>Ничего не найдено</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={() => toggle(option.value)}
                  className="gap-2"
                >
                  <div
                    className={cn(
                      "flex size-4 items-center justify-center rounded border border-border shrink-0",
                      selected.includes(option.value)
                        ? "bg-primary border-primary"
                        : "opacity-50"
                    )}
                  >
                    {selected.includes(option.value) && (
                      <Check className="size-3 text-primary-foreground" />
                    )}
                  </div>
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// ─────────────────────────────────────────────────────────────────
// SINGLE SELECT COMBOBOX
// ─────────────────────────────────────────────────────────────────

interface SingleSelectComboboxProps {
  options: { value: string; label: string }[]
  value: string
  onValueChange: (value: string) => void
  placeholder: string
  className?: string
}

function SingleSelectCombobox({
  options,
  value,
  onValueChange,
  placeholder,
  className,
}: SingleSelectComboboxProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "h-9 justify-between font-normal text-sm min-w-[140px]",
            value ? "text-foreground" : "text-muted-foreground",
            className
          )}
        >
          <span className="truncate">
            {value ? options.find((o) => o.value === value)?.label : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 size-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="start">
        <Command>
          <CommandList>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={(current) => {
                    onValueChange(current === value ? "" : current)
                    setOpen(false)
                  }}
                  className="gap-2"
                >
                  <Check
                    className={cn(
                      "size-4",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// ─────────────────────────────────────────────────────────────────
// DATE RANGE PICKER (simple two-input)
// ─────────────────────────────────────────────────────────────────

interface DateRangePickerProps {
  from: string
  to: string
  onFromChange: (v: string) => void
  onToChange: (v: string) => void
  placeholder: string
}

function DateRangePicker({ from, to, onFromChange, onToChange, placeholder }: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false)
  const displayLabel = from || to
    ? [from, to].filter(Boolean).join(" — ")
    : placeholder

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-9 justify-between font-normal text-sm min-w-[160px]",
            (from || to) ? "text-foreground" : "text-muted-foreground"
          )}
        >
          <Calendar className="mr-2 size-3.5 shrink-0 opacity-60" aria-hidden="true" />
          <span className="truncate flex-1 text-left">{displayLabel}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3 space-y-3" align="start">
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">От</label>
          <input
            type="date"
            value={from}
            onChange={(e) => onFromChange(e.target.value)}
            className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">До</label>
          <input
            type="date"
            value={to}
            onChange={(e) => onToChange(e.target.value)}
            className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full h-8 text-xs"
          onClick={() => { onFromChange(""); onToChange(""); setOpen(false) }}
        >
          Сбросить даты
        </Button>
      </PopoverContent>
    </Popover>
  )
}

// ─────────────────────────────────────────────────────────────────
// LOADING SKELETON
// ─────────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="space-y-2 mt-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-md" />
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────

export function ApplicationsList() {
  const t = useTranslations("screen.freelanceApplications")
  const tCommon = useTranslations("common")
  const tRole = useTranslations("role.functional")
  const router = useRouter()
  const locale = useLocale()
  const { user } = useAuth()

  const currentRole = user.role
  const canCreateApplication =
    currentRole !== "STORE_DIRECTOR" ||
    (currentRole === "STORE_DIRECTOR" && true) // tenant permission mock: always true for SD

  // External HR enabled (org-level flag, mock)
  const externalHrEnabled = true

  // ── URL state (nuqs) ────────────────────────────────────────────
  const [tabParam, setTabParam] = useQueryState("tab", parseAsString.withDefault("pending"))
  const [storeParam, setStoreParam] = useQueryState("store", parseAsString.withDefault(""))
  const [workTypeParam, setWorkTypeParam] = useQueryState("work_type", parseAsString.withDefault(""))
  const [dateFromParam, setDateFromParam] = useQueryState("date_from", parseAsString.withDefault(""))
  const [dateToParam, setDateToParam] = useQueryState("date_to", parseAsString.withDefault(""))
  const [sourceParam, setSourceParam] = useQueryState("source", parseAsString.withDefault(""))
  const [unassignedParam, setUnassignedParam] = useQueryState("unassigned", parseAsBoolean.withDefault(false))
  const [pageParam, setPageParam] = useQueryState("page", parseAsInteger.withDefault(1))

  // Multi-select stores (local state, mapped from storeParam)
  const [selectedStoreIds, setSelectedStoreIds] = React.useState<string[]>(
    storeParam ? storeParam.split(",").filter(Boolean) : []
  )
  const [selectedWorkTypeIds, setSelectedWorkTypeIds] = React.useState<string[]>(
    workTypeParam ? workTypeParam.split(",").filter(Boolean) : []
  )

  // Sync multi-selects to URL
  React.useEffect(() => {
    void setStoreParam(selectedStoreIds.length > 0 ? selectedStoreIds.join(",") : null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStoreIds])

  React.useEffect(() => {
    void setWorkTypeParam(selectedWorkTypeIds.length > 0 ? selectedWorkTypeIds.join(",") : null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWorkTypeIds])

  // ── Data state ──────────────────────────────────────────────────
  const [data, setData] = React.useState<FreelanceApplication[]>([])
  const [total, setTotal] = React.useState(0)
  const [tabCounts, setTabCounts] = React.useState<Record<string, number>>({})
  const [isLoading, setIsLoading] = React.useState(true)
  const [isError, setIsError] = React.useState(false)

  // ── Cancel dialog ───────────────────────────────────────────────
  const [cancelId, setCancelId] = React.useState<string | null>(null)
  const [isCancelling, setIsCancelling] = React.useState(false)

  // ── Fetch ───────────────────────────────────────────────────────
  const fetchData = React.useCallback(async () => {
    setIsLoading(true)
    setIsError(false)
    try {
      const statuses = TAB_STATUS_MAP[tabParam] ?? TAB_STATUS_MAP.pending
      // For multi-status tab we fetch each and merge
      const results = await Promise.all(
        statuses.map((status) =>
          getFreelanceApplications({
            status,
            store_id: selectedStoreIds.length === 1 ? Number(selectedStoreIds[0]) : undefined,
            work_type_id: selectedWorkTypeIds.length === 1 ? Number(selectedWorkTypeIds[0]) : undefined,
            date_from: dateFromParam || undefined,
            date_to: dateToParam || undefined,
            source: sourceParam ? (sourceParam as ApplicationSource) : undefined,
            unassigned: unassignedParam || undefined,
            page: pageParam,
            page_size: 20,
          })
        )
      )
      const merged = results.flatMap((r) => r.data)
      // Filter multi-store locally (API accepts single store_id)
      const filtered =
        selectedStoreIds.length > 1
          ? merged.filter((a) => selectedStoreIds.includes(String(a.store_id)))
          : merged
      // Filter multi-work-type locally
      const filtered2 =
        selectedWorkTypeIds.length > 1
          ? filtered.filter((a) => selectedWorkTypeIds.includes(String(a.work_type_id)))
          : filtered
      setData(filtered2)
      setTotal(results.reduce((s, r) => s + (r.total ?? 0), 0))
    } catch {
      setIsError(true)
    } finally {
      setIsLoading(false)
    }
  }, [
    tabParam,
    selectedStoreIds,
    selectedWorkTypeIds,
    dateFromParam,
    dateToParam,
    sourceParam,
    unassignedParam,
    pageParam,
  ])

  React.useEffect(() => {
    void fetchData()
  }, [fetchData])

  // ── Tab counts ──────────────────────────────────────────────────
  React.useEffect(() => {
    const tabKeys = Object.keys(TAB_STATUS_MAP)
    Promise.all(
      tabKeys.map(async (key) => {
        const statuses = TAB_STATUS_MAP[key]
        const counts = await Promise.all(
          statuses.map((s) => getFreelanceApplications({ status: s, page_size: 1 }))
        )
        return { key, count: counts.reduce((sum, r) => sum + (r.total ?? 0), 0) }
      })
    ).then((results) => {
      const map: Record<string, number> = {}
      for (const { key, count } of results) map[key] = count
      setTabCounts(map)
    })
  }, [])

  // ── Cancel handler ──────────────────────────────────────────────
  async function handleCancel() {
    if (!cancelId) return
    setIsCancelling(true)
    try {
      const result = await cancelApplication(cancelId, "Отменено пользователем")
      if (result.success) {
        toast.success("Заявка отменена")
        void fetchData()
      } else {
        toast.error(result.error?.message ?? "Ошибка при отмене")
      }
    } finally {
      setIsCancelling(false)
      setCancelId(null)
    }
  }

  // ── Row navigation ──────────────────────────────────────────────
  function handleRowClick(row: FreelanceApplication, e: React.MouseEvent) {
    const url = ADMIN_ROUTES.freelanceApplicationDetail(row.id)
    if (e.ctrlKey || e.metaKey) {
      window.open(url, "_blank", "noreferrer")
    } else {
      router.push(url)
    }
  }

  // ── Active filter count ─────────────────────────────────────────
  const activeFilterCount =
    selectedStoreIds.length +
    selectedWorkTypeIds.length +
    (dateFromParam ? 1 : 0) +
    (dateToParam ? 1 : 0) +
    (sourceParam ? 1 : 0) +
    (unassignedParam ? 1 : 0)

  function clearAllFilters() {
    setSelectedStoreIds([])
    setSelectedWorkTypeIds([])
    void setDateFromParam(null)
    void setDateToParam(null)
    void setSourceParam(null)
    void setUnassignedParam(null)
    void setPageParam(null)
  }

  // ── Column definitions ──────────────────────────────────────────
  const columns = React.useMemo<ColumnDef<FreelanceApplication>[]>(
    () => [
      {
        id: "source",
        header: "Источник",
        size: 90,
        cell: ({ row }) => {
          const app = row.original
          if (app.source === "EXTERNAL") {
            return (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge className="bg-info/10 text-info border-info/20 cursor-default">
                      Внешн.
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>Из HR-системы клиента</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )
          }
          return (
            <Badge variant="secondary" className="text-muted-foreground">
              Внутр.
            </Badge>
          )
        },
      },
      {
        id: "store",
        header: "Объект",
        cell: ({ row }) => {
          const app = row.original
          return (
            <div className="min-w-0">
              <p className="text-sm font-medium truncate leading-tight">{app.store_name}</p>
            </div>
          )
        },
      },
      {
        id: "planned_date",
        header: "Дата выхода",
        size: 120,
        cell: ({ row }) => {
          const app = row.original
          const dateLabel = formatPlannedDate(app.planned_date, locale)
          const isDateUrgent = app.urgent || isUrgentDate(app.planned_date)
          return (
            <div className="flex items-center gap-1.5">
              <Calendar
                className={cn(
                  "size-3.5 shrink-0",
                  isDateUrgent ? "text-destructive" : "text-muted-foreground"
                )}
                aria-hidden="true"
              />
              <span
                className={cn(
                  "text-sm",
                  isDateUrgent ? "text-destructive font-medium" : "text-foreground"
                )}
              >
                {dateLabel}
              </span>
            </div>
          )
        },
      },
      {
        id: "hours",
        header: "Часы",
        size: 80,
        cell: ({ row }) => {
          const app = row.original
          return (
            <span className="text-sm tabular-nums">
              {app.requested_hours}
              {app.approved_hours != null && app.approved_hours !== app.requested_hours
                ? ` / ${app.approved_hours}`
                : ""}
            </span>
          )
        },
      },
      {
        id: "work_type",
        header: "Тип работ",
        cell: ({ row }) => (
          <Badge variant="secondary" className="font-normal">
            {row.original.work_type_name}
          </Badge>
        ),
      },
      {
        id: "creator",
        header: "Создал",
        cell: ({ row }) => {
          const app = row.original
          return (
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm truncate">{app.created_by_name}</span>
              <RoleBadge role={app.created_by_role} size="sm" />
            </div>
          )
        },
      },
      {
        id: "created_at",
        header: "Создано",
        size: 110,
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatRelativeTime(row.original.created_at, locale)}
          </span>
        ),
      },
      {
        id: "status",
        header: "Статус",
        cell: ({ row }) => {
          const app = row.original
          return (
            <ApplicationStatusBadge
              status={app.status}
              urgent={app.urgent}
              retroactive={app.retroactive}
            />
          )
        },
      },
      {
        id: "actions",
        header: "",
        size: 40,
        cell: ({ row }) => {
          const app = row.original
          const canCancel =
            (app.status === "PENDING" || app.status === "DRAFT") &&
            app.created_by === user.id

          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  aria-label="Действия"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="size-4" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem
                  onSelect={() =>
                    router.push(ADMIN_ROUTES.freelanceApplicationDetail(app.id))
                  }
                >
                  <ExternalLink className="size-4 mr-2" />
                  Открыть
                </DropdownMenuItem>
                {canCancel && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onSelect={() => setCancelId(app.id)}
                    >
                      <X className="size-4 mr-2" />
                      Отменить
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [locale, user.id]
  )

  // ── Mobile card renderer ────────────────────────────────────────
  function mobileCardRender(app: FreelanceApplication) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{app.store_name}</p>
            <p className="text-xs text-muted-foreground truncate">
              {formatPlannedDate(app.planned_date, locale)} · {app.requested_hours}ч
              {app.approved_hours != null && app.approved_hours !== app.requested_hours
                ? `/${app.approved_hours}ч`
                : ""}
            </p>
          </div>
          {app.source === "EXTERNAL" ? (
            <Badge className="bg-info/10 text-info border-info/20 shrink-0">Внешн.</Badge>
          ) : (
            <Badge variant="secondary" className="text-muted-foreground shrink-0">Внутр.</Badge>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className="font-normal text-xs">
            {app.work_type_name}
          </Badge>
          <span className="text-xs text-muted-foreground">{app.created_by_name}</span>
        </div>
        <div className="pt-0.5">
          <ApplicationStatusBadge
            status={app.status}
            urgent={app.urgent}
            retroactive={app.retroactive}
          />
        </div>
      </div>
    )
  }

  // ── Tab list ────────────────────────────────────────────────────
  const TAB_LABELS: Record<string, string> = {
    pending:  "На согласовании",
    approved: "Согласованы",
    rejected: "Отклонены",
    bonus:    "Заменены бонусом",
    archive:  "Архив",
  }

  // ── Source filter options ───────────────────────────────────────
  const sourceOptions = [
    { value: "INTERNAL", label: "Внутренние" },
    { value: "EXTERNAL", label: "Внешние" },
  ]

  // ── Empty state logic ───────────────────────────────────────────
  const hasFilters = activeFilterCount > 0
  const isEmpty = !isLoading && !isError && data.length === 0

  // ── Active filter chips ─────────────────────────────────────────
  const filterChips: { label: string; value: string; onRemove: () => void }[] = []

  for (const id of selectedStoreIds) {
    const name = STORE_OPTIONS.find((s) => s.id === id)?.name ?? id
    filterChips.push({
      label: "Объект",
      value: name,
      onRemove: () => setSelectedStoreIds((prev) => prev.filter((v) => v !== id)),
    })
  }
  for (const id of selectedWorkTypeIds) {
    const name = WORK_TYPE_OPTIONS.find((w) => w.id === id)?.name ?? id
    filterChips.push({
      label: "Тип работ",
      value: name,
      onRemove: () => setSelectedWorkTypeIds((prev) => prev.filter((v) => v !== id)),
    })
  }
  if (dateFromParam) {
    filterChips.push({
      label: "Дата от",
      value: dateFromParam,
      onRemove: () => void setDateFromParam(null),
    })
  }
  if (dateToParam) {
    filterChips.push({
      label: "Дата до",
      value: dateToParam,
      onRemove: () => void setDateToParam(null),
    })
  }
  if (sourceParam) {
    filterChips.push({
      label: "Источник",
      value: sourceOptions.find((s) => s.value === sourceParam)?.label ?? sourceParam,
      onRemove: () => void setSourceParam(null),
    })
  }
  if (unassignedParam) {
    filterChips.push({
      label: "Фильтр",
      value: "Требуют назначения",
      onRemove: () => void setUnassignedParam(null),
    })
  }

  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────

  const filterRowContent = (
    <>
      <MultiSelectCombobox
        options={STORE_OPTIONS.map((s) => ({ value: s.id, label: s.name }))}
        selected={selectedStoreIds}
        onSelectionChange={(v) => { setSelectedStoreIds(v); void setPageParam(null) }}
        placeholder="Объект"
      />
      <MultiSelectCombobox
        options={WORK_TYPE_OPTIONS.map((w) => ({ value: w.id, label: w.name }))}
        selected={selectedWorkTypeIds}
        onSelectionChange={(v) => { setSelectedWorkTypeIds(v); void setPageParam(null) }}
        placeholder="Тип работ"
      />
      <DateRangePicker
        from={dateFromParam}
        to={dateToParam}
        onFromChange={(v) => { void setDateFromParam(v || null); void setPageParam(null) }}
        onToChange={(v) => { void setDateToParam(v || null); void setPageParam(null) }}
        placeholder="Дата выхода"
      />
      {externalHrEnabled && (
        <SingleSelectCombobox
          options={sourceOptions}
          value={sourceParam}
          onValueChange={(v) => { void setSourceParam(v || null); void setPageParam(null) }}
          placeholder="Источник"
        />
      )}
    </>
  )

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-6">
        {/* Page header */}
        <PageHeader
          title={t("page_title")}
          breadcrumbs={[
            { label: t("breadcrumbs.home"), href: ADMIN_ROUTES.dashboard },
            { label: t("breadcrumbs.freelance"), href: ADMIN_ROUTES.freelanceDashboard },
            { label: t("breadcrumbs.applications") },
          ]}
          actions={
            canCreateApplication ? (
              <Button asChild size="sm">
                <Link href={ADMIN_ROUTES.freelanceApplicationNew}>
                  <Plus className="size-4 mr-1.5" aria-hidden="true" />
                  {t("actions.new")}
                </Link>
              </Button>
            ) : undefined
          }
        />

        {/* Tabs */}
        <div className="flex flex-col gap-3">
          {/* Desktop tabs */}
          <ScrollArea className="hidden md:block w-full">
            <Tabs
              value={tabParam}
              onValueChange={(v) => { void setTabParam(v); void setPageParam(null) }}
            >
              <TabsList className="h-9">
                {Object.keys(TAB_STATUS_MAP).map((key) => (
                  <TabsTrigger key={key} value={key} className="text-xs gap-1.5">
                    {TAB_LABELS[key]}
                    {tabCounts[key] != null && tabCounts[key] > 0 && (
                      <Badge
                        variant="secondary"
                        className="h-4 min-w-4 px-1 text-[10px] rounded-full"
                      >
                        {tabCounts[key]}
                      </Badge>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>

          {/* Mobile: tab as combobox */}
          <div className="md:hidden">
            <SingleSelectCombobox
              options={Object.keys(TAB_STATUS_MAP).map((key) => ({
                value: key,
                label: TAB_LABELS[key] + (tabCounts[key] ? ` (${tabCounts[key]})` : ""),
              }))}
              value={tabParam}
              onValueChange={(v) => { void setTabParam(v || "pending"); void setPageParam(null) }}
              placeholder="Выберите вкладку"
              className="w-full sticky top-0 z-10"
            />
          </div>

          {/* Filter row — desktop */}
          <div className="hidden md:flex items-center gap-2 flex-wrap">
            {filterRowContent}

            {/* Unassigned toggle chip */}
            <Button
              variant={unassignedParam ? "default" : "outline"}
              size="sm"
              className={cn(
                "h-9 gap-1.5 text-sm font-normal",
                unassignedParam && "bg-primary text-primary-foreground"
              )}
              onClick={() => { void setUnassignedParam(unassignedParam ? null : true); void setPageParam(null) }}
              aria-pressed={unassignedParam}
            >
              {unassignedParam
                ? <ToggleRight className="size-4 shrink-0" />
                : <ToggleLeft className="size-4 shrink-0" />}
              Требуют назначения
            </Button>
          </div>

          {/* Mobile filter sheet */}
          <MobileFilterSheet
            activeCount={activeFilterCount}
            onClearAll={clearAllFilters}
            onApply={() => {}}
          >
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Объект</label>
                <MultiSelectCombobox
                  options={STORE_OPTIONS.map((s) => ({ value: s.id, label: s.name }))}
                  selected={selectedStoreIds}
                  onSelectionChange={(v) => { setSelectedStoreIds(v); void setPageParam(null) }}
                  placeholder="Выберите объект"
                  className="w-full"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Тип работ</label>
                <MultiSelectCombobox
                  options={WORK_TYPE_OPTIONS.map((w) => ({ value: w.id, label: w.name }))}
                  selected={selectedWorkTypeIds}
                  onSelectionChange={(v) => { setSelectedWorkTypeIds(v); void setPageParam(null) }}
                  placeholder="Выберите тип"
                  className="w-full"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Дата выхода</label>
                <DateRangePicker
                  from={dateFromParam}
                  to={dateToParam}
                  onFromChange={(v) => { void setDateFromParam(v || null); void setPageParam(null) }}
                  onToChange={(v) => { void setDateToParam(v || null); void setPageParam(null) }}
                  placeholder="Период"
                />
              </div>
              {externalHrEnabled && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Источник</label>
                  <SingleSelectCombobox
                    options={sourceOptions}
                    value={sourceParam}
                    onValueChange={(v) => { void setSourceParam(v || null); void setPageParam(null) }}
                    placeholder="Все источники"
                    className="w-full"
                  />
                </div>
              )}
              <div className="flex items-center gap-2 pt-1">
                <Button
                  variant={unassignedParam ? "default" : "outline"}
                  size="sm"
                  className="w-full h-11 gap-2"
                  onClick={() => { void setUnassignedParam(unassignedParam ? null : true) }}
                >
                  {unassignedParam
                    ? <ToggleRight className="size-4" />
                    : <ToggleLeft className="size-4" />}
                  Требуют назначения
                </Button>
              </div>
            </div>
          </MobileFilterSheet>

          {/* Active filter chips */}
          {filterChips.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {filterChips.map((chip, i) => (
                <FilterChip
                  key={i}
                  label={chip.label}
                  value={chip.value}
                  onRemove={chip.onRemove}
                />
              ))}
              <button
                type="button"
                onClick={clearAllFilters}
                className="text-xs text-muted-foreground hover:text-foreground underline transition-colors"
              >
                {tCommon("clearAll")}
              </button>
            </div>
          )}
        </div>

        {/* Table area */}
        {isLoading ? (
          <TableSkeleton />
        ) : isError ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <ServerCrash className="size-10 text-muted-foreground" aria-hidden="true" />
            <div>
              <p className="font-medium">Произошла ошибка при загрузке</p>
              <p className="text-sm text-muted-foreground">Попробуйте обновить данные</p>
            </div>
            <Button variant="outline" onClick={() => void fetchData()} className="gap-2">
              <RefreshCw className="size-4" aria-hidden="true" />
              {tCommon("retry")}
            </Button>
          </div>
        ) : isEmpty ? (
          hasFilters ? (
            <EmptyState
              icon={X}
              title="По заданным фильтрам ничего не найдено"
              description="Попробуйте изменить или сбросить фильтры"
              action={{ label: "Сбросить фильтры", onClick: clearAllFilters }}
            />
          ) : (
            <EmptyState
              icon={Plus}
              title={t("empty.no_applications")}
              description="Здесь будут отображаться заявки на внештатных сотрудников"
              action={
                canCreateApplication
                  ? { label: t("actions.new"), href: ADMIN_ROUTES.freelanceApplicationNew, icon: Plus }
                  : undefined
              }
            />
          )
        ) : (
          <ResponsiveDataTable
            columns={columns}
            data={data}
            mobileCardRender={mobileCardRender}
            isLoading={false}
            onRowClick={handleRowClick}
            pagination={{
              page: pageParam,
              pageSize: 20,
              total,
              onPageChange: (p) => void setPageParam(p),
            }}
          />
        )}

        {/* Cancel confirm dialog */}
        <AlertDialog open={cancelId !== null} onOpenChange={(open) => { if (!open) setCancelId(null) }}>
          <ConfirmDialog
            title="Отменить заявку?"
            message="Заявка будет переведена в статус «Отменена». Действие нельзя отменить."
            confirmLabel="Отменить заявку"
            variant="destructive"
            onConfirm={handleCancel}
            onOpenChange={(open) => { if (!open) setCancelId(null) }}
          />
        </AlertDialog>
      </div>
    </TooltipProvider>
  )
}
