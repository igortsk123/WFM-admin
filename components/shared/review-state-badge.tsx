"use client"

import { useTranslations } from "next-intl"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { TaskReviewState } from "@/lib/types"

interface ReviewStateBadgeProps {
  reviewState: TaskReviewState
  size?: "sm" | "md"
  className?: string
}

const REVIEW_STYLES: Record<TaskReviewState, string | null> = {
  NONE:           null,
  PENDING:        "bg-info/10 text-info border-info/20",
  APPROVED:       "bg-success/10 text-success border-success/20",
  REJECTED:       "bg-destructive/10 text-destructive border-destructive/20",
  NEEDS_REVISION: "bg-warning/10 text-warning border-warning/20",
}

const REVIEW_KEY: Record<TaskReviewState, string | null> = {
  NONE:           null,
  PENDING:        "pending",
  APPROVED:       "approved",
  REJECTED:       "rejected",
  NEEDS_REVISION: "needs_revision",
}

export function ReviewStateBadge({ reviewState, size = "md", className }: ReviewStateBadgeProps) {
  const t = useTranslations("task.review")

  const styles = REVIEW_STYLES[reviewState]
  const key = REVIEW_KEY[reviewState]

  if (!styles || !key) return null

  return (
    <Badge
      className={cn(
        styles,
        size === "sm" && "px-1.5 py-0 text-[11px]",
        className
      )}
    >
      {t(key)}
    </Badge>
  )
}
