"use client";

import { AlertTriangle, FileText, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

import type { RegulationsStats } from "@/lib/api/regulations";

import { KpiCard } from "@/components/shared/kpi-card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface StatsCardsProps {
  stats: RegulationsStats | null;
  loading: boolean;
  liveUses: number | null;
  untaggedOnly: boolean;
  onToggleUntagged: () => void;
}

export function StatsCards({
  stats,
  loading,
  liveUses,
  untaggedOnly,
  onToggleUntagged,
}: StatsCardsProps) {
  const t = useTranslations("screen.regulations");

  if (loading) {
    return (
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
      <KpiCard
        label={t("stats.total")}
        value={stats.total_count}
        icon={FileText}
      />
      <KpiCard
        label={t("stats.ai_uses_week")}
        value={liveUses ?? stats.ai_uses_7d}
        icon={Sparkles}
        trend={stats.ai_uses_chart_30d}
      />
      <button
        type="button"
        className={cn(
          "text-left rounded-xl transition-all",
          stats.untagged_count > 5 && "ring-2 ring-warning ring-offset-1",
          untaggedOnly && "ring-2 ring-primary ring-offset-1",
        )}
        onClick={onToggleUntagged}
        aria-pressed={untaggedOnly}
        title={untaggedOnly ? "Снять фильтр «Без тегов»" : "Фильтровать: Без тегов"}
      >
        <KpiCard
          label={t("stats.untagged")}
          value={stats.untagged_count}
          icon={AlertTriangle}
        />
      </button>
    </div>
  );
}
