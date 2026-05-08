"use client"

import { Badge } from "@/components/ui/badge"
import { GROUP_COLORS } from "./_shared"

interface GroupBadgeProps {
  group: string
  className?: string
}

/**
 * Work-type group badge. Color picked from GROUP_COLORS map by group name.
 * Local component (NOT shared/work-type-badge.tsx because that one uses
 * deterministic id-mapping — we want explicit group→color match).
 */
export function GroupBadge({ group, className }: GroupBadgeProps) {
  const colors = GROUP_COLORS[group]
  return (
    <Badge
      className={className ?? "border-transparent text-xs"}
      style={
        colors
          ? { backgroundColor: colors.bg, color: colors.text }
          : undefined
      }
    >
      {group}
    </Badge>
  )
}
