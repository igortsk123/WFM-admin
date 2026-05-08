"use client";

import { cn } from "@/lib/utils";
import type { EarningStatus } from "./_shared";

interface EarningStatusBadgeProps {
  status: EarningStatus;
  label: string;
}

export function EarningStatusBadge({ status, label }: EarningStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        status === "PAID"
          ? "bg-success/10 text-success"
          : "bg-warning/10 text-warning"
      )}
    >
      {label}
    </span>
  );
}
