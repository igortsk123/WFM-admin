"use client";

import { format, parseISO } from "date-fns";
import { useTranslations } from "next-intl";

import type { BudgetLimit, BudgetUsage } from "@/lib/types";

import { BudgetPeriodBadge } from "./period-badge";
import { BudgetUsageBar } from "./usage-bar";
import { RowActions } from "./row-actions";
import { formatRelative } from "./_shared";

interface MobileCardProps {
  limit: BudgetLimit;
  usage: BudgetUsage | null;
  isClientDirect: boolean;
  canWrite: boolean;
  locale: string;
  onEdit: (limit: BudgetLimit) => void;
  onTerminate: (limit: BudgetLimit) => void;
  onHistory: (limit: BudgetLimit) => void;
}

export function MobileCard({
  limit,
  usage,
  isClientDirect,
  canWrite,
  locale,
  onEdit,
  onTerminate,
  onHistory,
}: MobileCardProps) {
  const t = useTranslations("freelanceBudgetLimits");

  return (
    <div className="rounded-xl border bg-card p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-sm font-semibold text-foreground leading-tight">
            {limit.store_name.split(",")[0]}
          </span>
          {limit.store_name.includes(",") && (
            <span className="text-xs text-muted-foreground leading-tight">
              {limit.store_name.split(",").slice(1).join(",").trim()}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <BudgetPeriodBadge period={limit.period} />
          {canWrite && (
            <RowActions
              limit={limit}
              onEdit={onEdit}
              onTerminate={onTerminate}
              onHistory={onHistory}
            />
          )}
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="tabular-nums font-semibold text-foreground text-sm">
          {limit.amount.toLocaleString("ru-RU")} {limit.currency}
        </span>
        <span>
          {format(parseISO(limit.valid_from), "dd.MM.yy")} –{" "}
          {limit.valid_to
            ? format(parseISO(limit.valid_to), "dd.MM.yy")
            : t("indefinite")}
        </span>
      </div>

      <BudgetUsageBar
        usage={usage}
        limitAmount={limit.amount}
        currency={limit.currency}
        isClientDirect={isClientDirect}
      />

      <div className="text-xs text-muted-foreground">
        {limit.set_by_name} · {formatRelative(limit.set_at, locale)}
      </div>
    </div>
  );
}
