"use client"

import * as React from "react"
import { type ColumnDef } from "@tanstack/react-table"
import { Building2, User, Users } from "lucide-react"

import type { Agent } from "@/lib/types"
import { ADMIN_ROUTES } from "@/lib/constants/routes"

import { AgentStatusBadge } from "@/components/shared/agent-status-badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

import { ContractBadge } from "./contract-badge"
import { RowActions } from "./row-actions"

interface BuildColumnsParams {
  t: (key: string) => string
  locale: string
  canWrite: boolean
  isActing: string | null
  navigate: (url: string) => void
  onEdit: (agent: Agent) => void
  onBlock: (agent: Agent) => void
  onUnblock: (agent: Agent) => void
  onArchive: (agent: Agent) => void
}

export function buildColumns({
  t,
  locale,
  canWrite,
  isActing,
  navigate,
  onEdit,
  onBlock,
  onUnblock,
  onArchive,
}: BuildColumnsParams): ColumnDef<Agent>[] {
  return [
    {
      id: "name",
      header: t("columns.agent"),
      cell: ({ row }) => {
        const agent = row.original
        const Icon = agent.type === "COMPANY" ? Building2 : User
        return (
          <div className="flex items-center gap-2 min-w-0">
            <Icon className="size-4 text-muted-foreground shrink-0" aria-hidden="true" />
            <span className="font-medium truncate">{agent.name}</span>
          </div>
        )
      },
    },
    {
      id: "inn",
      header: t("columns.inn"),
      size: 130,
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground font-mono">
          {row.original.inn ?? "—"}
        </span>
      ),
    },
    {
      id: "contract",
      header: t("columns.contract"),
      size: 120,
      cell: ({ row }) => (
        <ContractBadge signedAt={row.original.contract_signed_at} />
      ),
    },
    {
      id: "commission_pct",
      header: () => (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-help border-b border-dashed border-muted-foreground">
                {t("columns.commission")}
              </span>
            </TooltipTrigger>
            <TooltipContent>{t("commission_tooltip")}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ),
      size: 110,
      cell: ({ row }) => (
        <span className="text-sm">{row.original.commission_pct}%</span>
      ),
    },
    {
      id: "freelancers_count",
      header: t("columns.performers"),
      size: 120,
      cell: ({ row }) => {
        const agent = row.original
        const url = `${ADMIN_ROUTES.employees}?agent_id=${agent.id}&type=FREELANCE`
        return (
          <a
            href={url}
            onClick={(e) => { e.stopPropagation(); navigate(url) }}
            className="flex items-center gap-1.5 text-sm text-primary hover:underline min-h-[44px] py-2"
            aria-label={`${agent.freelancers_count} исполнителей`}
          >
            <Users className="size-3.5" aria-hidden="true" />
            {agent.freelancers_count}
          </a>
        )
      },
    },
    {
      id: "total_earned_30d",
      header: t("columns.earned_30d"),
      size: 160,
      cell: ({ row }) => (
        <span className="text-sm tabular-nums">
          {row.original.total_earned_30d.toLocaleString(locale === "ru" ? "ru-RU" : "en-US")} ₽
        </span>
      ),
    },
    {
      id: "status",
      header: t("columns.status"),
      size: 120,
      cell: ({ row }) => <AgentStatusBadge status={row.original.status} />,
    },
    {
      id: "actions",
      header: "",
      size: 48,
      cell: ({ row }) => (
        <RowActions
          agent={row.original}
          canWrite={canWrite}
          isActing={isActing === row.original.id}
          onEdit={onEdit}
          onBlock={onBlock}
          onUnblock={onUnblock}
          onArchive={onArchive}
        />
      ),
    },
  ]
}
