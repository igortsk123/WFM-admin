import { Skeleton } from "@/components/ui/skeleton"

interface ListSkeletonProps {
  /** Number of list items. Default 5. */
  items?: number
  /** Show a circular avatar placeholder on the left of each item. Default false. */
  avatar?: boolean
  /** Number of text lines per item. Default 1. */
  lines?: number
  /** Optional trailing badge / pill placeholder on the right. Default false. */
  trailing?: boolean
  /** Pass-through className for the outer wrapper. */
  className?: string
  /** Optional aria-label for the busy region. */
  ariaLabel?: string
}

/**
 * Generic placeholder for vertical lists (mobile cards, sidebar lists,
 * activity feeds, audit logs, etc.). Each item renders an optional avatar,
 * one or more text lines, and an optional trailing pill.
 *
 * Uses semantic tokens via the shared <Skeleton> primitive.
 */
export function ListSkeleton({
  items = 5,
  avatar = false,
  lines = 1,
  trailing = false,
  className,
  ariaLabel,
}: ListSkeletonProps) {
  return (
    <div
      className={`${className ?? "flex flex-col gap-2"} transition-opacity duration-200`}
      aria-busy="true"
      aria-label={ariaLabel}
    >
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 px-4 py-3">
          {avatar && <Skeleton className="size-8 rounded-full shrink-0" />}
          <div className="flex-1 flex flex-col gap-1.5 min-w-0">
            {Array.from({ length: lines }).map((_, l) => (
              <Skeleton
                key={l}
                className={`h-4 ${l === 0 ? "w-3/4" : "w-1/2"}`}
              />
            ))}
          </div>
          {trailing && <Skeleton className="h-5 w-16 rounded-full" />}
        </div>
      ))}
    </div>
  )
}
