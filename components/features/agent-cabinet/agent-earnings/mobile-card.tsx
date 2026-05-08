"use client";

import { formatCurrency } from "@/lib/utils/format";
import type { AgentEarning, Locale } from "@/lib/types";
import { EarningStatusBadge } from "./earning-status-badge";
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
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-lg border border-border bg-card p-4 flex flex-col gap-2 hover:bg-muted/50 transition-colors min-h-[44px]"
      aria-label={`${earning.freelancer_name} – ${formatCurrency(earning.commission_amount, locale)}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-foreground truncate">
          {earning.freelancer_name}
        </span>
        <EarningStatusBadge status={earning.status} label={statusLabel} />
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          {formatShortDate(earning.period_date, locale)}
        </span>
        <span className="text-sm font-semibold tabular-nums text-foreground">
          {formatCurrency(earning.commission_amount, locale)}
        </span>
      </div>
    </button>
  );
}
