import type { useTranslations } from "next-intl";
import { CalendarClock, Clock, TrendingUp, AlertTriangle } from "lucide-react";

import { KpiCard } from "@/components/shared/kpi-card";
import type { PlanFactReportData } from "@/lib/api/reports";

import { formatDate } from "./_shared";

export function SummaryCards({
  t,
  reportData,
  cards,
}: {
  t: ReturnType<typeof useTranslations>;
  reportData: PlanFactReportData;
  cards: {
    totalPlanned: number;
    totalActual: number;
    deltaHours: number;
    deltaPct: number;
    avgDailyDelta: number;
    worstDay: PlanFactReportData["worst_day"];
  };
}) {
  const worstDayFormatted = formatDate(cards.worstDay.date);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <KpiCard
        icon={CalendarClock}
        label={t("summary_cards.planned_hours")}
        value={`${cards.totalPlanned} ч`}
      />
      <KpiCard
        icon={Clock}
        label={t("summary_cards.actual_hours")}
        value={`${cards.totalActual} ч`}
        diff={cards.deltaPct}
        trend={reportData.days.slice(0, 14).map((d) => d.actual_hours)}
      />
      <KpiCard
        icon={TrendingUp}
        label={t("summary_cards.avg_deviation")}
        value={`${cards.avgDailyDelta > 0 ? "+" : ""}${cards.avgDailyDelta} ч/день`}
      />
      <KpiCard
        icon={AlertTriangle}
        label={t("summary_cards.worst_day")}
        value={worstDayFormatted}
      />
    </div>
  );
}
