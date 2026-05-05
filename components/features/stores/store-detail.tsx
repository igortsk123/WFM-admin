"use client"

import { useState, useEffect, useCallback } from "react"
import { useTranslations, useLocale } from "next-intl"
import { toast } from "sonner"
import Link from "next/link"
import {
  Store as StoreIcon,
  MapPin,
  Plus,
  CalendarDays,
  Pencil,
  MoreHorizontal,
  Archive,
  RefreshCw,
  Users,
  Clock,
  AlertCircle,
  LayoutGrid,
  Activity,
  Phone,
  Mail,
  Copy,
  Check,
  SearchX,
  Lock,
  RotateCcw,
  Trash2,
  ChevronRight,
  UserCog,
  History,
} from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts"

import type { ArchiveReason } from "@/lib/types"
import {
  getStoreById,
  getStoreHistory,
  updateStore,
  archiveStore,
  restoreStore,
  type StoreDetail as StoreDetailData,
  type StoreHistoryEvent,
  type StoreZoneWithCounts,
} from "@/lib/api"
import { ADMIN_ROUTES } from "@/lib/constants/routes"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"

import { PageHeader } from "@/components/shared/page-header"
import { ActivityFeed } from "@/components/shared/activity-feed"
import type { ActivityItem } from "@/components/shared/activity-feed"
import { EmptyState } from "@/components/shared/empty-state"

// ─── Props ────────────────────────────────────────────────────────────────────

interface StoreDetailProps {
  storeId: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRelative(dateStr: string | undefined, locale: string): string {
  if (!dateStr) return "—"
  const d = new Date(dateStr)
  const diffMs = Date.now() - d.getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  const diffH = Math.floor(diffMin / 60)
  const diffD = Math.floor(diffH / 24)
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" })
  if (diffMin < 1) return rtf.format(0, "minute")
  if (diffMin < 60) return rtf.format(-diffMin, "minute")
  if (diffH < 24) return rtf.format(-diffH, "hour")
  if (diffD < 7) return rtf.format(-diffD, "day")
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(d)
}

function getInitials(first: string, last: string): string {
  return `${last.charAt(0)}${first.charAt(0)}`.toUpperCase()
}

const WEEK_LABELS_RU = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]

function buildWeekActivity(storeId: number) {
  const seed = storeId * 7
  return WEEK_LABELS_RU.map((label, i) => ({
    label,
    plan: 25 + ((seed + i * 3) % 20),
    fact: 15 + ((seed + i * 5) % 22),
  }))
}

function buildActivityFeedItems(): ActivityItem[] {
  const now = Date.now()
  const ago = (h: number) => new Date(now - h * 3600_000).toISOString()
  return [
    { id: "af1", timestamp: ago(0.5), actor: "Иванов А. С.", action: "завершил задачу «Выкладка молочки»", type: "TASK_COMPLETED" },
    { id: "af2", timestamp: ago(1.2), actor: "Система", action: "синхронизировала расписание LAMA", type: "SYSTEM" },
    { id: "af3", timestamp: ago(2), actor: "Соколова А. В.", action: "добавила зону «Кофейная»", type: "EMPLOYEE" },
    { id: "af4", timestamp: ago(4), actor: "Иванов А. С.", action: "создал задачу «Инвентаризация склада»", type: "TASK_CREATED" },
    { id: "af5", timestamp: ago(6), actor: "Петров И. Н.", action: "заблокировал задачу «Приёмка товара»", type: "TASK_BLOCKED" },
    { id: "af6", timestamp: ago(22), actor: "Соколова А. В.", action: "обновила контакты магазина", type: "EMPLOYEE" },
    { id: "af7", timestamp: ago(25), actor: "ИИ", action: "предложил оптимизацию зон кассы", type: "AI" },
    { id: "af8", timestamp: ago(48), actor: "Иванов А. С.", action: "архивировал задачу «Декор витрины»", type: "TASK_ARCHIVED" },
  ]
}

// ─── History event type label ─────────────────────────────────────────────────

