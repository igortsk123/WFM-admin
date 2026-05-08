"use client"

import { useTranslations } from "next-intl"
import { Plus, CalendarPlus, UserPlus, FileUp } from "lucide-react"

import { Link } from "@/i18n/navigation"
import { ADMIN_ROUTES } from "@/lib/constants/routes"
import type { FunctionalRole } from "@/lib/types"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function QuickActionsCard({ role }: { role: FunctionalRole }) {
  const t = useTranslations("screen.dashboard.actions")

  const actions = [
    { key: "create_task", icon: Plus, href: ADMIN_ROUTES.taskNew, show: true },
    { key: "plan_shift", icon: CalendarPlus, href: ADMIN_ROUTES.schedule, show: true },
    { key: "add_employee", icon: UserPlus, href: ADMIN_ROUTES.employeeNew, show: role === "NETWORK_OPS" || role === "HR_MANAGER" },
    { key: "import_schedule", icon: FileUp, href: ADMIN_ROUTES.integrations, show: true },
  ]

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t("title" as Parameters<typeof t>[0])}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2">
        {actions
          .filter((a) => a.show)
          .map((action) => {
            const Icon = action.icon
            return (
              <Button key={action.key} variant="outline" className="justify-start h-11" asChild>
                <Link href={action.href}>
                  <Icon className="size-4 mr-2" />
                  {t(action.key as Parameters<typeof t>[0])}
                </Link>
              </Button>
            )
          })}
      </CardContent>
    </Card>
  )
}
