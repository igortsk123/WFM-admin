"use client"

import { useTranslations } from "next-intl"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { ShiftState } from "@/lib/types"

interface ShiftStateBadgeProps {
  state: ShiftState
  size?: "sm" | "md"
  className?: string
}

const SHIFT_STYLES: Record<ShiftState, string> = {
  SCHEDULED:   "bg-muted text-muted-foreground border-transparent",
  IN_PROGRESS: "bg-success/10 text-success border-success/20",
  COMPLETED:   "bg-muted text-muted-foreground border-transparent",
  CANCELLED:   "bg-destructive/10 text-destructive border-destructive/20",
  NO_SHOW:     "bg-destructive/10 text-destructive border-destructive/20",
}

const SHIFT_KEY: Record<ShiftState, string> = {
  SCHEDULED:   "scheduled",
  IN_PROGRESS: "in_progress",
  COMPLETED:   "completed",
  CANCELLED:   "cancelled",
  NO_SHOW:     "no_show",
}

export function ShiftStateBadge({ state, size = "md", className }: ShiftStateBadgeProps) {
  const t = useTranslations("shift.state")

  return (
    <Badge
      className={cn(
        SHIFT_STYLES[state],
        size === "sm" && "px-1.5 py-0 text-[11px]",
        className
      )}
    >
      {state === "IN_PROGRESS" && (
        <span
          aria-hidden="true"
          className="mr-1 inline-block size-1.5 rounded-full bg-success animate-pulse"
        />
      )}
      {t(SHIFT_KEY[state])}
    </Badge>
  )
}
