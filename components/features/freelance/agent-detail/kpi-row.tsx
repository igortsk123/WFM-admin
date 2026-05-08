"use client";

import { useTranslations } from "next-intl";
import { Users, TrendingUp, BarChart3, Divide } from "lucide-react";

import { KpiCard } from "@/components/shared/kpi-card";

import { formatMoney, type AgentWithRoster } from "./_shared";

interface KpiRowProps {
  agent: AgentWithRoster;
  t: ReturnType<typeof useTranslations>;
  locale: string;
}

export function KpiRow({ agent, t, locale }: KpiRowProps) {
  const activeCount = agent.freelancers.filter(
    (f) => f.freelancer_status === "ACTIVE"
  ).length;
  const avgPerPerformer =
    activeCount > 0 ? Math.round(agent.total_earned_30d / activeCount) : 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <KpiCard
        label={t("kpi.active_performers")}
        value={activeCount}
        icon={Users}
      />
      <KpiCard
        label={t("kpi.earned_30d")}
        value={formatMoney(agent.total_earned_30d, locale)}
        icon={TrendingUp}
      />
      <KpiCard
        label={t("kpi.earned_all_time")}
        value={formatMoney(agent.total_earned_all_time, locale)}
        icon={BarChart3}
      />
      <KpiCard
        label={t("kpi.avg_per_performer")}
        value={formatMoney(avgPerPerformer, locale)}
        icon={Divide}
      />
    </div>
  );
}
