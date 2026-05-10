"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"

// ─────────────────────────────────────────────────────────────────────
// SidebarInfoCard
//
// Generic shell for "info" cards on detail-page sidebars.
//   - Desktop:  <Card> with optional uppercase title header + content gap-3
//   - Mobile:   Collapsible (default) with title row + chevron, OR same as
//               desktop when collapsibleOnMobile=false
//
// Domain-specific content stays in feature wrappers — only the shell is
// shared. Caller pre-translates the title.
// ─────────────────────────────────────────────────────────────────────

export interface SidebarInfoCardProps {
  /** Pre-translated title rendered in the header. Optional — if omitted the
   *  header is skipped on desktop and the mobile trigger uses a fallback
   *  empty label, so prefer providing one. */
  title?: string
  /** Small icon rendered before the title. */
  icon?: React.ReactNode
  /** Initial open state for the mobile Collapsible (uncontrolled). */
  defaultOpen?: boolean
  /** Controlled open state for the mobile Collapsible. */
  open?: boolean
  /** Open-state change callback for the mobile Collapsible. */
  onOpenChange?: (open: boolean) => void
  /** Whether mobile renders as Collapsible. Defaults to `true`. */
  collapsibleOnMobile?: boolean
  /** Extra classes applied to both desktop Card root and mobile Collapsible root. */
  className?: string
  children: React.ReactNode
}

export function SidebarInfoCard({
  title,
  icon,
  defaultOpen = false,
  open,
  onOpenChange,
  collapsibleOnMobile = true,
  className,
  children,
}: SidebarInfoCardProps) {
  // Desktop variant — plain Card with optional uppercase title header.
  const desktop = (
    <Card className={cn(collapsibleOnMobile && "hidden lg:block", className)}>
      {title !== undefined && (
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {icon}
            <span>{title}</span>
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className="px-4 pb-4">{children}</CardContent>
    </Card>
  )

  if (!collapsibleOnMobile) {
    return desktop
  }

  return (
    <>
      {desktop}
      <Collapsible
        open={open}
        defaultOpen={defaultOpen}
        onOpenChange={onOpenChange}
        className={cn(
          "lg:hidden border rounded-lg overflow-hidden bg-card",
          className,
        )}
      >
        <CollapsibleTrigger className="group flex w-full items-center justify-between px-4 py-3 min-h-[44px] hover:bg-muted/50 transition-colors">
          <span className="flex items-center gap-2 text-sm font-medium text-foreground">
            {icon}
            {title}
          </span>
          <ChevronDown className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent className="px-4 pb-4 pt-1">{children}</CollapsibleContent>
      </Collapsible>
    </>
  )
}
