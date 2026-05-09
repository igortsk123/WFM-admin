"use client"

import * as React from "react"
import { useRouter } from "@/i18n/navigation"
import { useTranslations, useLocale } from "next-intl"
import { useQueryState, parseAsString } from "nuqs"
import { Inbox, Send, CheckCircle2, XCircle, Ban } from "lucide-react"

import { getTaskOffers } from "@/lib/api"
import type { TaskOffer, TaskOfferStatus } from "@/lib/types"
import { ADMIN_ROUTES } from "@/lib/constants/routes"
import { formatRelative } from "@/lib/utils/format"
import { cn } from "@/lib/utils"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"

const STATUS_TABS: Record<string, TaskOfferStatus | undefined> = {
  active: "ROUTING",
  filled: "FILLED",
  expired: "EXPIRED_ALL",
  cancelled: "CANCELLED",
}

export function OffersList() {
  const t = useTranslations("screen.offers")
  const locale = useLocale()
  const router = useRouter()
  const [, startTransition] = React.useTransition()
  const [tabParam, setTabParam] = useQueryState("tab", parseAsString.withDefault("active"))
  const tab = tabParam ?? "active"

  const [data, setData] = React.useState<TaskOffer[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    setLoading(true)
    getTaskOffers({ status: STATUS_TABS[tab], page_size: 50 })
      .then((res) => setData(res.data))
      .finally(() => setLoading(false))
  }, [tab])

  // Counts
  const [counts, setCounts] = React.useState({ active: 0, filled: 0, expired: 0, cancelled: 0 })
  React.useEffect(() => {
    Promise.all([
      getTaskOffers({ status: "ROUTING", page_size: 1 }),
      getTaskOffers({ status: "FILLED", page_size: 1 }),
      getTaskOffers({ status: "EXPIRED_ALL", page_size: 1 }),
      getTaskOffers({ status: "CANCELLED", page_size: 1 }),
    ]).then(([a, f, e, c]) =>
      setCounts({ active: a.total, filled: f.total, expired: e.total, cancelled: c.total }),
    )
  }, [])

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6 max-w-screen-xl mx-auto">
      <PageHeader
        title={t("page_title")}
        subtitle={t("page_subtitle")}
        breadcrumbs={[
          { label: t("breadcrumb_home"), href: "/dashboard" },
          { label: t("breadcrumb_freelance"), href: ADMIN_ROUTES.freelanceAgents },
          { label: t("breadcrumb_offers") },
        ]}
      />

      <Tabs
        value={tab}
        onValueChange={(v) =>
          startTransition(() => {
            void setTabParam(v === "active" ? null : v)
          })
        }
      >
        <TabsList className="h-9">
          <TabsTrigger value="active">
            {t("tabs.active")}
            {counts.active > 0 && <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">{counts.active}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="filled">
            {t("tabs.filled")}
            {counts.filled > 0 && <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">{counts.filled}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="expired">
            {t("tabs.expired")}
            {counts.expired > 0 && <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">{counts.expired}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="cancelled">{t("tabs.cancelled")}</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="space-y-2 transition-opacity duration-200" aria-busy="true">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : data.length === 0 ? (
        <EmptyState icon={Inbox} title={t("empty_title")} description={t("empty_desc")} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 animate-in fade-in">
          {data.map((offer) => (
            <Card
              key={offer.id}
              role="button"
              tabIndex={0}
              onClick={() => router.push(ADMIN_ROUTES.freelanceOfferDetail(offer.id))}
              className="cursor-pointer hover:bg-muted/30 transition-colors"
            >
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{offer.work_type_name}</div>
                    <div className="text-xs text-muted-foreground truncate">{offer.store_name}</div>
                  </div>
                  <OfferStatusBadge status={offer.status} t={t} />
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span>📅 {offer.shift_date} {offer.start_time}</span>
                  <span>⏱ {offer.duration_hours} ч</span>
                  <span>💰 {offer.price_rub.toLocaleString("ru-RU")} ₽</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {t("candidates_count", { n: offer.candidate_count })}
                  </span>
                  <span className="text-muted-foreground">
                    {formatRelative(new Date(offer.created_at), locale === "en" ? "en" : "ru")}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function OfferStatusBadge({ status, t }: { status: TaskOfferStatus; t: ReturnType<typeof useTranslations> }) {
  const map: Record<TaskOfferStatus, { cls: string; icon: React.ReactNode; label: string }> = {
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
