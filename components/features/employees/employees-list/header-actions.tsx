"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { Download, MoreVertical, Plus, Upload } from "lucide-react"
import { toast } from "sonner"

import { useRouter } from "@/i18n/navigation"
import { ADMIN_ROUTES } from "@/lib/constants/routes"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface HeaderActionsProps {
  canFullCRUD: boolean
}

export function HeaderActions({ canFullCRUD }: HeaderActionsProps) {
  const t = useTranslations("screen.employees")
  const router = useRouter()

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="hidden md:flex"
        onClick={() => toast.info("Импорт XLSX — мок")}
      >
        <Upload className="size-4 mr-1.5" />
        {t("actions.import_xlsx")}
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="hidden md:flex"
        onClick={() => toast.info("Экспорт XLSX — мок")}
      >
        <Download className="size-4 mr-1.5" />
        {t("actions.export_xlsx")}
      </Button>
      {canFullCRUD && (
        <Button
          size="sm"
          onClick={() => router.push(ADMIN_ROUTES.employeeNew)}
          className="hidden md:flex"
        >
          <Plus className="size-4 mr-1.5" />
          {t("actions.add")}
        </Button>
      )}
      {/* Mobile: meatball menu for secondary actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" className="md:hidden size-9">
            <MoreVertical className="size-4" />
            <span className="sr-only">{t("actions.more")}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => toast.info("Импорт XLSX — мок")}>
            {t("actions.import_xlsx")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => toast.info("Экспорт XLSX — мок")}>
            {t("actions.export_xlsx")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {/* Mobile: primary add button */}
      {canFullCRUD && (
        <Button
          size="sm"
          onClick={() => router.push(ADMIN_ROUTES.employeeNew)}
          className="md:hidden"
        >
          <Plus className="size-4 mr-1.5" />
          {t("actions.add")}
        </Button>
      )}
    </>
  )
}
