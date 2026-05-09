"use client";

import type { AgentStatus } from "@/lib/types";

import { StatusBadge, type StatusConfig } from "./status-badge";

// Labels are static (no useTranslations namespace exists for agent.status yet),
// so we keep them inline here. Refactoring to next-intl would require adding
// a "freelance.agent.status.*" namespace — out of scope for this consolidation.
const AGENT_STATUS_LABELS_RU: Record<AgentStatus, string> = {
  ACTIVE: "Активен",
  BLOCKED: "Заблокирован",
  ARCHIVED: "Архив",
};

const AGENT_STATUS_LABELS_EN: Record<AgentStatus, string> = {
  ACTIVE: "Active",
  BLOCKED: "Blocked",
  ARCHIVED: "Archived",
};

function buildAgentStatusConfig(
  labels: Record<AgentStatus, string>,
): StatusConfig<AgentStatus> {
  return {
    ACTIVE: { label: labels.ACTIVE, tone: "success" },
    BLOCKED: { label: labels.BLOCKED, tone: "warning" },
    ARCHIVED: { label: labels.ARCHIVED, tone: "muted" },
  };
}

interface AgentStatusBadgeProps {
  status: AgentStatus;
  /** "md" is preserved as alias for default tone — wrappers shipped before this had "sm" | "md". */
  size?: "sm" | "md";
  className?: string;
}

export function AgentStatusBadge({
  status,
  size = "md",
  className,
}: AgentStatusBadgeProps) {
  return (
    <StatusBadge
      status={status}
      config={buildAgentStatusConfig(AGENT_STATUS_LABELS_RU)}
      size={size === "sm" ? "sm" : "default"}
      className={className}
    />
  );
}

export function getAgentStatusLabel(
  status: AgentStatus,
  locale: string = "ru",
): string {
  const labels =
    locale === "en" ? AGENT_STATUS_LABELS_EN : AGENT_STATUS_LABELS_RU;
  return labels[status];
}
