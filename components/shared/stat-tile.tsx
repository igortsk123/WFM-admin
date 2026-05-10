import type { ReactNode } from "react"

import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

/**
 * Compact bordered tile for label + numeric/short value pairs (no diff,
 * no sparkline). Use {@link KpiCard} when you need trend / sparkline /
 * percentage diff — `StatTile` is intentionally lighter.
 *
 * Mirrors the 6+ ad-hoc copies that lived in feature folders before
 * dedup (positions-list, store-detail, schedule stats-bar, shift-detail
 * KPI row, hints-management, employee-detail extras).
 *
 * Caller-translated labels — keep i18n in the caller.
 */
interface StatTileProps {
  label: string
  value: ReactNode
  /** Optional leading icon — accepts both `<Icon />` JSX and any ReactNode */
  icon?: ReactNode
  /** Render skeleton instead of value */
  loading?: boolean
  /** Highlight value with warning color + dot accent */
  warn?: boolean
  /** Per-tile color override for the value (e.g. `text-success`) */
  colorClass?: string
  /** Padding compactness — `sm` = p-3, `md` = p-4 (default `sm`) */
  size?: "sm" | "md"
  className?: string
}

export function StatTile({
  label,
  value,
  icon,
  loading,
  warn,
  colorClass,
  size = "sm",
  className,
}: StatTileProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 rounded-xl border border-border bg-card",
        size === "sm" ? "p-3" : "p-4",
        className,
      )}
    >
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      {loading ? (
        <Skeleton className="mt-0.5 h-7 w-16" />
      ) : (
        <span
          className={cn(
            "text-xl font-semibold leading-tight tabular-nums",
            warn ? "text-warning" : (colorClass ?? "text-foreground"),
          )}
        >
          {value}
          {warn && (
            <span
              aria-hidden="true"
              className="ml-1 inline-flex size-1.5 rounded-full bg-warning align-middle"
            />
          )}
        </span>
      )}
    </div>
  )
}
