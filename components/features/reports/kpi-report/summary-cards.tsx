import type { useTranslations } from "next-intl";
import { CheckCircle2, RotateCcw, Clock, BarChart3 } from "lucide-react";

import { KpiCard } from "@/components/shared/kpi-card";
import type { KpiReportData } from "@/lib/api/reports";

interface SummaryCardsProps {
  t: ReturnType<typeof useTranslations>;
  metrics: KpiReportData["metrics"];
}

export function SummaryCards({ t, metrics }: SummaryCardsProps) {
  const completionMetric = metrics.find((m) => m.key === "completion_rate");
  const returnMetric = metrics.find((m) => m.key === "return_rate");
  const onTimeMetric = metrics.find((m) => m.key === "on_time_rate");
  const hoursPlan = metrics.find((m) => m.key === "hours_plan");
  const hoursActual = metrics.find((m) => m.key === "hours_actual");

  const hoursDiff =
    hoursActual && hoursPlan ? hoursActual.value - hoursPlan.value : 0;
  const hoursDiffPct =
    hoursPlan && hoursPlan.value > 0
      ? Math.round((hoursDiff / hoursPlan.value) * 1000) / 10
      : 0;

  return (
    <section aria-label={t("sections.kpi_overview")}>
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label={t("metrics.completion_rate")}
          value={`${completionMetric?.value ?? 0}%`}
          diff={completionMetric?.change_pct}
          trend={completionMetric?.sparkline}
          icon={CheckCircle2}
        />
        {/* Return rate — inverse: lower is better */}
        <KpiCard
          label={t("metrics.return_rate")}
          value={`${returnMetric?.value ?? 0}%`}
          diff={returnMetric ? -returnMetric.change_pct : undefined}
          trend={returnMetric?.sparkline}
          icon={RotateCcw}
        />
        <KpiCard
          label={t("metrics.on_time_rate")}
          value={`${onTimeMetric?.value ?? 0}%`}
          diff={onTimeMetric?.change_pct}
          trend={onTimeMetric?.sparkline}
          icon={Clock}
        />
        <KpiCard
          label="План / Факт часы"
          value={`${(hoursPlan?.value ?? 0).toLocaleString("ru-RU")} / ${(hoursActual?.value ?? 0).toLocaleString("ru-RU")} ч`}
          diff={hoursDiffPct}
          trend={hoursActual?.sparkline}
          icon={BarChart3}
          className={
            Math.abs(hoursDiffPct) > 5 ? "border-warning" : undefined
          }
        />
      </div>
    </section>
  );
}
