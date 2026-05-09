"use client"

import * as React from "react"

import type { FreelanceApplication } from "@/lib/types"

import { Badge } from "@/components/ui/badge"
import { ApplicationStatusBadge } from "@/components/shared/application-status-badge"
import { EntityMobileCard } from "@/components/shared/entity-mobile-card"

import { formatPlannedDate } from "./_shared"

interface MobileCardProps {
  app: FreelanceApplication
  locale: string
}

export const MobileCard = React.memo(function MobileCard({ app, locale }: MobileCardProps) {
  return (
    <EntityMobileCard
      title={app.store_name}
      subtitle={
        <>
          {formatPlannedDate(app.planned_date, locale)} · {app.requested_hours}ч
          {app.approved_hours != null && app.approved_hours !== app.requested_hours
            ? `/${app.approved_hours}ч`
            : ""}
        </>
      }
      status={
        app.source === "EXTERNAL" ? (
          <Badge className="bg-info/10 text-info border-info/20 shrink-0">Внешн.</Badge>
        ) : (
          <Badge variant="secondary" className="text-muted-foreground shrink-0">
            Внутр.
          </Badge>
        )
      }
      meta={
        <>
          <Badge variant="secondary" className="font-normal text-xs">
            {app.work_type_name}
          </Badge>
          <span className="text-xs text-muted-foreground">{app.created_by_name}</span>
        </>
      }
      footer={
        <ApplicationStatusBadge
          status={app.status}
          urgent={app.urgent}
          retroactive={app.retroactive}
        />
      }
    />
  )
})
