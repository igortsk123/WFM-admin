import type { ReactNode } from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export interface MetadataItem {
  /** Pre-translated label rendered inside <dt>. */
  label: string
  /** Value rendered inside <dd>. Can be plain text, Badge, Link, etc. */
  value: ReactNode
  /**
   * How many grid columns this item should span.
   * Use 2 for wider values (addresses, comments) inside a 2-column grid.
   * Defaults to 1.
   */
  span?: 1 | 2 | 3
  /** Optional className applied to the <dd> element (e.g. text-success). */
  valueClassName?: string
  /** Stable key — defaults to label. Useful when label is duplicated. */
  key?: string
}

export interface MetadataCardProps {
  /** Optional card header title. When omitted, the card has no header. */
  title?: string
  /** Items rendered as <dt>/<dd> pairs inside a responsive <dl> grid. */
  items: MetadataItem[]
  /**
   * Number of columns on >= sm breakpoint. Mobile is always 1 column.
   * Defaults to 2.
   */
  columns?: 2 | 3 | 4
  /** Extra className passed to the outer Card. */
  className?: string
  /** Extra className passed to CardContent. */
  contentClassName?: string
}

const COLUMNS_CLASS: Record<NonNullable<MetadataCardProps["columns"]>, string> = {
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 md:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
}

const SPAN_CLASS: Record<NonNullable<MetadataItem["span"]>, string> = {
  1: "",
  2: "sm:col-span-2",
  3: "sm:col-span-2 md:col-span-3",
}

/**
 * Generic metadata grid for detail pages — a Card wrapping a `<dl>` grid of
 * label/value pairs. Each row uses muted-foreground `<dt>` (xs) over a
 * foreground `<dd>` (sm). Mobile-first: single column on mobile, configurable
 * on >= sm.
 *
 * Callers pass labels pre-translated (i18n is the caller's responsibility).
 * Values can be ReactNodes (Badges, Links, formatted dates).
 *
 * Use `span` on an item to make it occupy multiple columns (e.g. for an
 * address or comment in a 2-column grid). Use `valueClassName` for tinting
 * (e.g. text-success on an "approved" value).
 *
 * For headerless usage, omit `title`.
 */
export function MetadataCard({
  title,
  items,
  columns = 2,
  className,
  contentClassName,
}: MetadataCardProps) {
  return (
    <Card className={className}>
      {title ? (
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">{title}</CardTitle>
        </CardHeader>
      ) : null}
      <CardContent className={contentClassName}>
        <dl className={cn("grid gap-x-4 gap-y-3 text-sm", COLUMNS_CLASS[columns])}>
          {items.map((item) => (
            <div
              key={item.key ?? item.label}
              className={cn("flex flex-col gap-0.5", item.span ? SPAN_CLASS[item.span] : undefined)}
            >
              <dt className="text-xs text-muted-foreground">{item.label}</dt>
              <dd className={cn("text-sm font-medium text-foreground", item.valueClassName)}>
                {item.value}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  )
}
