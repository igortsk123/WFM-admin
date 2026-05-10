"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { Download, Plus, Upload } from "lucide-react"
import { toast } from "sonner"

import { ADMIN_ROUTES } from "@/lib/constants/routes"

import {
  ListHeaderActions,
  type ListHeaderAction,
} from "@/components/shared/list-header-actions"

interface HeaderActionsProps {
  canFullCRUD: boolean
}

export function HeaderActions({ canFullCRUD }: HeaderActionsProps) {
  const t = useTranslations("screen.employees")
  const tCommon = useTranslations("common")

  const actions: ListHeaderAction[] = [
    {
      id: "import",
      label: t("actions.import_xlsx"),
      icon: <Upload className="size-4" />,
      onClick: () => toast.info(tCommon("toasts.xlsx_import_mock")),
    },
    {
      id: "export",
      label: t("actions.export_xlsx"),
      icon: <Download className="size-4" />,
      onClick: () => toast.info(tCommon("toasts.xlsx_export_mock")),
    },
    {
      id: "add",
      label: t("actions.add"),
      icon: <Plus className="size-4" />,
      href: ADMIN_ROUTES.employeeNew,
      primary: true,
      hidden: !canFullCRUD,
    },
  ]

  return <ListHeaderActions actions={actions} moreLabel={t("actions.more")} />
}
