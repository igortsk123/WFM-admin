"use client"

import { cn } from "@/lib/utils"
import type { ServiceStatus } from "@/lib/types"

interface ServiceStatusBadgeProps {
  status: ServiceStatus
  size?: "sm" | "md"
  className?: string
}

const STATUS_CONFIG: Record<
  ServiceStatus,
  { labelRu: string; labelEn: string; className: string; dot?: boolean }
> = {
  PLANNED: {
    labelRu: "Запланирована",
    labelEn: "Planned",
    className: "bg-muted text-muted-foreground",
  },
  IN_PROGRESS: {
    labelRu: "Выполняется",
    labelEn: "In progress",
    className: "bg-info/10 text-info",
    dot: true,
  },
  COMPLETED: {
    labelRu: "Ждёт подтверждения",
    labelEn: "Awaiting confirmation",
    className: "bg-warning/10 text-warning",
  },
  CONFIRMED: {
    labelRu: "Подтверждена",
    labelEn: "Confirmed",
    className: "bg-success/10 text-success",
  },
  READY_TO_PAY: {
    labelRu: "Готова к оплате",
    labelEn: "Ready to pay",
    className: "bg-info/10 text-info",
  },
  PAID: {
    labelRu: "Выплачена",
    labelEn: "Paid",
    className: "bg-success/10 text-success",
  },
  NO_SHOW: {
    labelRu: "Невыход",
    labelEn: "No-show",
    className: "bg-destructive/10 text-destructive",
  },
  DISPUTED: {
    labelRu: "Спор",
    labelEn: "Disputed",
    className: "bg-destructive/10 text-destructive",
  },
}

export function ServiceStatusBadge({
  status,
  size = "md",
  className,
}: ServiceStatusBadgeProps) {
  const config = STATUS_CONFIG[status]

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md font-medium whitespace-nowrap",
        size === "sm" ? "px-1.5 py-0.5 text-xs" : "px-2 py-0.5 text-xs",
        config.className,
        className
      )}
    >
      {config.dot && (
        <span
          aria-hidden="true"
          className="size-1.5 rounded-full bg-current animate-pulse shrink-0"
        />
      )}
      {config.labelRu}
    </span>
  )
}

export function getServiceStatusLabel(
  status: ServiceStatus,
  locale: string = "ru"
): string {
  const config = STATUS_CONFIG[status]
  return locale === "en" ? config.labelEn : config.labelRu
}
