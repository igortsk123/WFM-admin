"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PayoutStatus } from "@/lib/types";

interface PayoutStatusBadgeProps {
  status: PayoutStatus;
  className?: string;
}

const STATUS_CONFIG: Record<
  PayoutStatus,
  { className: string; dotClass?: string; pulse?: boolean }
> = {
  PENDING: {
    className: "bg-muted text-muted-foreground border-border",
  },
  PROCESSING: {
    className: "bg-info/10 text-info border-info/20",
    dotClass: "bg-info",
    pulse: true,
  },
  PAID: {
    className: "bg-success/10 text-success border-success/20",
  },
  FAILED: {
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
};

export function PayoutStatusBadge({ status, className }: PayoutStatusBadgeProps) {
  const t = useTranslations("freelance.payout.status");
  const config = STATUS_CONFIG[status];

  return (
    <Badge
      variant="outline"
      className={cn("gap-1.5 font-medium", config.className, className)}
    >
      {config.dotClass && (
        <span
          aria-hidden="true"
          className={cn(
            "inline-block size-1.5 rounded-full shrink-0",
            config.dotClass,
            config.pulse && "animate-pulse"
          )}
        />
      )}
      {t(status as Parameters<typeof t>[0])}
    </Badge>
  );
}
