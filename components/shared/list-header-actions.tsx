"use client"

import * as React from "react"
import { MoreVertical } from "lucide-react"

import { Link } from "@/i18n/navigation"
import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export interface ListHeaderAction {
  /** Stable key for React lists. */
  id: string
  /** Pre-translated label (caller does i18n). */
  label: string
  /** Optional leading icon (e.g. <Plus className="size-4" />). */
  icon?: React.ReactNode
  /** Click handler for action buttons. Mutually exclusive with `href`. */
  onClick?: () => void
  /** If set, the action renders as a navigation link via i18n-aware Link. */
  href?: string
  /** shadcn Button variant — defaults to "outline" for non-primary actions, "default" for primary. */
  variant?: "default" | "outline" | "secondary" | "ghost" | "destructive" | "link"
  /**
   * If true, the action is the page-primary action (typically «Add»):
   *   – stays visible inline on mobile (next to the meatball menu),
   *   – uses solid `default` variant unless `variant` is overridden.
   * If false/undefined, action is desktop-only (md+) and folded into the
   * mobile DropdownMenu.
   */
  primary?: boolean
  /** Standard disabled flag. */
  disabled?: boolean
  /** Conditional hide (e.g. permissions). Hidden actions never render. */
  hidden?: boolean
  /**
   * If true, the action only renders on desktop (md+) — never inline on
   * mobile and never inside the mobile DropdownMenu. Use when the same
   * affordance is provided through a separate mobile component (e.g.
   * a sticky full-width «MobileCreateButton» below the header).
   */
  desktopOnly?: boolean
  /** Accessible label override for icon-only contexts. Defaults to `label`. */
  ariaLabel?: string
}

export interface ListHeaderActionsProps {
  actions: ListHeaderAction[]
  /** Extra classes for the outer wrapper. */
  className?: string
  /**
   * Accessible label for the mobile «more» trigger.
   * Caller should pre-translate (e.g. t("actions.more")). Falls back to
   * "More actions" / "Ещё" only as last-resort sr-only.
   */
  moreLabel?: string
}

/**
 * Reusable header action row for list screens.
 *
 * Layout:
 *   - Desktop (md+): all visible actions render inline as <Button> in order.
 *   - Mobile (<md): only `primary: true` actions render inline; the rest
 *     fold into a DropdownMenu under the MoreVertical (⋮) trigger.
 *
 * Каждый action — либо button (`onClick`), либо link (`href`). Touch target
 * на mobile ≥44px (size="default" h-9 + size-9 icon trigger; see Button).
 */
export function ListHeaderActions({
  actions,
  className,
  moreLabel,
}: ListHeaderActionsProps) {
  const visible = actions.filter((a) => !a.hidden)
  // primary — show inline on both desktop AND mobile (typical: the page-CTA, "Add").
  const primary = visible.filter((a) => a.primary && !a.desktopOnly)
  // mobileMenu — secondary actions that fold into the ⋮ menu on mobile.
  const mobileMenu = visible.filter((a) => !a.primary && !a.desktopOnly)

  if (visible.length === 0) return null

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Desktop: all visible actions inline (incl. desktopOnly) */}
      {visible.map((action) => (
        <ActionButton
          key={`desktop-${action.id}`}
          action={action}
          className="hidden md:inline-flex"
        />
      ))}

      {/* Mobile: secondary actions folded under ⋮ */}
      {mobileMenu.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="md:hidden size-9"
              aria-label={moreLabel}
            >
              <MoreVertical className="size-4" />
              {moreLabel && <span className="sr-only">{moreLabel}</span>}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {mobileMenu.map((action) => (
              <DropdownMenuItem
                key={`mobile-menu-${action.id}`}
                disabled={action.disabled}
                onClick={action.onClick}
                asChild={!!action.href}
              >
                {action.href ? (
                  <Link href={action.href}>
                    {action.icon && (
                      <span className="mr-2 inline-flex">{action.icon}</span>
                    )}
                    {action.label}
                  </Link>
                ) : (
                  <>
                    {action.icon && (
                      <span className="mr-2 inline-flex">{action.icon}</span>
                    )}
                    {action.label}
                  </>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Mobile: primary actions inline */}
      {primary.map((action) => (
        <ActionButton
          key={`mobile-${action.id}`}
          action={action}
          className="md:hidden"
        />
      ))}
    </div>
  )
}

interface ActionButtonProps {
  action: ListHeaderAction
  className?: string
}

function ActionButton({ action, className }: ActionButtonProps) {
  const variant = action.variant ?? (action.primary ? "default" : "outline")

  if (action.href) {
    return (
      <Button
        size="sm"
        variant={variant}
        className={className}
        disabled={action.disabled}
        aria-label={action.ariaLabel}
        asChild
      >
        <Link href={action.href}>
          {action.icon && <span className="mr-1.5 inline-flex">{action.icon}</span>}
          {action.label}
        </Link>
      </Button>
    )
  }

  return (
    <Button
      size="sm"
      variant={variant}
      className={className}
      disabled={action.disabled}
      onClick={action.onClick}
      aria-label={action.ariaLabel}
    >
      {action.icon && <span className="mr-1.5 inline-flex">{action.icon}</span>}
      {action.label}
    </Button>
  )
}
