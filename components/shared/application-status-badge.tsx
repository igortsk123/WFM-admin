"use client"

import * as React from "react"
import { Zap, History } from "lucide-react"
import { useTranslations } from "next-intl"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { ApplicationStatus } from "@/lib/types"

interface ApplicationStatusBadgeProps {
  status: ApplicationStatus
  urgent?: boolean
  retroactive?: boolean
  className?: string
}

const STATUS_STYLES: Record<ApplicationStatus, string> = {
  PENDING:             "bg-warning/10 text-warning border-warning/20",
  APPROVED_FULL:       "bg-success/10 text-success border-success/20",
  APPROVED_PARTIAL:    "bg-success/10 text-success border-success/20",
  REJECTED:            "bg-destructive/10 text-destructive border-destructive/20",
  REPLACED_WITH_BONUS: "bg-accent text-accent-foreground border-transparent",
  MIXED:               "bg-accent text-accent-foreground border-transparent",
  CANCELLED:           "bg-muted text-muted-foreground border-transparent",
  DRAFT:               "bg-muted text-muted-foreground border-transparent",
}

const STATUS_LABEL_KEY: Record<ApplicationStatus, string> = {
  PENDING:             "PENDING",
  APPROVED_FULL:       "APPROVED_FULL",
  APPROVED_PARTIAL:    "APPROVED_PARTIAL",
  REJECTED:            "REJECTED",
  REPLACED_WITH_BONUS: "REPLACED_WITH_BONUS",
  MIXED:               "MIXED",
  CANCELLED:           "CANCELLED",
  DRAFT:               "DRAFT",
}

export function ApplicationStatusBadge({
  status,
  urgent,
  retroactive,
  className,
}: ApplicationStatusBadgeProps) {
  const t = useTranslations("freelance.application.status")

  return (
    <span className={cn("inline-flex items-center gap-1 flex-wrap", className)}>
      <Badge className={cn(STATUS_STYLES[status])}>
        {t(STATUS_LABEL_KEY[status])}
      </Badge>

      {urgent && (
        <Badge className="bg-warning/10 text-warning border-warning/20 px-1.5 py-0 text-[11px] gap-1">
          <Zap className="size-3" aria-hidden="true" />
          <span className="sr-only">Срочная</span>
          <span aria-hidden="true">Срочная</span>
        </Badge>
      )}

      {retroactive && (
        <Badge variant="outline" className="px-1.5 py-0 text-[11px] gap-1">
          <History className="size-3" aria-hidden="true" />
          <span>Задним числом</span>
        </Badge>
      )}
    </span>
  )
}
