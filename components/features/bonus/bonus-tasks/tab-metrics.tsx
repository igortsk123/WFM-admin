"use client";

import { useTranslations } from "next-intl";
import {
  AlertCircle,
  BarChart3,
  CircleDot,
  Clock,
  Coins,
  TrendingUp,
} from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { EmptyState } from "@/components/shared/empty-state";
import { KpiCard } from "@/components/shared/kpi-card";

import type { BonusMetrics } from "./_shared";

interface TabMetricsProps {
  metrics: BonusMetrics | null;
  loading: boolean;
}

export function TabMetrics({ metrics, loading }: TabMetricsProps) {
  const t = useTranslations("screen.bonusTasks");

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!metrics) {
    return (
      <EmptyState
        icon={BarChart3}
        title="Нет данных"
        description="Метрики появятся после первых выполненных бонусных задач"
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {metrics.honest_curve_alert && (
        <Alert>
          <AlertCircle className="size-4" />
          <AlertDescription className="text-sm">{metrics.honest_curve_alert}</AlertDescription>
        </Alert>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label={t("metrics.coverage_title")}
          value={`${metrics.coverage_pct}%`}
          icon={CircleDot}
        />
        <KpiCard
          label={t("metrics.avg_claim_title")}
          value={`${metrics.avg_time_to_claim_min} мин`}
          icon={Clock}
        />
        <KpiCard
          label={t("metrics.distribution_subtitle_top")}
          value={`${metrics.distribution.top_pct}%`}
          icon={TrendingUp}
          diff={2}
        />
        <KpiCard
          label="Средний % от ЗП"
          value={`+${metrics.distribution.avg_pct}%`}
          icon={Coins}
        />
      </div>

      {/* Top performers */}
      <Card className="rounded-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">
            {t("metrics.best_performers_title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col divide-y">
            {metrics.top_performers.map((user, idx) => (
              <li
                key={user.id}
                className="flex items-center justify-between py-2.5 gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="flex size-7 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground shrink-0">
                    {idx + 1}
                  </span>
                  <span className="text-sm font-medium truncate">
                    {user.last_name} {user.first_name}
                  </span>
                </div>
                <span className="text-sm font-semibold text-primary shrink-0">
                  +{idx === 0 ? 15 : idx === 1 ? 12 : 10}%
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
