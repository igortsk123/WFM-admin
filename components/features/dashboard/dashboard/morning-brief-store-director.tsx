"use client"

import { useState } from "react"
import { useTranslations, useLocale } from "next-intl"
import { Sun, X, AlertTriangle, Target } from "lucide-react"

import { Link } from "@/i18n/navigation"
import { ADMIN_ROUTES } from "@/lib/constants/routes"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"

import { ReviewStateBadge } from "@/components/shared/review-state-badge"

import {
  formatDateLong,
  type ActiveGoal,
  type DayAlert,
  type MorningBriefStoreDirectorData,
} from "./_shared"

export function MorningBriefStoreDirector({
  data,
  activeGoal,
  dayAlerts,
  onClose,
}: {
  data: MorningBriefStoreDirectorData
  activeGoal: ActiveGoal | null
  dayAlerts: DayAlert[]
  onClose: () => void
}) {
  const t = useTranslations("screen.dashboard.morning_brief")
  const locale = useLocale()
  const [activeTab, setActiveTab] = useState<"planned" | "on_review" | "bonus">("planned")

  const unassignedCount = data.plannedTasks.filter((task) => !task.assignee).length

  return (
    <Card className="border-warning/30 bg-warning/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sun className="size-5 text-warning" />
            <CardTitle className="text-base">{t("title")}</CardTitle>
            <span className="text-sm text-muted-foreground">
              {formatDateLong(locale)}
            </span>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="size-8">
            <X className="size-4" />
            <span className="sr-only">{t("close")}</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Shift Utilization */}
        <div className="rounded-lg border bg-card p-4">
          <h4 className="text-sm font-medium mb-3">{t("shift_utilization")}</h4>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="text-center">
              <p className="text-2xl font-semibold">{data.shiftUtilization.onShift}/{data.shiftUtilization.total}</p>
              <p className="text-xs text-muted-foreground">{t("on_shift")}</p>
              {data.shiftUtilization.late > 0 && (
                <Badge variant="outline" className="mt-1 text-destructive border-destructive/30">
                  {data.shiftUtilization.late} {t("late")}
                </Badge>
              )}
            </div>
            <div className="text-center">
              <p className="text-2xl font-semibold text-success">{data.shiftUtilization.freeNow}</p>
              <p className="text-xs text-muted-foreground">{t("free_now")}</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-semibold text-warning">{data.shiftUtilization.overloaded}</p>
              <p className="text-xs text-muted-foreground">{t("overloaded")}</p>
            </div>
          </div>
        </div>

        {/* Task Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className="w-full">
            <TabsTrigger value="planned" className="flex-1">
              {t("tabs.planned")} ({data.plannedTasks.length})
            </TabsTrigger>
            <TabsTrigger value="on_review" className="flex-1">
              {t("tabs.on_review")} ({data.reviewTasks.length})
            </TabsTrigger>
            <TabsTrigger value="bonus" className="flex-1">
              {t("tabs.bonus")} ({data.bonusTasks.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="planned" className="mt-3 space-y-2">
            {data.plannedTasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between rounded-lg border bg-card p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{task.title}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{task.workType}</span>
                    <span>·</span>
                    <span>{task.estimatedMinutes} мин</span>
                    {task.assignee && (
                      <>
                        <span>·</span>
                        <span>{task.assignee}</span>
                      </>
                    )}
                  </div>
                </div>
                {!task.assignee && (
                  <Badge variant="outline" className="shrink-0 ml-2">Не назначена</Badge>
                )}
              </div>
            ))}
            {unassignedCount > 0 && (
              <Button variant="outline" className="w-full" asChild>
                <Link href={ADMIN_ROUTES.tasks}>
                  {t("distribute_unassigned")} ({unassignedCount})
                </Link>
              </Button>
            )}
          </TabsContent>

          <TabsContent value="on_review" className="mt-3 space-y-2">
            {data.reviewTasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between rounded-lg border bg-card p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{task.title}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{task.workType}</span>
                    <span>·</span>
                    <span>{task.assignee}</span>
                  </div>
                </div>
                <ReviewStateBadge reviewState="ON_REVIEW" />
              </div>
            ))}
          </TabsContent>

          <TabsContent value="bonus" className="mt-3 space-y-2">
            {data.bonusTasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between rounded-lg border bg-card p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{task.title}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{task.workType}</span>
                    <span>·</span>
                    <span>{task.estimatedMinutes} мин</span>
                  </div>
                </div>
              </div>
            ))}
            <p className="text-xs text-muted-foreground">{t("bonus_hint")}</p>
          </TabsContent>
        </Tabs>

        {/* Active Goal */}
        {activeGoal && (
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="size-4 text-primary" />
              <h4 className="text-sm font-medium">{t("active_goal")}</h4>
            </div>
            <p className="text-sm text-foreground truncate mb-2">{activeGoal.title}</p>
            <div className="flex items-center gap-3">
              <Progress value={activeGoal.progress} className="flex-1 h-2" />
              <span className="text-sm font-medium">{activeGoal.progress}%</span>
              <Button variant="outline" size="sm" asChild>
                <Link href={`${ADMIN_ROUTES.goals}?store_id=${activeGoal.storeId}`}>
                  {t("open_goal")}
                </Link>
              </Button>
            </div>
          </div>
        )}

        {/* Day Alerts */}
        {dayAlerts.length > 0 && (
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="size-4 text-warning" />
              <h4 className="text-sm font-medium">{t("alerts_title")}</h4>
            </div>
            <div className="space-y-2">
              {dayAlerts.map((alert) => (
                <div key={alert.id} className="flex items-center gap-2">
                  <AlertTriangle className="size-3.5 text-warning shrink-0" />
                  {alert.link ? (
                    <Link href={alert.link} className="text-sm text-foreground hover:underline truncate">
                      {alert.message}
                    </Link>
                  ) : (
                    <span className="text-sm text-foreground truncate">{alert.message}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
