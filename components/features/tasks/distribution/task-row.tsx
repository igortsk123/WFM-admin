"use client"

import * as React from "react"
import { memo } from "react"
import { useTranslations } from "next-intl"
import { Sparkles, Wand2, ListChecks, ChevronRight } from "lucide-react"

import type { UnassignedTask, TaskDistributionAllocation } from "@/lib/api/distribution"
import { cn } from "@/lib/utils"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

import { formatHM } from "./_utils"

// ─────────────────────────────────────────────────────────────────────────────
// TaskRow — компактная строка для задачи (визуальный близнец EmployeeUtilizationRow).
// Используется во всех 4 квадрантах /tasks/distribute (LEFT кликабельная,
// RIGHT read-only). Структура: иконка-индикатор · title+badges · progress+% · meta
// ─────────────────────────────────────────────────────────────────────────────

export interface TaskRowProps {
  task: UnassignedTask
  planAllocations: TaskDistributionAllocation[]
  onSelect?: () => void
  disabled?: boolean
  t: ReturnType<typeof useTranslations>
}

export const TaskRow = memo(function TaskRow({ task, planAllocations, onSelect, disabled, t }: TaskRowProps) {
  const totalLabel = formatHM(task.planned_minutes, t)
  const planMin = planAllocations.reduce((sum, a) => sum + a.minutes, 0)
  const effectiveDistributed = task.distributed_minutes + planMin
  const isFullyDistributed = effectiveDistributed >= task.planned_minutes
  const distributedPct = task.planned_minutes > 0
    ? (task.distributed_minutes / task.planned_minutes) * 100
    : 0
  const planPct = task.planned_minutes > 0
    ? (planMin / task.planned_minutes) * 100
    : 0
  const totalPct = Math.min(100, Math.round(distributedPct + planPct))

  const interactive = !!onSelect
  const rowDisabled = disabled || (isFullyDistributed && planMin === 0)

  const content = (
    <>
      {/* Иконка-индикатор: ListChecks как универсальный «task» аналог Avatar */}
      <div
        className={cn(
          "size-8 shrink-0 rounded-full flex items-center justify-center",
          isFullyDistributed ? "bg-success/15 text-success" : "bg-accent text-accent-foreground",
        )}
      >
        <ListChecks className="size-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium truncate">{task.title}</span>
          {task.source === "AI" && (
            <Badge variant="secondary" className="text-[10px] px-1 py-0">
              <Sparkles className="size-2.5 mr-0.5" />
              ИИ
            </Badge>
          )}
          {planMin > 0 && (
            <Badge variant="outline" className="text-[10px] px-1 py-0 border-primary text-primary">
              <Wand2 className="size-2.5 mr-0.5" />
              +{formatHM(planMin, t)}
            </Badge>
          )}
        </div>
        {/* Stacked bar: saved (primary) + planned (primary/40) */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden flex">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${distributedPct}%` }}
            />
            <div
              className="h-full bg-primary/40 transition-all"
              style={{ width: `${planPct}%` }}
            />
          </div>
          <span
            className={cn(
              "text-xs font-medium shrink-0",
              isFullyDistributed ? "text-success" : "text-muted-foreground",
            )}
          >
            {totalPct}%
          </span>
        </div>
        <span className="text-xs text-muted-foreground truncate block">
          {task.zone_name} · {formatHM(effectiveDistributed, t)} / {totalLabel}
        </span>
      </div>
    </>
  )

  if (interactive) {
    // Карточка во всю ширину — primary action в LEFT-панели.
    // Border + hover ring + ChevronRight = сильный visual affordance.
    return (
      <Card
        role="button"
        tabIndex={rowDisabled ? -1 : 0}
        onClick={() => {
          if (!rowDisabled && onSelect) onSelect()
        }}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !rowDisabled && onSelect) {
            e.preventDefault()
            onSelect()
          }
        }}
        aria-disabled={rowDisabled}
        className={cn(
          "group transition-all",
          rowDisabled
            ? "cursor-not-allowed opacity-60"
            : "cursor-pointer hover:shadow-md hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          planMin > 0 && "ring-1 ring-primary",
        )}
      >
        <CardContent className="flex items-center gap-3 p-3">
          {content}
          <ChevronRight
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-all",
              !rowDisabled && "group-hover:text-primary group-hover:translate-x-0.5",
            )}
          />
        </CardContent>
      </Card>
    )
  }

  // Read-only — компактная строка для RIGHT-панели.
  return <div className="flex items-center gap-3 py-2">{content}</div>
})
