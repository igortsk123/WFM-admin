"use client"

import { useState, useEffect, useCallback } from "react"
import { useTranslations, useLocale } from "next-intl"
import { toast } from "sonner"
import {
  Archive,
  RotateCcw,
  SearchX,
  Lock,
} from "lucide-react"

import {
  getStoreById,
  getStoreHistory,
  restoreStore,
  createStoreZone,
  updateStoreZone,
  deleteStoreZone,
  type StoreDetail as StoreDetailData,
  type StoreHistoryEvent,
  type StoreZoneWithCounts,
} from "@/lib/api"
import { ADMIN_ROUTES } from "@/lib/constants/routes"

import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"

import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"

import { StoreDetailSkeleton } from "./store-detail/skeleton"
import { EditStoreDialog } from "./store-detail/edit-store-dialog"
import { ArchiveStoreDialog } from "./store-detail/archive-store-dialog"
import { ZoneFormDialog, ZoneDeleteDialog, type ZoneDialogState } from "./store-detail/zone-dialogs"
import { StoreHeroCard } from "./store-detail/hero-card"
import { StoreOverviewTab } from "./store-detail/tab-overview"
import { StoreTeamTab } from "./store-detail/tab-team"
import { StoreZonesTab } from "./store-detail/tab-zones"
import { StoreHistoryTab } from "./store-detail/tab-history"
import { buildActivityFeedItems, getLamaColor } from "./store-detail/_shared"

// ─── Props ────────────────────────────────────────────────────────────────────

interface StoreDetailProps {
  storeId: number
}

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

