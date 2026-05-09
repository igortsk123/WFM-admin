"use client";

import { useTranslations } from "next-intl";
import { Clock, TrendingDown, TrendingUp, Wallet } from "lucide-react";

import { KpiCard } from "@/components/shared/kpi-card";

import { formatCurrency, type KpiTotals } from "./_shared";

interface KpiCardsProps {
  totals: KpiTotals;
  isClientDirect: boolean;
}

export function KpiCards({ totals, isClientDirect }: KpiCardsProps) {
  const t = useTranslations("screen.freelanceDashboard");

  const spentDiff =
    totals.forecast > 0
      ? Math.round((totals.spent / totals.forecast - 1) * 100)
      : undefined;

  return (
    <section aria-label="KPI бюджета внештата">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          label={
            isClientDirect
              ? `${t("kpi.budget")} (${t("kpi.client_direct_hint")})`
              : t("kpi.budget")
          }
          value={formatCurrency(totals.budget, totals.currency)}
          icon={Wallet}
        />
        <KpiCard
          label={t("kpi.spent")}
          value={formatCurrency(totals.spent, totals.currency)}
          diff={spentDiff}
          icon={TrendingUp}
        />
        <KpiCard
          label={t("kpi.remaining")}
          value={formatCurrency(totals.remaining, totals.currency)}
          icon={TrendingDown}
        />
        <KpiCard
          label={t("kpi.forecast")}
          value={formatCurrency(totals.forecast, totals.currency)}
          diff={totals.forecastPct !== 0 ? totals.forecastPct : undefined}
          icon={Clock}
        />
      </div>
    </section>
  );
}
