"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { MoreVertical } from "lucide-react"

import { useRouter } from "@/i18n/navigation"
import { ADMIN_ROUTES } from "@/lib/constants/routes"
import type { UserWithAssignment } from "@/lib/api/users"

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

import { INACTIVE_FREELANCER_STATUSES } from "./_shared"

interface RowActionsProps {
  user: UserWithAssignment
  variant?: "desktop" | "mobile"
  canFullCRUD: boolean
  canArchiveBulk: boolean
  canImpersonate: boolean
  onOpenPermissions: () => void
  onArchive: () => void
}

export function RowActions({
  user,
  variant = "desktop",
  canFullCRUD,
  canArchiveBulk,
  canImpersonate,
  onOpenPermissions,
  onArchive,
}: RowActionsProps) {
  const t = useTranslations("screen.employees")
  const router = useRouter()

  const isFreelance = user.type === "FREELANCE"
  const isInactive =
    isFreelance &&
    user.freelancer_status !== undefined &&
    INACTIVE_FREELANCER_STATUSES.includes(user.freelancer_status)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={variant === "mobile" ? "size-11" : "size-8"}
          onClick={(e) => e.stopPropagation()}
          aria-label={t("row_actions.open")}
        >
          <MoreVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation()
            router.push(ADMIN_ROUTES.employeeDetail(String(user.id)))
          }}
        >
          {t("row_actions.open")}
        </DropdownMenuItem>

        {variant === "desktop" && isInactive ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none opacity-50">
                  {t("row_actions.assign_task")}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {t("employment.not_activated_tooltip")}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation()
              router.push(`${ADMIN_ROUTES.taskNew}?assignee_id=${user.id}`)
            }}
          >
            {t("row_actions.assign_task")}
          </DropdownMenuItem>
        )}

        {variant === "desktop" && (
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation()
              onOpenPermissions()
            }}
          >
            {t("row_actions.permissions")}
          </DropdownMenuItem>
        )}

        {variant === "desktop" && canFullCRUD && (
          <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
            {t("row_actions.change_position")}
          </DropdownMenuItem>
        )}

        {variant === "desktop" &&
          canImpersonate &&
          process.env.NODE_ENV === "development" && (
            <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
              {t("row_actions.impersonate")}
            </DropdownMenuItem>
          )}

        {canArchiveBulk && !user.archived && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={(e) => {
                e.stopPropagation()
                onArchive()
              }}
            >
              {t("row_actions.archive")}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
