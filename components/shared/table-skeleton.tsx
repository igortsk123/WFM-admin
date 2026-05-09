import { Skeleton } from "@/components/ui/skeleton"

interface TableSkeletonProps {
  /** Number of rows. Default 8. */
  rows?: number
  /** Number of columns (used to render the optional header). Default 5. */
  columns?: number
  /** Show a 1-row header above the body rows. Default false. */
  showHeader?: boolean
  /** Override row height (Tailwind class). Default "h-12". */
  rowHeight?: string
  /** Pass-through className for the outer wrapper. */
  className?: string
}

/**
 * Generic placeholder for tabular / list-data screens (one row per item).
 * Renders N evenly-sized skeleton bars; optionally a thin header strip.
 *
 * Tailwind tokens only — uses the shared <Skeleton> primitive (bg-accent).
 */
export function TableSkeleton({
  rows = 8,
  columns = 5,
  showHeader = false,
  rowHeight = "h-12",
  className,
}: TableSkeletonProps) {
  return (
    <div className={className ?? "space-y-2"} aria-busy="true">
      {showHeader && (
        <div className="flex gap-2">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={`h-${i}`} className="h-8 flex-1 rounded-md" />
          ))}
        </div>
      )}
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className={`${rowHeight} w-full rounded-md`} />
      ))}
    </div>
  )
}
