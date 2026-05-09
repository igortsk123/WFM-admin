"use client";

import type { ApplicationStatus } from "@/lib/types";

import { StatusBadge, type StatusConfig } from "./status-badge";

const APPLICATION_TONES: Record<
  ApplicationStatus,
  StatusConfig<ApplicationStatus>[ApplicationStatus]["tone"]
> = {
  DRAFT: "muted",
  PENDING: "warning",
  APPROVED_FULL: "success",
  APPROVED_PARTIAL: "success",
  REJECTED: "destructive",
  REPLACED_WITH_BONUS: "info",
  MIXED: "info",
  CANCELLED: "muted",
};

const LABELS_RU: Record<ApplicationStatus, string> = {
  DRAFT: "Черновик",
  PENDING: "На рассмотрении",
  APPROVED_FULL: "Согласована",
  APPROVED_PARTIAL: "Частично",
  REJECTED: "Отклонена",
  REPLACED_WITH_BONUS: "Бонус",
  MIXED: "Смешанная",
  CANCELLED: "Отменена",
};

const LABELS_EN: Record<ApplicationStatus, string> = {
  DRAFT: "Draft",
  PENDING: "Pending",
  APPROVED_FULL: "Approved",
  APPROVED_PARTIAL: "Partial",
  REJECTED: "Rejected",
  REPLACED_WITH_BONUS: "Bonus",
  MIXED: "Mixed",
  CANCELLED: "Cancelled",
};

function buildConfig(
  labels: Record<ApplicationStatus, string>,
): StatusConfig<ApplicationStatus> {
  return (Object.keys(APPLICATION_TONES) as ApplicationStatus[]).reduce<
    StatusConfig<ApplicationStatus>
  >((acc, key) => {
    acc[key] = { label: labels[key], tone: APPLICATION_TONES[key] };
    return acc;
  }, {} as StatusConfig<ApplicationStatus>);
}

interface ApplicationStatusBadgeProps {
  status: ApplicationStatus;
  size?: "sm" | "md";
  className?: string;
  /** Срочная заявка — показать дополнительный индикатор. */
  urgent?: boolean;
  /** Ретроактивная заявка — показать дополнительный индикатор. */
  retroactive?: boolean;
}

export function ApplicationStatusBadge({
  status,
  size = "md",
  className,
  urgent,
  retroactive,
}: ApplicationStatusBadgeProps) {
  // Original component always rendered RU labels. next-intl namespace
  // freelance.application.status exists, but adopting it here would
  // change visible behaviour for screens that don't currently translate.
  // Keep RU-static here; getApplicationStatusLabel handles EN explicitly.
  return (
    <span className="inline-flex items-center gap-1">
      <StatusBadge
        status={status}
        config={buildConfig(LABELS_RU)}
        size={size === "sm" ? "sm" : "default"}
        className={className}
      />
      {urgent && (
        <span
          className="inline-block size-1.5 rounded-full bg-destructive"
          aria-label="urgent"
        />
      )}
      {retroactive && (
        <span
          className="inline-block size-1.5 rounded-full bg-warning"
          aria-label="retroactive"
        />
      )}
    </span>
  );
}

export function getApplicationStatusLabel(
  status: ApplicationStatus,
  locale: string = "ru",
): string {
  return locale === "en" ? LABELS_EN[status] : LABELS_RU[status];
}
