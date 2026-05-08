"use client"

import { useTranslations } from "next-intl"
import Link from "next/link"
import { Download, MoreVertical, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ADMIN_ROUTES } from "@/lib/constants/routes"

export function HeaderActions() {
  const t = useTranslations("screen.tasks")

  return (
    <>
      {/* Desktop actions */}
      <div className="hidden md:flex items-center gap-2">
        <Button variant="outline" size="sm">
          <Download className="size-4 mr-1.5" />
          {t("export_xlsx")}
        </Button>
        <Button size="sm" asChild>
          <Link href={ADMIN_ROUTES.taskNew}>
            <Plus className="size-4 mr-1.5" />
            {t("create_task")}
          </Link>
        </Button>
      </div>
      {/* Mobile: ⋮ menu for export */}
      <div className="flex md:hidden items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-9">
              <MoreVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Download className="size-4 mr-2" />
              {t("export_xlsx")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  )
}

export function MobileCreateButton() {
  const t = useTranslations("screen.tasks")

  return (
    <div className="md:hidden">
      <Button className="w-full h-11" size="default" asChild>
        <Link href={ADMIN_ROUTES.taskNew}>
          <Plus className="size-4 mr-2" />
          {t("create_task")}
        </Link>
      </Button>
    </div>
  )
}
