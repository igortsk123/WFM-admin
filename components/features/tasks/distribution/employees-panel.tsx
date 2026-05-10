"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { format } from "date-fns"
import { ru, enUS } from "date-fns/locale"
import { Users, Calendar } from "lucide-react"

import type { EmployeeUtilization } from "@/lib/api/distribution"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

import { EmptyState } from "@/components/shared/empty-state"

import { EmployeeUtilizationRow } from "./employee-row"
import { formatHM } from "./_utils"

// ─────────────────────────────────────────────────────────────────────────────
// EmployeesPanel — универсальная обёртка списка сотрудников (Card + header +
// rows + footer). Используется в двух квадрантах /tasks/distribute:
//   - by-task RIGHT (interactive=false, footer вкл) — read-only «Сводка по
//     команде» с suммой «Свободно X / Всего Y».
//   - by-employee LEFT (interactive=true, footer выкл) — кликабельные
//     EmployeeUtilizationRow открывают EmployeeSheet.
// Зеркальна TasksPanel.
// ─────────────────────────────────────────────────────────────────────────────

export interface EmployeesPanelProps {
  employees: EmployeeUtilization[]
  planMinByUser: Map<number, number>
  date: string
  locale: string
  t: ReturnType<typeof useTranslations>
  title: string
  isLoading?: boolean
  interactive?: boolean
  onEmployeeClick?: (employee: EmployeeUtilization) => void
  showFooter?: boolean
}

export function EmployeesPanel({
  employees,
  planMinByUser,
  date,
  locale,
  t,
  title,
  isLoading,
  interactive,
  onEmployeeClick,
  showFooter,
}: EmployeesPanelProps) {
  const dateLocale = locale === "en" ? enUS : ru
  const formattedDate = format(new Date(date), "d MMMM", { locale: dateLocale })

  const totalShiftMinutes = employees.reduce((sum, e) => sum + e.shift_total_min, 0)
  const totalAssignedMinutes = employees.reduce((sum, e) => sum + e.assigned_min, 0)
  const totalPlanMinutes = Array.from(planMinByUser.values()).reduce(
    (sum, n) => sum + n,
    0,
  )
  // Свободное время с учётом плана — auto-распределение сразу должно показать
  // что свободного времени стало меньше.
  const freeMinutes = Math.max(
    0,
    totalShiftMinutes - totalAssignedMinutes - totalPlanMinutes,
  )

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3 w-24 mt-1" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="size-8 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-1.5 w-full rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (employees.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="size-4" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="py-6">
          <EmptyState
            icon={Calendar}
            title={t("empty.no_shifts_title")}
            description={t("empty.no_shifts_description")}
            className="py-4"
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="size-4" />
          {title}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {t("utilization.date_label", { date: formattedDate })} · {t("utilization.employees_count", { count: employees.length })} · {t("utilization.available_label", { time: formatHM(freeMinutes, t) })}
        </p>
      </CardHeader>
      <CardContent>
        <div className={interactive ? "space-y-2" : "space-y-1"}>
          {employees.map((emp) => (
            <EmployeeUtilizationRow
              key={emp.user.id}
              employee={emp}
              planMin={planMinByUser.get(emp.user.id) ?? 0}
              onSelect={interactive && onEmployeeClick ? () => onEmployeeClick(emp) : undefined}
              t={t}
            />
          ))}
        </div>
        {showFooter && (
          <div className="mt-4 pt-3 border-t">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {t("utilization.summary", {
                  free: formatHM(freeMinutes, t),
                  total: formatHM(totalShiftMinutes, t),
                })}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
