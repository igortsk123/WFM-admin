import type { AgentStatus } from "@/lib/types"
import { cn } from "@/lib/utils"

interface AgentStatusBadgeProps {
  status: AgentStatus
  size?: "sm" | "md"
  className?: string
}

const STATUS_CONFIG: Record<
  AgentStatus,
  { labelRu: string; labelEn: string; className: string }
> = {
  ACTIVE: {
    labelRu: "Активен",
    labelEn: "Active",
    className: "bg-success/10 text-success",
  },
  BLOCKED: {
    labelRu: "Заблокирован",
    labelEn: "Blocked",
    className: "bg-warning/10 text-warning",
  },
  ARCHIVED: {
    labelRu: "Архив",
    labelEn: "Archived",
    className: "bg-muted text-muted-foreground",
  },
}

export function AgentStatusBadge({
  status,
  size = "md",
  className,
}: AgentStatusBadgeProps) {
  const config = STATUS_CONFIG[status]

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md font-medium whitespace-nowrap",
        size === "sm" ? "px-1.5 py-0.5 text-xs" : "px-2 py-0.5 text-xs",
        config.className,
        className
      )}
    >
      {config.labelRu}
    </span>
  )
}

export function getAgentStatusLabel(
  status: AgentStatus,
  locale: string = "ru"
): string {
  const config = STATUS_CONFIG[status]
  return locale === "en" ? config.labelEn : config.labelRu
}
