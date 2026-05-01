"use client"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

/** Deterministic 6-scheme mapping — mobile parity (iOS task.categoryBadgeColor / Android task.categoryBadgeScheme) */
const SCHEMES = ["violet", "blue", "yellow", "pink", "orange", "green"] as const
type SchemeKey = (typeof SCHEMES)[number]

interface WorkType {
  id: number
  name: string
}

interface WorkTypeBadgeProps {
  workType: WorkType
  size?: "sm" | "md"
  variant?: "bright" | "light"
  className?: string
}

export function WorkTypeBadge({
  workType,
  size = "md",
  variant = "light",
  className,
}: WorkTypeBadgeProps) {
  const scheme: SchemeKey = SCHEMES[workType.id % 6]

  const bgVar =
    variant === "bright"
      ? `var(--color-badge-${scheme}-bg-bright)`
      : `var(--color-badge-${scheme}-bg-light)`

  const textVar =
    variant === "bright"
      ? `var(--color-badge-${scheme}-text-bright)`
      : `var(--color-badge-${scheme}-text-light)`

  return (
    <Badge
      className={cn(
        "border-transparent",
        size === "sm" && "px-1.5 py-0 text-[11px]",
        className
      )}
      style={{
        backgroundColor: bgVar,
        color: textVar,
      }}
    >
      {workType.name}
    </Badge>
  )
}
