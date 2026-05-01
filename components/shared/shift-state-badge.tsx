"use client"

import { useTranslations } from "next-intl"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { ShiftStatus } from "@/lib/types"

interface ShiftStateBadgeProps {
  status: ShiftStatus
  size?: "sm" | "md"
  className?: string
}

const SHIFT_STYLES: Record<ShiftStatus, string> = {
  NEW:    "bg-info/10 text-info border-info/20",
  OPENED: "bg-success/10 text-success border-success/20",
  CLOSED: "bg-muted text-muted-foreground border-transparent",
}

const SHIFT_KEY: Record<ShiftStatus, string> = {
  NEW:    "new",
  OPENED: "opened",
  CLOSED: "closed",
}

export function ShiftStateBadge({ status, size = "md", className }: ShiftStateBadgeProps) {
  const t = useTranslations("shift.status")

  return (
    <Badge
      className={cn(
        SHIFT_STYLES[status],
        size === "sm" && "px-1.5 py-0 text-[11px]",
        className
      )}
    >
      {status === "OPENED" && (
        <span
          aria-hidden="true"
          className="mr-1 inline-block size-1.5 rounded-full bg-success animate-pulse"
        />
      )}
      {t(SHIFT_KEY[status])}
    </Badge>
  )
}
