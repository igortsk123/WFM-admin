"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { Plus, Download, Tag, SearchX } from "lucide-react"

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
import { Dialog } from "@/components/ui/dialog"
import { toast } from "sonner"

import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { ResponsiveDataTable } from "@/components/shared/responsive-data-table"

import {
  WorkTypeEditDialogContent,
  WORK_TYPE_GROUPS,
} from "./work-type-edit-dialog-content"

import { PAGE_SIZE, type ViewMode } from "./work-types-list/_shared"
import { WorkTypesListSkeleton } from "./work-types-list/list-skeleton"
import { WorkTypesErrorState } from "./work-types-list/error-state"
import { StatsRow } from "./work-types-list/stats-row"
import {
  FiltersBar,
  type ActiveFilterChip,
} from "./work-types-list/filters-bar"
import { buildWorkTypesColumns } from "./work-types-list/columns"
import { WorkTypeMobileCard } from "./work-types-list/mobile-card"
import { WorkTypesAccordionView } from "./work-types-list/accordion-view"
import { WorkTypeDeleteDialog } from "./work-types-list/delete-dialog"

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
  const activeFilters = React.useMemo<ActiveFilterChip[]>(() => {
    const chips: ActiveFilterChip[] = []
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
  const columns = React.useMemo(
    () =>
      buildWorkTypesColumns({
        t,
        tCommon,
        onEdit: openEdit,
        onDuplicate: handleDuplicate,
        onDelete: openDelete,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, tCommon]
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
    return Array.from(map.entries()).filter(([, list]) => list.length > 0)
  }, [items])

  const hasFilters = activeFilters.length > 0 || debouncedSearch.length > 0
  const isEmpty = !isLoading && items.length === 0

  if (isLoading && items.length === 0 && !isError) {
    return <WorkTypesListSkeleton />
  }

  if (isError) {
    return <WorkTypesErrorState onRetry={load} t={t} tCommon={tCommon} />
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
      <StatsRow
        totalAll={totalAll}
        groupCount={groupCount}
        withoutHints={withoutHints}
        isLoading={isLoading}
      />

      {/* Toolbar (search + filters + chips) */}
      <FiltersBar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        search={search}
        onSearchChange={setSearch}
        selectedGroups={selectedGroups}
        onSelectedGroupsChange={(groups) => {
          setSelectedGroups(groups)
          setPage(1)
        }}
        requiresPhoto={requiresPhoto}
        onRequiresPhotoChange={setRequiresPhoto}
        activeFilters={activeFilters}
        onClearAll={clearAllFilters}
        t={t}
      />

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
            <WorkTypeMobileCard
              workType={wt}
              onEdit={openEdit}
              onDuplicate={handleDuplicate}
              onDelete={openDelete}
              t={t}
              tCommon={tCommon}
            />
          )}
        />
      ) : (
        <WorkTypesAccordionView
          groupedItems={groupedItems}
          onEdit={openEdit}
          onDuplicate={handleDuplicate}
          onDelete={openDelete}
          t={t}
          tCommon={tCommon}
        />
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
      <WorkTypeDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        deletingWorkType={deletingWorkType}
        deleteError={deleteError}
        onConfirmDelete={handleDelete}
        onClearError={() => setDeleteError(null)}
        t={t}
        tCommon={tCommon}
      />
    </div>
  )
}
