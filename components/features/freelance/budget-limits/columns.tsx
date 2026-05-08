"use client";

import { format, parseISO } from "date-fns";
import { useTranslations } from "next-intl";

import type { BudgetLimit, BudgetUsage } from "@/lib/types";

import { TableCell, TableRow } from "@/components/ui/table";

import { BudgetPeriodBadge } from "./period-badge";
import { BudgetUsageBar } from "./usage-bar";
import { RowActions } from "./row-actions";
import { formatRelative } from "./_shared";

interface LimitRowProps {
  limit: BudgetLimit;
  usage: BudgetUsage | null;
  isClientDirect: boolean;
  canWrite: boolean;
  locale: string;
  onEdit: (limit: BudgetLimit) => void;
  onTerminate: (limit: BudgetLimit) => void;
  onHistory: (limit: BudgetLimit) => void;
}

export function LimitRow({
  limit,
  usage,
  isClientDirect,
  canWrite,
  locale,
  onEdit,
  onTerminate,
  onHistory,
}: LimitRowProps) {
  const t = useTranslations("freelanceBudgetLimits");

  return (
    <TableRow>
      {/* Object */}
      <TableCell className="min-w-[180px]">
        <div className="flex flex-col">
          <span className="text-sm font-medium text-foreground leading-tight">
            {limit.store_name.split(",")[0]}
          </span>
          {limit.store_name.includes(",") && (
            <span className="text-xs text-muted-foreground leading-tight">
              {limit.store_name.split(",").slice(1).join(",").trim()}
            </span>
          )}
        </div>
      </TableCell>

      {/* Period */}
      <TableCell>
        <BudgetPeriodBadge period={limit.period} />
      </TableCell>

      {/* Amount */}
      <TableCell className="tabular-nums text-sm font-medium">
        {limit.amount.toLocaleString("ru-RU")} {limit.currency}
      </TableCell>

      {/* Valid from */}
      <TableCell className="text-sm text-muted-foreground tabular-nums whitespace-nowrap">
        {format(parseISO(limit.valid_from), "dd.MM.yyyy")}
      </TableCell>

      {/* Valid to */}
      <TableCell className="text-sm text-muted-foreground tabular-nums whitespace-nowrap">
        {limit.valid_to ? (
          format(parseISO(limit.valid_to), "dd.MM.yyyy")
        ) : (
          <span className="text-muted-foreground/60 italic">
            {t("indefinite")}
          </span>
        )}
      </TableCell>

      {/* Set by */}
      <TableCell>
        <div className="flex flex-col">
          <span className="text-sm text-foreground leading-tight">
            {limit.set_by_name}
          </span>
          <span className="text-xs text-muted-foreground leading-tight">
            {formatRelative(limit.set_at, locale)}
          </span>
        </div>
      </TableCell>

      {/* Usage */}
      <TableCell>
        <BudgetUsageBar
          usage={usage}
          limitAmount={limit.amount}
          currency={limit.currency}
          isClientDirect={isClientDirect}
        />
      </TableCell>

      {/* Actions */}
      {canWrite && (
        <TableCell>
          <RowActions
            limit={limit}
            onEdit={onEdit}
            onTerminate={onTerminate}
            onHistory={onHistory}
          />
        </TableCell>
      )}
    </TableRow>
  );
}
