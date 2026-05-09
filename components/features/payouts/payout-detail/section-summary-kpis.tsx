import { useTranslations } from "next-intl";
import { Users, Star, Wallet, AlertTriangle } from "lucide-react";

import { KpiCard } from "@/components/shared/kpi-card";
import type { PayoutPeriod } from "@/lib/api/payouts";

import { formatCurrency } from "./_shared";

interface SummaryKpisProps {
  period: PayoutPeriod;
  anomalyCount: number;
}

export function SummaryKpis({ period, anomalyCount }: SummaryKpisProps) {
  const t = useTranslations("screen.payoutDetail.summary");

  return (
    <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
      <KpiCard
        label={t("employees")}
        value={period.employees_count}
        icon={Users}
      />
      <KpiCard
        label={t("points_total")}
        value={new Intl.NumberFormat("ru-RU").format(period.total_points)}
        icon={Star}
      />
      <KpiCard
        label={t("amount_total")}
        value={formatCurrency(period.total_rub)}
        icon={Wallet}
      />
      <KpiCard
        label={t("anomalies")}
        value={anomalyCount}
        icon={AlertTriangle}
        className={anomalyCount > 0 ? "border-warning/50" : undefined}
      />
    </div>
  );
}
