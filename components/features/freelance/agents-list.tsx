"use client"

import * as React from "react"
import { useRouter } from "@/i18n/navigation"
import { useTranslations, useLocale } from "next-intl"
import { useQueryState, parseAsString, parseAsInteger } from "nuqs"
import { Plus, Users } from "lucide-react"
import { toast } from "sonner"

import type { Agent } from "@/lib/types"
import {
  getAgents,
  blockAgent,
  archiveAgent,
  unblockAgent,
} from "@/lib/api/freelance-agents"
import { ADMIN_ROUTES } from "@/lib/constants/routes"
import { useAuth } from "@/lib/contexts/auth-context"

import { Button } from "@/components/ui/button"

import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { ResponsiveDataTable } from "@/components/shared/responsive-data-table"

import { TableSkeleton } from "@/components/shared/table-skeleton"

import {
  AgentSheet,
  BlockDialog,
  FiltersBar,
  MobileCard,
  buildColumns,
  TAB_STATUS_MAP,
  type AgentTab,
  type SheetMode,
} from "./agents-list/index"

export function AgentsList() {
  const t = useTranslations("screen.freelanceAgents")
  const router = useRouter()
  const locale = useLocale()
  const { user } = useAuth()
  // useTransition для не-срочных обновлений (search/filter/tab) — input/клик
  // остаются responsive, фоновое перевычисление списка не блокирует ввод.
  const [, startTransition] = React.useTransition()

  const currentRole = user.role
  const canWrite = currentRole === "NETWORK_OPS" || currentRole === "HR_MANAGER"

  // Guard: only available in NOMINAL_ACCOUNT mode
  const isClientDirect = user.organization.payment_mode === "CLIENT_DIRECT"

  // ── URL state (nuqs) ──────────────────────────────────────────────
  const [tabParam, setTabParam] = useQueryState("tab", parseAsString.withDefault("active"))
  const [searchParam, setSearchParam] = useQueryState("q", parseAsString.withDefault(""))
  const [typeParam, setTypeParam] = useQueryState("type", parseAsString.withDefault(""))
  const [pageParam, setPageParam] = useQueryState("page", parseAsInteger.withDefault(1))

  const activeTab = (tabParam as AgentTab) || "active"

  // ── Data state ────────────────────────────────────────────────────
  const [data, setData] = React.useState<Agent[]>([])
  const [total, setTotal] = React.useState(0)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isError, setIsError] = React.useState(false)

  // ── Action state ──────────────────────────────────────────────────
  const [blockTarget, setBlockTarget] = React.useState<Agent | null>(null)
  const [isBlocking, setIsBlocking] = React.useState(false)
  const [isActing, setIsActing] = React.useState<string | null>(null)

  // ── Sheet state ───────────────────────────────────────────────────
  const [sheetOpen, setSheetOpen] = React.useState(false)
  const [sheetMode, setSheetMode] = React.useState<SheetMode>("create")
  const [sheetAgent, setSheetAgent] = React.useState<Agent | null>(null)

  // ── Fetch ─────────────────────────────────────────────────────────
  const fetchData = React.useCallback(async () => {
    setIsLoading(true)
    setIsError(false)
    try {
      const status = TAB_STATUS_MAP[activeTab as AgentTab] ?? "ACTIVE"
      const result = await getAgents({
        status,
        search: searchParam || undefined,
        page: pageParam,
        page_size: 20,
      })
      const filtered =
        typeParam
          ? result.data.filter((a) => a.type === typeParam)
          : result.data
      setData(filtered)
      setTotal(filtered.length)
    } catch {
      setIsError(true)
    } finally {
      setIsLoading(false)
    }
  }, [activeTab, searchParam, typeParam, pageParam])

  React.useEffect(() => {
    void fetchData()
  }, [fetchData])

  // ── Handlers ──────────────────────────────────────────────────────
  function handleRowClick(agent: Agent, e: React.MouseEvent) {
    const url = ADMIN_ROUTES.freelanceAgentDetail(agent.id)
    if (e.ctrlKey || e.metaKey) {
      window.open(url, "_blank", "noreferrer")
    } else {
      router.push(url)
    }
  }

  function openCreate() {
    setSheetMode("create")
    setSheetAgent(null)
    setSheetOpen(true)
  }

  function openEdit(agent: Agent) {
    setSheetMode("edit")
    setSheetAgent(agent)
    setSheetOpen(true)
  }

  async function handleBlockConfirm(reason: string) {
    if (!blockTarget) return
    setIsBlocking(true)
    try {
      const result = await blockAgent(blockTarget.id, reason)
      if (result.success) {
        toast.success(t("toasts.blocked"))
        setBlockTarget(null)
        void fetchData()
      } else {
        toast.error(result.error?.message ?? t("toasts.error"))
      }
    } finally {
      setIsBlocking(false)
    }
  }

  async function handleUnblock(agent: Agent) {
    setIsActing(agent.id)
    try {
      const result = await unblockAgent(agent.id)
      if (result.success) {
        toast.success(t("toasts.unblocked"))
        void fetchData()
      } else {
        toast.error(result.error?.message ?? t("toasts.error"))
      }
    } finally {
      setIsActing(null)
    }
  }

  async function handleArchive(agent: Agent) {
    setIsActing(agent.id)
    try {
      const result = await archiveAgent(agent.id)
      if (result.success) {
        toast.success(t("toasts.archived"))
        void fetchData()
      } else {
        toast.error(result.error?.message ?? t("toasts.error"))
      }
    } finally {
      setIsActing(null)
    }
  }

  // ── Columns / mobile card ─────────────────────────────────────────
  const columns = React.useMemo(
    () =>
      buildColumns({
        t,
        locale,
        canWrite,
        isActing,
        navigate: (url: string) => router.push(url),
        onEdit: openEdit,
        onBlock: (agent) => setBlockTarget(agent),
        onUnblock: (agent) => void handleUnblock(agent),
        onArchive: (agent) => void handleArchive(agent),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, canWrite, isActing, locale]
  )

  const mobileCard = React.useCallback(
    (agent: Agent) => (
      <MobileCard
        agent={agent}
        canWrite={canWrite}
        onEdit={openEdit}
        onBlock={(a) => setBlockTarget(a)}
        onUnblock={(a) => void handleUnblock(a)}
      />
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canWrite]
  )

  // ── Guard: CLIENT_DIRECT ──────────────────────────────────────────
  if (isClientDirect) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-center px-4">
        <p className="text-muted-foreground text-sm max-w-sm">
          Раздел «Агенты» недоступен в режиме прямых расчётов (CLIENT_DIRECT).
        </p>
      </div>
    )
  }

  const isEmpty = !isLoading && data.length === 0

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <PageHeader
        title={t("page_title")}
        subtitle={t("page_subtitle")}
        breadcrumbs={[
          { label: t("breadcrumbs.home"), href: ADMIN_ROUTES.dashboard },
          { label: t("breadcrumbs.freelance"), href: ADMIN_ROUTES.freelanceDashboard },
          { label: t("breadcrumbs.agents") },
        ]}
        actions={
          canWrite ? (
            <Button
              size="sm"
              onClick={openCreate}
              className="h-9 min-w-[44px]"
              aria-label={t("actions.new_agent")}
            >
              <Plus className="size-4 mr-1.5" aria-hidden="true" />
              <span className="hidden sm:inline">{t("actions.new_agent")}</span>
              <span className="sm:hidden">Агент</span>
            </Button>
          ) : undefined
        }
      />

      <FiltersBar
        activeTab={activeTab}
        onTabChange={(v) => {
          startTransition(() => {
            void setTabParam(v)
            void setPageParam(null)
          })
        }}
        searchValue={searchParam}
        onSearchChange={(v) => {
          startTransition(() => {
            void setSearchParam(v || null)
            void setPageParam(null)
          })
        }}
        typeValue={typeParam}
        onTypeChange={(v) => {
          startTransition(() => {
            void setTypeParam(v || null)
            void setPageParam(null)
          })
        }}
      />

      {/* Table / Cards */}
      {isLoading ? (
        <TableSkeleton />
      ) : isError ? (
        <div className="flex flex-col items-center gap-3 py-16">
          <p className="text-sm text-muted-foreground">Не удалось загрузить данные</p>
          <Button variant="outline" size="sm" onClick={() => void fetchData()}>
            Повторить
          </Button>
        </div>
      ) : isEmpty ? (
        <EmptyState
          icon={Users}
          title={t("empty.no_agents")}
          description={t("empty.description")}
          action={
            canWrite
              ? { label: t("actions.new_agent"), onClick: openCreate, icon: Plus }
              : undefined
          }
        />
      ) : (
        <div className="animate-in fade-in">
          <ResponsiveDataTable
            columns={columns}
            data={data}
            mobileCardRender={mobileCard}
            onRowClick={handleRowClick}
            pagination={{
              page: pageParam,
              pageSize: 20,
              total,
              onPageChange: (p) => void setPageParam(p),
            }}
          />
        </div>
      )}

      {/* Block dialog */}
      <BlockDialog
        open={!!blockTarget}
        onOpenChange={(v) => !v && setBlockTarget(null)}
        onConfirm={handleBlockConfirm}
        isLoading={isBlocking}
      />

      {/* Create / Edit sheet */}
      <AgentSheet
        open={sheetOpen}
        mode={sheetMode}
        agent={sheetAgent}
        onClose={() => setSheetOpen(false)}
        onSuccess={() => void fetchData()}
      />
    </div>
  )
}
