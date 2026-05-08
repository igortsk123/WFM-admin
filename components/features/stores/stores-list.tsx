"use client"

import * as React from "react"
import { useRouter } from "@/i18n/navigation"
import { useTranslations } from "next-intl"
import { useQueryState, parseAsString, parseAsInteger } from "nuqs"
import {
  AlertCircle,
  Download,
  MapPin,
  MoreHorizontal,
  Plus,
  RefreshCw,
  SearchX,
  Store,
} from "lucide-react"
import { toast } from "sonner"

import type { ObjectFormat } from "@/lib/types"
import type { StoreWithStats } from "@/lib/api/stores"
import {
  archiveStore,
  bulkArchiveStores,
  getStores,
  syncLama,
} from "@/lib/api/stores"
import { ADMIN_ROUTES } from "@/lib/constants/routes"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertDialog } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"

import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { EmptyState } from "@/components/shared/empty-state"
import { PageHeader } from "@/components/shared/page-header"
import { ResponsiveDataTable } from "@/components/shared/responsive-data-table"

import { BulkActionBar } from "./stores-list/bulk-action-bar"
import { buildStoreColumns } from "./stores-list/columns"
import { FiltersBar } from "./stores-list/filters-bar"
import { MapView } from "./stores-list/map-view"
import { MobileCard } from "./stores-list/mobile-card"
import { StatsRow } from "./stores-list/stats-row"
import { StoreDialog } from "./stores-list/store-dialog"

