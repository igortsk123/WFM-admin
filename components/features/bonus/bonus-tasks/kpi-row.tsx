"use client";

import { useTranslations } from "next-intl";
import { BarChart3, Gift, Sparkles, Target, TrendingUp } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { KpiCard } from "@/components/shared/kpi-card";

import type { ReplacedByBonusKpi } from "@/lib/api/bonus";
import type { BonusBudget } from "@/lib/types";

import { fmtRub } from "./_shared";

interface KpiRowProps {
  activeTasksCount: number;
  loadingActive: boolean;
  proposalsCount: number;
  loadingProposals: boolean;
  replacedKpi: ReplacedByBonusKpi | null;
  loadingKpi: boolean;
  budgets: BonusBudget[];
  locale: string;
}

export function KpiRow({
  activeTasksCount,
  loadingActive,
  proposalsCount,
  loadingProposals,
  replacedKpi,
  loadingKpi,
  budgets,
  locale,
}: KpiRowProps) {
  const t = useTranslations("screen.bonusTasks");

  const replacedHoursLabel = replacedKpi ? `${replacedKpi.total_hours}ч` : "—";

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        label="Активных задач"
        value={loadingActive ? "—" : activeTasksCount}
        icon={Gift}
      />
      <KpiCard
        label="Предложений ИИ"
        value={loadingProposals ? "—" : proposalsCount}
        icon={Sparkles}
      />
      {/* Replaced by bonus KPI */}
      {loadingKpi ? (
        <Skeleton className="h-24 rounded-xl" />
      ) : replacedKpi && replacedKpi.replaced_count > 0 ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <KpiCard
                  label={t("freelance_link.kpi_replaced_title")}
                  value={t("freelance_link.kpi_replaced_value", {
                    hours: replacedHoursLabel,
                    saved: fmtRub(replacedKpi.total_saved, locale),
                  })}
                  icon={TrendingUp}
                />
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <p className="text-xs">
                {replacedKpi.replaced_count} заявок на внештат заменено бонусным пулом
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        <KpiCard
          label="Бюджет использован"
          value={
            budgets.length > 0
              ? `${Math.round(
                  (budgets.reduce((s, b) => s + b.spent_points, 0) /
                    Math.max(
                      budgets.reduce((s, b) => s + b.total_points, 0),
                      1,
                    )) *
                    100,
                )}%`
              : "—"
          }
          icon={BarChart3}
        />
      )}
      <KpiCard label="Стратегий активно" value="3" icon={Target} />
    </div>
  );
}
