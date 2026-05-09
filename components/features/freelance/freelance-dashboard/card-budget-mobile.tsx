import type { BudgetUsage } from "@/lib/types";
import { cn } from "@/lib/utils";

import { formatCurrency } from "./_shared";

interface BudgetMobileCardProps {
  row: BudgetUsage;
  onClick: () => void;
}

export function BudgetMobileCard({ row, onClick }: BudgetMobileCardProps) {
  const overspendClass =
    row.overspend_pct >= 10
      ? "border-l-4 border-l-destructive"
      : row.overspend_pct > 0
        ? "border-l-4 border-l-warning"
        : "";

  return (
    <button
      type="button"
      className={cn("w-full text-left space-y-1.5", overspendClass)}
      onClick={onClick}
    >
      <p className="text-sm font-medium text-foreground truncate">
        {row.store_name}
      </p>
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{row.period_start.slice(0, 7)}</span>
        <span>Лимит: {formatCurrency(row.limit_amount, row.currency)}</span>
      </div>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span>
          Потрачено:{" "}
          <strong className="text-foreground">
            {formatCurrency(row.actual_amount, row.currency)}
          </strong>
        </span>
        {row.overspend > 0 && (
          <span
            className={cn(
              "font-medium",
              row.overspend_pct >= 10 ? "text-destructive" : "text-warning"
            )}
          >
            +{formatCurrency(row.overspend, row.currency)} ({row.overspend_pct}%)
          </span>
        )}
      </div>
    </button>
  );
}
