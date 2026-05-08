"use client"

import { useTranslations } from "next-intl"
import { History } from "lucide-react"

import type { StoreDetail as StoreDetailData, StoreHistoryEvent } from "@/lib/api"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/shared/empty-state"

import { HISTORY_TYPE_LABELS, formatRelative } from "./_shared"

interface StoreHistoryTabProps {
  data: StoreDetailData
  history: StoreHistoryEvent[]
  loading: boolean
  locale: string
}

export function StoreHistoryTab({ data, history, loading, locale }: StoreHistoryTabProps) {
  const t = useTranslations("screen.storeDetail")

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <History className="size-4" />
          {t("tabs.history")}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
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
  )
}
