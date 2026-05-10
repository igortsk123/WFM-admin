"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useTranslations, useLocale } from "next-intl"
import { toast } from "sonner"
import {
  ArrowLeft, Send, CheckCircle2, XCircle, Clock, AlertTriangle,
  ThumbsUp, ThumbsDown, Timer, Ban, Loader2,
} from "lucide-react"

import {
  getTaskOfferById,
  simulateAttemptResponse,
  cancelTaskOffer,
  type AttemptResponseAction,
} from "@/lib/api"
import type { Locale, TaskOffer, OfferAttempt, OfferAttemptStatus } from "@/lib/types"
import { ADMIN_ROUTES } from "@/lib/constants/routes"
import { formatRelative } from "@/lib/utils/format"
import { pickLocalized } from "@/lib/utils/locale-pick"
import { cn } from "@/lib/utils"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { EmptyState } from "@/components/shared/empty-state"
import { PageHeader } from "@/components/shared/page-header"
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog"

interface Props {
  offerId: string
}

export function OfferDetail({ offerId }: Props) {
  const t = useTranslations("screen.offerDetail")
  const tList = useTranslations("screen.offers")
  const locale = useLocale()

  const [data, setData] = useState<(TaskOffer & { attempts: OfferAttempt[] }) | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await getTaskOfferById(offerId)
      setData(res.data)
    } catch (e) {
      setError(e instanceof Error ? e.message : t("error_load"))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offerId])

  async function simulate(attemptId: string, action: AttemptResponseAction) {
    setBusy(true)
    try {
      const res = await simulateAttemptResponse(offerId, attemptId, action)
      if (res.success) {
        toast.success(t(`toast.${action.toLowerCase()}`))
        await load()
      } else {
        toast.error(res.error?.message ?? t("error_load"))
      }
    } finally {
      setBusy(false)
    }
  }

  async function handleCancel() {
    setBusy(true)
    try {
      const res = await cancelTaskOffer(offerId)
      if (res.success) {
        toast.success(t("toast.cancelled"))
        await load()
      } else {
        toast.error(res.error?.message ?? t("error_load"))
      }
    } finally {
      setBusy(false)
      setCancelOpen(false)
    }
  }

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-4 max-w-screen-xl mx-auto">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="p-4 md:p-6 max-w-screen-xl mx-auto">
        <EmptyState
          icon={AlertTriangle}
          title={t("not_found_title")}
          description={error ?? t("not_found_desc")}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-screen-xl mx-auto">
      <PageHeader
        title={`${data.work_type_name} — ${data.store_name}`}
        breadcrumbs={[
          { label: t("breadcrumb_home"), href: "/dashboard" },
          { label: t("breadcrumb_freelance"), href: ADMIN_ROUTES.freelanceAgents },
          { label: t("breadcrumb_offers"), href: ADMIN_ROUTES.freelanceOffers },
          { label: data.work_type_name },
        ]}
      />

      {/* Hero */}
      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="space-y-2 min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <OfferStatusBadge status={data.status} t={tList} />
                <span className="text-xs text-muted-foreground">
                  {t("created", { ago: formatRelative(new Date(data.created_at), locale === "en" ? "en" : "ru") })}
                </span>
              </div>
              <h1 className="text-xl md:text-2xl font-semibold text-balance">
                {data.work_type_name}
              </h1>
              <div className="text-sm text-muted-foreground">{data.store_name}</div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                <span>📅 {data.shift_date} {data.start_time}</span>
                <span>⏱ {data.duration_hours} ч</span>
                <span>💰 {data.price_rub.toLocaleString("ru-RU")} ₽</span>
                <span>👥 {t("candidates", { n: data.candidate_count })}</span>
              </div>
              {data.note && (
                <Alert className="mt-2">
                  <AlertDescription className="text-sm whitespace-pre-wrap">
                    {pickLocalized(data.note, data.note_en, locale as Locale)}
                  </AlertDescription>
                </Alert>
              )}
            </div>
            {data.status === "ROUTING" && (
              <Button variant="destructive" size="sm" onClick={() => setCancelOpen(true)}>
                <Ban className="size-4 mr-1.5" />
                {t("cancel")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tier explanation */}
      <Alert className="border-info/30 bg-info/5">
        <Timer className="size-4 text-info" />
        <AlertDescription className="text-xs">
          {t("tier_explanation")}
        </AlertDescription>
      </Alert>

      {/* Queue */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("queue_title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.attempts.map((a) => (
            <AttemptRow
              key={a.id}
              attempt={a}
              offerStatus={data.status}
              busy={busy}
              onSimulate={(action) => simulate(a.id, action)}
              t={t}
              locale={locale}
            />
          ))}
        </CardContent>
      </Card>

      <div>
        <Button variant="ghost" size="sm" asChild>
          <Link href={ADMIN_ROUTES.freelanceOffers}>
            <ArrowLeft className="size-4 mr-1.5" />
            {t("back_to_list")}
          </Link>
        </Button>
      </div>

      {/* Cancel confirm */}
      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("cancel_dialog_title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("cancel_dialog_desc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>{t("cancel_dialog_back")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={handleCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {busy && <Loader2 className="size-4 mr-1.5 animate-spin" />}
              {t("cancel_dialog_confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────
// AttemptRow
// ──────────────────────────────────────────────────────────────────

interface RowProps {
  attempt: OfferAttempt
  offerStatus: TaskOffer["status"]
  busy: boolean
  onSimulate: (action: AttemptResponseAction) => void
  t: ReturnType<typeof useTranslations>
  locale: string
}

function AttemptRow({ attempt: a, offerStatus, busy, onSimulate, t, locale }: RowProps) {
  const initials = a.freelancer_name
    .split(" ")
    .slice(0, 2)
    .map((s) => s[0] ?? "")
    .join("")

  const isPending = a.status === "PENDING"
  const canSimulateActive = isPending && offerStatus === "ROUTING"
  const canLateRespond = a.status === "EXPIRED" && offerStatus === "ROUTING"

  return (
    <div
      className={cn(
        "flex flex-col md:flex-row md:items-center gap-3 rounded-md border p-3",
        isPending && "border-primary/40 bg-primary/5",
      )}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <Badge variant="secondary" className="size-7 rounded-full p-0 flex items-center justify-center text-xs tabular-nums shrink-0">
          {a.rank}
        </Badge>
        <Avatar className="size-9 shrink-0">
          <AvatarImage src={a.freelancer_avatar_url} alt="" />
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium truncate">{a.freelancer_name}</div>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            {a.rating !== null && <span>★ {a.rating.toFixed(1)}</span>}
            <span>
              {t(`tier.${a.tier.toLowerCase()}`)} · {a.exclusive_minutes} мин
            </span>
            {a.exclusive_until && (
              <span>
                {t("expires_at", {
                  time: new Date(a.exclusive_until).toLocaleTimeString(locale === "en" ? "en-GB" : "ru-RU", {
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                })}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <AttemptStatusBadge status={a.status} t={t} />
        {canSimulateActive && (
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              className="h-7"
              disabled={busy}
              onClick={() => onSimulate("ACCEPT")}
            >
              <ThumbsUp className="size-3.5 text-success" />
              <span className="ml-1 hidden sm:inline">{t("sim.accept")}</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7"
              disabled={busy}
              onClick={() => onSimulate("DECLINE")}
            >
              <ThumbsDown className="size-3.5 text-destructive" />
              <span className="ml-1 hidden sm:inline">{t("sim.decline")}</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7"
              disabled={busy}
              onClick={() => onSimulate("EXPIRE")}
            >
              <Timer className="size-3.5" />
              <span className="ml-1 hidden sm:inline">{t("sim.expire")}</span>
            </Button>
          </div>
        )}
        {canLateRespond && (
          <Button
            size="sm"
            variant="outline"
            className="h-7"
            disabled={busy}
            onClick={() => onSimulate("LATE_RESPOND")}
          >
            <Clock className="size-3.5" />
            <span className="ml-1 hidden sm:inline">{t("sim.late")}</span>
          </Button>
        )}
      </div>
    </div>
  )
}

function AttemptStatusBadge({ status, t }: { status: OfferAttemptStatus; t: ReturnType<typeof useTranslations> }) {
  const map: Record<OfferAttemptStatus, { cls: string; label: string }> = {
    PENDING: { cls: "bg-warning/10 text-warning border-warning/20", label: t("attempt_status.pending") },
    ACCEPTED: { cls: "bg-success/10 text-success border-success/20", label: t("attempt_status.accepted") },
    DECLINED: { cls: "bg-destructive/10 text-destructive border-destructive/20", label: t("attempt_status.declined") },
    EXPIRED: { cls: "bg-muted text-muted-foreground border", label: t("attempt_status.expired") },
    WAITING: { cls: "bg-muted/50 text-muted-foreground border", label: t("attempt_status.waiting") },
    LATE_FALLBACK: { cls: "bg-info/10 text-info border-info/20", label: t("attempt_status.late_fallback") },
  }
  return <Badge className={cn("text-xs", map[status].cls)}>{map[status].label}</Badge>
}

function OfferStatusBadge({ status, t }: { status: TaskOffer["status"]; t: ReturnType<typeof useTranslations> }) {
  const map: Record<TaskOffer["status"], { cls: string; icon: React.ReactNode; label: string }> = {
    ROUTING: { cls: "bg-warning/10 text-warning border-warning/20", icon: <Send className="size-3" />, label: t("status.routing") },
    FILLED: { cls: "bg-success/10 text-success border-success/20", icon: <CheckCircle2 className="size-3" />, label: t("status.filled") },
    EXPIRED_ALL: { cls: "bg-destructive/10 text-destructive border-destructive/20", icon: <XCircle className="size-3" />, label: t("status.expired_all") },
    CANCELLED: { cls: "bg-muted text-muted-foreground border", icon: <Ban className="size-3" />, label: t("status.cancelled") },
  }
  const m = map[status]
  return (
    <Badge className={cn("gap-1 shrink-0", m.cls)}>
      {m.icon}
      {m.label}
    </Badge>
  )
}
