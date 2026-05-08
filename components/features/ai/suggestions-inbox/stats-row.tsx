"use client";

import { Sparkles, Clock, CheckCircle2, XCircle } from "lucide-react";

import { KpiCard } from "@/components/shared";

import type { TFn } from "./_shared";

export interface StatsRowProps {
  newToday: number;
  inProgress: number;
  acceptedWeek: number;
  rejectedWeek: number;
  t: TFn;
}

export function StatsRow({
  newToday,
  inProgress,
  acceptedWeek,
  rejectedWeek,
  t,
}: StatsRowProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <KpiCard label={t("stats.new_today")} value={newToday} icon={Sparkles} />
      <KpiCard label={t("stats.in_progress")} value={inProgress} icon={Clock} />
      <KpiCard
        label={t("stats.accepted_week")}
        value={acceptedWeek}
        icon={CheckCircle2}
      />
      <KpiCard
        label={t("stats.rejected_week")}
        value={rejectedWeek}
        icon={XCircle}
      />
    </div>
  );
}
