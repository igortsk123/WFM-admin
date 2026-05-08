"use client"

import { useTranslations } from "next-intl"
import { MoreVertical, Pencil, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { Operation } from "@/lib/types"

interface SubtaskActionsMenuProps {
  subtask: Operation
  isStoreDirector: boolean
  isNetworkOps: boolean
  onSuggestEdit: () => void
  onDelete: () => void
}

export function SubtaskActionsMenu({
  subtask,
  isStoreDirector,
  isNetworkOps,
  onSuggestEdit,
  onDelete,
}: SubtaskActionsMenuProps) {
  const t = useTranslations("screen.taskDetail")
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8 min-h-[44px] md:min-h-0">
          <MoreVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {isStoreDirector ? (
          <DropdownMenuItem onClick={onSuggestEdit}>
            <Pencil className="size-4 mr-2 text-info" />
            {t("subtask_action_suggest_edit")}
          </DropdownMenuItem>
        ) : (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none opacity-50">
                  <Pencil className="size-4 mr-2 text-info" />
                  {t("subtask_action_suggest_edit")}
                </span>
              </TooltipTrigger>
              <TooltipContent>{t("subtask_action_suggest_edit_disabled_hint")}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        {(subtask.review_state === "PENDING" || subtask.review_state === "REJECTED" || isNetworkOps) && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="size-4 mr-2" />
              {t("subtask_action_delete")}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
