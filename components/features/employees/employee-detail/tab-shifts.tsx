"use client"

import { useTranslations } from "next-intl"
import { Clock } from "lucide-react"

import { EmptyState } from "@/components/shared"

interface EmployeeShiftsTabProps {
  t: ReturnType<typeof useTranslations<"screen.employeeDetail">>
}

export function EmployeeShiftsTab({ t }: EmployeeShiftsTabProps) {
  return (
    <EmptyState
      icon={Clock}
      title={t("shifts.empty")}
      description=""
    />
  )
}
