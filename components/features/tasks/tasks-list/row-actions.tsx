"use client"

import { useTranslations } from "next-intl"
import { useRouter } from "@/i18n/navigation"
import { MoreVertical } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { TaskWithAvatar } from "@/lib/api/tasks"
import { ADMIN_ROUTES } from "@/lib/constants/routes"

interface RowActionsProps {
  task: TaskWithAvatar
  isArchiveTab: boolean
  /** Touch-target size for trigger — desktop "size-8" / mobile "size-11" */
  triggerSize?: "size-8" | "size-11"
}

export function RowActions({ task, isArchiveTab, triggerSize = "size-8" }: RowActionsProps) {
  const t = useTranslations("screen.tasks")
  const router = useRouter()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={triggerSize}
          onClick={(e) => e.stopPropagation()}
          aria-label="Действия"
        >
          <MoreVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() =>
            router.push(
              ADMIN_ROUTES.taskDetail(task.id) as Parameters<typeof router.push>[0],
            )
          }
        >
          {t("open")}
        </DropdownMenuItem>
        {!isArchiveTab && (
          <>
            <DropdownMenuItem>{t("duplicate")}</DropdownMenuItem>
            <DropdownMenuItem>{t("reassign")}</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" disabled={task.archived}>
              {t("archive")}
            </DropdownMenuItem>
          </>
        )}
        {isArchiveTab && <DropdownMenuItem>{t("restore")}</DropdownMenuItem>}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
