"use client"

import { useTranslations } from "next-intl"

import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface StatsRowProps {
  total: number
  active: number
  archived: number
  noDirector: number
  isLoading: boolean
  onOpenNoDirector: () => void
}

export function StatsRow({
  total,
  active,
  archived,
  noDirector,
  isLoading,
  onOpenNoDirector,
}: StatsRowProps) {
  const t = useTranslations("screen.stores")

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <Card>
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground leading-tight">{t("stats.total")}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{total}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground leading-tight">{t("stats.active")}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-success">{active}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground leading-tight">{t("stats.archived")}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{archived}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground leading-tight">{t("stats.no_director")}</p>
          <div className="mt-1 flex items-center gap-2">
            <p className={cn("text-2xl font-semibold tabular-nums", noDirector > 0 && "text-warning")}>
              {noDirector}
            </p>
            {noDirector > 0 && (
              <button
                onClick={onOpenNoDirector}
                className="text-xs text-primary hover:underline"
              >
                {t("stats.open_link")}
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
