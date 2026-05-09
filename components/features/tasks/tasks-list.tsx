"use client"

import * as React from "react"
import { useRouter } from "@/i18n/navigation"
import { useTranslations } from "next-intl"
import { useSearchParams, usePathname } from "next/navigation"
import { format } from "date-fns"
import { RotateCcw } from "lucide-react"

import type { ArchiveReason } from "@/lib/types"
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
import { ADMIN_ROUTES } from "@/lib/constants/routes"

import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"

import { PageHeader } from "@/components/shared/page-header"
import { ResponsiveDataTable } from "@/components/shared/responsive-data-table"

import { PAGE_SIZE, type TabKey, tabToFilters, stateToActiveFilter } from "./tasks-list/_shared"
import { HeaderActions, MobileCreateButton } from "./tasks-list/header-actions"
import { TabsRow } from "./tasks-list/tabs-row"
import { FiltersBar } from "./tasks-list/filters-bar"
import { ActiveFilterChips, type ActiveChip } from "./tasks-list/active-filter-chips"
import { BulkActionBar } from "./tasks-list/bulk-action-bar"
import { BulkReassignDialog } from "./tasks-list/bulk-reassign-dialog"
import { BulkArchiveDialog } from "./tasks-list/bulk-archive-dialog"
import { useTasksColumns } from "./tasks-list/columns"
import { MobileCard } from "./tasks-list/mobile-card"

