"use client"

import { useTranslations, useLocale } from "next-intl"
import { Sun, X, AlertTriangle, Target, Sparkles, ArrowRight, ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"
import { Link } from "@/i18n/navigation"
import { ADMIN_ROUTES } from "@/lib/constants/routes"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

import {
  formatDateLong,
  GOAL_CATEGORY_ICON,
  type ActiveGoal,
  type DayAlert,
  type MorningBriefSupervisorData,
} from "./_shared"

export function MorningBriefSupervisor({
  data,
  activeGoal,
  dayAlerts,
  onClose,
}: {
  data: MorningBriefSupervisorData
  activeGoal: ActiveGoal | null
  dayAlerts: DayAlert[]
  onClose: () => void
}) {
  const t = useTranslations("screen.dashboard.morning_brief")
  const locale = useLocale()

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
        {/* Anomalies */}
        <div className="rounded-lg border bg-card p-4">
          <h4 className="text-sm font-medium mb-3">{t("anomalies_title")}</h4>
          <div className="space-y-2">
            {data.anomalies.map((anomaly) => (
              <div
                key={anomaly.id}
                className={cn(
                  "flex items-center gap-2 rounded-md p-2",
                  anomaly.severity === "critical" ? "bg-destructive/10" : "bg-warning/10"
                )}
              >
                <AlertTriangle
                  className={cn(
                    "size-4 shrink-0",
                    anomaly.severity === "critical" ? "text-destructive" : "text-warning"
                  )}
                />
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-medium">{anomaly.store}:</span>{" "}
                  <span className="text-sm text-muted-foreground">{anomaly.message}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Goals Progress */}
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium">{t("goals_progress_title")}</h4>
            <Button variant="ghost" size="sm" asChild>
              <Link href={ADMIN_ROUTES.goals}>
                {t("set_goal")}
                <ChevronRight className="size-4 ml-1" />
              </Link>
            </Button>
          </div>
          <div className="space-y-3">
            {data.goalsProgress.map((goal) => {
              const Icon = GOAL_CATEGORY_ICON[goal.category]
              return (
                <div key={goal.id} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Icon className="size-4 text-primary" />
                    <span className="text-sm font-medium truncate flex-1">{goal.storeName}</span>
                    <span className="text-sm font-medium">{goal.progress}%</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate pl-6">{goal.title}</p>
                  <Progress value={goal.progress} className="h-1.5" />
                </div>
              )
            })}
          </div>
        </div>

        {/* AI Suggestions + Bonus */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="size-4 text-primary" />
              <h4 className="text-sm font-medium">{t("urgent_suggestions")} ({data.urgentSuggestions.length})</h4>
            </div>
            <div className="space-y-2">
              {data.urgentSuggestions.map((sug) => (
                <div key={sug.id} className="text-sm">
                  <span className="font-medium">{sug.storeName}:</span>{" "}
                  <span className="text-muted-foreground">{sug.title}</span>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" className="w-full mt-3" asChild>
              <Link href={ADMIN_ROUTES.aiSuggestions}>
                {t("all_suggestions")}
                <ArrowRight className="size-4 ml-1" />
              </Link>
            </Button>
          </div>

          <div className="rounded-lg border bg-card p-4">
            <h4 className="text-sm font-medium mb-3">{t("bonus_tomorrow")}</h4>
            <p className="text-3xl font-semibold">{data.bonusTasksTomorrow}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("bonus_hint")}</p>
          </div>
        </div>

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
