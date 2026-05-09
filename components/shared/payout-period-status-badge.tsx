"use client";

import { StatusBadge, type StatusConfig } from "./status-badge";

import type { PayoutPeriodStatus } from "@/lib/api";

const PAYOUT_PERIOD_TONES: Record<
  PayoutPeriodStatus,
  StatusConfig<PayoutPeriodStatus>[PayoutPeriodStatus]["tone"]
> = {
  OPEN: "info",
  CALCULATING: "warning",
  READY: "success",
  PAID: "muted",
};

interface PayoutPeriodStatusBadgeProps {
  status: PayoutPeriodStatus;
  /** Pre-translated label — caller passes via next-intl. */
  label: string;
  size?: "sm" | "md";
  className?: string;
}

export function PayoutPeriodStatusBadge({
  status,
  label,
  size = "md",
  className,
}: PayoutPeriodStatusBadgeProps) {
  const config = (Object.keys(PAYOUT_PERIOD_TONES) as PayoutPeriodStatus[]).reduce<
    StatusConfig<PayoutPeriodStatus>
  >((acc, key) => {
    acc[key] = {
      label: key === status ? label : key,
      tone: PAYOUT_PERIOD_TONES[key],
    };
    return acc;
  }, {} as StatusConfig<PayoutPeriodStatus>);

  return (
    <StatusBadge
      status={status}
      config={config}
      size={size === "sm" ? "sm" : "default"}
      className={className}
    />
  );
}
