"use client";

import { useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";

import { StatTile } from "@/components/shared";

interface StatsBarStats {
  coverage: number;
  openShifts: number;
  planned: number;
  conflicts: number;
}

interface StatsBarProps {
  stats: StatsBarStats;
}

export function StatsBar({ stats }: StatsBarProps) {
  const t = useTranslations("screen.schedule");

  const coverageColor =
    stats.coverage >= 80
      ? "text-success"
      : stats.coverage >= 60
      ? "text-warning"
      : "text-destructive";

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
      <StatTile
        label={t("aggregates.coverage")}
        value={`${stats.coverage}%`}
        colorClass={coverageColor}
        size="md"
      />
      <StatTile
        label={t("aggregates.open_shifts")}
        value={stats.openShifts}
        size="md"
      />
      <StatTile
        label={t("aggregates.total_planned")}
        value={stats.planned}
        size="md"
      />
      <StatTile
        label={t("aggregates.conflicts")}
        value={
          <span className="inline-flex items-center gap-1.5">
            {stats.conflicts}
            {stats.conflicts > 0 && (
              <AlertTriangle
                className="size-4 text-destructive"
                aria-hidden="true"
              />
            )}
          </span>
        }
        colorClass={stats.conflicts > 0 ? "text-destructive" : undefined}
        size="md"
      />
    </div>
  );
}
