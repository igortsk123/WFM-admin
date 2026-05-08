"use client"

import { useTranslations } from "next-intl"
import { AlertTriangle } from "lucide-react"

import { cn } from "@/lib/utils"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import type { AnomalyItem } from "./_shared"

export function AnomaliesCard({ items }: { items: AnomalyItem[] }) {
  const t = useTranslations("screen.dashboard.anomalies")

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              "flex items-center gap-2 rounded-lg p-3",
              item.severity === "critical" ? "bg-destructive/10" : "bg-warning/10"
            )}
          >
            <AlertTriangle
              className={cn(
                "size-4 shrink-0",
                item.severity === "critical" ? "text-destructive" : "text-warning"
              )}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{item.store}</p>
              <p className="text-xs text-muted-foreground truncate">{item.message}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
