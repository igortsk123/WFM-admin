import type { FreelancerStatus } from "@/lib/types"
import { cn } from "@/lib/utils"

interface FreelancerStatusBadgeProps {
  status: FreelancerStatus
  size?: "sm" | "md"
  className?: string
}

const STATUS_CONFIG: Record<
  FreelancerStatus,
  { label: string; labelEn: string; className: string }
> = {
  NEW: {
    label: "Новый",
    labelEn: "New",
    className: "bg-muted text-muted-foreground",
  },
  VERIFICATION: {
    label: "Проверка",
    labelEn: "Verification",
    className: "bg-warning/10 text-warning",
  },
  ACTIVE: {
    label: "Активен",
    labelEn: "Active",
    className: "bg-success/10 text-success",
  },
  BLOCKED: {
    label: "Заблокирован",
    labelEn: "Blocked",
    className: "bg-destructive/10 text-destructive",
  },
  ARCHIVED: {
    label: "Архив",
    labelEn: "Archived",
    className: "bg-muted text-muted-foreground",
  },
}

export function FreelancerStatusBadge({
  status,
  size = "md",
  className,
}: FreelancerStatusBadgeProps) {
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
      {config.label}
    </span>
  )
}

/** Английская метка для фильтра/опции */
export function getFreelancerStatusLabel(
  status: FreelancerStatus,
  locale: string = "ru"
): string {
  const config = STATUS_CONFIG[status]
  return locale === "en" ? config.labelEn : config.label
}
