"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * EntityMobileCard — generic slot-based mobile card for list rows.
 *
 * Replaces the ad-hoc `mobile-card.tsx` files that lived under each
 * `components/features/<feature>/<entity>-list/` and shared the same UX:
 *   - leading icon/avatar (optional)
 *   - title row with status pill on the right
 *   - optional subtitle directly under the title
 *   - one or more meta rows (badges, dates, counts)
 *   - optional actions (dropdown/buttons) — typically aligned to the title row
 *   - optional footer (e.g. usage bar, action buttons row)
 *
 * Two rendering modes:
 *
 * 1. **Standalone card** — when `onClick` is supplied (or `asCard`), the
 *    component wraps the content in `<button>` with full card chrome
 *    (`bg-card`, `border-border`, padding, rounded). Use this when the
 *    parent does NOT already wrap the row in a card (e.g. plain
 *    `.map()`-rendered list).
 *
 * 2. **Content-only** — when neither `onClick` nor `asCard` is supplied,
 *    the component renders its inner flex-column layout only. Use this
 *    inside `ResponsiveDataTable.mobileCardRender`, which already
 *    provides the outer card chrome and click handling.
 *
 * All slots accept arbitrary `ReactNode` — i18n and feature-specific
 * formatting stay in the caller. Visual primitives (Tailwind tokens,
 * spacing, touch target ≥44px on the wrapper) are unified here.
 */
export interface EntityMobileCardProps {
  /**
   * Click handler. When provided, the component renders itself as a
   * `<button>` with full card chrome (`bg-card`, `border-border`,
   * padding, hover state). Use for self-contained list rows.
   *
   * Inside `ResponsiveDataTable.mobileCardRender`, the outer wrapper
   * already handles clicks — leave `onClick` undefined there.
   */
  onClick?: () => void

  /**
   * Force standalone-card rendering even without `onClick`. Useful when
   * the card is interactive only via inner controls (e.g. footer buttons)
   * but still needs its own chrome.
   */
  asCard?: boolean

  /**
   * Leading slot (avatar, icon container, file-type badge). Aligns to
   * the start of the title row.
   */
  leading?: React.ReactNode

  /** Primary title (entity name). Truncates on overflow. */
  title: React.ReactNode

  /**
   * Subtitle directly under the title (role, code, address). Smaller,
   * muted text.
   */
  subtitle?: React.ReactNode

  /**
   * Status slot rendered on the right side of the title row (status pill,
   * source badge).
   */
  status?: React.ReactNode

  /**
   * Actions slot (dropdown menu trigger, checkboxes). Rendered next to
   * `status` on the right side of the title row. Stop propagation is the
   * caller's responsibility.
   */
  actions?: React.ReactNode

  /**
   * Meta rows beneath the title — badges, dates, counts. Pass a single
   * `ReactNode` for one row, or an array for multiple stacked rows.
   * Each row gets `flex items-center gap-2 flex-wrap`.
   */
  meta?: React.ReactNode | React.ReactNode[]

  /**
   * Bottom row — usage bar, action buttons, or anything else that should
   * sit below all meta rows. No flex constraints applied.
   */
  footer?: React.ReactNode

  /**
   * Visual selected state for bulk-select rows. Adds a primary-tinted
   * border. Selection toggling itself stays in the caller (use the
   * `actions` slot for a `<Checkbox>`).
   */
  selected?: boolean

  /** ARIA label for the standalone-card mode. */
  "aria-label"?: string

  className?: string
}

const META_ROW_CLASS = "flex items-center gap-2 flex-wrap"

function MetaRows({ meta }: { meta: React.ReactNode | React.ReactNode[] }) {
  if (Array.isArray(meta)) {
    return (
      <>
        {meta.map((row, i) =>
          row == null || row === false ? null : (
            <div key={i} className={META_ROW_CLASS}>
              {row}
            </div>
          ),
        )}
      </>
    )
  }
  return <div className={META_ROW_CLASS}>{meta}</div>
}

export function EntityMobileCard({
  onClick,
  asCard,
  leading,
  title,
  subtitle,
  status,
  actions,
  meta,
  footer,
  selected,
  "aria-label": ariaLabel,
  className,
}: EntityMobileCardProps) {
  const standalone = onClick != null || asCard === true

  const headerRow = (
    <div className="flex items-start justify-between gap-2">
      <div className="flex items-start gap-2 min-w-0 flex-1">
        {leading && <div className="shrink-0">{leading}</div>}
        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
          <div className="text-sm font-medium text-foreground truncate text-left">
            {title}
          </div>
          {subtitle && (
            <div className="text-xs text-muted-foreground truncate text-left">
              {subtitle}
            </div>
          )}
        </div>
      </div>
      {(status != null || actions != null) && (
        <div className="flex items-center gap-1 shrink-0">
          {status}
          {actions}
        </div>
      )}
    </div>
  )

  const body = (
    <>
      {headerRow}
      {meta != null && meta !== false && <MetaRows meta={meta} />}
      {footer != null && footer !== false && <div>{footer}</div>}
    </>
  )

  const innerLayoutClass = "flex flex-col gap-2 w-full"

  if (standalone) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel}
        className={cn(
          innerLayoutClass,
          "rounded-lg border bg-card p-4 text-left min-h-[44px] transition-colors",
          "hover:bg-muted/50 active:bg-muted/50",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          selected ? "border-primary" : "border-border",
          className,
        )}
      >
        {body}
      </button>
    )
  }

  return (
    <div
      className={cn(
        innerLayoutClass,
        selected && "ring-1 ring-primary -m-px rounded-lg",
        className,
      )}
    >
      {body}
    </div>
  )
}
