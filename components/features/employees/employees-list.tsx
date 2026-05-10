"use client"

import * as React from "react"
import { useRouter } from "@/i18n/navigation"
import { useTranslations, useLocale } from "next-intl"
import { useQueryState, parseAsString, parseAsInteger } from "nuqs"
import { Archive, SearchX, Users } from "lucide-react"
import { toast } from "sonner"

import type {
  Permission,
  EmployeeType,
  FreelancerStatus,
} from "@/lib/types"
import type { UserWithAssignment } from "@/lib/api/users"
import { getUsers, archiveUser } from "@/lib/api/users"
import { ADMIN_ROUTES } from "@/lib/constants/routes"
import { useAuth } from "@/lib/contexts/auth-context"

import { Button } from "@/components/ui/button"
import { AlertDialog } from "@/components/ui/alert-dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"

import { PageHeader } from "@/components/shared/page-header"
import { ResponsiveDataTable } from "@/components/shared/responsive-data-table"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"

import {
  PermissionAssignDialog,
  BulkRoleDialog,
  BulkStoreDialog,
  BulkZoneDialog,
} from "./bulk-dialogs"

import { BulkActionBar } from "./employees-list/bulk-action-bar"
import { buildColumns } from "./employees-list/columns"
import { FiltersBar } from "./employees-list/filters-bar"
import { HeaderActions } from "./employees-list/header-actions"
import { MobileCard } from "./employees-list/mobile-card"
import { StatsRow } from "./employees-list/stats-row"

// ─────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────

