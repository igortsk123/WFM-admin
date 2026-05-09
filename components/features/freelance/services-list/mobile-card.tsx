"use client";

import { memo } from "react";

import type { Service } from "@/lib/types";

import { ServiceStatusBadge } from "@/components/shared/service-status-badge";
import { UserCell } from "@/components/shared/user-cell";
import { WorkTypeBadge } from "@/components/shared/work-type-badge";

import { formatAmount, formatDate } from "./_shared";

export interface ServiceMobileCardProps {
  service: Service;
  isNominal: boolean;
  locale: string;
}

export const ServiceMobileCard = memo(function ServiceMobileCard({
  service: s,
  isNominal,
  locale,
}: ServiceMobileCardProps) {
  const nameParts = s.freelancer_name.split(" ");
  const fakeUser = {
    first_name: nameParts[1] ?? "",
    last_name: nameParts[0] ?? "",
    middle_name: nameParts[2],
  };
  const amount = isNominal ? s.total_amount : s.total_amount_indicative;

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-2">
        <UserCell user={fakeUser} />
        <ServiceStatusBadge status={s.status} size="sm" />
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground">
          {formatDate(s.service_date, locale)}
        </span>
        <span className="text-xs text-muted-foreground">·</span>
        <span className="text-xs text-muted-foreground truncate max-w-[120px]">
          {s.store_name}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <WorkTypeBadge
          workType={{ id: s.work_type_id, name: s.work_type_name }}
          size="sm"
        />
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground font-mono">
            {s.scheduled_hours}&nbsp;ч
          </span>
          {amount != null && (
            <span className="text-sm font-semibold text-foreground font-mono">
              {formatAmount(amount, "RUB", locale)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
});
