import { useTranslations } from "next-intl";

import { PayoutPeriodStatusBadge } from "@/components/shared/payout-period-status-badge";
import type { PayoutPeriodStatus } from "@/lib/api/payouts";

interface PayoutStatusBadgeProps {
  status: PayoutPeriodStatus;
  t: ReturnType<typeof useTranslations<"screen.payoutDetail">>;
}

export function PayoutStatusBadge({ status, t }: PayoutStatusBadgeProps) {
  return (
    <PayoutPeriodStatusBadge
      status={status}
      label={t(`stages.${status.toLowerCase()}` as Parameters<typeof t>[0])}
    />
  );
}