export function TasksList() {
  const t = useTranslations("screen.tasks")
  const tCommon = useTranslations("common")
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  // useTransition — фильтры/поиск/таб как non-urgent, ввод остаётся responsive.
  const [, startTransition] = React.useTransition()

  // ── URL state ─────────────────────────────────────────────────────────────
  const activeTab = (searchParams.get("tab") as TabKey) ?? "all"
  const urlPage = parseInt(searchParams.get("page") ?? "1", 10)

  const updateUrl = React.useCallback(
    (updates: Record<string, string | null>) => {
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
    },
    [searchParams, pathname, router],
  )

  // ── Local filter state ────────────────────────────────────────────────────
  const [search, setSearch] = React.useState("")
  const [selectedStores, setSelectedStores] = React.useState<string[]>([])
  const [selectedZones, setSelectedZones] = React.useState<string[]>([])
  const [selectedWorkTypes, setSelectedWorkTypes] = React.useState<string[]>([])
  const [selectedCategories, setSelectedCategories] = React.useState<string[]>([])
  const [selectedAssignees, setSelectedAssignees] = React.useState<string[]>([])
  const [dateFrom, setDateFrom] = React.useState<Date | undefined>()
  const [dateTo, setDateTo] = React.useState<Date | undefined>()

  // ── Data state ────────────────────────────────────────────────────────────
  const [data, setData] = React.useState<TaskWithAvatar[]>([])
  const [total, setTotal] = React.useState(0)
  const [page, setPage] = React.useState(urlPage)
  const [tabCounts, setTabCounts] = React.useState<TaskTabCounts | null>(null)
  const [filterOptions, setFilterOptions] = React.useState<TaskFiltersResponse | null>(null)
  const [storeOptions, setStoreOptions] = React.useState<{ value: string; label: string }[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isError, setIsError] = React.useState(false)

  // ── Selection state ───────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())

  // ── Dialog state ──────────────────────────────────────────────────────────
  const [showReassignDialog, setShowReassignDialog] = React.useState(false)
  const [showArchiveDialog, setShowArchiveDialog] = React.useState(false)
  const [archiveReason, setArchiveReason] = React.useState<ArchiveReason>("CLOSED")
  const [reassignAssigneeId, setReassignAssigneeId] = React.useState<string>("")
  const [isBulkLoading, setIsBulkLoading] = React.useState(false)

  const isArchiveTab = activeTab === "archive"
  const hasFilters = !!(
    search ||
    selectedStores.length ||
    selectedZones.length ||
    selectedWorkTypes.length ||
    selectedCategories.length ||
    selectedAssignees.length ||
    dateFrom ||
    dateTo
  )

  const activeFilterCount = [
    search ? 1 : 0,
    selectedStores.length,
    selectedZones.length,
    selectedWorkTypes.length,
    selectedCategories.length,
    selectedAssignees.length,
    dateFrom || dateTo ? 1 : 0,
  ].reduce((a, b) => a + b, 0)

  // ── Load filter options + tab counts + stores ────────────────────────────
  React.useEffect(() => {
    getTaskListFilterOptions().then((res) => setFilterOptions(res))
    getTaskTabCounts().then(setTabCounts)
    getStores({ active: true, page: 1, page_size: 100 }).then((res) =>
      setStoreOptions(res.data.map((s) => ({ value: String(s.id), label: s.name }))),
    )
  }, [])

  // ── Load tasks data ───────────────────────────────────────────────────────
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
          filtered = filtered.filter((task) => activeStates.includes(task.state))
        }
        setData(filtered)
        setTotal(res.total)
        setIsLoading(false)
      })
      .catch(() => {
        setIsError(true)
        setIsLoading(false)
      })
  }, [
    activeTab,
    search,
    selectedStores,
    selectedZones,
    selectedWorkTypes,
    selectedCategories,
    selectedAssignees,
    dateFrom,
    dateTo,
    page,
  ])

  // ── Clear all filters ─────────────────────────────────────────────────────
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

  // ── Selection handlers ────────────────────────────────────────────────────
  const toggleSelect = React.useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleSelectAll = () => {
    if (selectedIds.size === data.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(data.map((task) => task.id)))
    }
  }

  // ── Row click ─────────────────────────────────────────────────────────────
  const handleRowClick = (task: TaskWithAvatar, e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey) return
    router.push(ADMIN_ROUTES.taskDetail(task.id) as Parameters<typeof router.push>[0])
  }

  // ── Bulk actions ──────────────────────────────────────────────────────────
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

  // ── Filter options derived ────────────────────────────────────────────────
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

  // ── Active filter chips ───────────────────────────────────────────────────
  const activeChips: ActiveChip[] = [
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
      ? [
          {
            label: t("filters.date_range"),
            value: [dateFrom && format(dateFrom, "dd.MM.yy"), dateTo && format(dateTo, "dd.MM.yy")]
              .filter(Boolean)
              .join(" – "),
            onRemove: () => {
              setDateFrom(undefined)
              setDateTo(undefined)
            },
          },
        ]
      : []),
  ]

  // ── Columns ───────────────────────────────────────────────────────────────
  const columns = useTasksColumns({
    data,
    selectedIds,
    onToggleAll: toggleSelectAll,
    onToggleOne: toggleSelect,
    isArchiveTab,
  })

  // ── Pagination footer info ────────────────────────────────────────────────
  const fromItem = Math.min((page - 1) * PAGE_SIZE + 1, total)
  const toItem = Math.min(page * PAGE_SIZE, total)

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <PageHeader title={t("title")} actions={<HeaderActions />} />

      <MobileCreateButton />

      <TabsRow
        activeTab={activeTab}
        onChange={(v) => {
          updateUrl({ tab: v === "all" ? null : v })
          setPage(1)
          setSelectedIds(new Set())
        }}
        tabCounts={tabCounts}
      />

      <FiltersBar
        search={search}
        onSearchChange={(v) => {
          startTransition(() => {
            setSearch(v)
            setPage(1)
          })
        }}
        storeOptions={storeOptions}
        selectedStores={selectedStores}
        onStoresChange={(v) => {
          startTransition(() => {
            setSelectedStores(v)
            setPage(1)
          })
        }}
        zoneOptions={zoneOptions}
        selectedZones={selectedZones}
        onZonesChange={(v) => {
          startTransition(() => {
            setSelectedZones(v)
            setPage(1)
          })
        }}
        workTypeOptions={workTypeOptions}
        selectedWorkTypes={selectedWorkTypes}
        onWorkTypesChange={(v) => {
          startTransition(() => {
            setSelectedWorkTypes(v)
            setPage(1)
          })
        }}
        categoryOptions={categoryOptions}
        selectedCategories={selectedCategories}
        onCategoriesChange={(v) => {
          startTransition(() => {
            setSelectedCategories(v)
            setPage(1)
          })
        }}
        assigneeOptions={assigneeOptions}
        selectedAssignees={selectedAssignees}
        onAssigneesChange={(v) => {
          startTransition(() => {
            setSelectedAssignees(v)
            setPage(1)
          })
        }}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateRangeChange={(from, to) => {
          startTransition(() => {
            setDateFrom(from)
            setDateTo(to)
            setPage(1)
          })
        }}
        activeFilterCount={activeFilterCount}
        onClearAll={clearAllFilters}
        onApply={() => setPage(1)}
      />

      <ActiveFilterChips chips={activeChips} onClearAll={clearAllFilters} />

      {selectedIds.size > 0 && (
        <BulkActionBar
          count={selectedIds.size}
          onReassign={() => setShowReassignDialog(true)}
          onArchive={() => setShowArchiveDialog(true)}
          onClear={() => setSelectedIds(new Set())}
          isArchiveTab={isArchiveTab}
        />
      )}

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

      {!isError && (
        <ResponsiveDataTable
          columns={columns}
          data={data}
          mobileCardRender={(task) => (
            <MobileCard
              task={task}
              isSelected={selectedIds.has(task.id)}
              onToggleSelect={toggleSelect}
              isArchiveTab={isArchiveTab}
            />
          )}
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

      {!isLoading && !isError && total > 0 && (
        <div className="hidden md:flex items-center justify-between text-sm text-muted-foreground px-1">
          <span>{t("pagination_info", { from: fromItem, to: toItem, total })}</span>
          <div className="flex items-center gap-2">
            <span>
              {tCommon("perPage")}: {PAGE_SIZE}
            </span>
          </div>
        </div>
      )}

      <BulkReassignDialog
        open={showReassignDialog}
        onOpenChange={setShowReassignDialog}
        assigneeOptions={assigneeOptions}
        assigneeId={reassignAssigneeId}
        onAssigneeChange={setReassignAssigneeId}
        loading={isBulkLoading}
        onConfirm={handleBulkReassign}
      />

      <BulkArchiveDialog
        open={showArchiveDialog}
        onOpenChange={setShowArchiveDialog}
        count={selectedIds.size}
        reason={archiveReason}
        onReasonChange={setArchiveReason}
        loading={isBulkLoading}
        onConfirm={handleBulkArchive}
      />
    </div>
  )
}
