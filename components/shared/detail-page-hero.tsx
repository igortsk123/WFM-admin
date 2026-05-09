import type { ReactNode } from "react"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export interface DetailPageHeroProps {
  /** Avatar / icon shown to the left of the title block. */
  leading?: ReactNode
  /** Entity name / heading. Rendered as the primary identity element. */
  title: ReactNode
  /** Subtitle below the title (role / code / category / position). */
  subtitle?: ReactNode
  /** Meta row below the title block — contact info, dates, badges, location. */
  meta?: ReactNode
  /** Action buttons (edit / archive / etc) shown on the right of the header on desktop. */
  actions?: ReactNode
  /**
   * Optional status pill rendered inline with the title.
   * Useful for "active dot", archived badge, etc.
   */
  status?: ReactNode
  /**
   * Sub-section below the hero (KPI tiles / summary stats / field grid).
   * Rendered with a top border separator when present.
   */
  statsSlot?: ReactNode
  className?: string
}

/**
 * Generic hero card for detail pages (employee, store, agent, ...).
 *
 * Slot-based — feature-specific wrappers compose the slots from their own data
 * and translations. Mobile-first responsive: title row on top, meta below,
 * actions wrap below the identity column on small screens.
 *
 * Uses semantic Tailwind tokens only (bg-card / text-foreground / border-border).
 */
export function DetailPageHero({
  leading,
  title,
  subtitle,
  meta,
  actions,
  status,
  statsSlot,
  className,
}: DetailPageHeroProps) {
  return (
    <Card className={className}>
      <CardContent className="p-4 md:p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          {/* Left column — leading + identity stack */}
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <div className="flex items-start gap-4">
              {leading ? <div className="shrink-0">{leading}</div> : null}

              <div className="flex min-w-0 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-balance text-xl font-semibold text-foreground md:text-2xl">
                    {title}
                  </h1>
                  {status}
                </div>
                {subtitle ? (
                  <div className="text-sm text-muted-foreground">{subtitle}</div>
                ) : null}
              </div>
            </div>

            {meta ? <div className="flex flex-col gap-2">{meta}</div> : null}
          </div>

          {/* Right column — actions */}
          {actions ? (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {actions}
            </div>
          ) : null}
        </div>

        {statsSlot ? (
          <div className={cn("mt-6 border-t border-border pt-5")}>
            {statsSlot}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
