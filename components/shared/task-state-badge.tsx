"use client"

import { useTranslations } from "next-intl"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { TaskState } from "@/lib/types"

interface TaskStateBadgeProps {
  state: TaskState
  size?: "sm" | "md"
  className?: string
}

const STATE_STYLES: Record<TaskState, string> = {
  NEW:         "bg-info/10 text-info border-info/20",
  IN_PROGRESS: "bg-success/10 text-success border-success/20",
  PAUSED:      "bg-warning/10 text-warning border-warning/20",
  COMPLETED:   "bg-muted text-muted-foreground border-transparent",
}

const STATE_KEY: Record<TaskState, string> = {
  NEW:         "new",
  IN_PROGRESS: "in_progress",
  PAUSED:      "paused",
  COMPLETED:   "completed",
}

export function TaskStateBadge({ state, size = "md", className }: TaskStateBadgeProps) {
  const t = useTranslations("task.state")

  return (
    <Badge
      className={cn(
        STATE_STYLES[state],
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
      {t(STATE_KEY[state])}
    </Badge>
  )
}