const HISTORY_TYPE_LABELS: Record<StoreHistoryEvent["type"], string> = {
  CREATED: "Создан",
  UPDATED: "Обновлён",
  MANAGER_CHANGED: "Смена управляющего",
  SUPERVISOR_CHANGED: "Смена супервайзера",
  ZONE_ADDED: "Зона добавлена",
  ZONE_REMOVED: "Зона удалена",
  LAMA_SYNC: "LAMA-синхронизация",
  ARCHIVED: "Архивирован",
  RESTORED: "Восстановлен",
}

// ─── Zone icon mapping ────────────────────────────────────────────────────────

function ZoneIcon({ name }: { name: string }) {
  const lower = name.toLowerCase()
  if (lower.includes("касс")) return <span className="text-lg">🏧</span>
  if (lower.includes("склад") || lower.includes("хран")) return <span className="text-lg">📦</span>
  if (lower.includes("кофе") || lower.includes("cafe")) return <span className="text-lg">☕</span>
  if (lower.includes("самокас") || lower.includes("self")) return <span className="text-lg">🤖</span>
  if (lower.includes("торг") || lower.includes("зал")) return <span className="text-lg">🛒</span>
  if (lower.includes("возврат")) return <span className="text-lg">↩️</span>
  return <LayoutGrid className="size-4 text-muted-foreground" />
}

// ═══════════════════════════════════════════════════════════════════
// LOADING SKELETON
// ═══════════════════════════════════════════════════════════════════

function StoreDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <Skeleton className="h-5 w-56" />
      <Skeleton className="h-48 w-full rounded-xl" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-10 w-96 rounded-lg" />
      <Skeleton className="h-80 w-full rounded-xl" />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// EDIT STORE DIALOG
// ═══════════════════════════════════════════════════════════════════

interface EditStoreDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  data: StoreDetailData
  onSaved: () => void
}

