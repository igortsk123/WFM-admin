"use client";

import { useTranslations } from "next-intl";
import { BadgeCheck, CreditCard, TrendingUp, Wallet } from "lucide-react";
import { KpiCard } from "@/components/shared/kpi-card";
import { formatCurrency } from "@/lib/utils/format";
import type { Locale } from "@/lib/types";

interface SummaryCardsProps {
  accrued: number;
  paid: number;
  pending: number;
  avgPerDay: number;
  locale: Locale;
}

export function SummaryCards({
  accrued,
  paid,
  pending,
  avgPerDay,
  locale,
}: SummaryCardsProps) {
  const t = useTranslations("screen.agentEarnings");

  return (
    <section aria-label="KPI">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label={t("kpi.accrued")}
          value={formatCurrency(accrued, locale)}
          icon={Wallet}
        />
        <KpiCard
          label={t("kpi.paid")}
          value={formatCurrency(paid, locale)}
          icon={BadgeCheck}
        />
        <KpiCard
          label={t("kpi.pending")}
          value={formatCurrency(pending, locale)}
          icon={CreditCard}
        />
        <KpiCard
          label={t("kpi.avg_per_day")}
          value={formatCurrency(avgPerDay, locale)}
          icon={TrendingUp}
        />
      </div>
    </section>
  );
}
