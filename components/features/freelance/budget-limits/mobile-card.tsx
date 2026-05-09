"use client";

import { memo } from "react";
import { format, parseISO } from "date-fns";
import { useTranslations } from "next-intl";

import { EntityMobileCard } from "@/components/shared/entity-mobile-card";
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

export const MobileCard = memo(function MobileCard({
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
  const [primary, ...rest] = limit.store_name.split(",");
  const subtitleText = rest.join(",").trim();

  return (
    <EntityMobileCard
      asCard
      title={primary}
      subtitle={subtitleText || undefined}
      status={<BudgetPeriodBadge period={limit.period} />}
      actions={
        canWrite ? (
          <RowActions
            limit={limit}
            onEdit={onEdit}
            onTerminate={onTerminate}
            onHistory={onHistory}
          />
        ) : undefined
      }
      meta={
        <div className="flex items-center justify-between text-xs text-muted-foreground w-full">
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
      }
      footer={
        <div className="flex flex-col gap-3">
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
      }
    />
  );
});
