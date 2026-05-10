"use client"

import * as React from "react"
import { useTranslations } from "next-intl"

import { cn } from "@/lib/utils"

export type BulkActionBarVariant = "sticky" | "inline"

export interface BulkActionBarProps {
  /**
   * Visual placement variant.
   *
   * - `"sticky"` — fixed bottom bar with backdrop, full-width on mobile,
   *   offset by the admin sidebar on desktop. Use for primary list-screens
   *   where the bar is the persistent action surface for a multi-row selection.
   * - `"inline"` — inline card block rendered in document flow. Use for
   *   sub-screens / panels where the bar should live above the content (e.g.
   *   permissions matrix, AI suggestions inbox).
   *
   * @default "sticky"
   */
  variant?: BulkActionBarVariant
  /** Number of selected items. When `0` (and no `forceVisible`) the bar is hidden. */
  selectedCount: number
  /** Optional hand-rolled count label. If not provided, defaults to `common.selected: N`. */
  countLabel?: React.ReactNode
  /**
   * Slot for action buttons / menus. Caller composes whatever JSX is needed
   * (Button, DropdownMenu, AlertDialogTrigger, …). Logic stays per-feature.
   */
  actions: React.ReactNode
  /**
   * Optional clear-selection callback. When provided, the bar renders a
   * dedicated "clear" affordance next to the count (sticky variant only).
   * For inline variant, place a "clear" button inside `actions` instead.
   */
  onClearSelection?: () => void
  /** Disables interaction and dims the bar (e.g. while an async bulk op is running). */
  loading?: boolean
  /** Render the bar even when `selectedCount === 0`. Rarely needed. */
  forceVisible?: boolean
  /** Extra classes for the outer container. */
  className?: string
}

/**
 * Generic bulk-action bar shared across list screens.
 *
 * Variants:
 * - `sticky` → fixed bottom bar (full-width, sidebar-aware on desktop)
 * - `inline` → inline card block in document flow
 *
 * Action buttons stay slot-based — feature owners build the per-feature JSX
 * (with their own i18n / dropdowns / dialogs) and pass it through `actions`.
 */
export function BulkActionBar({
  variant = "sticky",
  selectedCount,
  countLabel,
  actions,
  onClearSelection,
  loading = false,
  forceVisible = false,
  className,
}: BulkActionBarProps) {
  const tCommon = useTranslations("common")

  if (!forceVisible && selectedCount === 0) return null

  const resolvedCountLabel =
    countLabel ?? `${tCommon("selected")}: ${selectedCount}`

  if (variant === "inline") {
    return (
      <div
        className={cn(
          "flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 shadow-sm",
          loading && "pointer-events-none opacity-70",
          className,
        )}
        role="region"
        aria-label={typeof resolvedCountLabel === "string" ? resolvedCountLabel : undefined}
      >
        <span className="text-sm font-medium text-foreground shrink-0">
          {resolvedCountLabel}
        </span>
        <div className="flex flex-wrap items-center gap-2 ml-auto">
          {actions}
        </div>
      </div>
    )
  }

  // variant === "sticky"
  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40",
        "bg-card border-t border-border shadow-lg",
        "flex flex-wrap items-center gap-3 px-4 py-3 md:px-6",
        "md:left-[var(--sidebar-width,260px)]",
        loading && "pointer-events-none opacity-70",
        className,
      )}
      role="region"
      aria-label={typeof resolvedCountLabel === "string" ? resolvedCountLabel : undefined}
    >
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-sm font-medium text-foreground">
          {resolvedCountLabel}
        </span>
        {onClearSelection && (
          <button
            type="button"
            onClick={onClearSelection}
            disabled={loading}
            className={cn(
              "inline-flex items-center justify-center rounded-md px-2 min-h-11 min-w-11",
              "text-xs text-muted-foreground hover:text-foreground hover:bg-accent",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              "disabled:opacity-50 disabled:cursor-not-allowed",
            )}
            aria-label={tCommon("clearAll")}
          >
            <span className="hidden sm:inline">{tCommon("clearAll")}</span>
            <span aria-hidden="true" className="sm:hidden text-base leading-none">&times;</span>
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 flex-1 justify-end">
        {actions}
      </div>
    </div>
  )
}
