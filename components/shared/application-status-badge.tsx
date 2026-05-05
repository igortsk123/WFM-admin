import type { ApplicationStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ApplicationStatusBadgeProps {
  status: ApplicationStatus;
  size?: "sm" | "md";
  className?: string;
}

const STATUS_CONFIG: Record<
  ApplicationStatus,
  { labelRu: string; labelEn: string; className: string }
> = {
  DRAFT: {
    labelRu: "Черновик",
    labelEn: "Draft",
    className: "bg-muted text-muted-foreground",
  },
  PENDING: {
    labelRu: "На рассмотрении",
    labelEn: "Pending",
    className: "bg-warning/10 text-warning",
  },
  APPROVED_FULL: {
    labelRu: "Согласована",
    labelEn: "Approved",
    className: "bg-success/10 text-success",
  },
  APPROVED_PARTIAL: {
    labelRu: "Частично",
    labelEn: "Partial",
    className: "bg-success/10 text-success",
  },
  REJECTED: {
    labelRu: "Отклонена",
    labelEn: "Rejected",
    className: "bg-destructive/10 text-destructive",
  },
  REPLACED_WITH_BONUS: {
    labelRu: "Бонус",
    labelEn: "Bonus",
    className: "bg-info/10 text-info",
  },
  MIXED: {
    labelRu: "Смешанная",
    labelEn: "Mixed",
    className: "bg-info/10 text-info",
  },
  CANCELLED: {
    labelRu: "Отменена",
    labelEn: "Cancelled",
    className: "bg-muted text-muted-foreground",
  },
};

export function ApplicationStatusBadge({
  status,
  size = "md",
  className,
}: ApplicationStatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md font-medium whitespace-nowrap",
        size === "sm" ? "px-1.5 py-0.5 text-xs" : "px-2.5 py-1 text-xs",
        config.className,
        className
      )}
    >
      {config.labelRu}
    </span>
  );
}

export function getApplicationStatusLabel(
  status: ApplicationStatus,
  locale: string = "ru"
): string {
  const config = STATUS_CONFIG[status];
  return locale === "en" ? config.labelEn : config.labelRu;
}
