"use client"

import * as React from "react"
import { useRouter } from "@/i18n/navigation"
import { useTranslations, useLocale } from "next-intl"
import { useSearchParams, usePathname } from "next/navigation"
import {
  type ColumnDef,
} from "@tanstack/react-table"
import {
  Plus,
  Download,
  Sparkles,
  Shield,
  MoreVertical,
  RotateCcw,
  ChevronUp,
} from "lucide-react"

import type { TaskState, TaskReviewState, ArchiveReason } from "@/lib/types"
import type { TaskWithAvatar } from "@/lib/api/tasks"
import {
  getTasks,
  getTaskTabCounts,
  getTaskListFilterOptions,
  bulkArchiveTasks,
  bulkAssignTasks,
  type TaskTabCounts,
  type TaskFiltersResponse,
} from "@/lib/api/tasks"
import { getStores } from "@/lib/api/stores"
import Link from "next/link"
import { ADMIN_ROUTES } from "@/lib/constants/routes"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
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
import { format } from "date-fns"
import { ChevronsUpDown, Check } from "lucide-react"
import { cn } from "@/lib/utils"

import { PageHeader } from "@/components/shared/page-header"
import { FilterChip } from "@/components/shared/filter-chip"
import { TaskStateBadge } from "@/components/shared/task-state-badge"
import { ReviewStateBadge } from "@/components/shared/review-state-badge"
import { UserCell } from "@/components/shared/user-cell"
import { ResponsiveDataTable } from "@/components/shared/responsive-data-table"
import { MobileFilterSheet } from "@/components/shared/mobile-filter-sheet"
import { DateRangePicker } from "@/components/shared/date-range-picker"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type TabKey = "all" | "active" | "on_review" | "completed" | "rejected" | "archive"

const ARCHIVE_REASONS: ArchiveReason[] = ["CLOSED", "DUPLICATE", "WRONG_DATA", "OBSOLETE", "OTHER"]

const PAGE_SIZE = 25

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatRelativeDate(dateStr: string, locale: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffH = Math.floor(diffMs / 3600000)
  const diffD = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return locale === "ru" ? "только что" : "just now"
  if (diffMin < 60) return locale === "ru" ? `${diffMin} мин назад` : `${diffMin}m ago`
  if (diffH < 24) return locale === "ru" ? `${diffH} ч назад` : `${diffH}h ago`
  if (diffD < 7) {
    const dateOpts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }
    return new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-GB", dateOpts).format(date)
  }
  return new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-GB", {
    day: "numeric", month: "short", year: "numeric"
  }).format(date)
}

function tabToFilters(tab: TabKey): { state?: TaskState; review_state?: TaskReviewState; archived?: boolean } {
  switch (tab) {
    case "active":    return { state: undefined, review_state: undefined, archived: false }
    case "on_review": return { review_state: "ON_REVIEW", archived: false }
    case "completed": return { state: "COMPLETED", archived: false }
    case "rejected":  return { review_state: "REJECTED", archived: false }
    case "archive":   return { archived: true }
    default:          return { archived: false }
  }
}

// Active tab from URL helper
function stateToActiveFilter(tab: TabKey): { states: TaskState[] } {
  if (tab === "active") return { states: ["NEW", "IN_PROGRESS", "PAUSED"] }
  return { states: [] }
}

// ─────────────────────────────────────────────────────────────────────────────
// Multi-select Combobox
// ─────────────────────────────────────────────────────────────────────────────

interface MultiComboboxProps {
  options: { value: string; label: string }[]
  value: string[]
  onChange: (values: string[]) => void
  placeholder: string
  className?: string
}

