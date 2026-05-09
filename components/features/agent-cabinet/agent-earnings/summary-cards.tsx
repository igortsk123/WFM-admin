"use client";

import { useTranslations } from "next-intl";
import { BadgeCheck, CreditCard, TrendingUp, Wallet } from "lucide-react";
import { KpiCardGrid, type KpiCardItem } from "@/components/shared";
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

  const items: KpiCardItem[] = [
    {
      key: "accrued",
      label: t("kpi.accrued"),
      value: formatCurrency(accrued, locale),
      icon: Wallet,
    },
    {
      key: "paid",
      label: t("kpi.paid"),
      value: formatCurrency(paid, locale),
      icon: BadgeCheck,
    },
    {
      key: "pending",
      label: t("kpi.pending"),
      value: formatCurrency(pending, locale),
      icon: CreditCard,
    },
    {
      key: "avg_per_day",
      label: t("kpi.avg_per_day"),
      value: formatCurrency(avgPerDay, locale),
      icon: TrendingUp,
    },
  ];

  return (
    <section aria-label="KPI">
      <KpiCardGrid items={items} />
    </section>
  );
}
