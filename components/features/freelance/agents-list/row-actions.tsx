"use client"

import { useTranslations } from "next-intl"
import { useRouter } from "@/i18n/navigation"
import { ExternalLink, MoreVertical } from "lucide-react"

import type { Agent } from "@/lib/types"
import { ADMIN_ROUTES } from "@/lib/constants/routes"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface RowActionsProps {
  agent: Agent
  canWrite: boolean
  isActing: boolean
  onEdit: (agent: Agent) => void
  onBlock: (agent: Agent) => void
  onUnblock: (agent: Agent) => void
  onArchive: (agent: Agent) => void
}

export function RowActions({
  agent,
  canWrite,
  isActing,
  onEdit,
  onBlock,
  onUnblock,
  onArchive,
}: RowActionsProps) {
  const t = useTranslations("screen.freelanceAgents")
  const router = useRouter()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-muted-foreground"
          aria-label="Действия"
          onClick={(e) => e.stopPropagation()}
          disabled={isActing}
        >
          <MoreVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation()
            router.push(ADMIN_ROUTES.freelanceAgentDetail(agent.id))
          }}
        >
          <ExternalLink className="size-3.5 mr-2 opacity-60" />
          {t("menu.open")}
        </DropdownMenuItem>

        {canWrite && agent.status !== "ARCHIVED" && (
          <DropdownMenuItem
            onClick={(e) => { e.stopPropagation(); onEdit(agent) }}
          >
            {t("menu.edit")}
          </DropdownMenuItem>
        )}

        {canWrite && agent.status === "ACTIVE" && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-warning focus:text-warning"
              onClick={(e) => { e.stopPropagation(); onBlock(agent) }}
            >
              {t("menu.block")}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={(e) => { e.stopPropagation(); onArchive(agent) }}
            >
              {t("menu.archive")}
            </DropdownMenuItem>
          </>
        )}

        {canWrite && agent.status === "BLOCKED" && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={(e) => { e.stopPropagation(); onUnblock(agent) }}
            >
              {t("menu.unblock")}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={(e) => { e.stopPropagation(); onArchive(agent) }}
            >
              {t("menu.archive")}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
