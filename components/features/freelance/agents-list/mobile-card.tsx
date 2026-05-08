"use client"

import { useTranslations } from "next-intl"
import { Building2, User, Users } from "lucide-react"

import type { Agent } from "@/lib/types"

import { Button } from "@/components/ui/button"
import { AgentStatusBadge } from "@/components/shared/agent-status-badge"

interface MobileCardProps {
  agent: Agent
  canWrite: boolean
  onEdit: (agent: Agent) => void
  onBlock: (agent: Agent) => void
  onUnblock: (agent: Agent) => void
}

export function MobileCard({ agent, canWrite, onEdit, onBlock, onUnblock }: MobileCardProps) {
  const t = useTranslations("screen.freelanceAgents")
  const Icon = agent.type === "COMPANY" ? Building2 : User

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className="size-4 text-muted-foreground shrink-0" aria-hidden="true" />
          <span className="font-medium text-sm truncate">{agent.name}</span>
        </div>
        <AgentStatusBadge status={agent.status} size="sm" />
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {agent.inn && <span>ИНН: {agent.inn}</span>}
        <span className="flex items-center gap-1">
          <Users className="size-3" aria-hidden="true" />
          {agent.freelancers_count} исп.
        </span>
        <span>{agent.total_earned_30d.toLocaleString("ru-RU")} ₽ / 30д</span>
      </div>
      {canWrite && agent.status !== "ARCHIVED" && (
        <div className="flex gap-2 mt-1" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="outline"
            size="sm"
            className="h-9 text-xs"
            onClick={() => onEdit(agent)}
          >
            {t("menu.edit")}
          </Button>
          {agent.status === "ACTIVE" && (
            <Button
              variant="outline"
              size="sm"
              className="h-9 text-xs text-warning border-warning/30"
              onClick={() => onBlock(agent)}
            >
              {t("menu.block")}
            </Button>
          )}
          {agent.status === "BLOCKED" && (
            <Button
              variant="outline"
              size="sm"
              className="h-9 text-xs"
              onClick={() => onUnblock(agent)}
            >
              {t("menu.unblock")}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
