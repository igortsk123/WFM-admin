"use client";

import { useTranslations } from "next-intl";

import type { BudgetUsage } from "@/lib/types";
import { cn } from "@/lib/utils";

interface BudgetUsageBarProps {
  usage: BudgetUsage | null;
  limitAmount: number;
  currency: string;
  isClientDirect: boolean;
}

export function BudgetUsageBar({
  usage,
  limitAmount,
  currency,
  isClientDirect,
}: BudgetUsageBarProps) {
  const t = useTranslations("freelanceBudgetLimits.usage");

  if (!usage) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  const pct = Math.min(
    Math.round((usage.actual_amount / limitAmount) * 100),
    100
  );
  const isOver = usage.actual_amount > limitAmount;
  const isWarning = pct >= 80 && !isOver;

  const barColor = isOver
    ? "bg-destructive"
    : isWarning
    ? "bg-warning"
    : "bg-success";

  const fmt = (n: number) =>
    new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(n);

  return (
    <div className="flex flex-col gap-1.5 min-w-[140px]">
      <div className="relative h-2 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            "absolute left-0 top-0 h-full rounded-full transition-all",
            barColor
          )}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <span
          className={cn(
            "font-medium tabular-nums",
            isOver
              ? "text-destructive"
              : isWarning
              ? "text-warning"
              : "text-foreground"
          )}
        >
          {fmt(usage.actual_amount)}
        </span>
        <span>{t("of")}</span>
        <span className="tabular-nums">{fmt(limitAmount)}</span>
        {isClientDirect && (
          <span className="ml-1 text-muted-foreground/60">
            ({t("indicative")})
          </span>
        )}
      </div>
    </div>
  );
}
