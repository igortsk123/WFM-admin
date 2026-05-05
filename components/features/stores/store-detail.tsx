"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Store as StoreIcon } from "lucide-react"
import { getStoreById, type StoreDetail as StoreDetailData } from "@/lib/api"

interface StoreDetailProps {
  storeId: number
}

/**
 * Stub-реализация экрана /stores/:id.
 * Полностью заменяется V0 в чате 27 (store-detail). Foundation предоставляет
 * только types/API/i18n/page-wrapper — UI ниже минимальный, чтобы build проходил.
 */
export function StoreDetail({ storeId }: StoreDetailProps) {
  const t = useTranslations("screen.storeDetail")
  const [data, setData] = useState<StoreDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getStoreById(storeId)
      .then((res) => {
        if (cancelled) return
        setData(res.data)
        setError(null)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : "error")
      })
      .finally(() => {
        if (cancelled) return
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [storeId])

  if (loading) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <Card className="m-6">
        <CardHeader>
          <CardTitle>{t("states.error_title")}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {error ?? t("states.not_found_description")}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <Card>
        <CardHeader className="flex flex-row items-start gap-4">
          <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <StoreIcon className="size-6" />
          </div>
          <div className="flex flex-col gap-1">
            <CardTitle className="text-2xl">{data.name}</CardTitle>
            <p className="text-sm text-muted-foreground">{data.address_full}</p>
            <p className="text-xs text-muted-foreground">
              {t("hero.external_code")}: {data.external_code} · {t("hero.store_type")}:{" "}
              {data.store_type}
            </p>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <KpiMini label={t("hero.kpi.team")} value={data.team_count} />
          <KpiMini label={t("hero.kpi.team_active")} value={data.team_active_count} />
          <KpiMini label={t("hero.kpi.tasks_today")} value={data.kpi.tasks_today} />
          <KpiMini label={t("hero.kpi.completed_today")} value={data.kpi.completed_today} />
          <KpiMini label={t("hero.kpi.on_review")} value={data.kpi.on_review_today} />
          <KpiMini label={t("hero.kpi.zones")} value={data.zones.length} />
        </CardContent>
      </Card>
    </div>
  )
}

function KpiMini({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  )
}
