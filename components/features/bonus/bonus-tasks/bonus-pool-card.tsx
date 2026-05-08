"use client";

import { useTranslations } from "next-intl";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import type { BonusBudget } from "@/lib/types";

import { FreelanceLinkBadge } from "./freelance-link-badge";

interface BonusPoolCardProps {
  budget: BonusBudget;
  locale: string;
  storeName?: string;
}

export function BonusPoolCard({ budget, locale, storeName }: BonusPoolCardProps) {
  const t = useTranslations("screen.bonusTasks.budget_card");
  const usedPct =
    budget.total_points > 0
      ? Math.round((budget.spent_points / budget.total_points) * 100)
      : 0;

  return (
    <Card className="rounded-xl">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-1 min-w-0">
            <CardTitle className="text-sm font-semibold truncate">
              {storeName ?? t("title")}
            </CardTitle>
            <span className="text-xs text-muted-foreground">
              {budget.period_start} — {budget.period_end}
            </span>
          </div>
          <FreelanceLinkBadge budgetId={budget.id} locale={locale} />
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="flex items-end justify-between mb-2">
          <span className="text-2xl font-bold text-foreground">
            {budget.total_points.toLocaleString(locale)}
            <span className="text-sm font-normal text-muted-foreground ml-1">₽</span>
          </span>
          <span
            className={`text-xs font-medium ${usedPct > 80 ? "text-warning" : "text-muted-foreground"}`}
          >
            {usedPct}%{" "}
            {t("used_label", {
              value: budget.spent_points.toLocaleString(locale),
              percent: usedPct,
            })}
          </span>
        </div>
        {/* Progress bar */}
        <div className="h-2 rounded-full bg-muted overflow-hidden" aria-hidden="true">
          <div
            className={`h-full rounded-full transition-all ${usedPct > 80 ? "bg-warning" : "bg-primary"}`}
            style={{ width: `${Math.min(usedPct, 100)}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
