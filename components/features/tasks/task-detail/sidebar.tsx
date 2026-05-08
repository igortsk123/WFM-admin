"use client"

import type { ReactNode } from "react"
import { useTranslations, useLocale } from "next-intl"
import { CheckCircle2, ChevronDown, MapPin, Store, User } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

import { TaskStateBadge } from "@/components/shared/task-state-badge"
import { ReviewStateBadge } from "@/components/shared/review-state-badge"
import { UserCell } from "@/components/shared/user-cell"

import { ADMIN_ROUTES } from "@/lib/constants/routes"
import type { TaskDetail as TaskDetailType } from "@/lib/api/tasks"
import { cn } from "@/lib/utils"

import { fmtDate, fmtMin, fmtTime, getDeviationClass } from "./_shared"

// ──────────────────────────────────────────────────────────────────
// SidebarCard — desktop=Card, mobile=Collapsible
// ──────────────────────────────────────────────────────────────────

interface SidebarCardProps {
  id: string
  title: string
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
}

export function SidebarCard({ id, title, isOpen, onOpenChange, children }: SidebarCardProps) {
  void id
  return (
    <>
      {/* Desktop: plain Card */}
      <Card className="hidden lg:block">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">{children}</CardContent>
      </Card>

      {/* Mobile: Collapsible */}
      <Collapsible
        open={isOpen}
        onOpenChange={onOpenChange}
        className="lg:hidden border rounded-lg overflow-hidden"
      >
        <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3 min-h-[44px] hover:bg-muted/50 transition-colors">
          <span className="text-sm font-medium text-foreground">{title}</span>
          <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
        </CollapsibleTrigger>
        <CollapsibleContent className="px-4 pb-4 pt-1">{children}</CollapsibleContent>
      </Collapsible>
    </>
  )
}

// ──────────────────────────────────────────────────────────────────
// Status content
// ──────────────────────────────────────────────────────────────────

interface StatusContentProps {
  task: TaskDetailType
}