export function StoresList() {
  const t = useTranslations("screen.stores")
  const router = useRouter()

  // ── URL state ──────────────────────────────────────────────────
  const [tabParam, setTabParam] = useQueryState("status", parseAsString.withDefault("all"))
  const [viewParam, setViewParam] = useQueryState("view", parseAsString.withDefault("list"))
  const [searchParam, setSearchParam] = useQueryState("search", parseAsString.withDefault(""))
  const [cityParam, setCityParam] = useQueryState("city", parseAsString.withDefault(""))
  const [storeTypeParam, setStoreTypeParam] = useQueryState("store_type", parseAsString.withDefault(""))
  const [pageParam, setPageParam] = useQueryState("page", parseAsInteger.withDefault(1))

  // Format filter (local, not encoded in URL for brevity)
  const [selectedFormats, setSelectedFormats] = React.useState<ObjectFormat[]>([])

  // ── Data state ──────────────────────────────────────────────────
  const [data, setData] = React.useState<StoreWithStats[]>([])
  const [total, setTotal] = React.useState(0)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isError, setIsError] = React.useState(false)

  // Stats strip counts
  const [statsLoading, setStatsLoading] = React.useState(true)
  const [statsTotal, setStatsTotal] = React.useState(0)
  const [statsActive, setStatsActive] = React.useState(0)
  const [statsArchived, setStatsArchived] = React.useState(0)
  const [statsNoDirector, setStatsNoDirector] = React.useState(0)

  // ── Bulk selection ──────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = React.useState<Set<number>>(new Set())

  // ── Dialog state ────────────────────────────────────────────────
  const [archivingId, setArchivingId] = React.useState<number | null>(null)
  const [bulkArchiveOpen, setBulkArchiveOpen] = React.useState(false)
  const [storeDialogOpen, setStoreDialogOpen] = React.useState(false)
  const [editingStore, setEditingStore] = React.useState<StoreWithStats | null>(null)
  const [syncingId, setSyncingId] = React.useState<number | null>(null)
  const [syncConfirmOpen, setSyncConfirmOpen] = React.useState(false)

  // ── Fetch data ──────────────────────────────────────────────────
  const fetchData = React.useCallback(async () => {
    setIsLoading(true)
    setIsError(false)
    try {
      const archived = tabParam === "archived" ? true : tabParam === "active" ? false : undefined
      const result = await getStores({
        archived: archived ?? false,
        search: searchParam || undefined,
        city: cityParam || undefined,
        store_type: storeTypeParam || undefined,
        format: selectedFormats.length > 0 ? selectedFormats : undefined,
        page: pageParam,
        page_size: 20,
      })
      setData(result.data)
      setTotal(result.total ?? 0)
    } catch {
      setIsError(true)
    } finally {
      setIsLoading(false)
    }
  }, [tabParam, searchParam, cityParam, storeTypeParam, selectedFormats, pageParam])

  React.useEffect(() => {
    fetchData()
  }, [fetchData])

  // ── Stats strip fetch (counts) ─────────────────────────────────
  React.useEffect(() => {
    async function fetchStats() {
      setStatsLoading(true)
      try {
        const [activeRes, archivedRes] = await Promise.all([
          getStores({ archived: false, page_size: 100 }),
          getStores({ archived: true, page_size: 100 }),
        ])
        const activeStores = activeRes.data
        const noDirectorCount = activeStores.filter((s) => !s.manager_id).length
        setStatsActive(activeRes.total ?? 0)
        setStatsArchived(archivedRes.total ?? 0)
        setStatsTotal((activeRes.total ?? 0) + (archivedRes.total ?? 0))
        setStatsNoDirector(noDirectorCount)
      } finally {
        setStatsLoading(false)
      }
    }
    fetchStats()
  }, [])

  // ── Filter helpers ──────────────────────────────────────────────
  const activeFilterCount =
    (cityParam ? 1 : 0) +
    (storeTypeParam ? 1 : 0) +
    selectedFormats.length

  const hasActiveFilters = activeFilterCount > 0 || !!searchParam

  function clearAllFilters() {
    setSearchParam(null)
    setCityParam(null)
    setStoreTypeParam(null)
    setSelectedFormats([])
    setPageParam(null)
  }

  // ── Selection helpers ───────────────────────────────────────────
  const allSelected = data.length > 0 && data.every((s) => selectedIds.has(s.id))
  const someSelected = selectedIds.size > 0

  function toggleAll() {
    if (allSelected) setSelectedIds(new Set())
    else setSelectedIds(new Set(data.map((s) => s.id)))
  }

  function toggleRow(id: number) {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  // ── Row actions ─────────────────────────────────────────────────
  async function handleArchiveSingle(id: number) {
    const result = await archiveStore(id)
    if (result.success) {
      toast.success(t("toast.archived"))
      fetchData()
      setSelectedIds(new Set())
    } else {
      toast.error(t("toast.error"))
    }
    setArchivingId(null)
  }

  async function handleBulkArchive() {
    const ids = Array.from(selectedIds)
    const result = await bulkArchiveStores(ids)
    if (result.success) {
      toast.success(t("toast.bulk_archived", { count: ids.length }))
      fetchData()
      setSelectedIds(new Set())
    } else {
      toast.error(t("toast.error"))
    }
    setBulkArchiveOpen(false)
  }

  async function handleSyncLama(id: number) {
    toast.info(t("toast.sync_started"))
    const result = await syncLama(id)
    if (result.success) {
      toast.success(t("toast.sync_finished"))
      fetchData()
    } else {
      toast.error(t("toast.error"))
    }
    setSyncingId(null)
    setSyncConfirmOpen(false)
  }

  function handleRowClick(row: StoreWithStats, e: React.MouseEvent) {
    const target = e.target as HTMLElement
    if (
      target.closest("button") ||
      target.closest('[role="checkbox"]') ||
      target.closest("[data-radix-collection-item]")
    ) {
      return
    }
    router.push(ADMIN_ROUTES.storeDetail(String(row.id)))
  }

  // ── Columns definition ──────────────────────────────────────────
  const columns = buildStoreColumns({
    t,
    selectedIds,
    allSelected,
    onToggleAll: toggleAll,
    onToggleRow: toggleRow,
    onOpen: (store) => router.push(ADMIN_ROUTES.storeDetail(String(store.id))),
    onEdit: (store) => {
      setEditingStore(store)
      setStoreDialogOpen(true)
    },
    onChangeDirector: () => {
      // TODO: change-director flow
    },
    onSync: (store) => {
      setSyncingId(store.id)
      setSyncConfirmOpen(true)
    },
    onArchive: (store) => setArchivingId(store.id),
  })

  // ── Empty / error states ────────────────────────────────────────
  const isEmptyAll =
    !hasActiveFilters && tabParam !== "archived" && data.length === 0 && !isLoading
  const isEmptyFiltered = hasActiveFilters && data.length === 0 && !isLoading
  const isEmptyArchived =
    tabParam === "archived" && data.length === 0 && !isLoading && !hasActiveFilters

  // ── Page actions (mobile overflow) ─────────────────────────────
  const pageActions = (
    <>
      <Button
        size="sm"
        className="gap-1.5"
        onClick={() => {
          setEditingStore(null)
          setStoreDialogOpen(true)
        }}
      >
        <Plus className="size-4" />
        <span className="hidden sm:inline">{t("actions.add")}</span>
      </Button>
      {/* Mobile overflow menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" className="size-9 md:hidden">
            <MoreHorizontal className="size-4" />
            <span className="sr-only">{t("actions.more")}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem className="gap-2">
            <Download className="size-4" /> {t("actions.export_csv")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )

  return (
    <div className="space-y-4">
      {/* Page header */}
      <PageHeader
        title={t("page_title")}
        subtitle={!isLoading ? t("counter", { count: total }) : undefined}
        breadcrumbs={[
          { label: t("breadcrumbs.home"), href: ADMIN_ROUTES.dashboard },
          { label: t("breadcrumbs.stores") },
        ]}
        actions={pageActions}
      />

      {/* Stats strip */}
      <StatsRow
        total={statsTotal}
        active={statsActive}
        archived={statsArchived}
        noDirector={statsNoDirector}
        isLoading={statsLoading}
        onOpenNoDirector={() => {
          setTabParam("active")
          setSearchParam(null)
        }}
      />

      {/* Toolbar row: tabs + view toggle */}
      <div className="flex items-center justify-between gap-3">
        <ScrollArea className="max-w-full">
          <Tabs
            value={tabParam}
            onValueChange={(v) => {
              setTabParam(v)
              setPageParam(null)
              setSelectedIds(new Set())
            }}
          >
            <TabsList className="h-9">
              <TabsTrigger value="all" className="text-sm">
                {t("tabs.all")}
              </TabsTrigger>
              <TabsTrigger value="active" className="text-sm">
                {t("tabs.active")}
              </TabsTrigger>
              <TabsTrigger value="archived" className="text-sm">
                {t("tabs.archived")}
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        <ToggleGroup
          type="single"
          value={viewParam}
          onValueChange={(v) => v && setViewParam(v)}
          className="shrink-0"
        >
          <ToggleGroupItem value="list" aria-label={t("view.list")} className="h-9 w-9">
            <svg
              width="15"
              height="15"
              viewBox="0 0 15 15"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M2 3h11M2 7.5h11M2 12h11"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </ToggleGroupItem>
          <ToggleGroupItem value="map" aria-label={t("view.map")} className="h-9 w-9">
            <MapPin className="size-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Filter row + chips */}
      <FiltersBar
        searchValue={searchParam}
        cityValue={cityParam}
        storeTypeValue={storeTypeParam}
        selectedFormats={selectedFormats}
        hasActiveFilters={hasActiveFilters}
        activeFilterCount={activeFilterCount}
        onSearchChange={(v) => {
          setSearchParam(v || null)
          setPageParam(null)
        }}
        onCityChange={(v) => {
          setCityParam(v || null)
          setPageParam(null)
        }}
        onStoreTypeChange={(v) => {
          setStoreTypeParam(v || null)
          setPageParam(null)
        }}
        onRemoveFormat={(fmt) =>
          setSelectedFormats((prev) => prev.filter((f) => f !== fmt))
        }
        onClearAll={clearAllFilters}
      />

      {/* Error state */}
      {isError && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription className="flex items-center gap-3">
            {t("error.title")}
            <Button size="sm" variant="outline" onClick={fetchData}>
              <RefreshCw className="size-3.5 mr-1.5" />
              {t("error.retry")}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Map view */}
      {viewParam === "map" && !isError && (
        <MapView onStoreClick={(id) => router.push(ADMIN_ROUTES.storeDetail(String(id)))} />
      )}

      {/* List view */}
      {viewParam === "list" && !isError && (
        <>
          {isEmptyAll && (
            <EmptyState
              icon={Store}
              title={t("empty.all.title")}
              description={t("empty.all.subtitle")}
              action={{
                label: t("empty.all.cta"),
                onClick: () => {
                  setEditingStore(null)
                  setStoreDialogOpen(true)
                },
                icon: Plus,
              }}
            />
          )}
          {isEmptyArchived && (
            <EmptyState
              icon={Store}
              title={t("empty.archived.title")}
              description={t("empty.archived.subtitle")}
            />
          )}
          {isEmptyFiltered && (
            <EmptyState
              icon={SearchX}
              title={t("empty.filtered.title")}
              description={t("empty.filtered.subtitle")}
              action={{ label: t("empty.filtered.reset"), onClick: clearAllFilters }}
            />
          )}
          {!isEmptyAll && !isEmptyArchived && !isEmptyFiltered && (
            <ResponsiveDataTable
              columns={columns}
              data={data}
              isLoading={isLoading}
              isError={false}
              onRowClick={handleRowClick}
              pagination={{
                page: pageParam,
                pageSize: 20,
                total,
                onPageChange: (p) => setPageParam(p),
              }}
              mobileCardRender={(store) => (
                <MobileCard
                  store={store}
                  onClick={() => router.push(ADMIN_ROUTES.storeDetail(String(store.id)))}
                  onArchive={() => setArchivingId(store.id)}
                  onSync={() => {
                    setSyncingId(store.id)
                    setSyncConfirmOpen(true)
                  }}
                  onEdit={() => {
                    setEditingStore(store)
                    setStoreDialogOpen(true)
                  }}
                />
              )}
            />
          )}
        </>
      )}

      {/* Bulk action bar */}
      {someSelected && (
        <BulkActionBar
          selectedCount={selectedIds.size}
          onArchive={() => setBulkArchiveOpen(true)}
          onCancel={() => setSelectedIds(new Set())}
        />
      )}

      {/* Archive single dialog */}
      <AlertDialog
        open={archivingId !== null}
        onOpenChange={(open) => !open && setArchivingId(null)}
      >
        <ConfirmDialog
          title={t("dialogs.archive_title")}
          message={t("dialogs.archive_description")}
          confirmLabel={t("dialogs.archive_confirm")}
          cancelLabel={t("dialogs.cancel")}
          variant="destructive"
          onConfirm={() => {
            if (archivingId !== null) handleArchiveSingle(archivingId)
          }}
          onOpenChange={(open) => !open && setArchivingId(null)}
        />
      </AlertDialog>

      {/* Bulk archive dialog */}
      <AlertDialog open={bulkArchiveOpen} onOpenChange={setBulkArchiveOpen}>
        <ConfirmDialog
          title={t("dialogs.bulk_archive_title", { count: selectedIds.size })}
          message={t("dialogs.bulk_archive_description")}
          confirmLabel={t("bulk.archive")}
          cancelLabel={t("dialogs.cancel")}
          variant="destructive"
          onConfirm={handleBulkArchive}
          onOpenChange={setBulkArchiveOpen}
        />
      </AlertDialog>

      {/* Sync LAMA confirm */}
      <AlertDialog open={syncConfirmOpen} onOpenChange={setSyncConfirmOpen}>
        <ConfirmDialog
          title={t("dialogs.sync_lama_title")}
          message={t("dialogs.sync_lama_description")}
          confirmLabel={t("dialogs.sync_lama_confirm")}
          cancelLabel={t("dialogs.cancel")}
          onConfirm={() => {
            if (syncingId !== null) handleSyncLama(syncingId)
          }}
          onOpenChange={setSyncConfirmOpen}
        />
      </AlertDialog>

      {/* Add / Edit dialog */}
      <StoreDialog
        open={storeDialogOpen}
        onOpenChange={setStoreDialogOpen}
        store={editingStore}
        onSuccess={fetchData}
      />
    </div>
  )
}