function EditStoreDialog({ open, onOpenChange, data, onSaved }: EditStoreDialogProps) {
  const t = useTranslations("screen.storeDetail")
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: data.name,
    external_code: data.external_code,
    address: data.address,
    city: data.city,
    store_type: data.store_type,
    lat: String(data.geo?.lat ?? ""),
    lng: String(data.geo?.lng ?? ""),
  })

  function handleChange(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      await updateStore(data.id, {
        name: form.name,
        external_code: form.external_code,
        address: form.address,
        city: form.city,
        store_type: form.store_type,
        geo: form.lat && form.lng ? { lat: parseFloat(form.lat), lng: parseFloat(form.lng) } : data.geo,
      })
      toast.success(t("toast.store_updated"))
      onSaved()
      onOpenChange(false)
    } catch {
      toast.error(t("toast.error"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("dialogs.edit_title")}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-name">{t("dialogs.edit_name")}</Label>
            <Input id="edit-name" value={form.name} onChange={(e) => handleChange("name", e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-code">{t("dialogs.edit_external_code")}</Label>
            <Input id="edit-code" value={form.external_code} onChange={(e) => handleChange("external_code", e.target.value)} className="font-mono" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-address">{t("dialogs.edit_address")}</Label>
            <Input id="edit-address" value={form.address} onChange={(e) => handleChange("address", e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-city">{t("dialogs.edit_city")}</Label>
            <Input id="edit-city" value={form.city} onChange={(e) => handleChange("city", e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-type">{t("dialogs.edit_store_type")}</Label>
            <Input id="edit-type" value={form.store_type} onChange={(e) => handleChange("store_type", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-lat">{t("dialogs.edit_geo_lat")}</Label>
              <Input id="edit-lat" value={form.lat} onChange={(e) => handleChange("lat", e.target.value)} placeholder="56.484" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-lng">{t("dialogs.edit_geo_lng")}</Label>
              <Input id="edit-lng" value={form.lng} onChange={(e) => handleChange("lng", e.target.value)} placeholder="84.957" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Отмена</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Сохранение..." : "Сохранить"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ═══════════════════════════════════════════════════════════════════
// ARCHIVE DIALOG
// ═══════════════════════════════════════════════════════════════════

interface ArchiveStoreDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  storeId: number
  onArchived: () => void
}

const ARCHIVE_REASONS: { value: ArchiveReason; labelKey: string }[] = [
  { value: "CLOSED", labelKey: "archive_reason_closed" },
  { value: "DUPLICATE", labelKey: "archive_reason_duplicate" },
  { value: "WRONG_DATA", labelKey: "archive_reason_wrong_data" },
  { value: "OBSOLETE", labelKey: "archive_reason_obsolete" },
  { value: "OTHER", labelKey: "archive_reason_other" },
]

function ArchiveStoreDialog({ open, onOpenChange, storeId, onArchived }: ArchiveStoreDialogProps) {
  const t = useTranslations("screen.storeDetail")
  const [reason, setReason] = useState<ArchiveReason>("OTHER")
  const [loading, setLoading] = useState(false)

  async function handleArchive() {
    setLoading(true)
    try {
      await archiveStore(storeId, reason)
      toast.success(t("toast.archived"))
      onArchived()
      onOpenChange(false)
    } catch {
      toast.error(t("toast.error"))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("dialogs.archive_title")}</AlertDialogTitle>
          <AlertDialogDescription>{t("dialogs.archive_description")}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-2">
          <Label className="mb-2 block text-sm">{t("dialogs.archive_reason_label")}</Label>
          <Select value={reason} onValueChange={(v) => setReason(v as ArchiveReason)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ARCHIVE_REASONS.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {t(`dialogs.${r.labelKey}` as Parameters<typeof t>[0])}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <AlertDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Отмена</Button>
          <Button variant="destructive" onClick={handleArchive} disabled={loading}>
            {loading ? "Архивирование..." : t("actions.archive")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// ═══════════════════════════════════════════════════════════════════
// ZONE CARD
// ═══════════════════════════════════════════════════════════════════

interface ZoneCardProps {
  zone: StoreZoneWithCounts
  storeCode: string
  onEdit?: (zone: StoreZoneWithCounts) => void
  onDelete?: (zone: StoreZoneWithCounts) => void
}

function ZoneCard({ zone, storeCode, onEdit, onDelete }: ZoneCardProps) {
  const t = useTranslations("screen.storeDetail")
  const canDelete = zone.tasks_today === 0

  return (
    <Card className="flex flex-col gap-0 overflow-hidden">
      <CardHeader className="flex flex-row items-start gap-3 pb-2">
        <span className="flex size-9 items-center justify-center rounded-lg bg-muted shrink-0">
          <ZoneIcon name={zone.name} />
        </span>
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-foreground truncate">{zone.name}</span>
            {zone.is_global ? (
              <Badge variant="secondary" className="text-xs shrink-0">{t("zones.global_badge")}</Badge>
            ) : (
              <Badge variant="outline" className="text-xs font-mono shrink-0">{t("zones.store_badge", { code: storeCode })}</Badge>
            )}
          </div>
          {zone.code && (
            <span className="text-xs text-muted-foreground font-mono">{zone.code}</span>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 pt-0">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="flex flex-col gap-0.5 rounded-md bg-muted/50 p-2">
            <span className="text-base font-semibold text-foreground">{zone.employees_count}</span>
            <span className="text-xs text-muted-foreground leading-tight">{t("zones.stat_employees")}</span>
          </div>
          <div className="flex flex-col gap-0.5 rounded-md bg-muted/50 p-2">
            <span className="text-base font-semibold text-foreground">{zone.tasks_today}</span>
            <span className="text-xs text-muted-foreground leading-tight">{t("zones.stat_tasks")}</span>
          </div>
          <div className="flex flex-col gap-0.5 rounded-md bg-muted/50 p-2">
            <span className="text-base font-semibold text-foreground">{zone.active_shifts_count}</span>
            <span className="text-xs text-muted-foreground leading-tight">{t("zones.stat_shifts")}</span>
          </div>
        </div>
        <div className="flex items-center justify-end gap-1 pt-1 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => onEdit?.(zone)}
          >
            <Pencil className="size-3" />
            {t("zones.edit")}
          </Button>
          <TooltipProvider>
            <UITooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
                    disabled={!canDelete}
                    onClick={() => canDelete && onDelete?.(zone)}
                  >
                    <Trash2 className="size-3" />
                    {t("zones.delete")}
                  </Button>
                </span>
              </TooltipTrigger>
              {!canDelete && (
                <TooltipContent side="top" className="max-w-48 text-center text-xs">
                  {t("zones.delete_disabled")}
                </TooltipContent>
              )}
            </UITooltip>
          </TooltipProvider>
        </div>
      </CardContent>
    </Card>
  )
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

  const weekData = buildWeekActivity(storeId)

  // LAMA sync indicator color
  const lamaSyncedHoursAgo = data.last_synced_at
    ? Math.floor((Date.now() - new Date(data.last_synced_at).getTime()) / 3_600_000)
    : null
  const lamaColor =
    lamaSyncedHoursAgo === null
      ? "text-muted-foreground"
      : lamaSyncedHoursAgo < 2
        ? "text-success"
        : lamaSyncedHoursAgo < 24
          ? "text-warning"
          : "text-destructive"

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

        {/* ── PageHeader breadcrumb ── */}
        <PageHeader
          title={`${data.external_code} — ${data.address_full}`}
          breadcrumbs={[
            { label: t("breadcrumbs.home"), href: ADMIN_ROUTES.dashboard },
            { label: t("breadcrumbs.stores"), href: ADMIN_ROUTES.stores },
            { label: data.external_code },
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
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              {/* Left: identity */}
              <div className="flex items-start gap-4">
                <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <StoreIcon className="size-7" />
                </div>
                <div className="flex flex-col gap-2 min-w-0">
                  <h2 className="text-2xl font-semibold font-sans text-foreground text-balance leading-tight">
                    {data.external_code} — {data.address_full}
                  </h2>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="font-mono text-xs">{data.external_code}</Badge>
                    <Badge variant="secondary" className="text-xs">{data.store_type}</Badge>
                    {data.archived ? (
                      <Badge variant="destructive" className="text-xs">{t("hero.archived_badge")}</Badge>
                    ) : (
                      <Badge className="text-xs bg-success/15 text-success border-0 hover:bg-success/20">
                        {t("hero.active_badge")}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="size-3.5 shrink-0" />
                    <span>{data.address_full}</span>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-1">
                    {data.manager && (
                      <span className="flex items-center gap-1">
                        <Users className="size-3.5" />
                        {t("hero.manager_label")}: <span className="font-medium text-foreground">{data.manager.last_name} {data.manager.first_name[0]}.</span>
                      </span>
                    )}
                    {data.supervisor && (
                      <span className="flex items-center gap-1">
                        <UserCog className="size-3.5" />
                        {t("hero.supervisor_label")}: <span className="font-medium text-foreground">{data.supervisor.last_name} {data.supervisor.first_name[0]}.</span>
                      </span>
                    )}
                    <span className={`flex items-center gap-1 ${lamaColor}`}>
                      <RefreshCw className="size-3.5" />
                      {data.last_synced_at
                        ? t("hero.lama_synced", { ago: formatRelative(data.last_synced_at, locale) })
                        : t("hero.lama_never")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: actions */}
              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <Button size="sm" asChild>
                  <Link href={`${ADMIN_ROUTES.taskNew}?store_id=${storeId}`}>
                    <Plus className="size-4" />
                    {t("actions.create_task")}
                  </Link>
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <Link href={`${ADMIN_ROUTES.schedule}?store_id=${storeId}`}>
                    <CalendarDays className="size-4" />
                    {t("actions.schedule")}
                  </Link>
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
                  <Pencil className="size-4" />
                  {t("actions.edit")}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline" aria-label={t("actions.more")}>
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    {!data.archived && (
                      <DropdownMenuItem
                        className="gap-2 text-destructive focus:text-destructive"
                        onClick={() => setArchiveOpen(true)}
                      >
                        <Archive className="size-4" />
                        {t("actions.archive")}
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* ── KPI stats grid ── */}
            <div className="grid grid-cols-2 gap-3 mt-6 border-t border-border pt-5 md:grid-cols-3 lg:grid-cols-6">
              <KpiMiniCard label={t("hero.kpi.team")} value={data.team_count} icon={<Users className="size-3.5" />} />
              <KpiMiniCard label={t("hero.kpi.team_active")} value={data.team_active_count} icon={<Activity className="size-3.5" />} />
              <KpiMiniCard label={t("hero.kpi.tasks_today")} value={data.kpi.tasks_today} icon={<Clock className="size-3.5" />} />
              <KpiMiniCard
                label={t("hero.kpi.on_review")}
                value={data.kpi.on_review_today}
                icon={<AlertCircle className="size-3.5" />}
                warn={data.kpi.on_review_today > 0}
              />
              <KpiMiniCard label={t("hero.kpi.zones")} value={data.zones.length} icon={<LayoutGrid className="size-3.5" />} />
              <KpiMiniCard
                label={t("hero.kpi.lama_sync")}
                value={data.last_synced_at ? formatRelative(data.last_synced_at, locale) : "—"}
                icon={<RefreshCw className="size-3.5" />}
                colorClass={lamaColor}
              />
            </div>
          </CardContent>
        </Card>

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

          {/* ─── TAB: Обзор ─────────────────────────────────────────────── */}
          <TabsContent value="overview" className="mt-4">
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Left col-span-2 */}
              <div className="flex flex-col gap-6 lg:col-span-2">
                {/* Weekly activity bar chart */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{t("overview.activity_title")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={weekData} barGap={2} barCategoryGap="25%">
                        <XAxis dataKey="label" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                        <YAxis hide />
                        <Tooltip
                          contentStyle={{
                            background: "var(--color-card)",
                            border: "1px solid var(--color-border)",
                            borderRadius: 8,
                            fontSize: 12,
                          }}
                          cursor={{ fill: "var(--color-muted)", radius: 4 }}
                        />
                        <Bar dataKey="plan" name="План" fill="var(--color-chart-2)" radius={[3, 3, 0, 0]} />
                        <Bar dataKey="fact" name="Факт" fill="var(--color-chart-1)" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <span className="size-2.5 rounded-sm inline-block bg-[var(--color-chart-2)]" />
                        План
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="size-2.5 rounded-sm inline-block bg-[var(--color-chart-1)]" />
                        Факт
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Activity feed */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{t("overview.feed_title")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ActivityFeed items={activityItems} />
                  </CardContent>
                </Card>
              </div>

              {/* Right col-1 sticky */}
              <div className="flex flex-col gap-4 lg:sticky lg:top-20 lg:self-start">
                {/* Manager card */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{t("overview.manager_card")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {data.manager ? (
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="size-10 shrink-0">
                            <AvatarImage src={data.manager.avatar_url} alt={`${data.manager.last_name} ${data.manager.first_name}`} />
                            <AvatarFallback className="text-sm font-medium bg-primary/10 text-primary">
                              {getInitials(data.manager.first_name, data.manager.last_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm font-medium text-foreground truncate">
                              {data.manager.last_name} {data.manager.first_name}
                            </span>
                            <span className="text-xs text-muted-foreground">Директор магазина</span>
                          </div>
                        </div>
                        <Button size="sm" variant="outline" className="w-full gap-2" asChild>
                          <Link href={`${ADMIN_ROUTES.employees}?store_id=${storeId}`}>
                            <Phone className="size-3.5" />
                            {t("overview.manager_contact")}
                          </Link>
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        <Alert variant="default" className="border-warning/40 bg-warning/5 py-3">
                          <AlertCircle className="size-4 text-warning" />
                          <AlertDescription className="text-xs text-warning">
                            {t("hero.manager_unassigned")}
                          </AlertDescription>
                        </Alert>
                        <Button size="sm" variant="outline" className="w-full">
                          {t("hero.manager_assign")}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Contacts card */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{t("overview.contacts_card")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Phone className="size-3.5 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground">{t("overview.contacts_phone")}:</span>
                        <span className="text-foreground font-medium">+7 (382) 222-30-55</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="size-3.5 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground">{t("overview.contacts_email")}:</span>
                        <span className="text-foreground font-medium truncate">spar-tom-001@spar.ru</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 pt-2 border-t border-border">
                        <Clock className="size-3.5 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground">{t("overview.contacts_hours")}:</span>
                        <span className="text-foreground font-medium">08:00 – 22:00</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Address card */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{t("overview.address_card")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-3">
                      <div className="flex items-start gap-2">
                        <MapPin className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
                        <span className="text-sm text-foreground leading-relaxed">{data.address_full}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="w-full gap-2 justify-start h-8"
                        onClick={handleCopyAddress}
                      >
                        {addressCopied ? (
                          <Check className="size-3.5 text-success" />
                        ) : (
                          <Copy className="size-3.5" />
                        )}
                        <span className="text-xs">{addressCopied ? t("overview.address_copied") : t("overview.address_copy")}</span>
                      </Button>
                      {data.geo && (
                        <div className="text-xs text-muted-foreground mt-1">
                          <span className="font-medium">{t("overview.coords")}: </span>
                          <span className="font-mono">{data.geo.lat}, {data.geo.lng}</span>
                        </div>
                      )}
                      {/* Map placeholder */}
                      <div className="relative rounded-lg overflow-hidden bg-muted h-28 flex items-center justify-center mt-1">
                        <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted/80" />
                        <div className="relative flex flex-col items-center gap-1 text-muted-foreground">
                          <MapPin className="size-6" />
                          <span className="text-xs">Томск, пр. Ленина 80</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ─── TAB: Сотрудники ──────────────────────────────────────────── */}
          <TabsContent value="team" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4 pb-3">
                <CardTitle className="text-base">Сотрудники ({data.team_count})</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Input
                      placeholder={t("team.search_placeholder")}
                      className="h-8 w-48 text-sm pl-8"
                    />
                    <Activity className="absolute left-2.5 top-2 size-3.5 text-muted-foreground" />
                  </div>
                  <Select defaultValue="all">
                    <SelectTrigger className="h-8 w-36 text-xs">
                      <SelectValue placeholder={t("team.filter_position")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("team.all_positions")}</SelectItem>
                      <SelectItem value="STORE_DIRECTOR">Директор магазина</SelectItem>
                      <SelectItem value="WORKER">Работник</SelectItem>
                      <SelectItem value="OPERATOR">Оператор</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Сотрудник</th>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden md:table-cell">Должность</th>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden sm:table-cell">Телефон</th>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Статус</th>
                      </tr>
                    </thead>
                    <tbody>
                      {DEMO_TEAM_MEMBERS.map((emp) => (
                        <tr key={emp.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <Avatar className="size-7 shrink-0">
                                <AvatarFallback className="text-xs bg-accent text-accent-foreground">
                                  {getInitials(emp.first_name, emp.last_name)}
                                </AvatarFallback>
                              </Avatar>
                              <Link
                                href={ADMIN_ROUTES.employeeDetail(String(emp.id))}
                                className="font-medium text-foreground hover:text-primary transition-colors truncate"
                              >
                                {emp.last_name} {emp.first_name}
                              </Link>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{emp.position}</td>
                          <td className="px-4 py-3 text-muted-foreground font-mono text-xs hidden sm:table-cell">{emp.phone}</td>
                          <td className="px-4 py-3">
                            <Badge
                              variant={emp.active ? "default" : "secondary"}
                              className={`text-xs ${emp.active ? "bg-success/15 text-success border-0" : ""}`}
                            >
                              {emp.active ? "На смене" : "Не на смене"}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                  <span className="text-xs text-muted-foreground">Показано 5 из {data.team_count}</span>
                  <Button variant="ghost" size="sm" className="gap-1 text-xs" asChild>
                    <Link href={`${ADMIN_ROUTES.employees}?store_id=${storeId}`}>
                      {t("team.view_all")}
                      <ChevronRight className="size-3.5" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── TAB: Зоны ───────────────────────────────────────────────── */}
          <TabsContent value="zones" className="mt-4">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-foreground">
                  {t("zones.title", { count: data.zones.length })}
                </h3>
                <Button size="sm" variant="outline" className="gap-2">
                  <Plus className="size-4" />
                  {t("zones.add")}
                </Button>
              </div>
              {data.zones.length === 0 ? (
                <EmptyState
                  icon={LayoutGrid}
                  title="Зоны не настроены"
                  description="Добавьте зоны для управления расписанием и задачами"
                  action={{ label: t("zones.add"), onClick: () => {} }}
                />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {data.zones.map((zone) => (
                    <ZoneCard
                      key={zone.id}
                      zone={zone}
                      storeCode={data.external_code}
                    />
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ─── TAB: История ────────────────────────────────────────────── */}
          <TabsContent value="history" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <History className="size-4" />
                  {t("tabs.history")}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {historyLoading ? (
                  <div className="flex flex-col gap-2 p-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full rounded-lg" />
                    ))}
                  </div>
                ) : history.length === 0 ? (
                  <EmptyState
                    icon={History}
                    title={t("history.empty")}
                    description="Действия с магазином будут отображаться здесь"
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">{t("history.col_time")}</th>
                          <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">{t("history.col_who")}</th>
                          <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">{t("history.col_action")}</th>
                          <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden md:table-cell">{t("history.col_object")}</th>
                          <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden lg:table-cell">{t("history.col_ip")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.map((evt) => (
                          <tr key={evt.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                              {formatRelative(evt.ts, locale)}
                            </td>
                            <td className="px-4 py-3 text-xs font-medium text-foreground whitespace-nowrap">
                              {evt.by_user_name}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-col gap-0.5">
                                <span className="text-xs font-medium text-foreground">{evt.title}</span>
                                <span className="text-xs text-muted-foreground">{HISTORY_TYPE_LABELS[evt.type]}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">
                              {data.external_code}
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground font-mono hidden lg:table-cell">
                              192.168.1.{(parseInt(evt.id.split("-").pop() ?? "1") * 17) % 200 + 1}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  )
}

// ─── Mini KPI card for hero ───────────────────────────────────────────────────

interface KpiMiniCardProps {
  label: string
  value: number | string
  icon?: React.ReactNode
  warn?: boolean
  colorClass?: string
}

function KpiMiniCard({ label, value, icon, warn, colorClass }: KpiMiniCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <span
        className={`text-xl font-semibold leading-tight ${
          warn ? "text-warning" : colorClass ?? "text-foreground"
        }`}
      >
        {value}
        {warn && (
          <span className="ml-1 inline-flex size-1.5 rounded-full bg-warning align-middle" />
        )}
      </span>
    </div>
  )
}

// ─── Demo team members (scoped to store 1) ────────────────────────────────────

const DEMO_TEAM_MEMBERS = [
  { id: 5, first_name: "Александр", last_name: "Иванов", position: "Директор магазина", phone: "+7 (913) 501-11-01", active: true },
  { id: 12, first_name: "Дмитрий", last_name: "Кузнецов", position: "Работник", phone: "+7 (913) 512-22-02", active: true },
  { id: 13, first_name: "Ольга", last_name: "Лебедева", position: "Работник", phone: "+7 (913) 513-33-03", active: false },
  { id: 14, first_name: "Евгений", last_name: "Морозов", position: "Оператор", phone: "+7 (913) 514-44-04", active: true },
  { id: 15, first_name: "Наталья", last_name: "Новикова", position: "Работник", phone: "+7 (913) 515-55-05", active: false },
]
