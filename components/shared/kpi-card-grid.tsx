"use client"

import type { LucideIcon } from "lucide-react"
import { KpiCard } from "@/components/shared/kpi-card"
import { cn } from "@/lib/utils"

/**
 * KPI item descriptor for {@link KpiCardGrid}. Mirrors `KpiCard` props so
 * callers don't have to wrap each element themselves — pass an array, get a
 * responsive grid.
 */
export interface KpiCardItem {
  /** Already-translated label (i18n stays in caller) */
  label: string
  value: string | number
  /** Positive number = success (up), negative = destructive (down) */
  diff?: number
  /** Sparkline data points */
  trend?: number[]
  icon?: LucideIcon
  /** Renders a subtle warning border on the card */
  warning?: boolean
  /** Per-item className passthrough (e.g. conditional `border-warning`) */
  className?: string
  /** Stable react key for the card (defaults to label) */
  key?: string
}

interface KpiCardGridProps {
  items: KpiCardItem[]
  /** Desktop column count. Mobile = 1, tablet = 2, desktop = N. Default 4. */
  columns?: 2 | 3 | 4
  className?: string
}

const columnClass: Record<NonNullable<KpiCardGridProps["columns"]>, string> = {
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
}

export function KpiCardGrid({
  items,
  columns = 4,
  className,
}: KpiCardGridProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-4",
        columnClass[columns],
        className,
      )}
    >
      {items.map((item, i) => (
        <KpiCard
          key={item.key ?? `${item.label}-${i}`}
          label={item.label}
          value={item.value}
          diff={item.diff}
          trend={item.trend}
          icon={item.icon}
          className={cn(item.warning && "border-warning", item.className)}
        />
      ))}
    </div>
  )
}
