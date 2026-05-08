"use client";

import { useTranslations } from "next-intl";
import type { BudgetUsage } from "@/lib/types";
import { budgetPct } from "./types";

export function BudgetUsageRow({
  usage,
  periodLabel,
  simulatedActual,
}: {
  usage: BudgetUsage;
  periodLabel: string;
  simulatedActual?: number;
}) {
  const t = useTranslations("screen.freelanceApplicationDetail.finance_card");

  const displayActual = simulatedActual ?? usage.actual_amount;
  const pct = budgetPct(displayActual, usage.limit_amount);
  const overspend = Math.max(0, displayActual - usage.limit_amount);

  // Map semantic state to CSS var color for the indicator
  const isOverspend = displayActual > usage.limit_amount;
  const isRisk = !isOverspend && pct > 80;
  const indicatorColor = isOverspend
    ? "var(--color-destructive)"
    : isRisk
    ? "var(--color-warning)"
    : "var(--color-success)";

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-foreground capitalize">
          {periodLabel}
        </span>
        <span className="text-muted-foreground">
          {displayActual.toLocaleString("ru")} /{" "}
          {usage.limit_amount.toLocaleString("ru")} {usage.currency === "RUB" ? "₽" : usage.currency}
        </span>
      </div>
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-primary/20">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${Math.min(100, pct)}%`,
            backgroundColor: indicatorColor,
          }}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {t("budget_planned")}: {usage.planned_amount.toLocaleString("ru")} {usage.currency === "RUB" ? "₽" : usage.currency}
        </span>
        {overspend > 0 && (
          <span className="text-destructive font-medium">
            {t("budget_overspend")}: +{overspend.toLocaleString("ru")} {usage.currency === "RUB" ? "₽" : usage.currency}
          </span>
        )}
      </div>
    </div>
  );
}
