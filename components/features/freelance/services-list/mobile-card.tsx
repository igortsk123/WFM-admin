"use client";

import { memo } from "react";

import type { Locale, Service } from "@/lib/types";
import { pickLocalized } from "@/lib/utils/locale-pick";

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
  const serviceName = pickLocalized(
    s.service_name,
    s.service_name_en ?? undefined,
    locale as Locale,
  );
  // Одно значение часов: для PLANNED/IN_PROGRESS/NO_SHOW — «обещано»,
  // остальные — «к оплате». Детальная разбивка остаётся в sheet'е.
  const isPreOrPending =
    s.status === "PLANNED" ||
    s.status === "IN_PROGRESS" ||
    s.status === "NO_SHOW";
  const hoursValue = isPreOrPending ? s.scheduled_hours : s.payable_hours;

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-2 min-w-0">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground truncate">
            {serviceName}
          </p>
          <div className="mt-0.5">
            <UserCell user={fakeUser} />
          </div>
        </div>
        <ServiceStatusBadge status={s.status} size="sm" />
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground">
          {formatDate(s.service_date, locale)}
        </span>
        <span className="text-xs text-muted-foreground">·</span>
        <span className="text-xs text-muted-foreground truncate max-w-[140px]">
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
            {hoursValue}&nbsp;ч
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
