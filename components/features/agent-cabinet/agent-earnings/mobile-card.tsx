"use client";

import { EntityMobileCard } from "@/components/shared/entity-mobile-card";
import { EarningStatusBadge } from "@/components/shared/earning-status-badge";
import type { AgentEarning, Locale } from "@/lib/types";
import { formatCurrency } from "@/lib/utils/format";

import { formatShortDate } from "./_shared";

interface MobileEarningCardProps {
  earning: AgentEarning;
  onClick: () => void;
  locale: Locale;
  statusLabel: string;
}

export function MobileEarningCard({
  earning,
  onClick,
  locale,
  statusLabel,
}: MobileEarningCardProps) {
  return (
    <EntityMobileCard
      onClick={onClick}
      aria-label={`${earning.freelancer_name} – ${formatCurrency(earning.commission_amount, locale)}`}
      title={earning.freelancer_name}
      status={
        <EarningStatusBadge status={earning.status} label={statusLabel} />
      }
      meta={
        <div className="flex items-center justify-between gap-2 w-full">
          <span className="text-xs text-muted-foreground">
            {formatShortDate(earning.period_date, locale)}
          </span>
          <span className="text-sm font-semibold tabular-nums text-foreground">
            {formatCurrency(earning.commission_amount, locale)}
          </span>
        </div>
      }
    />
  );
}
