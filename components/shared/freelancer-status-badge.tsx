"use client";

import type { FreelancerStatus } from "@/lib/types";

import { StatusBadge, type StatusConfig } from "./status-badge";

const FREELANCER_LABELS_RU: Record<FreelancerStatus, string> = {
  NEW: "Новый",
  VERIFICATION: "Проверка",
  ACTIVE: "Активен",
  BLOCKED: "Заблокирован",
  ARCHIVED: "Архив",
};

const FREELANCER_LABELS_EN: Record<FreelancerStatus, string> = {
  NEW: "New",
  VERIFICATION: "Verification",
  ACTIVE: "Active",
  BLOCKED: "Blocked",
  ARCHIVED: "Archived",
};

function buildFreelancerStatusConfig(
  labels: Record<FreelancerStatus, string>,
): StatusConfig<FreelancerStatus> {
  return {
    NEW: { label: labels.NEW, tone: "muted" },
    VERIFICATION: { label: labels.VERIFICATION, tone: "warning" },
    ACTIVE: { label: labels.ACTIVE, tone: "success" },
    BLOCKED: { label: labels.BLOCKED, tone: "destructive" },
    ARCHIVED: { label: labels.ARCHIVED, tone: "muted" },
  };
}

interface FreelancerStatusBadgeProps {
  status: FreelancerStatus;
  size?: "sm" | "md";
  className?: string;
}

export function FreelancerStatusBadge({
  status,
  size = "md",
  className,
}: FreelancerStatusBadgeProps) {
  return (
    <StatusBadge
      status={status}
      config={buildFreelancerStatusConfig(FREELANCER_LABELS_RU)}
      size={size === "sm" ? "sm" : "default"}
      className={className}
    />
  );
}

export function getFreelancerStatusLabel(
  status: FreelancerStatus,
  locale: string = "ru",
): string {
  const labels =
    locale === "en" ? FREELANCER_LABELS_EN : FREELANCER_LABELS_RU;
  return labels[status];
}