export function EmployeesList() {
  const t = useTranslations("screen.employees")
  const tPerm = useTranslations("permission")
  const router = useRouter()
  const locale = useLocale()
  const { user } = useAuth()
  // useTransition — фильтры/поиск как non-urgent, ввод остаётся responsive.
  const [, startTransition] = React.useTransition()

  const currentRole = user.role

  const canFullCRUD =
    currentRole === "HR_MANAGER" || currentRole === "NETWORK_OPS"
  const canArchiveBulk = canFullCRUD
  const canImpersonate = canFullCRUD
  const hideStore = currentRole === "STORE_DIRECTOR"

  // ── URL state ───────────────────────────────────────────────────
  const [statusParam, setStatusParam] = useQueryState(
    "status",
    parseAsString.withDefault("active")
  )
  const [searchParam, setSearchParam] = useQueryState(
    "search",
    parseAsString.withDefault("")
  )
  const [pageParam, setPageParam] = useQueryState(
    "page",
    parseAsInteger.withDefault(1)
  )

  // Local filter state (not in URL for brevity — complex multi arrays)
  const [selectedStoreIds, setSelectedStoreIds] = React.useState<string[]>([])
  const [selectedPositionIds, setSelectedPositionIds] = React.useState<
    string[]
  >([])
  const [selectedPermissions, setSelectedPermissions] = React.useState<
    string[]
  >([])
  const [selectedEmploymentType, setSelectedEmploymentType] =
    React.useState<string>("")
  const [selectedFreelancerStatus, setSelectedFreelancerStatus] =
    React.useState<string>("")
  const [selectedSource, setSelectedSource] = React.useState<string>("")

  // ── Data state ──────────────────────────────────────────────────
  const [data, setData] = React.useState<UserWithAssignment[]>([])
  const [total, setTotal] = React.useState(0)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isError, setIsError] = React.useState(false)

  // ── Bulk selection ──────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = React.useState<Set<number>>(new Set())

  // ── Dialog state ────────────────────────────────────────────────
  const [permDialogOpen, setPermDialogOpen] = React.useState(false)
  const [archivingId, setArchivingId] = React.useState<number | null>(null)
  const [bulkArchiveDialogOpen, setBulkArchiveDialogOpen] =
    React.useState(false)
  const [bulkRoleDialogOpen, setBulkRoleDialogOpen] = React.useState(false)
  const [bulkStoreDialogOpen, setBulkStoreDialogOpen] = React.useState(false)
  const [bulkZoneMode, setBulkZoneMode] = React.useState<"assign" | "revoke">(
    "assign"
  )
  const [bulkZoneDialogOpen, setBulkZoneDialogOpen] = React.useState(false)
  const [bulkBarLoading, _setBulkBarLoading] = React.useState(false)

  // ── Fetch ───────────────────────────────────────────────────────
  // refreshTick — bump-state для ручного re-fetch (после bulk-операций
  // и т.п.). Изменение → useEffect перевыполняется. fetchData() ниже
  // экспонируется как стабильная no-args функция, использующая этот bump.
  const [refreshTick, setRefreshTick] = React.useState(0)
  const fetchData = React.useCallback(() => {
    setRefreshTick((t) => t + 1)
  }, [])

  // Inline effect с cancelled-flag — стандартный pattern для async fetch:
  // 1) защита от race condition при unmount (стейт не пишется после dispose),
  // 2) убирает overhead useCallback (раньше было 11 dep, любое изменение →
  //    новая ссылка callback → re-fetch). Зависимости перечислены явно
  //    в массиве deps useEffect — JSON.stringify по массивам гарантирует
  //    стабильное сравнение (без него nuqs возвращает новые refs на каждый
  //    render → лишние re-fetch).
  React.useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setIsError(false)
    const archived = statusParam === "archived"
    getUsers({
      archived,
      search: searchParam || undefined,
      store_ids:
        selectedStoreIds.length > 0
          ? selectedStoreIds.map(Number)
          : undefined,
      position_ids:
        selectedPositionIds.length > 0
          ? selectedPositionIds.map(Number)
          : undefined,
      permissions:
        selectedPermissions.length > 0
          ? (selectedPermissions as Permission[])
          : undefined,
      employment_type: selectedEmploymentType
        ? (selectedEmploymentType as EmployeeType)
        : undefined,
      freelancer_status: selectedFreelancerStatus
        ? (selectedFreelancerStatus as FreelancerStatus)
        : undefined,
      source: selectedSource
        ? (selectedSource as "MANUAL" | "EXTERNAL_SYNC")
        : undefined,
      page: pageParam,
      page_size: 20,
    })
      .then((result) => {
        if (cancelled) return
        setData(result.data)
        setTotal(result.total ?? 0)
      })
      .catch(() => {
        if (cancelled) return
        setIsError(true)
      })
      .finally(() => {
        if (cancelled) return
        setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
    // Зависимости через JSON.stringify по массивам — иначе nuqs пересоздаёт
    // массивы на каждый render и хук триггерится впустую.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    statusParam,
    searchParam,
    JSON.stringify(selectedStoreIds),
    JSON.stringify(selectedPositionIds),
    JSON.stringify(selectedPermissions),
    selectedEmploymentType,
    selectedFreelancerStatus,
    selectedSource,
    pageParam,
    refreshTick,
  ])

  // ── Counts for tabs ─────────────────────────────────────────────
  const [allCount, setAllCount] = React.useState(0)
  const [activeCount, setActiveCount] = React.useState(0)
  const [archivedCount, setArchivedCount] = React.useState(0)

  React.useEffect(() => {
    let cancelled = false
    Promise.all([
      getUsers({ archived: false, page_size: 1 }),
      getUsers({ archived: true, page_size: 1 }),
    ])
      .then(([active, archived]) => {
        if (cancelled) return
        const a = active.total ?? 0
        const ar = archived.total ?? 0
        setActiveCount(a)
        setArchivedCount(ar)
        setAllCount(a + ar)
      })
      .catch(() => {
        // Counts опциональны — silent fail не блокирует основной поток.
      })
    return () => {
      cancelled = true
    }
  }, [])

  // ── Org feature flags (mock: external_hr_enabled) ──
  // In production these come from user.organization.
  // showAgentFilter удалён — агентский scope относится только к freelance-карточкам
  // (см. /freelance/* ); в общем списке /employees он смешивал штатных и внештатных.
  const externalHrEnabled = true
  const showSourceFilter = externalHrEnabled
  const showFreelancerStatusFilter = selectedEmploymentType === "FREELANCE"

  // ── Active filter count ─────────────────────────────────────────
  const activeFilterCount =
    selectedStoreIds.length +
    selectedPositionIds.length +
    selectedPermissions.length +
    (selectedEmploymentType ? 1 : 0) +
    (selectedFreelancerStatus ? 1 : 0) +
    (selectedSource ? 1 : 0)

  const hasActiveFilters = activeFilterCount > 0 || !!searchParam

  function clearAllFilters() {
    setSelectedStoreIds([])
    setSelectedPositionIds([])
    setSelectedPermissions([])
    setSelectedEmploymentType("")
    setSelectedFreelancerStatus("")
    setSelectedSource("")
    setSearchParam(null)
    setPageParam(null)
  }

  // ── Selection helpers ───────────────────────────────────────────
  const allSelected =
    data.length > 0 && data.every((u) => selectedIds.has(u.id))
  const someSelected = selectedIds.size > 0

  function toggleAll() {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(data.map((u) => u.id)))
    }
  }

  const toggleRow = React.useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleOpenPermissions = React.useCallback((userId: number) => {
    setSelectedIds(new Set([userId]))
    setPermDialogOpen(true)
  }, [])

  const handleArchiveRow = React.useCallback((userId: number) => {
    setArchivingId(userId)
  }, [])

  // ── Row actions ─────────────────────────────────────────────────
  async function handleArchiveSingle(id: number) {
    const result = await archiveUser(id)
    if (result.success) {
      toast.success(t("toast.archived"))
      fetchData()
      setSelectedIds(new Set())
    } else {
      toast.error(t("toast.error"))
    }
  }

  async function handleBulkArchive() {
    const ids = Array.from(selectedIds)
    const results = await Promise.all(ids.map((id) => archiveUser(id)))
    const successCount = results.filter((r) => r.success).length
    if (successCount > 0) {
      toast.success(t("toast.bulk_archived", { count: successCount }))
      fetchData()
      setSelectedIds(new Set())
    } else {
      toast.error(t("toast.error"))
    }
    setBulkArchiveDialogOpen(false)
  }

  function handleRowClick(row: UserWithAssignment, e: React.MouseEvent) {
    if (e.metaKey || e.ctrlKey) {
      return
    }
    router.push(ADMIN_ROUTES.employeeDetail(String(row.id)))
  }

  // ── Permission/Role label helpers ────────────────────────────────
  const permLabelMap: Record<Permission, string> = {
    CASHIER: tPerm("cashier"),
    SALES_FLOOR: tPerm("sales_floor"),
    SELF_CHECKOUT: tPerm("self_checkout"),
    WAREHOUSE: tPerm("warehouse"),
    PRODUCTION_LINE: tPerm("production_line"),
  }

  // ── Columns ─────────────────────────────────────────────────────
  const columns = buildColumns({
    t: t as (key: string, vars?: Record<string, unknown>) => string,
    locale,
    hideStore,
    canFullCRUD,
    canArchiveBulk,
    canImpersonate,
    selectedIds,
    allSelected,
    toggleAll,
    toggleRow,
    onOpenPermissions: (userId: number) => {
      setSelectedIds(new Set([userId]))
      setPermDialogOpen(true)
    },
    onArchive: (userId: number) => setArchivingId(userId),
  })

  // ── Empty state variants ─────────────────────────────────────────
  function getEmptyState() {
    if (hasActiveFilters || !!searchParam) {
      return {
        icon: SearchX,
        title: t("empty.filtered.title"),
        description: t("empty.filtered.subtitle"),
        action: {
          label: t("empty.filtered.reset"),
          onClick: clearAllFilters,
        },
      }
    }
    if (statusParam === "archived") {
      return {
        icon: Archive,
        title: t("empty.archived.title"),
        description: t("empty.archived.subtitle"),
      }
    }
    return {
      icon: Users,
      title: t("empty.all.title"),
      description: "",
      action: canFullCRUD
        ? {
            label: t("empty.all.cta"),
            onClick: () => router.push(ADMIN_ROUTES.employeeNew),
          }
        : undefined,
    }
  }

  const emptyState = getEmptyState()

  // ── Tab counts ──────────────────────────────────────────────────
  const tabCountMap: Record<string, number> = {
    all: allCount,
    active: activeCount,
    archived: archivedCount,
  }

  const displayTotal = tabCountMap[statusParam] ?? total

  // ── RENDER ────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <PageHeader
        title={t("page_title")}
        subtitle={
          isLoading ? undefined : t("counter", { count: displayTotal })
        }
        actions={<HeaderActions canFullCRUD={canFullCRUD} />}
      />

      {/* Tabs */}
      <StatsRow
        statusParam={statusParam}
        activeCount={activeCount}
        archivedCount={archivedCount}
        onStatusChange={(v) => {
          setStatusParam(v === "active" ? null : v)
          setPageParam(null)
          setSelectedIds(new Set())
        }}
      />

      {/* Search + filters + chips */}
      <FiltersBar
        search={searchParam ?? ""}
        onSearchChange={(v) => {
          startTransition(() => {
            setSearchParam(v || null)
            setPageParam(null)
          })
        }}
        selectedStoreIds={selectedStoreIds}
        onStoreIdsChange={(v) => {
          startTransition(() => {
            setSelectedStoreIds(v)
            setPageParam(null)
          })
        }}
        selectedPositionIds={selectedPositionIds}
        onPositionIdsChange={(v) => {
          startTransition(() => {
            setSelectedPositionIds(v)
            setPageParam(null)
          })
        }}
        selectedPermissions={selectedPermissions}
        onPermissionsChange={(v) => {
          startTransition(() => {
            setSelectedPermissions(v)
            setPageParam(null)
          })
        }}
        selectedEmploymentType={selectedEmploymentType}
        onEmploymentTypeChange={(v) => {
          startTransition(() => {
            setSelectedEmploymentType(v)
            setPageParam(null)
          })
        }}
        selectedFreelancerStatus={selectedFreelancerStatus}
        onFreelancerStatusChange={(v) => {
          startTransition(() => {
            setSelectedFreelancerStatus(v)
            setPageParam(null)
          })
        }}
        selectedSource={selectedSource}
        onSourceChange={(v) => {
          startTransition(() => {
            setSelectedSource(v)
            setPageParam(null)
          })
        }}
        hideStore={hideStore}
        showSourceFilter={showSourceFilter}
        showFreelancerStatusFilter={showFreelancerStatusFilter}
        activeFilterCount={activeFilterCount}
        clearAllFilters={clearAllFilters}
        permLabelMap={permLabelMap}
      />

      {/* Error state */}
      {isError && (
        <Alert variant="destructive">
          <AlertDescription className="flex items-center gap-3">
            Не удалось загрузить список сотрудников.
            <Button size="sm" variant="outline" onClick={fetchData}>
              Повторить
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Table */}
      {!isError && (
        <ResponsiveDataTable
          columns={columns}
          data={data}
          mobileCardRender={(u) => (
            <MobileCard
              user={u}
              hideStore={hideStore}
              canFullCRUD={canFullCRUD}
              canArchiveBulk={canArchiveBulk}
              canImpersonate={canImpersonate}
              selectedIds={selectedIds}
              toggleRow={toggleRow}
              onOpenPermissions={handleOpenPermissions}
              onArchive={handleArchiveRow}
            />
          )}
          isLoading={isLoading}
          isEmpty={!isLoading && data.length === 0}
          emptyMessage={{
            title: emptyState.title,
            description: emptyState.description ?? "",
          }}
          pagination={{
            page: pageParam,
            pageSize: 20,
            total,
            onPageChange: (p) => setPageParam(p),
          }}
          onRowClick={handleRowClick}
        />
      )}

      {/* Bulk action bar */}
      {someSelected && (
        <BulkActionBar
          selectedIds={selectedIds}
          onClearSelection={() => setSelectedIds(new Set())}
          bulkBarLoading={bulkBarLoading}
          canArchiveBulk={canArchiveBulk}
          onAssignRole={() => setBulkRoleDialogOpen(true)}
          onChangeStore={() => setBulkStoreDialogOpen(true)}
          onZoneAction={(mode) => {
            setBulkZoneMode(mode)
            setBulkZoneDialogOpen(true)
          }}
          onArchive={() => setBulkArchiveDialogOpen(true)}
        />
      )}

      {/* Dialogs */}
      <PermissionAssignDialog
        open={permDialogOpen}
        onOpenChange={setPermDialogOpen}
        selectedIds={Array.from(selectedIds)}
        onSuccess={() => {
          fetchData()
          setSelectedIds(new Set())
        }}
      />

      <BulkRoleDialog
        open={bulkRoleDialogOpen}
        onOpenChange={setBulkRoleDialogOpen}
        selectedIds={Array.from(selectedIds)}
        onSuccess={() => {
          fetchData()
          setSelectedIds(new Set())
        }}
      />

      <BulkStoreDialog
        open={bulkStoreDialogOpen}
        onOpenChange={setBulkStoreDialogOpen}
        selectedIds={Array.from(selectedIds)}
        onSuccess={() => {
          fetchData()
          setSelectedIds(new Set())
        }}
      />

      <BulkZoneDialog
        open={bulkZoneDialogOpen}
        onOpenChange={setBulkZoneDialogOpen}
        mode={bulkZoneMode}
        selectedIds={Array.from(selectedIds)}
        onSuccess={() => {
          fetchData()
          setSelectedIds(new Set())
        }}
      />

      {/* Single archive confirm */}
      <AlertDialog
        open={archivingId !== null}
        onOpenChange={(o) => !o && setArchivingId(null)}
      >
        <ConfirmDialog
          title={t("dialogs.archive_title")}
          message={t("dialogs.archive_description")}
          confirmLabel={t("dialogs.archive_confirm")}
          variant="destructive"
          onConfirm={async () => {
            if (archivingId !== null) await handleArchiveSingle(archivingId)
          }}
          onOpenChange={(o) => !o && setArchivingId(null)}
        />
      </AlertDialog>

      {/* Bulk archive confirm */}
      <AlertDialog
        open={bulkArchiveDialogOpen}
        onOpenChange={setBulkArchiveDialogOpen}
      >
        <ConfirmDialog
          title={t("dialogs.archive_title")}
          message={t("dialogs.archive_description")}
          confirmLabel={t("dialogs.archive_confirm")}
          variant="destructive"
          onConfirm={handleBulkArchive}
          onOpenChange={setBulkArchiveDialogOpen}
        />
      </AlertDialog>
    </div>
  )
}
