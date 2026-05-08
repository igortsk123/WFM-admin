"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { ChevronsUpDown, MoreVertical, X } from "lucide-react"

import { useRouter } from "@/i18n/navigation"
import { ADMIN_ROUTES } from "@/lib/constants/routes"
import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Spinner } from "@/components/ui/spinner"

interface BulkActionBarProps {
  selectedIds: Set<number>
  onClearSelection: () => void
  bulkBarLoading: boolean
  canArchiveBulk: boolean
  onAssignRole: () => void
  onChangeStore: () => void
  onZoneAction: (mode: "assign" | "revoke") => void
  onArchive: () => void
}

export function BulkActionBar({
  selectedIds,
  onClearSelection,
  bulkBarLoading,
  canArchiveBulk,
  onAssignRole,
  onChangeStore,
  onZoneAction,
  onArchive,
}: BulkActionBarProps) {
  const t = useTranslations("screen.employees")
  const router = useRouter()

  const navigateBulkAssignTask = () => {
    const ids = Array.from(selectedIds).join(",")
    router.push(`${ADMIN_ROUTES.taskNew}?bulk_employee_ids=${ids}`)
  }

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border shadow-lg",
        "flex items-center gap-3 px-4 py-3 md:px-6",
        "md:left-[var(--sidebar-width,260px)]",
        bulkBarLoading && "pointer-events-none opacity-70"
      )}
    >
      {/* Left: count + deselect */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-sm font-medium text-foreground">
          {t("bulk.selected", { count: selectedIds.size })}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-muted-foreground"
          onClick={onClearSelection}
        >
          <X className="size-3.5 mr-1" />
          <span className="hidden sm:inline">{t("bulk.clear_selection")}</span>
        </Button>
      </div>

      {/* Right: action buttons */}
      <div className="flex items-center gap-2 flex-1 justify-end flex-wrap">
        {bulkBarLoading && <Spinner className="size-4 shrink-0" />}

        {/* Assign role */}
        <Button
          size="sm"
          variant="outline"
          className="hidden sm:flex"
          onClick={onAssignRole}
          disabled={bulkBarLoading}
        >
          {t("bulk.assign_role")}
        </Button>

        {/* Change store */}
        <Button
          size="sm"
          variant="outline"
          className="hidden sm:flex"
          onClick={onChangeStore}
          disabled={bulkBarLoading}
        >
          {t("bulk.change_store")}
        </Button>

        {/* Zones dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" disabled={bulkBarLoading}>
              {t("bulk.zones_menu")}
              <ChevronsUpDown className="ml-1.5 size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onZoneAction("assign")}>
              {t("bulk.assign_zone")}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => onZoneAction("revoke")}
            >
              {t("bulk.revoke_zone")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Assign task */}
        <Button
          size="sm"
          variant="outline"
          className="hidden sm:flex"
          disabled={bulkBarLoading}
          onClick={navigateBulkAssignTask}
        >
          {t("bulk.assign_task")}
        </Button>

        {/* Mobile: compact more menu for non-zone actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="sm:hidden size-8"
              disabled={bulkBarLoading}
            >
              <MoreVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onAssignRole}>
              {t("bulk.assign_role")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onChangeStore}>
              {t("bulk.change_store")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={navigateBulkAssignTask}>
              {t("bulk.assign_task")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Archive (HR/NETWORK_OPS only) */}
        {canArchiveBulk && (
          <Button
            size="sm"
            variant="destructive"
            onClick={onArchive}
            disabled={bulkBarLoading}
          >
            {t("bulk.archive")}
          </Button>
        )}
      </div>
    </div>
  )
}
