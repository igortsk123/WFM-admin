"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { format } from "date-fns"
import { ru, enUS } from "date-fns/locale"
import { ListChecks, Sparkles } from "lucide-react"

import type { UnassignedTask, TaskDistributionAllocation } from "@/lib/api/distribution"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

import { EmptyState } from "@/components/shared/empty-state"

import { TaskRow } from "./task-row"
import { formatHM } from "./_utils"

// ─────────────────────────────────────────────────────────────────────────────
// TasksPanel — универсальная обёртка списка задач (Card + header + rows + footer).
// Используется в двух квадрантах /tasks/distribute:
//   - by-task LEFT (interactive=true, footer выкл) — кликабельные TaskRow
//     открывают DistributionSheet.
//   - by-employee RIGHT (interactive=false, footer вкл) — read-only сводка с
//     суммой «Покрыто: X / Y».
// Структура зеркальна EmployeesPanel — те же CardHeader/CardContent/footer
// чтобы 4 квадранта выглядели идентично.
// ─────────────────────────────────────────────────────────────────────────────

export interface TasksPanelProps {
  tasks: UnassignedTask[]
  plan: Map<string, TaskDistributionAllocation[]>
  date: string
  locale: string
  t: ReturnType<typeof useTranslations>
  title: string
  subtitleSuffix?: string
  isLoading?: boolean
  interactive?: boolean
  onTaskClick?: (task: UnassignedTask) => void
  disabled?: boolean
  showFooter?: boolean
  /** Сортировщик списка перед рендером — для by-task LEFT. */
  sortTasks?: (a: UnassignedTask, b: UnassignedTask) => number
}

const taskNoun = (n: number) =>
  n === 1 ? "задача" : n >= 2 && n <= 4 ? "задачи" : "задач"

export function TasksPanel({
  tasks,
  plan,
  date,
  locale,
  t,
  title,
  subtitleSuffix,
  isLoading,
  interactive,
  onTaskClick,
  disabled,
  showFooter,
  sortTasks,
}: TasksPanelProps) {
  const dateLocale = locale === "en" ? enUS : ru
  const formattedDate = format(new Date(date), "d MMMM", { locale: dateLocale })

  const totalPlanned = tasks.reduce((s, tt) => s + tt.planned_minutes, 0)
  const totalDistributed = tasks.reduce((s, tt) => s + tt.distributed_minutes, 0)
  const totalPlanMin = Array.from(plan.values()).reduce(
    (sum, allocs) => sum + allocs.reduce((s, a) => s + a.minutes, 0),
    0,
  )
  const totalCovered = totalDistributed + totalPlanMin
  const remaining = Math.max(0, totalPlanned - totalCovered)

  const subtitle = `на ${formattedDate} · ${tasks.length} ${taskNoun(tasks.length)} на сегодня${
    plan.size > 0 ? ` · ${plan.size} в плане` : ""
  }${subtitleSuffix ? ` · ${subtitleSuffix}` : ""}`

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
                <Skeleton className="size-8 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-1.5 w-full rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (tasks.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ListChecks className="size-4" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="py-6">
          <EmptyState
            icon={Sparkles}
            title={t("empty.no_tasks_title")}
            description={t("empty.no_tasks_description")}
            className="py-4"
          />
        </CardContent>
      </Card>
    )
  }

  const ordered = sortTasks ? [...tasks].sort(sortTasks) : tasks

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <ListChecks className="size-4" />
          {title}
        </CardTitle>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </CardHeader>
      <CardContent>
        <div className={interactive ? "space-y-2" : "space-y-1"}>
          {ordered.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              planAllocations={plan.get(task.id) ?? []}
              onSelect={interactive && onTaskClick ? () => onTaskClick(task) : undefined}
              disabled={disabled}
              t={t}
            />
          ))}
        </div>
        {showFooter && (
          <div className="mt-4 pt-3 border-t">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                Покрыто: {formatHM(totalCovered, t)} / {formatHM(totalPlanned, t)}
                {remaining > 0 && ` · осталось ${formatHM(remaining, t)}`}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
