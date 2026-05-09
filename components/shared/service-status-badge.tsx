"use client";

import { useTranslations } from "next-intl";

import type { ServiceStatus } from "@/lib/types";

import { StatusBadge, type StatusConfig } from "./status-badge";

const SERVICE_TONES: Record<ServiceStatus, StatusConfig<ServiceStatus>[ServiceStatus]["tone"]> = {
  PLANNED: "muted",
  IN_PROGRESS: "info",
  COMPLETED: "warning",
  CONFIRMED: "success",
  READY_TO_PAY: "info",
  PAID: "success",
  NO_SHOW: "destructive",
  DISPUTED: "destructive",
};

// Static EN fallback labels for getServiceStatusLabel() used in non-React
// contexts (CSV exports, filter chips that don't have a translator handy).
const LABELS_RU: Record<ServiceStatus, string> = {
  PLANNED: "Запланирована",
  IN_PROGRESS: "Выполняется",
  COMPLETED: "Ждёт подтверждения",
  CONFIRMED: "Подтверждена",
  READY_TO_PAY: "Готова к оплате",
  PAID: "Выплачена",
  NO_SHOW: "Невыход",
  DISPUTED: "Спор",
};

const LABELS_EN: Record<ServiceStatus, string> = {
  PLANNED: "Planned",
  IN_PROGRESS: "In progress",
  COMPLETED: "Awaiting confirmation",
  CONFIRMED: "Confirmed",
  READY_TO_PAY: "Ready to pay",
  PAID: "Paid",
  NO_SHOW: "No-show",
  DISPUTED: "Disputed",
};

interface ServiceStatusBadgeProps {
  status: ServiceStatus;
  size?: "sm" | "md";
  className?: string;
}

export function ServiceStatusBadge({
  status,
  size = "md",
  className,
}: ServiceStatusBadgeProps) {
  const t = useTranslations("freelance.service.status");

  const config = (Object.keys(SERVICE_TONES) as ServiceStatus[]).reduce<
    StatusConfig<ServiceStatus>
  >((acc, key) => {
    acc[key] = {
      label: t(key as Parameters<typeof t>[0]),
      tone: SERVICE_TONES[key],
      dot: key === "IN_PROGRESS",
      pulse: key === "IN_PROGRESS",
    };
    return acc;
  }, {} as StatusConfig<ServiceStatus>);

  return (
    <StatusBadge
      status={status}
      config={config}
      size={size === "sm" ? "sm" : "default"}
      className={className}
    />
  );
}

export function getServiceStatusLabel(
  status: ServiceStatus,
  locale: string = "ru",
): string {
  return locale === "en" ? LABELS_EN[status] : LABELS_RU[status];
}
