"use client"

import { useTranslations } from "next-intl"

import { StatTile } from "@/components/shared"

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

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <StatTile label={t("stats.total")} value={total} loading={isLoading} size="md" />
      <StatTile
        label={t("stats.active")}
        value={active}
        loading={isLoading}
        colorClass="text-success"
        size="md"
      />
      <StatTile
        label={t("stats.archived")}
        value={archived}
        loading={isLoading}
        size="md"
      />
      <StatTile
        label={t("stats.no_director")}
        value={
          <span className="inline-flex items-center gap-2">
            {noDirector}
            {noDirector > 0 && (
              <button
                onClick={onOpenNoDirector}
                className="text-xs font-normal text-primary hover:underline"
              >
                {t("stats.open_link")}
              </button>
            )}
          </span>
        }
        loading={isLoading}
        colorClass={noDirector > 0 ? "text-warning" : undefined}
        size="md"
      />
    </div>
  )
}