export function StoreDetail({ storeId }: StoreDetailProps) {
  const t = useTranslations("screen.storeDetail")
  const locale = useLocale()

  const [data, setData] = useState<StoreDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [forbidden, setForbidden] = useState(false)

  const [history, setHistory] = useState<StoreHistoryEvent[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  // Dialog open states
  const [editOpen, setEditOpen] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [restoreLoading, setRestoreLoading] = useState(false)
  const [addressCopied, setAddressCopied] = useState(false)
  const [zoneDialog, setZoneDialog] = useState<ZoneDialogState | null>(null)
  const [zoneForm, setZoneForm] = useState({ name: "", code: "" })
  const [zoneSaving, setZoneSaving] = useState(false)
  const [zoneDeleteId, setZoneDeleteId] = useState<number | null>(null)

  const activityItems = buildActivityFeedItems()

  // ── Fetch ─────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getStoreById(storeId)
      setData(res.data)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "error"
      if (msg.toLowerCase().includes("forbidden") || msg.toLowerCase().includes("403")) {
        setForbidden(true)
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }, [storeId])

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true)
    try {
      const res = await getStoreHistory(storeId, { limit: 20 })
      setHistory(res.data)
    } catch {
      // silent
    } finally {
      setHistoryLoading(false)
    }
  }, [storeId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ── Actions ────────────────────────────────────────────────────────────

  async function handleRestore() {
    setRestoreLoading(true)
    try {
      await restoreStore(storeId)
      toast.success(t("toast.restored"))
      fetchData()
    } catch {
      toast.error(t("toast.error"))
    } finally {
      setRestoreLoading(false)
    }
  }

  function handleCopyAddress() {
    if (!data) return
    navigator.clipboard.writeText(data.address_full).then(() => {
      setAddressCopied(true)
      setTimeout(() => setAddressCopied(false), 2000)
    })
  }

  function openZoneAdd() {
    setZoneForm({ name: "", code: "" })
    setZoneDialog({ mode: "add" })
  }

  function openZoneEdit(zone: StoreZoneWithCounts) {
    setZoneForm({ name: zone.name, code: zone.code ?? "" })
    setZoneDialog({ mode: "edit", zone })
  }

  async function handleZoneSubmit() {
    if (!data || !zoneForm.name.trim()) return
    setZoneSaving(true)
    try {
      const result = zoneDialog?.mode === "edit" && zoneDialog.zone
        ? await updateStoreZone(storeId, zoneDialog.zone.id, { name: zoneForm.name.trim(), code: zoneForm.code.trim() || undefined })
        : await createStoreZone(storeId, { name: zoneForm.name.trim(), code: zoneForm.code.trim() || undefined })
      if (result.success) {
        toast.success(zoneDialog?.mode === "edit" ? t("zones.toast_updated") : t("zones.toast_added"))
        setZoneDialog(null)
        fetchData()
      } else {
        toast.error(result.error?.message ?? t("toast.error"))
      }
    } catch {
      toast.error(t("toast.error"))
    } finally {
      setZoneSaving(false)
    }
  }

  async function handleZoneDelete(zoneId: number) {
    if (!data) return
    try {
      const result = await deleteStoreZone(storeId, zoneId)
      if (result.success) {
        toast.success(t("zones.toast_deleted"))
        fetchData()
      } else {
        toast.error(result.error?.message ?? t("toast.error"))
      }
    } catch {
      toast.error(t("toast.error"))
    } finally {
      setZoneDeleteId(null)
    }
  }

  // ── History lazy load on tab switch ───────────────────────────────────

  function handleTabChange(value: string) {
    if (value === "history" && history.length === 0) {
      fetchHistory()
    }
  }

  // ── Error / forbidden / not found states ──────────────────────────────

  if (loading) return <StoreDetailSkeleton />

  if (forbidden) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-6">
        <EmptyState
          icon={Lock}
          title={t("states.forbidden_title")}
          description={t("states.forbidden_description")}
          action={{ label: t("breadcrumbs.stores"), href: ADMIN_ROUTES.stores }}
        />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-6">
        <EmptyState
          icon={SearchX}
          title={error ? t("states.error_title") : t("states.not_found_title")}
          description={error ? (error ?? t("states.not_found_description")) : t("states.not_found_description")}
          action={{ label: t("states.error_retry"), onClick: fetchData }}
        />
      </div>
    )
  }

  const lamaColor = getLamaColor(data.last_synced_at)

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-6 p-4 md:p-6 max-w-screen-xl mx-auto">
        {/* ── Dialogs ── */}
        <EditStoreDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          data={data}
          onSaved={fetchData}
        />
        <ArchiveStoreDialog
          open={archiveOpen}
          onOpenChange={setArchiveOpen}
          storeId={storeId}
          onArchived={fetchData}
        />
        <ZoneFormDialog
          state={zoneDialog}
          form={zoneForm}
          saving={zoneSaving}
          onChange={setZoneForm}
          onClose={() => setZoneDialog(null)}
          onSubmit={handleZoneSubmit}
        />
        <ZoneDeleteDialog
          zoneId={zoneDeleteId}
          onClose={() => setZoneDeleteId(null)}
          onConfirm={handleZoneDelete}
        />

        {/* ── PageHeader breadcrumb ── */}
        <PageHeader
          title={`${data.store_type} — ${data.address_full}`}
          breadcrumbs={[
            { label: t("breadcrumbs.home"), href: ADMIN_ROUTES.dashboard },
            { label: t("breadcrumbs.stores"), href: ADMIN_ROUTES.stores },
            { label: data.name },
          ]}
        />

        {/* ── Archived banner ── */}
        {data.archived && (
          <Alert variant="default" className="border-warning/50 bg-warning/5">
            <Archive className="size-4 text-warning" />
            <AlertTitle className="text-warning">Магазин архивирован</AlertTitle>
            <AlertDescription className="flex items-center justify-between gap-4">
              <span>{t("settings.archive_hint")}</span>
              <Button
                size="sm"
                variant="outline"
                onClick={handleRestore}
                disabled={restoreLoading}
                className="shrink-0"
              >
                <RotateCcw className="size-3.5" />
                {restoreLoading ? "Восстановление..." : t("actions.restore")}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* ── HERO CARD ── */}
        <StoreHeroCard
          data={data}
          storeId={storeId}
          locale={locale}
          lamaColor={lamaColor}
          onEdit={() => setEditOpen(true)}
          onArchive={() => setArchiveOpen(true)}
        />

        {/* ── TABS ── */}
        <Tabs defaultValue="overview" onValueChange={handleTabChange}>
          <ScrollArea>
            <TabsList className="inline-flex h-10 w-auto">
              <TabsTrigger value="overview">{t("tabs.overview")}</TabsTrigger>
              <TabsTrigger value="team">{t("tabs.team")}</TabsTrigger>
              <TabsTrigger value="zones">{t("tabs.zones")}</TabsTrigger>
              <TabsTrigger value="history">{t("tabs.history")}</TabsTrigger>
            </TabsList>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>

          <TabsContent value="overview" className="mt-4">
            <StoreOverviewTab
              data={data}
              storeId={storeId}
              activityItems={activityItems}
              addressCopied={addressCopied}
              onCopyAddress={handleCopyAddress}
            />
          </TabsContent>

          <TabsContent value="team" className="mt-4">
            <StoreTeamTab data={data} storeId={storeId} />
          </TabsContent>

          <TabsContent value="zones" className="mt-4">
            <StoreZonesTab
              data={data}
              onAddZone={openZoneAdd}
              onEditZone={openZoneEdit}
              onDeleteZone={(id) => setZoneDeleteId(id)}
            />
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <StoreHistoryTab
              data={data}
              history={history}
              loading={historyLoading}
              locale={locale}
            />
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  )
}
