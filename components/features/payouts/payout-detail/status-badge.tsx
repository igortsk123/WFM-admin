import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import type { PayoutPeriodStatus } from "@/lib/api/payouts";

interface PayoutStatusBadgeProps {
  status: PayoutPeriodStatus;
  t: ReturnType<typeof useTranslations<"screen.payoutDetail">>;
}

export function PayoutStatusBadge({ status, t }: PayoutStatusBadgeProps) {
  const config: Record<PayoutPeriodStatus, { className: string }> = {
    OPEN: { className: "bg-info/10 text-info border-info/20" },
    CALCULATING: { className: "bg-warning/10 text-warning border-warning/20" },
    READY: { className: "bg-success/10 text-success border-success/20" },
    PAID: { className: "bg-muted text-muted-foreground border-border" },
  };

  const { className } = config[status];

  return (
    <Badge variant="outline" className={className}>
      {t(`stages.${status.toLowerCase()}` as Parameters<typeof t>[0])}
    </Badge>
  );
}
