"use client"

import { type ColumnDef } from "@tanstack/react-table"
import { Calendar } from "lucide-react"

import type { FreelanceApplication } from "@/lib/types"
import { cn } from "@/lib/utils"

import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

import { RoleBadge } from "@/components/shared/role-badge"
import { ApplicationStatusBadge } from "@/components/shared/application-status-badge"

import { formatPlannedDate, isUrgentDate, formatRelativeTime } from "./_shared"
import { RowActions } from "./row-actions"

interface BuildColumnsParams {
  locale: string
  currentUserId: number
  onCancel: (id: string) => void
}

export function buildApplicationColumns({
  locale,
  currentUserId,
  onCancel,
}: BuildColumnsParams): ColumnDef<FreelanceApplication>[] {
  return [
    {
      id: "source",
      header: "Источник",
      size: 90,
      cell: ({ row }) => {
        const app = row.original
        if (app.source === "EXTERNAL") {
          return (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge className="bg-info/10 text-info border-info/20 cursor-default">
                    Внешн.
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>Из HR-системы клиента</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )
        }
        return (
          <Badge variant="secondary" className="text-muted-foreground">
            Внутр.
          </Badge>
        )
      },
    },
    {
      id: "store",
      header: "Объект",
      cell: ({ row }) => {
        const app = row.original
        return (
          <div className="min-w-0">
            <p className="text-sm font-medium truncate leading-tight">{app.store_name}</p>
          </div>
        )
      },
    },
    {
      id: "planned_date",
      header: "Дата выхода",
      size: 120,
      cell: ({ row }) => {
        const app = row.original
        const dateLabel = formatPlannedDate(app.planned_date, locale)
        const isDateUrgent = app.urgent || isUrgentDate(app.planned_date)
        return (
          <div className="flex items-center gap-1.5">
            <Calendar
              className={cn(
                "size-3.5 shrink-0",
                isDateUrgent ? "text-destructive" : "text-muted-foreground"
              )}
              aria-hidden="true"
            />
            <span
              className={cn(
                "text-sm",
                isDateUrgent ? "text-destructive font-medium" : "text-foreground"
              )}
            >
              {dateLabel}
            </span>
          </div>
        )
      },
    },
    {
      id: "hours",
      header: "Часы",
      size: 80,
      cell: ({ row }) => {
        const app = row.original
        return (
          <span className="text-sm tabular-nums">
            {app.requested_hours}
            {app.approved_hours != null && app.approved_hours !== app.requested_hours
              ? ` / ${app.approved_hours}`
              : ""}
          </span>
        )
      },
    },
    {
      id: "work_type",
      header: "Тип работ",
      cell: ({ row }) => (
        <Badge variant="secondary" className="font-normal">
          {row.original.work_type_name}
        </Badge>
      ),
    },
    {
      id: "creator",
      header: "Создал",
      cell: ({ row }) => {
        const app = row.original
        return (
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm truncate">{app.created_by_name}</span>
            <RoleBadge role={app.created_by_role} size="sm" />
          </div>
        )
      },
    },
    {
      id: "created_at",
      header: "Создано",
      size: 110,
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {formatRelativeTime(row.original.created_at, locale)}
        </span>
      ),
    },
    {
      id: "status",
      header: "Статус",
      cell: ({ row }) => {
        const app = row.original
        return (
          <ApplicationStatusBadge
            status={app.status}
            urgent={app.urgent}
            retroactive={app.retroactive}
          />
        )
      },
    },
    {
      id: "actions",
      header: "",
      size: 40,
      cell: ({ row }) => (
        <RowActions app={row.original} currentUserId={currentUserId} onCancel={onCancel} />
      ),
    },
  ]
}
