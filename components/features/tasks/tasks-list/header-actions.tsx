"use client"

import { useTranslations } from "next-intl"
import { Download, Plus } from "lucide-react"

import { Link } from "@/i18n/navigation"
import { ADMIN_ROUTES } from "@/lib/constants/routes"

import { Button } from "@/components/ui/button"
import {
  ListHeaderActions,
  type ListHeaderAction,
} from "@/components/shared/list-header-actions"

export function HeaderActions() {
  const t = useTranslations("screen.tasks")
  const tCommon = useTranslations("common")

  const actions: ListHeaderAction[] = [
    {
      id: "export",
      label: t("export_xlsx"),
      icon: <Download className="size-4" />,
      // No-op until export wiring lands; keep parity with previous behavior.
      onClick: () => {},
    },
    {
      id: "create",
      label: t("create_task"),
      icon: <Plus className="size-4" />,
      href: ADMIN_ROUTES.taskNew,
      // Mobile primary CTA is rendered separately via <MobileCreateButton/>
      // below as a full-width sticky button — keep desktop-only here to
      // avoid double rendering on mobile.
      desktopOnly: true,
    },
  ]

  return <ListHeaderActions actions={actions} moreLabel={tCommon("more")} />
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
