import { Skeleton } from "@/components/ui/skeleton"

interface CardGridSkeletonProps {
  /** Number of cards. Default 4. */
  count?: number
  /** Number of columns at lg+ breakpoint. Default 4. */
  columns?: 2 | 3 | 4 | 6
  /** Per-card height (Tailwind class). Default "h-28". */
  height?: string
  /** Border-radius (Tailwind class). Default "rounded-xl". */
  rounded?: string
  /** Pass-through className for the outer grid wrapper. */
  className?: string
}

const COLUMN_CLASS: Record<2 | 3 | 4 | 6, string> = {
  2: "grid-cols-2",
  3: "grid-cols-2 md:grid-cols-3",
  4: "grid-cols-2 lg:grid-cols-4",
  6: "grid-cols-2 md:grid-cols-3 lg:grid-cols-6",
}

/**
 * Generic placeholder for KPI / dashboard / metric-card grids.
 * Renders N equally-sized rounded cards in a responsive grid.
 *
 * Uses semantic tokens via the shared <Skeleton> primitive.
 */
export function CardGridSkeleton({
  count = 4,
  columns = 4,
  height = "h-28",
  rounded = "rounded-xl",
  className,
}: CardGridSkeletonProps) {
  return (
    <div
      className={`${className ?? `grid gap-4 ${COLUMN_CLASS[columns]}`} transition-opacity duration-200`}
      aria-busy="true"
    >
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className={`${height} ${rounded}`} />
      ))}
    </div>
  )
}
