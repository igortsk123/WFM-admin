"use client";

import { StatusBadge, type StatusConfig } from "./status-badge";

export type EarningStatus = "CALCULATED" | "PAID";

interface EarningStatusBadgeProps {
  status: EarningStatus;
  /** Pre-translated label — caller passes through next-intl. */
  label: string;
  size?: "sm" | "md";
  className?: string;
}

export function EarningStatusBadge({
  status,
  label,
  size = "md",
  className,
}: EarningStatusBadgeProps) {
  const config: StatusConfig<EarningStatus> = {
    CALCULATED: { label, tone: "warning" },
    PAID: { label, tone: "success" },
  };

  return (
    <StatusBadge
      status={status}
      config={config}
      size={size === "sm" ? "sm" : "default"}
      className={className}
    />
  );
}
