"use client";

import { useTranslations } from "next-intl";
import { Loader2, TrendingUp } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { BudgetUsage } from "@/lib/types/index";

interface CostPreviewProps {
  hourlyRate: number | null;
  estimatedCost: number | null;
  watchedHours: number;
  watchedWorkTypeId: number | undefined;
  loadingNorms: boolean;
  isClientDirect: boolean;
  loadingBudget: boolean;
  budgetUsage: BudgetUsage | null;
  budgetPct: number | null;
  budgetTrackColor: string;
}

export function CostPreview({
  hourlyRate,
  estimatedCost,
  watchedHours,
  watchedWorkTypeId,
  loadingNorms,
  isClientDirect,
  loadingBudget,
  budgetUsage,
  budgetPct,
  budgetTrackColor,
}: CostPreviewProps) {
  const t = useTranslations("screen.freelanceApplicationNew");
  const tCommon = useTranslations("common");

  if (estimatedCost == null && budgetUsage == null) return null;

  return (
    <>
      <Separator />
      <Card className="bg-muted/40">
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="size-4 text-muted-foreground" />
            {t("cost_section.title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          {/* Cost formula */}
          {hourlyRate != null && estimatedCost != null ? (
            <div className="text-sm">
              <span className="font-medium tabular-nums">
                {t("cost_section.formula", {
                  hours: watchedHours,
                  rate: hourlyRate.toLocaleString("ru"),
                  total: estimatedCost.toLocaleString("ru"),
                })}
              </span>
              {isClientDirect && (
                <span className="ml-2 text-xs text-muted-foreground">
                  ({t("cost_section.client_direct_hint")})
                </span>
              )}
            </div>
          ) : watchedWorkTypeId && !loadingNorms ? (
            <p className="text-xs text-muted-foreground">
              {t("cost_section.no_norms")}
            </p>
          ) : null}

          {/* Budget usage progress */}
          {loadingBudget ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-3 animate-spin" />
              {tCommon("loading")}
            </div>
          ) : budgetUsage != null && budgetPct != null ? (
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">
                {t("cost_section.budget_month_label")}
              </p>
              <Progress
                value={budgetPct}
                className={cn("h-2", budgetTrackColor)}
                aria-label={`${budgetPct}%`}
              />
              <p className="text-xs text-muted-foreground">
                {t("cost_section.budget_usage", {
                  spent: budgetUsage.actual_amount.toLocaleString("ru"),
                  limit: budgetUsage.limit_amount.toLocaleString("ru"),
                  pct: budgetPct,
                })}
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </>
  );
}
