import type { useTranslations } from "next-intl";
import { CalendarClock, Clock, TrendingUp, AlertTriangle } from "lucide-react";

import { KpiCardGrid, type KpiCardItem } from "@/components/shared";
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

  const items: KpiCardItem[] = [
    {
      key: "planned_hours",
      icon: CalendarClock,
      label: t("summary_cards.planned_hours"),
      value: `${cards.totalPlanned} ч`,
    },
    {
      key: "actual_hours",
      icon: Clock,
      label: t("summary_cards.actual_hours"),
      value: `${cards.totalActual} ч`,
      diff: cards.deltaPct,
      trend: reportData.days.slice(0, 14).map((d) => d.actual_hours),
    },
    {
      key: "avg_deviation",
      icon: TrendingUp,
      label: t("summary_cards.avg_deviation"),
      value: `${cards.avgDailyDelta > 0 ? "+" : ""}${cards.avgDailyDelta} ч/день`,
    },
    {
      key: "worst_day",
      icon: AlertTriangle,
      label: t("summary_cards.worst_day"),
      value: worstDayFormatted,
    },
  ];

  return <KpiCardGrid items={items} />;
}
