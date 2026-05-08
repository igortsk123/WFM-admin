"use client";

import { useTranslations } from "next-intl";
import { CircleDollarSign, Clock, Info, Users } from "lucide-react";

import { KpiCard } from "@/components/shared/kpi-card";
import type { Payout } from "@/lib/types";

import { formatCurrency } from "./_shared";

interface StatsRowProps {
  payouts: Payout[];
}

export function StatsRow({ payouts }: StatsRowProps) {
  const t = useTranslations("screen.freelancePayoutsList");

  const paidSum = payouts
    .filter((p) => p.status === "PAID")
    .reduce((s, p) => s + p.gross_amount, 0);
  const feeSum = payouts
    .filter((p) => p.status === "PAID")
    .reduce((s, p) => s + p.nominal_account_fee, 0);
  const agentSum = payouts
    .filter((p) => p.status === "PAID" && p.agent_commission)
    .reduce((s, p) => s + (p.agent_commission ?? 0), 0);
  const pendingSum = payouts
    .filter((p) => p.status === "PENDING" || p.status === "PROCESSING")
    .reduce((s, p) => s + p.gross_amount, 0);

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <KpiCard
        icon={CircleDollarSign}
        label={t("kpi.paid_total")}
        value={formatCurrency(paidSum)}
      />
      <KpiCard
        icon={Info}
        label={t("kpi.fee_total")}
        value={formatCurrency(feeSum)}
      />
      <KpiCard
        icon={Users}
        label={t("kpi.agent_total")}
        value={formatCurrency(agentSum)}
      />
      <KpiCard
        icon={Clock}
        label={t("kpi.pending_total")}
        value={formatCurrency(pendingSum)}
      />
    </div>
  );
}
