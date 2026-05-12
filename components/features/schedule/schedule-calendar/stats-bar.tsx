"use client";

import { useTranslations } from "next-intl";

import { StatTile } from "@/components/shared";

interface StatsBarStats {
  /** Прогноз LAMA на диапазон (часы). */
  forecast: number;
  /** Часы покрытые реальными задачами (Task.shift_id ∈ shifts). */
  assigned: number;
  /** Покрытие = assigned / forecast × 100. */
  coveragePct: number;
}

interface StatsBarProps {
  stats: StatsBarStats;
}

export function StatsBar({ stats }: StatsBarProps) {
  const t = useTranslations("screen.schedule");

  const coverageColor =
    stats.coveragePct >= 80
      ? "text-success"
      : stats.coveragePct >= 60
        ? "text-warning"
        : "text-destructive";

  const forecastLabel =
    stats.forecast > 0
      ? t("aggregates.hours_value", { hours: stats.forecast })
      : "—";
  const assignedLabel = t("aggregates.hours_value", {
    hours: stats.assigned,
  });
  const coverageLabel =
    stats.forecast > 0 ? `${stats.coveragePct}%` : "—";

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 md:gap-4">
      <StatTile
        label={t("aggregates.forecast")}
        value={forecastLabel}
        size="md"
      />
      <StatTile
        label={t("aggregates.assigned")}
        value={assignedLabel}
        size="md"
      />
      <StatTile
        label={t("aggregates.coverage_assigned")}
        value={coverageLabel}
        colorClass={stats.forecast > 0 ? coverageColor : undefined}
        size="md"
      />
    </div>
  );
}
