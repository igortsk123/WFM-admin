"use client"

import type { FreelanceApplication } from "@/lib/types"

import { Badge } from "@/components/ui/badge"
import { ApplicationStatusBadge } from "@/components/shared/application-status-badge"

import { formatPlannedDate } from "./_shared"

interface MobileCardProps {
  app: FreelanceApplication
  locale: string
}

export function MobileCard({ app, locale }: MobileCardProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{app.store_name}</p>
          <p className="text-xs text-muted-foreground truncate">
            {formatPlannedDate(app.planned_date, locale)} · {app.requested_hours}ч
            {app.approved_hours != null && app.approved_hours !== app.requested_hours
              ? `/${app.approved_hours}ч`
              : ""}
          </p>
        </div>
        {app.source === "EXTERNAL" ? (
          <Badge className="bg-info/10 text-info border-info/20 shrink-0">Внешн.</Badge>
        ) : (
          <Badge variant="secondary" className="text-muted-foreground shrink-0">
            Внутр.
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="secondary" className="font-normal text-xs">
          {app.work_type_name}
        </Badge>
        <span className="text-xs text-muted-foreground">{app.created_by_name}</span>
      </div>
      <div className="pt-0.5">
        <ApplicationStatusBadge
          status={app.status}
          urgent={app.urgent}
          retroactive={app.retroactive}
        />
      </div>
    </div>
  )
}
