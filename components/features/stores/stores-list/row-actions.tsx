"use client"

import { useTranslations } from "next-intl"
import { MoreHorizontal } from "lucide-react"

import type { StoreWithStats } from "@/lib/api/stores"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface RowActionsProps {
  store: StoreWithStats
  onOpen: () => void
  onEdit: () => void
  onChangeDirector: () => void
  onSync: () => void
  onArchive: () => void
}

export function RowActions({
  store,
  onOpen,
  onEdit,
  onChangeDirector,
  onSync,
  onArchive,
}: RowActionsProps) {
  const t = useTranslations("screen.stores")

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        <Button variant="ghost" size="icon" className="size-8">
          <MoreHorizontal className="size-4" />
          <span className="sr-only">Действия для {store.name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation()
            onOpen()
          }}
        >
          {t("actions.open")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation()
            onEdit()
          }}
        >
          {t("actions.edit")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation()
            onChangeDirector()
          }}
        >
          {t("actions.change_director")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation()
            onSync()
          }}
        >
          {t("actions.force_sync_lama")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={(e) => {
            e.stopPropagation()
            onArchive()
          }}
        >
          {t("actions.archive")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
