"use client";

import { StatTile } from "@/components/shared";
import type { TFn } from "./_shared";

interface StatsRowProps {
  total: number;
  worker: number;
  manager: number;
  loading: boolean;
  t: TFn;
}

export function StatsRow({ total, worker, manager, loading, t }: StatsRowProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <StatTile label={t("stats.total")} value={total} loading={loading} />
      <StatTile label="WORKER" value={worker} loading={loading} />
      <StatTile label="MANAGER" value={manager} loading={loading} />
      <StatTile
        label="HR / Merchandiser / Office"
        value={0}
        loading={loading}
      />
    </div>
  );
}
