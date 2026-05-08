"use client"

import Link from "next/link"
import { MoreVertical, Copy } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ADMIN_ROUTES } from "@/lib/constants/routes"
import { cn } from "@/lib/utils"

import type { WorkTypeWithCount } from "@/lib/api/taxonomy"
import type { TFn } from "./_shared"

interface RowActionsProps {
  workType: WorkTypeWithCount
  onEdit: (wt: WorkTypeWithCount) => void
  onDuplicate: (wt: WorkTypeWithCount) => void
  onDelete: (wt: WorkTypeWithCount) => void
  t: TFn
  tCommon: TFn
  /** Variant changes button size for desktop table vs mobile card. */
  variant?: "compact" | "card"
  /** Show duplicate icon (compact list — yes; accordion mini-table — no). */
  showDuplicateIcon?: boolean
}

export function RowActions({
  workType: wt,
  onEdit,
  onDuplicate,
  onDelete,
  t,
  tCommon,
  variant = "compact",
  showDuplicateIcon = true,
}: RowActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={variant === "card" ? "size-9 shrink-0" : "size-8"}
          aria-label={tCommon("actions")}
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical className="size-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onEdit(wt)}>
          {t("row_actions.edit")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onDuplicate(wt)}>
          {showDuplicateIcon && (
            <Copy className="size-3.5 mr-2 opacity-60" aria-hidden="true" />
          )}
          {t("row_actions.duplicate")}
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link
            href={`${ADMIN_ROUTES.hints}?work_type_id=${wt.id}`}
            onClick={(e) => e.stopPropagation()}
          >
            {t("row_actions.hints")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className={cn(
            "text-destructive focus:text-destructive",
            wt.tasks_count > 0 && "opacity-50 pointer-events-none"
          )}
          onClick={(e) => {
            e.stopPropagation()
            if (wt.tasks_count === 0) onDelete(wt)
          }}
          aria-disabled={wt.tasks_count > 0}
        >
          {t("row_actions.delete")}
          {wt.tasks_count > 0 && (
            <span className="ml-auto text-xs text-muted-foreground">
              ({wt.tasks_count})
            </span>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
