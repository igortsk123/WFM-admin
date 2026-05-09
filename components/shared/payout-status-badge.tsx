"use client";

import { useTranslations } from "next-intl";

import type { PayoutStatus } from "@/lib/types";

import { StatusBadge, type StatusConfig } from "./status-badge";

const PAYOUT_TONES: Record<
  PayoutStatus,
  StatusConfig<PayoutStatus>[PayoutStatus]["tone"]
> = {
  PENDING: "muted",
  PROCESSING: "info",
  PAID: "success",
  FAILED: "destructive",
};

interface PayoutStatusBadgeProps {
  status: PayoutStatus;
  className?: string;
}

export function PayoutStatusBadge({ status, className }: PayoutStatusBadgeProps) {
  const t = useTranslations("freelance.payout.status");

  const config = (Object.keys(PAYOUT_TONES) as PayoutStatus[]).reduce<
    StatusConfig<PayoutStatus>
  >((acc, key) => {
    acc[key] = {
      label: t(key as Parameters<typeof t>[0]),
      tone: PAYOUT_TONES[key],
      dot: key === "PROCESSING",
      pulse: key === "PROCESSING",
    };
    return acc;
  }, {} as StatusConfig<PayoutStatus>);

  return <StatusBadge status={status} config={config} className={className} />;
}
