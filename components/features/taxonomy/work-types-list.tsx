"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import Link from "next/link"
import {
  Plus,
  Download,
  List,
  LayoutGrid,
  Camera,
  FileText,
  MoreVertical,
  Tag,
  SearchX,
  Copy,
  AlertCircle,
  RefreshCw,
} from "lucide-react"
import type { ColumnDef } from "@tanstack/react-table"

import type { WorkType } from "@/lib/types"
import {
  getWorkTypes,
  createWorkType,
  updateWorkType,
  deleteWorkType,
  type WorkTypeWithCount,
} from "@/lib/api/taxonomy"
import { ADMIN_ROUTES } from "@/lib/constants/routes"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent } from "@/components/ui/card"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Dialog } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
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
import { ChevronsUpDown, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

import { PageHeader } from "@/components/shared/page-header"
import { FilterChip } from "@/components/shared/filter-chip"
import { EmptyState } from "@/components/shared/empty-state"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { ResponsiveDataTable } from "@/components/shared/responsive-data-table"
import { MobileFilterSheet } from "@/components/shared/mobile-filter-sheet"
import {
  WorkTypeEditDialogContent,
  WORK_TYPE_GROUPS,
} from "./work-type-edit-dialog-content"

// ── Category color map (badge semantic vars) ──────────────────────
const GROUP_COLORS: Record<string, { bg: string; text: string }> = {
  "Мерчендайзинг": {
    bg: "var(--color-badge-violet-bg-light)",
    text: "var(--color-badge-violet-text-light)",
  },
  "Логистика": {
    bg: "var(--color-badge-blue-bg-light)",
    text: "var(--color-badge-blue-text-light)",
  },
  "Касса": {
    bg: "var(--color-badge-yellow-bg-light)",
    text: "var(--color-badge-yellow-text-light)",
  },
  "Поддержка": {
    bg: "var(--color-badge-pink-bg-light)",
    text: "var(--color-badge-pink-text-light)",
  },
  "Качество": {
    bg: "var(--color-badge-green-bg-light)",
    text: "var(--color-badge-green-text-light)",
  },
  "Управление": {
    bg: "var(--color-badge-orange-bg-light)",
    text: "var(--color-badge-orange-text-light)",
  },
  "Производство": {
    bg: "var(--color-badge-blue-bg-light)",
    text: "var(--color-badge-blue-text-light)",
  },
}

function GroupBadge({ group }: { group: string }) {
  const colors = GROUP_COLORS[group]
  return (
    <Badge
      className="border-transparent text-xs"
      style={
        colors
          ? { backgroundColor: colors.bg, color: colors.text }
          : undefined
      }
    >
      {group}
    </Badge>
  )
}

type ViewMode = "list" | "accordion"

const PAGE_SIZE = 10

// ── Skeleton loader ───────────────────────────────────────────────
function WorkTypesListSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-44" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-80 w-full rounded-lg" />
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────
export function WorkTypesList() {
  const t = useTranslations("screen.workTypes")
  const tCommon = useTranslations("common")

  // ── State ────────────────────────────────────────────────────────
  const [items, setItems] = React.useState<WorkTypeWithCount[]>([])
  const [total, setTotal] = React.useState(0)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isError, setIsError] = React.useState(false)
  const [page, setPage] = React.useState(1)
  const [viewMode, setViewMode] = React.useState<ViewMode>("list")

  // Filters
  const [search, setSearch] = React.useState("")
  const [debouncedSearch, setDebouncedSearch] = React.useState("")
  const [selectedGroups, setSelectedGroups] = React.useState<string[]>([])
  const [requiresPhoto, setRequiresPhoto] = React.useState<
    boolean | undefined
  >(undefined)
  const [groupOpen, setGroupOpen] = React.useState(false)

  // Stats
  const [totalAll, setTotalAll] = React.useState(0)
  const [groupCount, setGroupCount] = React.useState(0)
  const [withoutHints, setWithoutHints] = React.useState(0)

  // Dialog states
  const [editDialogOpen, setEditDialogOpen] = React.useState(false)
  const [editingWorkType, setEditingWorkType] =
    React.useState<WorkTypeWithCount | null>(null)

  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [deletingWorkType, setDeletingWorkType] =
    React.useState<WorkTypeWithCount | null>(null)
  const [deleteError, setDeleteError] = React.useState<string | null>(null)

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  // ── Fetch data ────────────────────────────────────────────────────
  const load = React.useCallback(async () => {
    setIsLoading(true)
    setIsError(false)
    try {
      // Fetch stats from full set
      const [statsRes, listRes] = await Promise.all([
        getWorkTypes({ page: 1, page_size: 999 }),
        getWorkTypes({
          search: debouncedSearch || undefined,
          group: selectedGroups.length === 1 ? selectedGroups[0] : undefined,
          requires_photo: requiresPhoto,
          page,
          page_size: PAGE_SIZE,
          sort_by: "name",
          sort_dir: "asc",
        }),
      ])

      // Compute stats
      const allItems = statsRes.data
      setTotalAll(allItems.length)
      const uniqueGroups = new Set(allItems.map((w) => w.group))
      setGroupCount(uniqueGroups.size)
      setWithoutHints(allItems.filter((w) => w.hints_count === 0).length)

      setItems(listRes.data)
      setTotal(listRes.total ?? 0)
    } catch {
      setIsError(true)
    } finally {
      setIsLoading(false)
    }
  }, [debouncedSearch, selectedGroups, requiresPhoto, page])

  React.useEffect(() => {
    load()
  }, [load])

  // ── Active filter chips ───────────────────────────────────────────
  const activeFilters = React.useMemo(() => {
    const chips: Array<{ key: string; label: string; value: string; onRemove: () => void }> = []
    selectedGroups.forEach((g) =>
      chips.push({
        key: `group-${g}`,
        label: t("filters.group"),
        value: g,
        onRemove: () =>
          setSelectedGroups((prev) => prev.filter((x) => x !== g)),
      })
    )
    if (requiresPhoto !== undefined) {
      chips.push({
        key: "photo",
        label: t("filters.requires_photo"),
        value: requiresPhoto
          ? t("filters.requires_photo_yes")
          : t("filters.requires_photo_no"),
        onRemove: () => setRequiresPhoto(undefined),
      })
    }
    return chips
  }, [selectedGroups, requiresPhoto, t])

  function clearAllFilters() {
    setSelectedGroups([])
    setRequiresPhoto(undefined)
    setSearch("")
  }

  // ── CRUD handlers ─────────────────────────────────────────────────
  function openCreate() {
    setEditingWorkType(null)
    setEditDialogOpen(true)
  }

  function openEdit(wt: WorkTypeWithCount) {
    setEditingWorkType(wt)
    setEditDialogOpen(true)
  }

  async function handleSave(data: Partial<WorkType>) {
    if (editingWorkType) {
      const res = await updateWorkType(editingWorkType.id, data)
      if (res.success) {
        toast.success(t("toasts.updated"))
        load()
      } else {
        toast.error(t("toasts.error"))
        throw new Error(res.error?.message)
      }
    } else {
      const res = await createWorkType(data)
      if (res.success) {
        toast.success(t("toasts.created"))
        load()
      } else {
        toast.error(t("toasts.error"))
        throw new Error(res.error?.message)
      }
    }
  }

  async function handleDuplicate(wt: WorkTypeWithCount) {
    const res = await createWorkType({
      ...wt,
      code: `${wt.code}_COPY`,
      name: `${wt.name} (копия)`,
    })
    if (res.success) {
      toast.success(t("toasts.created"))
      load()
    } else {
      toast.error(t("toasts.error"))
    }
  }

  function openDelete(wt: WorkTypeWithCount) {
    setDeletingWorkType(wt)
    setDeleteError(null)
    setDeleteDialogOpen(true)
  }

  async function handleDelete() {
    if (!deletingWorkType) return
    const res = await deleteWorkType(deletingWorkType.id)
    if (res.success) {
      toast.success(t("toasts.deleted"))
      setDeleteDialogOpen(false)
      load()
    } else if (res.error?.code === "HAS_DEPENDENCIES") {
      const count = deletingWorkType.tasks_count
      setDeleteError(t("toasts.in_use_warning", { count }))
    } else {
      toast.error(t("toasts.error"))
    }
  }

  // ── Columns for DataTable ─────────────────────────────────────────
  const columns: ColumnDef<WorkTypeWithCount>[] = React.useMemo(
    () => [
      {
        id: "code",
        accessorKey: "code",
        header: t("columns.code"),
        enableSorting: true,
        cell: ({ row }) => (
          <span className="font-mono text-xs uppercase tracking-wide bg-muted px-1.5 py-0.5 rounded text-foreground">
            {row.original.code}
          </span>
        ),
      },
      {
        id: "name",
        accessorKey: "name",
        header: t("columns.name"),
        enableSorting: true,
        cell: ({ row }) => (
          <span className="font-medium text-sm">{row.original.name}</span>
        ),
      },
      {
        id: "group",
        accessorKey: "group",
        header: t("columns.group"),
        enableSorting: true,
        cell: ({ row }) => <GroupBadge group={row.original.group} />,
      },
      {
        id: "default_duration_min",
        accessorKey: "default_duration_min",
        header: t("columns.default_duration"),
        enableSorting: true,
        cell: ({ row }) => (
          <span className="tabular-nums text-sm text-right block">
            {row.original.default_duration_min}
          </span>
        ),
      },
      {
        id: "hints_count",
        accessorKey: "hints_count",
        header: t("columns.hints_count"),
        enableSorting: true,
        cell: ({ row }) =>
          row.original.hints_count > 0 ? (
            <Link
              href={`${ADMIN_ROUTES.hints}?work_type_id=${row.original.id}`}
              className="text-primary hover:underline text-sm tabular-nums"
              onClick={(e) => e.stopPropagation()}
            >
              {row.original.hints_count}
            </Link>
          ) : (
            <span className="text-muted-foreground text-sm">—</span>
          ),
      },
      {
        id: "usage_count",
        accessorKey: "usage_count",
        header: t("columns.usage_count"),
        enableSorting: true,
        cell: ({ row }) => {
          const count = row.original.usage_count ?? 0
          return count > 0 ? (
            <Link
              href={`${ADMIN_ROUTES.tasks}?work_type_id=${row.original.id}`}
              className="text-primary hover:underline text-sm tabular-nums"
              onClick={(e) => e.stopPropagation()}
            >
              {count}
            </Link>
          ) : (
            <span className="text-muted-foreground text-sm">0</span>
          )
        },
      },
      {
        id: "requires_photo_default",
        accessorKey: "requires_photo_default",
        header: t("columns.requires_photo"),
        cell: ({ row }) => (
          <Switch
            checked={row.original.requires_photo_default}
            disabled
            aria-label={
              row.original.requires_photo_default ? "Да" : "Нет"
            }
            className="pointer-events-none"
          />
        ),
      },
      {
        id: "requires_report_default",
        accessorKey: "requires_report_default",
        header: t("columns.requires_report"),
        cell: ({ row }) => (
          <Switch
            checked={row.original.requires_report_default}
            disabled
            aria-label={
              row.original.requires_report_default ? "Да" : "Нет"
            }
            className="pointer-events-none"
          />
        ),
      },
      {
        id: "acceptance_policy_default",
        accessorKey: "acceptance_policy_default",
        header: t("columns.acceptance_policy"),
        cell: ({ row }) => (
          <Badge variant="outline" className="text-xs">
            {row.original.acceptance_policy_default === "AUTO"
              ? t("policy.AUTO")
              : t("policy.MANUAL")}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) => {
          const wt = row.original
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  aria-label={tCommon("actions")}
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="size-4" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => openEdit(wt)}>
                  {t("row_actions.edit")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDuplicate(wt)}>
                  <Copy className="size-3.5 mr-2 opacity-60" aria-hidden="true" />
                  {t("row_actions.duplicate")}
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link
                    href={`${ADMIN_ROUTES.hints}?work_type_id=${wt.id}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {t("row_actions.hints")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className={cn(
                    "text-destructive focus:text-destructive",
                    wt.tasks_count > 0 && "opacity-50 pointer-events-none"
                  )}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (wt.tasks_count === 0) openDelete(wt)
                  }}
                  aria-disabled={wt.tasks_count > 0}
                >
                  {t("row_actions.delete")}
                  {wt.tasks_count > 0 && (
                    <span className="ml-auto text-xs text-muted-foreground">
                      ({wt.tasks_count})
                    </span>
                  )}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
      },
    ],
    [t, tCommon] // eslint-disable-line react-hooks/exhaustive-deps
  )

  // ── Accordion view grouped data ───────────────────────────────────
  const groupedItems = React.useMemo(() => {
    const map = new Map<string, WorkTypeWithCount[]>()
    WORK_TYPE_GROUPS.forEach((g) => map.set(g, []))
    items.forEach((wt) => {
      const list = map.get(wt.group)
      if (list) list.push(wt)
      else map.set(wt.group, [wt])
    })
    // Remove empty groups
    return Array.from(map.entries()).filter(([, list]) => list.length > 0)
  }, [items])

  const hasFilters =
    activeFilters.length > 0 || debouncedSearch.length > 0
  const isEmpty = !isLoading && items.length === 0

  if (isLoading && items.length === 0 && !isError) {
    return <WorkTypesListSkeleton />
  }

  // ── Error state ───────────────────────────────────────────────────
  if (isError) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title={t("page_title")}
          breadcrumbs={[
            { label: t("breadcrumbs.home"), href: ADMIN_ROUTES.dashboard },
            { label: t("breadcrumbs.taxonomy") },
            { label: t("breadcrumbs.work_types") },
          ]}
        />
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription className="flex items-center gap-3">
            {tCommon("error")}
            <Button
              size="sm"
              variant="outline"
              onClick={load}
            >
              <RefreshCw className="size-3.5 mr-1.5" aria-hidden="true" />
              {tCommon("retry")}
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <PageHeader
        title={t("page_title")}
        breadcrumbs={[
          { label: t("breadcrumbs.home"), href: ADMIN_ROUTES.dashboard },
          { label: t("breadcrumbs.taxonomy") },
          { label: t("breadcrumbs.work_types") },
        ]}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              className="hidden md:inline-flex"
              aria-label={t("actions.export")}
            >
              <Download className="size-4 mr-2" aria-hidden="true" />
              {t("actions.export")}
            </Button>
            <Button size="sm" onClick={openCreate}>
              <Plus className="size-4 mr-2" aria-hidden="true" />
              <span className="hidden sm:inline">{t("actions.create")}</span>
              <span className="sm:hidden">Добавить</span>
            </Button>
          </>
        }
      />

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="rounded-xl">
          <CardContent className="p-4 flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-md bg-muted">
              <List className="size-4 text-muted-foreground" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Всего типов
              </p>
              <p className="text-2xl font-semibold tracking-tight">
                {isLoading ? <Skeleton className="h-7 w-8 inline-block" /> : totalAll}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl">
          <CardContent className="p-4 flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-md bg-muted">
              <Tag className="size-4 text-muted-foreground" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Категорий
              </p>
              <p className="text-2xl font-semibold tracking-tight">
                {isLoading ? <Skeleton className="h-7 w-8 inline-block" /> : groupCount}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl">
          <CardContent className="p-4 flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-md bg-muted">
              <FileText className="size-4 text-muted-foreground" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Без подсказок
              </p>
              <p
                className={cn(
                  "text-2xl font-semibold tracking-tight",
                  withoutHints > 0 && "text-warning"
                )}
              >
                {isLoading ? <Skeleton className="h-7 w-8 inline-block" /> : withoutHints}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3">
        {/* Row 1: View toggle + Search + Group combobox */}
        <div className="flex flex-col sm:flex-row gap-2">
          {/* View toggle — desktop only */}
          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(v) => {
              if (v) setViewMode(v as ViewMode)
            }}
            variant="outline"
            className="hidden md:flex shrink-0"
            aria-label="Вид"
          >
            <ToggleGroupItem value="list" aria-label="Список">
              <List className="size-4" aria-hidden="true" />
            </ToggleGroupItem>
            <ToggleGroupItem value="accordion" aria-label="По категориям">
              <LayoutGrid className="size-4" aria-hidden="true" />
            </ToggleGroupItem>
          </ToggleGroup>

          {/* Search */}
          <div className="relative flex-1">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("filters.search_placeholder")}
              className="pl-3"
              aria-label={t("filters.search_placeholder")}
            />
          </div>

          {/* Group combobox — desktop */}
          <Popover open={groupOpen} onOpenChange={setGroupOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={groupOpen}
                className="hidden md:flex w-[180px] justify-between shrink-0"
              >
                {selectedGroups.length > 0
                  ? selectedGroups.length === 1
                    ? selectedGroups[0]
                    : `Групп: ${selectedGroups.length}`
                  : t("filters.group_all")}
                <ChevronsUpDown
                  className="ml-2 size-4 shrink-0 opacity-50"
                  aria-hidden="true"
                />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0">
              <Command>
                <CommandInput placeholder="Поиск группы..." />
                <CommandList>
                  <CommandEmpty>Не найдено</CommandEmpty>
                  <CommandGroup>
                    {WORK_TYPE_GROUPS.map((g) => (
                      <CommandItem
                        key={g}
                        value={g}
                        onSelect={() => {
                          setSelectedGroups((prev) =>
                            prev.includes(g)
                              ? prev.filter((x) => x !== g)
                              : [...prev, g]
                          )
                          setPage(1)
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 size-4",
                            selectedGroups.includes(g)
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                          aria-hidden="true"
                        />
                        <GroupBadge group={g} />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {/* Mobile: filter sheet */}
          <MobileFilterSheet
            activeCount={activeFilters.length}
            onClearAll={clearAllFilters}
            onApply={() => {}}
          >
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">{t("filters.group")}</p>
                <div className="flex flex-wrap gap-2">
                  {WORK_TYPE_GROUPS.map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() =>
                        setSelectedGroups((prev) =>
                          prev.includes(g)
                            ? prev.filter((x) => x !== g)
                            : [...prev, g]
                        )
                      }
                      className={cn(
                        "rounded-full border px-3 py-1 text-sm transition-colors",
                        selectedGroups.includes(g)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border"
                      )}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">
                  {t("filters.requires_photo")}
                </p>
                <div className="flex gap-2">
                  {[
                    { label: t("filters.requires_photo_yes"), value: true },
                    { label: t("filters.requires_photo_no"), value: false },
                  ].map(({ label, value }) => (
                    <button
                      key={String(value)}
                      type="button"
                      onClick={() =>
                        setRequiresPhoto((prev) =>
                          prev === value ? undefined : value
                        )
                      }
                      className={cn(
                        "rounded-full border px-3 py-1 text-sm transition-colors",
                        requiresPhoto === value
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </MobileFilterSheet>
        </div>

        {/* Filter chips row */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {activeFilters.map((chip) => (
              <FilterChip
                key={chip.key}
                label={chip.label}
                value={chip.value}
                onRemove={chip.onRemove}
              />
            ))}
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {t("filters.clear_all")}
            </button>
          </div>
        )}
      </div>

      {/* List / Accordion view */}
      {isEmpty ? (
        hasFilters ? (
          <EmptyState
            icon={SearchX}
            title={t("empty.filtered_title")}
            description={t("empty.filtered_subtitle")}
            action={{
              label: t("empty.filtered_reset"),
              onClick: clearAllFilters,
            }}
          />
        ) : (
          <EmptyState
            icon={Tag}
            title={t("empty.no_work_types_title")}
            description={t("empty.no_work_types_subtitle")}
            action={{
              label: t("empty.no_work_types_cta"),
              onClick: openCreate,
            }}
          />
        )
      ) : viewMode === "list" ? (
        <div>
          <ResponsiveDataTable
              columns={columns}
              data={items}
              isLoading={isLoading}
              emptyMessage={{
                title: t("empty.filtered_title"),
                description: t("empty.filtered_subtitle"),
              }}
              pagination={{
                page,
                pageSize: PAGE_SIZE,
                total,
                onPageChange: setPage,
              }}
              mobileCardRender={(wt) => (
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{wt.name}</span>
                      <span className="font-mono text-xs uppercase tracking-wide bg-muted px-1.5 py-0.5 rounded text-foreground">
                        {wt.code}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <GroupBadge group={wt.group} />
                      {wt.usage_count !== undefined && wt.usage_count > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {wt.usage_count} задач
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      {wt.requires_photo_default && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Camera className="size-3" aria-hidden="true" />
                          Фото
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {wt.default_duration_min} мин
                      </span>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-9 shrink-0"
                        aria-label={tCommon("actions")}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="size-4" aria-hidden="true" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(wt)}>
                        {t("row_actions.edit")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDuplicate(wt)}
                      >
                        <Copy className="size-3.5 mr-2 opacity-60" />
                        {t("row_actions.duplicate")}
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link
                          href={`${ADMIN_ROUTES.hints}?work_type_id=${wt.id}`}
                        >
                          {t("row_actions.hints")}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className={cn(
                          "text-destructive focus:text-destructive",
                          wt.tasks_count > 0 &&
                            "opacity-50 pointer-events-none"
                        )}
                        onClick={() => {
                          if (wt.tasks_count === 0) openDelete(wt)
                        }}
                      >
                        {t("row_actions.delete")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            />
        </div>
      ) : (
        /* Accordion view (desktop only) */
            <Accordion type="multiple" className="space-y-2">
              {groupedItems.map(([group, groupItems]) => {
                const colors = GROUP_COLORS[group]
                return (
                  <AccordionItem
                    key={group}
                    value={group}
                    className="rounded-lg border border-border overflow-hidden"
                  >
                    <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/40 transition-colors">
                      <div className="flex items-center gap-3">
                        <Badge
                          className="border-transparent"
                          style={
                            colors
                              ? { backgroundColor: colors.bg, color: colors.text }
                              : undefined
                          }
                        >
                          {group}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {groupItems.length} типов
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-0 pb-0">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-muted/20 border-t border-border">
                            <th className="text-left px-4 py-2 text-xs text-muted-foreground font-medium uppercase tracking-wide">
                              {t("columns.code")}
                            </th>
                            <th className="text-left px-4 py-2 text-xs text-muted-foreground font-medium uppercase tracking-wide">
                              {t("columns.name")}
                            </th>
                            <th className="text-left px-4 py-2 text-xs text-muted-foreground font-medium uppercase tracking-wide">
                              {t("columns.default_duration")}
                            </th>
                            <th className="text-left px-4 py-2 text-xs text-muted-foreground font-medium uppercase tracking-wide">
                              {t("columns.hints_count")}
                            </th>
                            <th className="px-4 py-2 w-12" />
                          </tr>
                        </thead>
                        <tbody>
                          {groupItems.map((wt, i) => (
                            <tr
                              key={wt.id}
                              className={cn(
                                "border-t border-border hover:bg-muted/30 transition-colors cursor-pointer",
                                i % 2 === 1 && "bg-muted/10"
                              )}
                              onClick={() => openEdit(wt)}
                            >
                              <td className="px-4 py-2.5">
                                <span className="font-mono text-xs uppercase tracking-wide bg-muted px-1.5 py-0.5 rounded">
                                  {wt.code}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 font-medium">
                                {wt.name}
                              </td>
                              <td className="px-4 py-2.5 tabular-nums">
                                {wt.default_duration_min}
                              </td>
                              <td className="px-4 py-2.5">
                                {wt.hints_count > 0 ? (
                                  <Link
                                    href={`${ADMIN_ROUTES.hints}?work_type_id=${wt.id}`}
                                    className="text-primary hover:underline"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {wt.hints_count}
                                  </Link>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </td>
                              <td
                                className="px-4 py-2.5"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="size-8"
                                      aria-label={tCommon("actions")}
                                    >
                                      <MoreVertical
                                        className="size-4"
                                        aria-hidden="true"
                                      />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      onClick={() => openEdit(wt)}
                                    >
                                      {t("row_actions.edit")}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => handleDuplicate(wt)}
                                    >
                                      {t("row_actions.duplicate")}
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className={cn(
                                        "text-destructive focus:text-destructive",
                                        wt.tasks_count > 0 &&
                                          "opacity-50 pointer-events-none"
                                      )}
                                      onClick={() => {
                                        if (wt.tasks_count === 0)
                                          openDelete(wt)
                                      }}
                                    >
                                      {t("row_actions.delete")}
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </AccordionContent>
                  </AccordionItem>
                )
              })}
            </Accordion>
      )}

      {/* Edit / Create Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <WorkTypeEditDialogContent
          workType={editingWorkType}
          onSave={handleSave}
          onOpenChange={setEditDialogOpen}
        />
      </Dialog>

      {/* Delete AlertDialog */}
      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open)
          if (!open) setDeleteError(null)
        }}
      >
        <AlertDialogTrigger asChild>
          <span className="sr-only" />
        </AlertDialogTrigger>
        <ConfirmDialog
          title={t("dialogs.delete_confirm_title", {
            name: deletingWorkType?.name ?? "",
          })}
          message={
            deleteError
              ? deleteError
              : t("dialogs.delete_confirm_warning")
          }
          confirmLabel={
            deleteError
              ? tCommon("close")
              : t("dialogs.delete_confirm_action")
          }
          variant={deleteError ? "default" : "destructive"}
          onConfirm={deleteError ? async () => setDeleteDialogOpen(false) : handleDelete}
          onOpenChange={setDeleteDialogOpen}
        />
      </AlertDialog>
    </div>
  )
}
