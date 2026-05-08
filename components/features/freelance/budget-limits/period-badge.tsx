"use client";

import { useTranslations } from "next-intl";

import type { BudgetPeriod } from "@/lib/types";
import { cn } from "@/lib/utils";

interface BudgetPeriodBadgeProps {
  period: BudgetPeriod;
}

export function BudgetPeriodBadge({ period }: BudgetPeriodBadgeProps) {
  const t = useTranslations("freelanceBudgetLimits.period");
  const variantMap: Record<BudgetPeriod, string> = {
    DAY: "bg-info/10 text-info border-info/20",
    WEEK: "bg-warning/10 text-warning border-warning/20",
    MONTH: "bg-primary/10 text-primary border-primary/20",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
        variantMap[period]
      )}
    >
      {t(period)}
    </span>
  );
}