function MultiCombobox({ options, value, onChange, placeholder, className }: MultiComboboxProps) {
  const [open, setOpen] = React.useState(false)

  const selectedLabels = options
    .filter((o) => value.includes(o.value))
    .map((o) => o.label)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className={cn("w-full justify-between font-normal truncate h-9", className)}
        >
          <span className="truncate text-left">
            {selectedLabels.length > 0
              ? selectedLabels.length === 1
                ? selectedLabels[0]
                : `${selectedLabels.length} выбрано`
              : <span className="text-muted-foreground">{placeholder}</span>
            }
          </span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Поиск..." />
          <CommandList className="max-h-52">
            <CommandEmpty>Не найдено</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={opt.label}
                  onSelect={() => {
                    const next = value.includes(opt.value)
                      ? value.filter((v) => v !== opt.value)
                      : [...value, opt.value]
                    onChange(next)
                  }}
                >
                  <Check className={cn("mr-2 size-4", value.includes(opt.value) ? "opacity-100" : "opacity-0")} />
                  {opt.label}
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
// Source Badge
// ─────────────────────────────────────────────────────────────────────────────

interface SourceBadgeProps {
  task: TaskWithAvatar
  onAiClick?: (suggestionId: string) => void
}

function SourceBadge({ task, onAiClick }: SourceBadgeProps) {
  if (task.source === "AI") {
    return (
      <Badge
        className="bg-primary/10 text-primary border-primary/20 gap-1 cursor-pointer hover:bg-primary/20 transition-colors"
        onClick={() => task.ai_suggestion_id && onAiClick?.(task.ai_suggestion_id)}
        role="button"
        tabIndex={0}
      >
        <Sparkles className="size-3" />
        ИИ
      </Badge>
    )
  }
  if (task.source === "PLANNED") {
    return <Badge className="bg-info/10 text-info border-info/20">Плановая</Badge>
  }
  return <Badge variant="secondary">Менеджер</Badge>
}

// ─────────────────────────────────────────────────────────────────────────────
// Bulk Action Bar
// ─────────────────────────────────────────────────────────────────────────────

interface BulkBarProps {
  count: number
  onReassign: () => void
  onArchive: () => void
  onClear: () => void
  isArchiveTab: boolean
}

function BulkActionBar({ count, onReassign, onArchive, onClear, isArchiveTab }: BulkBarProps) {
  const t = useTranslations("screen.tasks.bulk")

  return (
    <div className="sticky top-0 z-20 bg-primary/5 border border-primary/20 rounded-lg px-4 py-3 flex flex-wrap items-center gap-3 md:gap-4">
      <span className="text-sm font-medium text-foreground shrink-0">
        {t("selected", { count })}
      </span>

      {/* Desktop: all buttons inline */}
      <div className="hidden sm:flex items-center gap-2 flex-wrap">
        {!isArchiveTab && (
          <>
            <Button size="sm" variant="outline" onClick={onReassign}>{t("reassign")}</Button>
            <Button size="sm" variant="outline" onClick={onArchive}>{t("archive")}</Button>
          </>
        )}
        {isArchiveTab && (
          <Button size="sm" variant="outline" onClick={onReassign}>{t("reassign")}</Button>
        )}
        <Button size="sm" variant="ghost" onClick={onClear}>{t("clear")}</Button>
      </div>

      {/* Mobile: actions dropdown + clear */}
      <div className="flex sm:hidden items-center gap-2 ml-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline">
              Действия <ChevronUp className="ml-1 size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {!isArchiveTab && (
              <>
                <DropdownMenuItem onClick={onReassign}>{t("reassign")}</DropdownMenuItem>
                <DropdownMenuItem onClick={onArchive}>{t("archive")}</DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button size="sm" variant="ghost" onClick={onClear}>{t("clear")}</Button>
      </div>

      {!isArchiveTab && (
        <p className="text-xs text-muted-foreground w-full sm:w-auto sm:ml-auto">
          {t("archive_hint")}
        </p>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export function TasksList() {
  const t = useTranslations("screen.tasks")
  const tBulk = useTranslations("screen.tasks.bulk")
  const tCommon = useTranslations("common")
  const tArchive = useTranslations("task.archive_reason")
  const locale = useLocale()
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()

  // ── URL state ──────────────────────────────────────────────────────────────
  const activeTab = (searchParams.get("tab") as TabKey) ?? "all"
  const urlPage = parseInt(searchParams.get("page") ?? "1", 10)

  const updateUrl = React.useCallback((updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([key, val]) => {
      if (val === null || val === "") {
        params.delete(key)
      } else {
        params.set(key, val)
      }
    })
    // Reset page on filter changes
    if (!("page" in updates)) params.delete("page")
    router.replace(`${pathname}?${params.toString()}`)
  }, [searchParams, pathname, router])

  // ── Local filter state ─────────────────────────────────────────────────────
  const [search, setSearch] = React.useState("")
  const [selectedStores, setSelectedStores] = React.useState<string[]>([])
  const [selectedZones, setSelectedZones] = React.useState<string[]>([])
  const [selectedWorkTypes, setSelectedWorkTypes] = React.useState<string[]>([])
  const [selectedCategories, setSelectedCategories] = React.useState<string[]>([])
  const [selectedAssignees, setSelectedAssignees] = React.useState<string[]>([])
  const [dateFrom, setDateFrom] = React.useState<Date | undefined>()
  const [dateTo, setDateTo] = React.useState<Date | undefined>()

  // ── Data state ─────────────────────────────────────────────────────────────
  const [data, setData] = React.useState<TaskWithAvatar[]>([])
  const [total, setTotal] = React.useState(0)
  const [page, setPage] = React.useState(urlPage)
  const [tabCounts, setTabCounts] = React.useState<TaskTabCounts | null>(null)
  const [filterOptions, setFilterOptions] = React.useState<TaskFiltersResponse | null>(null)
  const [storeOptions, setStoreOptions] = React.useState<{ value: string; label: string }[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isError, setIsError] = React.useState(false)

  // ── Selection state ────────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())

  // ── Dialog state ───────────────────────────────────────────────────────────
  const [showReassignDialog, setShowReassignDialog] = React.useState(false)
  const [showArchiveDialog, setShowArchiveDialog] = React.useState(false)
  const [archiveReason, setArchiveReason] = React.useState<ArchiveReason>("CLOSED")
  const [reassignAssigneeId, setReassignAssigneeId] = React.useState<string>("")
  const [isBulkLoading, setIsBulkLoading] = React.useState(false)

  const isArchiveTab = activeTab === "archive"
  const hasFilters = search || selectedStores.length || selectedZones.length ||
    selectedWorkTypes.length || selectedCategories.length || selectedAssignees.length ||
    dateFrom || dateTo

  const activeFilterCount = [
    search ? 1 : 0,
    selectedStores.length,
    selectedZones.length,
    selectedWorkTypes.length,
    selectedCategories.length,
    selectedAssignees.length,
    dateFrom || dateTo ? 1 : 0,
  ].reduce((a, b) => a + b, 0)

  // ── Load filter options + tab counts + stores ─────────────────────────────
  React.useEffect(() => {
    getTaskListFilterOptions().then((res) => setFilterOptions(res))
    getTaskTabCounts().then(setTabCounts)
    getStores({ active: true, page: 1, page_size: 100 }).then((res) =>
      setStoreOptions(res.data.map((s) => ({ value: String(s.id), label: s.name })))
    )
  }, [])

  // ── Load tasks data ────────────────────────────────────────────────────────
  React.useEffect(() => {
    setIsLoading(true)
    setIsError(false)
    setSelectedIds(new Set())

    const tabFilters = tabToFilters(activeTab)
    const activeStates = stateToActiveFilter(activeTab).states

    getTasks({
      search: search || undefined,
      ...(activeTab === "active"
        ? {}
        : {
            state: tabFilters.state,
            review_state: tabFilters.review_state,
          }),
      archived: tabFilters.archived,
      store_ids: selectedStores.length ? selectedStores.map(Number) : undefined,
      zone_ids: selectedZones.length ? selectedZones.map(Number) : undefined,
      work_type_ids: selectedWorkTypes.length ? selectedWorkTypes.map(Number) : undefined,
      assignee_ids: selectedAssignees.length ? selectedAssignees.map(Number) : undefined,
      category_id: selectedCategories.length ? Number(selectedCategories[0]) : undefined,
      date_from: dateFrom ? dateFrom.toISOString() : undefined,
      date_to: dateTo ? dateTo.toISOString() : undefined,
      page,
      page_size: PAGE_SIZE,
      sort_by: "created_at",
      sort_dir: "desc",
    })
      .then((res) => {
        // For "active" tab filter client-side by states
        let filtered = res.data
        if (activeTab === "active" && activeStates.length) {
          filtered = filtered.filter((t) => activeStates.includes(t.state))
        }
        setData(filtered)
        setTotal(activeTab === "active" ? res.total : res.total)
        setIsLoading(false)
      })
      .catch(() => {
        setIsError(true)
        setIsLoading(false)
      })
  }, [activeTab, search, selectedStores, selectedZones, selectedWorkTypes,
      selectedCategories, selectedAssignees, dateFrom, dateTo, page])

  // ── Clear all filters ──────────────────────────────────────────────────────
  const clearAllFilters = () => {
    setSearch("")
    setSelectedStores([])
    setSelectedZones([])
    setSelectedWorkTypes([])
    setSelectedCategories([])
    setSelectedAssignees([])
    setDateFrom(undefined)
    setDateTo(undefined)
  }

  // ── Selection handlers ─────────────────────────────────────────────────────
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === data.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(data.map((t) => t.id)))
    }
  }

  // ── Row click ──────────────────────────────────────────────────────────────
  const handleRowClick = (task: TaskWithAvatar, e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey) {
      return
    }
    router.push(ADMIN_ROUTES.taskDetail(task.id) as Parameters<typeof router.push>[0])
  }

  // ── Bulk actions ───────────────────────────────────────────────────────────
  const handleBulkArchive = async () => {
    setIsBulkLoading(true)
    await bulkArchiveTasks([...selectedIds], archiveReason)
    setIsBulkLoading(false)
    setShowArchiveDialog(false)
    setSelectedIds(new Set())
    getTaskTabCounts().then(setTabCounts)
  }

  const handleBulkReassign = async () => {
    if (!reassignAssigneeId) return
    setIsBulkLoading(true)
    await bulkAssignTasks([...selectedIds], Number(reassignAssigneeId))
    setIsBulkLoading(false)
    setShowReassignDialog(false)
    setSelectedIds(new Set())
  }

  // ── Filter options derived ─────────────────────────────────────────────────
  const zones = filterOptions?.zones ?? []
  const workTypes = filterOptions?.work_types ?? []
  const productCategories = filterOptions?.product_categories ?? []
  const assignees = filterOptions?.assignees ?? []

  const zoneOptions = zones.map((z) => ({ value: String(z.id), label: z.name }))
  const workTypeOptions = workTypes.map((wt) => ({ value: String(wt.id), label: wt.name }))
  const categoryOptions = productCategories.map((c) => ({ value: String(c.id), label: c.name }))
  const assigneeOptions = assignees.map((u) => ({
    value: String(u.id),
    label: `${u.last_name} ${u.first_name}`,
  }))

  // ── Active filter chips ────────────────────────────────────────────────────
  const activeChips: Array<{ label: string; value: string; onRemove: () => void }> = [
    ...selectedStores.map((id) => ({
      label: t("filters.store"),
      value: storeOptions.find((s) => s.value === id)?.label ?? id,
      onRemove: () => setSelectedStores((p) => p.filter((v) => v !== id)),
    })),
    ...selectedZones.map((id) => ({
      label: t("filters.zone"),
      value: zoneOptions.find((z) => z.value === id)?.label ?? id,
      onRemove: () => setSelectedZones((p) => p.filter((v) => v !== id)),
    })),
    ...selectedWorkTypes.map((id) => ({
      label: t("filters.work_type"),
      value: workTypeOptions.find((w) => w.value === id)?.label ?? id,
      onRemove: () => setSelectedWorkTypes((p) => p.filter((v) => v !== id)),
    })),
    ...selectedCategories.map((id) => ({
      label: t("filters.product_category"),
      value: categoryOptions.find((c) => c.value === id)?.label ?? id,
      onRemove: () => setSelectedCategories((p) => p.filter((v) => v !== id)),
    })),
    ...selectedAssignees.map((id) => ({
      label: t("filters.assignee"),
      value: assigneeOptions.find((a) => a.value === id)?.label ?? id,
      onRemove: () => setSelectedAssignees((p) => p.filter((v) => v !== id)),
    })),
    ...(dateFrom || dateTo
      ? [{
          label: t("filters.date_range"),
          value: [dateFrom && format(dateFrom, "dd.MM.yy"), dateTo && format(dateTo, "dd.MM.yy")]
            .filter(Boolean).join(" – "),
          onRemove: () => { setDateFrom(undefined); setDateTo(undefined) },
        }]
      : []),
  ]

  // ── Desktop table columns ──────────────────────────────────────────────────
  const columns: ColumnDef<TaskWithAvatar>[] = [
    {
      id: "select",
      header: () => (
        <Checkbox
          checked={data.length > 0 && selectedIds.size === data.length}
          onCheckedChange={toggleSelectAll}
          aria-label="Выбрать все"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={selectedIds.has(row.original.id)}
          onCheckedChange={() => toggleSelect(row.original.id)}
          aria-label={`Выбрать задачу ${row.original.title}`}
          onClick={(e) => e.stopPropagation()}
        />
      ),
      enableSorting: false,
    },
    {
      accessorKey: "title",
      header: t("table.name"),
      cell: ({ row }) => {
        const task = row.original
        return (
          <div className="flex flex-col gap-0.5 min-w-0 max-w-[260px]">
            <span className="font-medium text-sm text-foreground truncate">{task.title}</span>
            <span className="text-xs text-muted-foreground truncate">
              {task.zone_name} · {task.work_type_name}
            </span>
          </div>
        )
      },
    },
    {
      accessorKey: "store_name",
      header: t("table.store"),
      cell: ({ row }) => (
        <span className="text-sm text-foreground truncate max-w-[160px] block">
          {row.original.store_name}
        </span>
      ),
    },
    {
      id: "assignee",
      header: t("table.assignee"),
      cell: ({ row }) => {
        const task = row.original
        if (task.assignee_id && task.assignee_name) {
          const nameParts = task.assignee_name.split(" ")
          return (
            <UserCell
              user={{
                first_name: nameParts[1] ?? "",
                last_name: nameParts[0] ?? task.assignee_name,
                avatar_url: task.assignee_avatar,
              }}
              className="min-w-[120px]"
            />
          )
        }
        if (task.assigned_to_permission) {
          return (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Shield className="size-3.5 shrink-0" />
              {task.assigned_to_permission}
            </div>
          )
        }
        return <span className="text-sm text-muted-foreground">—</span>
      },
    },
    {
      id: "status",
      header: t("table.status"),
      cell: ({ row }) => {
        const task = row.original
        return (
          <div className="flex items-center gap-1.5 flex-wrap">
            <TaskStateBadge state={task.state} size="sm" />
            {task.review_state !== "NONE" && (
              <ReviewStateBadge reviewState={task.review_state} size="sm" />
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "planned_minutes",
      header: t("table.planned_min"),
      cell: ({ row }) => (
        <span className="tabular-nums text-sm text-right block">{row.original.planned_minutes}</span>
      ),
    },
    {
      accessorKey: "source",
      header: t("table.source"),
      cell: ({ row }) => (
        <SourceBadge
          task={row.original}
          onAiClick={(id) => router.push(`${ADMIN_ROUTES.aiSuggestions}?id=${id}` as Parameters<typeof router.push>[0])}
        />
      ),
      enableSorting: false,
    },
    ...(isArchiveTab
      ? [
          {
            accessorKey: "archive_reason",
            header: t("table.archive_reason"),
            cell: ({ row }: { row: { original: TaskWithAvatar } }) => (
              <span className="text-sm text-muted-foreground">
                {row.original.archive_reason ? tArchive(row.original.archive_reason as Parameters<typeof tArchive>[0]) : "—"}
              </span>
            ),
          } satisfies ColumnDef<TaskWithAvatar>,
        ]
      : []),
    {
      accessorKey: "created_at",
      header: t("table.created_at"),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {formatRelativeDate(row.original.created_at, locale)}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const task = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={(e) => e.stopPropagation()}
                aria-label="Действия"
              >
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push(ADMIN_ROUTES.taskDetail(task.id) as Parameters<typeof router.push>[0])}>
                {t("open")}
              </DropdownMenuItem>
              {!isArchiveTab && (
                <>
                  <DropdownMenuItem>{t("duplicate")}</DropdownMenuItem>
                  <DropdownMenuItem>{t("reassign")}</DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    disabled={task.archived}
                  >
                    {t("archive")}
                  </DropdownMenuItem>
                </>
              )}
              {isArchiveTab && (
                <DropdownMenuItem>{t("restore")}</DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
      enableSorting: false,
    },
  ]

  // ── Mobile card renderer ───────────────────────────────────────────────────
  const mobileCardRender = (task: TaskWithAvatar) => (
    <div className="flex flex-col gap-2 p-3">
      {/* Checkbox + title */}
      <div className="flex items-start gap-2">
        <Checkbox
          checked={selectedIds.has(task.id)}
          onCheckedChange={() => toggleSelect(task.id)}
          onClick={(e) => e.stopPropagation()}
          className="mt-0.5 shrink-0"
        />
        <span className="font-medium text-sm text-foreground line-clamp-2 flex-1">
          {task.title}
        </span>
      </div>
      {/* Badges */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <TaskStateBadge state={task.state} size="sm" />
        {task.review_state !== "NONE" && (
          <ReviewStateBadge reviewState={task.review_state} size="sm" />
        )}
        <SourceBadge task={task} />
      </div>
      {/* Store */}
      <span className="text-xs text-muted-foreground truncate">{task.store_name}</span>
      {/* Assignee + actions row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {task.assignee_id && task.assignee_name ? (
            <UserCell
              user={{
                first_name: task.assignee_name.split(" ")[1] ?? "",
                last_name: task.assignee_name.split(" ")[0] ?? "",
                avatar_url: task.assignee_avatar,
              }}
              className="text-sm"
            />
          ) : task.assigned_to_permission ? (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Shield className="size-3.5" />
              {task.assigned_to_permission}
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-muted-foreground">
            {formatRelativeDate(task.created_at, locale)}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-11"
                onClick={(e) => e.stopPropagation()}
                aria-label="Действия"
              >
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push(ADMIN_ROUTES.taskDetail(task.id) as Parameters<typeof router.push>[0])}>
                {t("open")}
              </DropdownMenuItem>
              {!isArchiveTab && (
                <>
                  <DropdownMenuItem>{t("duplicate")}</DropdownMenuItem>
                  <DropdownMenuItem>{t("reassign")}</DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive" disabled={task.archived}>
                    {t("archive")}
                  </DropdownMenuItem>
                </>
              )}
              {isArchiveTab && <DropdownMenuItem>{t("restore")}</DropdownMenuItem>}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )

  // ── Filter content (shared between desktop row and mobile sheet) ───────────
  const filterContent = (
    <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end">
      {/* Search */}
      <div className="relative flex-1 min-w-[260px] md:basis-[280px]">
        <Input
          placeholder={t("filters.search_placeholder")}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="h-9 pr-8"
        />
      </div>
      {/* Store combobox — all users can see, but meaningful for NETWORK_OPS */}
      <MultiCombobox
        options={storeOptions}
        value={selectedStores}
        onChange={(v) => { setSelectedStores(v); setPage(1) }}
        placeholder={t("filters.store")}
        className="md:w-[180px]"
      />
      <MultiCombobox
        options={zoneOptions}
        value={selectedZones}
        onChange={(v) => { setSelectedZones(v); setPage(1) }}
        placeholder={t("filters.zone")}
        className="md:w-[150px]"
      />
      <MultiCombobox
        options={workTypeOptions}
        value={selectedWorkTypes}
        onChange={(v) => { setSelectedWorkTypes(v); setPage(1) }}
        placeholder={t("filters.work_type")}
        className="md:w-[160px]"
      />
      <MultiCombobox
        options={categoryOptions}
        value={selectedCategories}
        onChange={(v) => { setSelectedCategories(v); setPage(1) }}
        placeholder={t("filters.product_category")}
        className="md:w-[170px]"
      />
      <MultiCombobox
        options={assigneeOptions}
        value={selectedAssignees}
        onChange={(v) => { setSelectedAssignees(v); setPage(1) }}
        placeholder={t("filters.assignee")}
        className="md:w-[170px]"
      />
      <DateRangePicker
        from={dateFrom}
        to={dateTo}
        onChange={(from, to) => { setDateFrom(from); setDateTo(to); setPage(1) }}
        placeholder={t("filters.date_range")}
      />
    </div>
  )

  // ── Pagination ─────────────────────────────────────────────────────────────
  const totalPages = Math.ceil(total / PAGE_SIZE)
  const fromItem = Math.min((page - 1) * PAGE_SIZE + 1, total)
  const toItem = Math.min(page * PAGE_SIZE, total)

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 md:gap-6">
      {/* ── PageHeader ── */}
      <PageHeader
        title={t("title")}
        actions={
          <>
            {/* Desktop actions */}
            <div className="hidden md:flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Download className="size-4 mr-1.5" />
                {t("export_xlsx")}
              </Button>
              <Button size="sm" asChild>
                <Link href={ADMIN_ROUTES.taskNew}>
                  <Plus className="size-4 mr-1.5" />
                  {t("create_task")}
                </Link>
              </Button>
            </div>
            {/* Mobile: ⋮ menu for export, primary for create */}
            <div className="flex md:hidden items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-9">
                    <MoreVertical className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Download className="size-4 mr-2" />
                    {t("export_xlsx")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </>
        }
      />

      {/* Mobile create button */}
      <div className="md:hidden">
        <Button className="w-full h-11" size="default" asChild>
          <Link href={ADMIN_ROUTES.taskNew}>
            <Plus className="size-4 mr-2" />
            {t("create_task")}
          </Link>
        </Button>
      </div>

      {/* ── Tabs ── */}
      <ScrollArea className="w-full" type="scroll">
        <Tabs
          value={activeTab}
          onValueChange={(v) => { updateUrl({ tab: v === "all" ? null : v }); setPage(1); setSelectedIds(new Set()) }}
        >
          <TabsList className="h-9 gap-0.5 bg-muted/50 p-0.5 flex-nowrap w-max">
            {(["all", "active", "on_review", "completed", "rejected", "archive"] as TabKey[]).map((tab) => {
              const count = tabCounts
                ? tab === "all" ? tabCounts.all
                : tab === "active" ? tabCounts.active
                : tab === "on_review" ? tabCounts.on_review
                : tab === "completed" ? tabCounts.completed
                : tab === "rejected" ? tabCounts.rejected
                : tabCounts.archived
                : null

              return (
                <TabsTrigger key={tab} value={tab} className="h-8 px-3 text-sm whitespace-nowrap">
                  {t(`tabs.${tab}`)}
                  {count !== null && (
                    <Badge
                      variant="secondary"
                      className="ml-1.5 h-5 px-1.5 text-xs font-normal"
                    >
                      {count}
                    </Badge>
                  )}
                </TabsTrigger>
              )
            })}
          </TabsList>
        </Tabs>
      </ScrollArea>

      {/* ── Filter row — desktop ── */}
      <div className="hidden md:block bg-card border border-border rounded-lg p-3">
        {filterContent}
      </div>

      {/* ── Filter row — mobile ── */}
      <div className="md:hidden flex flex-col gap-2">
        <div className="flex gap-2">
          <Input
            placeholder={t("filters.search_placeholder")}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="h-11 flex-1"
          />
          <MobileFilterSheet
            activeCount={activeFilterCount - (search ? 1 : 0)}
            onClearAll={clearAllFilters}
            onApply={() => setPage(1)}
          >
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>{t("filters.store")}</Label>
                <MultiCombobox options={storeOptions} value={selectedStores} onChange={setSelectedStores} placeholder={t("filters.store")} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>{t("filters.zone")}</Label>
                <MultiCombobox options={zoneOptions} value={selectedZones} onChange={setSelectedZones} placeholder={t("filters.zone")} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>{t("filters.work_type")}</Label>
                <MultiCombobox options={workTypeOptions} value={selectedWorkTypes} onChange={setSelectedWorkTypes} placeholder={t("filters.work_type")} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>{t("filters.product_category")}</Label>
                <MultiCombobox options={categoryOptions} value={selectedCategories} onChange={setSelectedCategories} placeholder={t("filters.product_category")} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>{t("filters.assignee")}</Label>
                <MultiCombobox options={assigneeOptions} value={selectedAssignees} onChange={setSelectedAssignees} placeholder={t("filters.assignee")} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>{t("filters.date_range")}</Label>
                <DateRangePicker
                  from={dateFrom}
                  to={dateTo}
                  onChange={(from, to) => { setDateFrom(from); setDateTo(to) }}
                  placeholder={t("filters.date_range")}
                />
              </div>
            </div>
          </MobileFilterSheet>
        </div>
      </div>

      {/* ── Active filter chips ── */}
      {activeChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {activeChips.map((chip, i) => (
            <FilterChip key={i} label={chip.label} value={chip.value} onRemove={chip.onRemove} />
          ))}
          <button
            onClick={clearAllFilters}
            className="text-xs text-primary hover:underline"
          >
            {tCommon("clear_all")}
          </button>
        </div>
      )}

      {/* ── Bulk action bar ── */}
      {selectedIds.size > 0 && (
        <BulkActionBar
          count={selectedIds.size}
          onReassign={() => setShowReassignDialog(true)}
          onArchive={() => setShowArchiveDialog(true)}
          onClear={() => setSelectedIds(new Set())}
          isArchiveTab={isArchiveTab}
        />
      )}

      {/* ── Error state ── */}
      {isError && (
        <Alert variant="destructive">
          <AlertDescription className="flex items-center gap-3">
            {t("error_title")}
            <Button size="sm" variant="outline" onClick={() => setIsLoading(true)}>
              <RotateCcw className="size-3.5 mr-1.5" />
              {tCommon("retry")}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* ── Data table ── */}
      {!isError && (
        <ResponsiveDataTable
          columns={columns}
          data={data}
          mobileCardRender={mobileCardRender}
          isLoading={isLoading}
          isEmpty={!isLoading && data.length === 0}
          emptyMessage={
            hasFilters
              ? { title: t("empty_filtered_title"), description: t("empty_filtered_desc") }
              : { title: t("empty_no_tasks_title"), description: t("empty_no_tasks_desc") }
          }
          onRowClick={handleRowClick}
          pagination={{
            page,
            pageSize: PAGE_SIZE,
            total,
            onPageChange: setPage,
          }}
        />
      )}

      {/* ── Pagination footer info ── */}
      {!isLoading && !isError && total > 0 && (
        <div className="hidden md:flex items-center justify-between text-sm text-muted-foreground px-1">
          <span>{t("pagination_info", { from: fromItem, to: toItem, total })}</span>
          <div className="flex items-center gap-2">
            <span>{tCommon("perPage")}: {PAGE_SIZE}</span>
          </div>
        </div>
      )}

      {/* ── Bulk Reassign Dialog ── */}
      <Dialog open={showReassignDialog} onOpenChange={setShowReassignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tBulk("dialog_reassign_title")}</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <MultiCombobox
              options={assigneeOptions}
              value={reassignAssigneeId ? [reassignAssigneeId] : []}
              onChange={(v) => setReassignAssigneeId(v[0] ?? "")}
              placeholder={tBulk("assignee_placeholder")}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReassignDialog(false)}>
              {tCommon("cancel")}
            </Button>
            <Button disabled={!reassignAssigneeId || isBulkLoading} onClick={handleBulkReassign}>
              {isBulkLoading ? tCommon("loading") : tCommon("confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Bulk Archive Dialog ── */}
      <Dialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tBulk("dialog_archive_title")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {tBulk("dialog_archive_desc", { count: selectedIds.size })}
          </p>
          <RadioGroup
            value={archiveReason}
            onValueChange={(v) => setArchiveReason(v as ArchiveReason)}
            className="flex flex-col gap-2 mt-2"
          >
            {ARCHIVE_REASONS.map((reason) => (
              <div key={reason} className="flex items-center gap-2">
                <RadioGroupItem value={reason} id={`archive-reason-${reason}`} />
                <Label htmlFor={`archive-reason-${reason}`} className="font-normal cursor-pointer">
                  {tArchive(reason as Parameters<typeof tArchive>[0])}
                </Label>
              </div>
            ))}
          </RadioGroup>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowArchiveDialog(false)}>
              {tCommon("cancel")}
            </Button>
            <Button variant="destructive" disabled={isBulkLoading} onClick={handleBulkArchive}>
              {isBulkLoading ? tCommon("loading") : tCommon("archive")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
