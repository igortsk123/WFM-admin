"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "@/i18n/navigation"
import { useTranslations, useLocale } from "next-intl"
import {
  useQueryState,
  parseAsString,
  parseAsInteger,
  parseAsBoolean,
} from "nuqs"
import { Plus, RefreshCw, ServerCrash, X } from "lucide-react"
import { toast } from "sonner"

import type { FreelanceApplication, ApplicationSource } from "@/lib/types"
import {
  getFreelanceApplications,
  cancelApplication,
} from "@/lib/api/freelance-applications"
import { ADMIN_ROUTES } from "@/lib/constants/routes"
import { useAuth } from "@/lib/contexts/auth-context"

import { Button } from "@/components/ui/button"
import { TooltipProvider } from "@/components/ui/tooltip"

import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { ResponsiveDataTable } from "@/components/shared/responsive-data-table"

import {
  STORE_OPTIONS,
  WORK_TYPE_OPTIONS,
  SOURCE_OPTIONS,
  TAB_STATUS_MAP,
} from "./applications-list/_shared"
import { ListSkeleton } from "./applications-list/list-skeleton"
import { TabsBar } from "./applications-list/tabs-bar"
import { FiltersBar } from "./applications-list/filters-bar"
import { buildApplicationColumns } from "./applications-list/columns"
import { MobileCard } from "./applications-list/mobile-card"
import { CancelDialog } from "./applications-list/cancel-dialog"

// ─────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────

export function ApplicationsList() {
  const t = useTranslations("screen.freelanceApplications")
  const tCommon = useTranslations("common")
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
  const [workTypeParam, setWorkTypeParam] = useQueryState(
    "work_type",
    parseAsString.withDefault("")
  )
  const [dateFromParam, setDateFromParam] = useQueryState(
    "date_from",
    parseAsString.withDefault("")
  )
  const [dateToParam, setDateToParam] = useQueryState("date_to", parseAsString.withDefault(""))
  const [sourceParam, setSourceParam] = useQueryState("source", parseAsString.withDefault(""))
  const [unassignedParam, setUnassignedParam] = useQueryState(
    "unassigned",
    parseAsBoolean.withDefault(false)
  )
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
  const [, setIsCancelling] = React.useState(false)

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
            store_id:
              selectedStoreIds.length === 1 ? Number(selectedStoreIds[0]) : undefined,
            work_type_id:
              selectedWorkTypeIds.length === 1 ? Number(selectedWorkTypeIds[0]) : undefined,
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
  const columns = React.useMemo(
    () =>
      buildApplicationColumns({
        locale,
        currentUserId: user.id,
        onCancel: (id) => setCancelId(id),
      }),
    [locale, user.id]
  )

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
      value: SOURCE_OPTIONS.find((s) => s.value === sourceParam)?.label ?? sourceParam,
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

  // ── Filter handlers ─────────────────────────────────────────────
  const handleChangeStores = (values: string[]) => {
    setSelectedStoreIds(values)
    void setPageParam(null)
  }
  const handleChangeWorkTypes = (values: string[]) => {
    setSelectedWorkTypeIds(values)
    void setPageParam(null)
  }
  const handleChangeDateFrom = (value: string | null) => {
    void setDateFromParam(value)
    void setPageParam(null)
  }
  const handleChangeDateTo = (value: string | null) => {
    void setDateToParam(value)
    void setPageParam(null)
  }
  const handleChangeSource = (value: string | null) => {
    void setSourceParam(value)
    void setPageParam(null)
  }
  const handleChangeUnassigned = (value: boolean | null) => {
    void setUnassignedParam(value)
    void setPageParam(null)
  }
  const handleChangeTab = (value: string) => {
    void setTabParam(value)
    void setPageParam(null)
  }

  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────

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

        {/* Tabs + filters */}
        <div className="flex flex-col gap-3">
          <TabsBar tab={tabParam} onChange={handleChangeTab} tabCounts={tabCounts} />

          <FiltersBar
            externalHrEnabled={externalHrEnabled}
            selectedStoreIds={selectedStoreIds}
            selectedWorkTypeIds={selectedWorkTypeIds}
            dateFromParam={dateFromParam}
            dateToParam={dateToParam}
            sourceParam={sourceParam}
            unassignedParam={unassignedParam}
            activeFilterCount={activeFilterCount}
            onChangeStores={handleChangeStores}
            onChangeWorkTypes={handleChangeWorkTypes}
            onChangeDateFrom={handleChangeDateFrom}
            onChangeDateTo={handleChangeDateTo}
            onChangeSource={handleChangeSource}
            onChangeUnassigned={handleChangeUnassigned}
            onClearAll={clearAllFilters}
            filterChips={filterChips}
          />
        </div>

        {/* Table area */}
        {isLoading ? (
          <ListSkeleton />
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
                  ? {
                      label: t("actions.new"),
                      href: ADMIN_ROUTES.freelanceApplicationNew,
                      icon: Plus,
                    }
                  : undefined
              }
            />
          )
        ) : (
          <ResponsiveDataTable
            columns={columns}
            data={data}
            mobileCardRender={(app) => <MobileCard app={app} locale={locale} />}
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
        <CancelDialog
          open={cancelId !== null}
          onOpenChange={(open) => {
            if (!open) setCancelId(null)
          }}
          onConfirm={handleCancel}
        />
      </div>
    </TooltipProvider>
  )
}