export function SidebarStatusContent({ task }: StatusContentProps) {
  const t = useTranslations("screen.taskDetail")
  const locale = useLocale()

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <TaskStateBadge state={task.state} />
        {task.review_state !== "NONE" && <ReviewStateBadge reviewState={task.review_state} />}
      </div>
      {task.review_state === "REJECTED" && task.review_comment && (
        <Alert variant="destructive" className="py-2">
          <AlertDescription className="text-xs">{task.review_comment}</AlertDescription>
        </Alert>
      )}
      <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
        <span>{t("sidebar_created", { date: fmtDate(task.created_at, locale) })}</span>
        <span>{t("sidebar_updated", { time: fmtTime(task.updated_at, locale) })}</span>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────
// Assignee content
// ──────────────────────────────────────────────────────────────────

interface AssigneeContentProps {
  task: TaskDetailType
  isManager: boolean
  elapsedMin: number
  onAssignClick: () => void
}

export function SidebarAssigneeContent({ task, isManager, elapsedMin, onAssignClick }: AssigneeContentProps) {
  const t = useTranslations("screen.taskDetail")
  const locale = useLocale()

  const assigneeName = task.assignee_name
    ? (() => {
        const parts = task.assignee_name.split(" ")
        return { last_name: parts[0] ?? "", first_name: parts[1] ?? "", middle_name: parts[2] }
      })()
    : null

  return (
    <div className="flex flex-col gap-3">
      {task.assignee_id && assigneeName ? (
        <div className="flex items-center justify-between gap-2">
          <UserCell user={assigneeName} />
          <Button variant="ghost" size="icon" asChild className="shrink-0">
            <a href={ADMIN_ROUTES.employeeDetail(String(task.assignee_id))} aria-label="Открыть профиль">
              <User className="size-4" />
            </a>
          </Button>
        </div>
      ) : task.assigned_to_permission ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle2 className="size-4 text-muted-foreground" />
          {t("sidebar_any_permission", { permission: task.assigned_to_permission })}
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="size-4" />
            {t("sidebar_not_assigned")}
          </div>
          {isManager && (
            <Button variant="outline" size="sm" onClick={onAssignClick}>
              {t("sidebar_assign_btn")}
            </Button>
          )}
        </div>
      )}
      {task.state === "IN_PROGRESS" && elapsedMin > 0 && (
        <p className="text-xs text-muted-foreground">
          {t("sidebar_elapsed", { time: fmtMin(elapsedMin, locale) })}
        </p>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────
// Location content
// ──────────────────────────────────────────────────────────────────

interface LocationContentProps {
  task: TaskDetailType
}

export function SidebarLocationContent({ task }: LocationContentProps) {
  return (
    <div className="flex flex-col gap-2 text-sm">
      <div className="flex items-center gap-2 text-foreground">
        <Store className="size-4 text-muted-foreground shrink-0" />
        <a href={ADMIN_ROUTES.storeDetail(String(task.store_id))} className="hover:underline text-foreground">
          {task.store_name}
        </a>
      </div>
      <div className="flex items-center gap-2 text-foreground">
        <MapPin className="size-4 text-muted-foreground shrink-0" />
        <a href={ADMIN_ROUTES.taxonomyZones} className="hover:underline text-foreground">
          {task.zone_name}
        </a>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────
// Timing content
// ──────────────────────────────────────────────────────────────────

interface TimingContentProps {
  task: TaskDetailType
  actualMin: number | null
  isOverdue: boolean
  overdueDiff: number | null
}

export function SidebarTimingContent({ task, actualMin, isOverdue, overdueDiff }: TimingContentProps) {
  const t = useTranslations("screen.taskDetail")
  const locale = useLocale()

  return (
    <div className="flex flex-col gap-2 text-sm">
      <div className="flex justify-between">
        <span className="text-muted-foreground">{t("sidebar_timing_planned")}</span>
        <span className="font-medium text-foreground">{fmtMin(task.planned_minutes, locale)}</span>
      </div>
      {actualMin !== null && (
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t("sidebar_timing_actual")}</span>
          <span className={cn("font-medium", getDeviationClass(task.planned_minutes, actualMin))}>{fmtMin(actualMin, locale)}</span>
        </div>
      )}
      {task.time_start && (
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t("sidebar_timing_scheduled")}</span>
          <span className="font-medium text-foreground">{task.time_start.slice(0, 5)}</span>
        </div>
      )}
      {task.time_end && (
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t("sidebar_timing_deadline")}</span>
          <span className="font-medium text-foreground">{task.time_end.slice(0, 5)}</span>
        </div>
      )}
      {isOverdue && overdueDiff !== null && (
        <p className="text-xs font-medium text-destructive mt-1">
          {t("sidebar_timing_overdue", { duration: fmtMin(overdueDiff, locale) })}
        </p>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────
// Settings content
// ──────────────────────────────────────────────────────────────────

interface SettingsContentProps {
  task: TaskDetailType
}

export function SidebarSettingsContent({ task }: SettingsContentProps) {
  const t = useTranslations("screen.taskDetail")

  return (
    <div className="flex flex-col gap-2 text-sm">
      <div className="flex justify-between">
        <span className="text-muted-foreground">{t("sidebar_task_type")}</span>
        <Badge variant="outline" className="text-xs">{task.type}</Badge>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">{t("sidebar_policy")}</span>
        <span className="font-medium text-foreground">
          {task.acceptance_policy === "AUTO" ? t("sidebar_policy_auto") : t("sidebar_policy_manual")}
        </span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-muted-foreground">{t("sidebar_photo")}</span>
        <span className={cn("font-medium", task.requires_photo ? "text-foreground" : "text-muted-foreground")}>
          {task.requires_photo ? t("sidebar_photo_required") : t("sidebar_photo_not_required")}
        </span>
      </div>
      {task.state === "NEW" && (
        <a href={ADMIN_ROUTES.taskEdit(task.id)} className="text-xs text-primary hover:underline mt-1">
          {t("sidebar_edit_link")}
        </a>
      )}
    </div>
  )
}
