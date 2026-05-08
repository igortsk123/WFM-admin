"use client"

import { useTranslations } from "next-intl"
import { Briefcase } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/shared"

interface EmployeeTasksTabProps {
  t: ReturnType<typeof useTranslations<"screen.employeeDetail">>
  tCommon: ReturnType<typeof useTranslations<"common">>
}

export function EmployeeTasksTab({ t, tCommon }: EmployeeTasksTabProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">{t("tasks.filter_period")}: </span>
        <Badge variant="outline">{tCommon("month")}</Badge>
        <span className="text-sm text-muted-foreground ml-2">{t("tasks.filter_state")}: </span>
        <Badge variant="outline">{tCommon("all")}</Badge>
      </div>
      <EmptyState
        icon={Briefcase}
        title={t("tasks.empty")}
        description=""
      />
    </div>
  )
}
