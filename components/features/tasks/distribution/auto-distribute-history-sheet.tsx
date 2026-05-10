"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { Sparkles, AlertTriangle, CheckCircle2 } from "lucide-react"

import {
  type DistributionResult,
  type DistributionAssignment,
  type TaskLabel,
  getTaskLabels,
  groupByEmployee,
} from "@/lib/utils/auto-distribute"
import { cn } from "@/lib/utils"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

import { formatHM, getInitials } from "./_utils"

// ─────────────────────────────────────────────────────────────────────────────
// AutoDistributeHistorySheet
// ─────────────────────────────────────────────────────────────────────────────

export interface AutoDistributeHistorySheetProps {
  open: boolean
  onClose: () => void
  shopCode: string | null
  result: DistributionResult | null
  onApprove: () => void
  isApplying: boolean
}

/**
 * Sheet с результатами «исторического» auto-distribute (lib/utils/auto-distribute).
 *
 * В отличие от обычного Авто, этот алгоритм объясняет каждое назначение —
 * для демо клиенту видно «почему именно этот сотрудник» (affinity / load /
 * zone / permission). UI группирует по сотрудникам.
 *
 * Apply = демонстрационный (LAMA-задачи живут отдельно от MOCK_TASKS).
 * Парент-компонент закрывает Sheet и показывает success toast.
 */
export function AutoDistributeHistorySheet({
  open,
  onClose,
  shopCode,
  result,
  onApprove,
  isApplying,
}: AutoDistributeHistorySheetProps) {
  const t = useTranslations("screen.taskDistribution.auto_history")

  // Карта taskId → подпись (operation + zone) для карточек сотрудников.
  const taskIndex = React.useMemo<Map<number, TaskLabel>>(
    () => getTaskLabels(shopCode),
    [shopCode],
  )

  const groups = React.useMemo(
    () => (result ? groupByEmployee(result.assignments) : []),
    [result],
  )

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl flex flex-col gap-0 p-0"
      >
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="size-4 text-primary" />
            {t("title")}
          </SheetTitle>
          {result && (
            <p className="text-sm text-muted-foreground">
              {t("summary", {
                distributed: result.stats.distributed,
                total: result.stats.total_tasks,
                avg: result.stats.avg_score,
              })}
            </p>
          )}
        </SheetHeader>

        <ScrollArea className="flex-1 px-6 py-4">
          {!result || result.assignments.length === 0 ? (
            <EmptyState message={t("empty")} />
          ) : (
            <div className="flex flex-col gap-4">
              {groups.map((group) => (
                <EmployeeGroupCard
                  key={group.employeeId}
                  employeeName={group.employeeName}
                  assignments={group.assignments}
                  taskIndex={taskIndex}
                  hoursLabel={t("hours_label", { h: group.totalHours })}
                  tasksLabel={t("tasks_count", { count: group.assignments.length })}
                />
              ))}

              {result.unassigned.length > 0 && (
                <UnassignedSection
                  title={t("unassigned_title")}
                  unassigned={result.unassigned}
                  taskIndex={taskIndex}
                />
              )}
            </div>
          )}
        </ScrollArea>

        <SheetFooter className="px-6 py-4 border-t border-border">
          <div className="flex gap-2 w-full">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isApplying}
              className="flex-1"
            >
              {t("reject")}
            </Button>
            <Button
              variant="default"
              onClick={onApprove}
              disabled={
                isApplying ||
                !result ||
                result.assignments.length === 0
              }
              className="flex-1 gap-1.5"
            >
              <CheckCircle2 className="size-4" />
              {isApplying ? t("approving") : t("approve")}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

interface EmployeeGroupCardProps {
  employeeName: string
  assignments: DistributionAssignment[]
  taskIndex: Map<number, TaskLabel>
  hoursLabel: string
  tasksLabel: string
}

function EmployeeGroupCard({
  employeeName,
  assignments,
  taskIndex,
  hoursLabel,
  tasksLabel,
}: EmployeeGroupCardProps) {
  const tFmt = useTranslations("screen.taskDistribution")
  const [first, last] = employeeName.split(" ")
  const initials = getInitials(last ?? "", first ?? "")

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      {/* Header row — avatar + name + summary */}
      <div className="flex items-start gap-3 mb-3">
        <Avatar className="size-10 shrink-0">
          <AvatarFallback className="text-xs bg-secondary text-secondary-foreground">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-card-foreground truncate">
            {employeeName}
          </p>
          <p className="text-xs text-muted-foreground">
            {tasksLabel} · {hoursLabel}
          </p>
        </div>
      </div>

      <Separator className="mb-3" />

      {/* Task list with reasoning */}
      <ul className="flex flex-col gap-2.5">
        {assignments.map((a) => {
          const taskInfo = taskIndex.get(a.taskId)
          return (
            <li key={a.taskId} className="flex flex-col gap-1">
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm text-card-foreground">
                  {taskInfo?.title ?? `Task #${a.taskId}`}
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {formatHM(a.durationMinutes, tFmt)}
                  </span>
                  <ScoreBadge score={a.score} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {a.reasoning}
              </p>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

interface ScoreBadgeProps {
  score: number
}

function ScoreBadge({ score }: ScoreBadgeProps) {
  const variant: "default" | "secondary" | "destructive" =
    score >= 70 ? "default" : score >= 50 ? "secondary" : "destructive"
  return (
    <Badge variant={variant} className="tabular-nums text-[10px] h-5 px-1.5">
      {score}
    </Badge>
  )
}

interface UnassignedSectionProps {
  title: string
  unassigned: DistributionResult["unassigned"]
  taskIndex: Map<number, TaskLabel>
}

function UnassignedSection({
  title,
  unassigned,
  taskIndex,
}: UnassignedSectionProps) {
  return (
    <div className="rounded-lg border border-warning/40 bg-warning/5 p-4">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="size-4 text-warning" />
        <h3 className="text-sm font-medium text-card-foreground">{title}</h3>
      </div>
      <ul className="flex flex-col gap-1.5">
        {unassigned.map((u) => (
          <li key={u.taskId} className="text-xs text-muted-foreground">
            <span className="font-medium text-card-foreground">
              {taskIndex.get(u.taskId)?.title ?? `Task #${u.taskId}`}
            </span>
            {": "}
            {u.reason}
          </li>
        ))}
      </ul>
    </div>
  )
}

interface EmptyStateProps {
  message: string
}

function EmptyState({ message }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 text-center",
        "text-sm text-muted-foreground",
      )}
    >
      <Sparkles className="size-8 mb-3 opacity-40" />
      <p>{message}</p>
    </div>
  )
}
