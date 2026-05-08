"use client"

import { ExternalLink, MoreVertical, X } from "lucide-react"

import { useRouter } from "@/i18n/navigation"
import type { FreelanceApplication } from "@/lib/types"
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
  app: FreelanceApplication
  currentUserId: number
  onCancel: (id: string) => void
}

export function RowActions({ app, currentUserId, onCancel }: RowActionsProps) {
  const router = useRouter()

  const canCancel =
    (app.status === "PENDING" || app.status === "DRAFT") && app.created_by === currentUserId

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          aria-label="Действия"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical className="size-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem
          onSelect={() => router.push(ADMIN_ROUTES.freelanceApplicationDetail(app.id))}
        >
          <ExternalLink className="size-4 mr-2" />
          Открыть
        </DropdownMenuItem>
        {canCancel && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onSelect={() => onCancel(app.id)}>
              <X className="size-4 mr-2" />
              Отменить
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
