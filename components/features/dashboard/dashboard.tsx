"use client"

import { useState, useMemo, useEffect } from "react"
import { useTranslations, useLocale } from "next-intl"
import { Link } from "@/i18n/navigation"
import { DEMO_TOP_STORES } from "@/lib/api/_demo-stores"
import {
  Plus,
  CalendarPlus,
  UserPlus,
  FileUp,
  CheckSquare,
  CheckCircle2,
  Clock,
  TrendingUp,
  Users,
  Briefcase,
  UserMinus,
  Percent,
  Sun,
  X,
  AlertTriangle,
  Target,
  Sparkles,
  ArrowRight,
  ChevronRight,
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts"

import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/contexts/auth-context"
import { ADMIN_ROUTES } from "@/lib/constants/routes"
import type { FunctionalRole, GoalCategory } from "@/lib/types"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

import { PageHeader } from "@/components/shared/page-header"
import { KpiCard } from "@/components/shared/kpi-card"
import { ActivityFeed, type ActivityItem } from "@/components/shared/activity-feed"
import { ReviewStateBadge } from "@/components/shared/review-state-badge"
import { ResourceBalanceCard } from "./resource-balance-card"
import { NetworkDashboard } from "./network-dashboard"
import { getDashboardResourceBalance, type ResourceBalanceData } from "@/lib/api/dashboard"

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

interface KpiData {
  value: number
  diff: number
  trend: number[]
}

interface ReviewQueueItem {
  id: string
  title: string
  assignee: string
  submittedAt: Date
  overdueMinutes?: number
}

interface AnomalyItem {
  id: string
  store: string
  message: string
  severity: "warning" | "critical"
}

interface DayAlert {
  id: string
  message: string
  link?: string
}

interface MorningBriefTask {
  id: string
  title: string
  workType: string
  estimatedMinutes: number
  assignee?: string
}

interface GoalProgress {
  id: string
  storeId: number
  storeName: string
  category: GoalCategory
  title: string
  progress: number
}

interface AISuggestion {
  id: string
  title: string
  storeName: string
  urgency: "high" | "medium"
}

// ═══════════════════════════════════════════════════════════════════
// MOCK DATA
// ═══════════════════════════════════════════════════════════════════

const OPERATIONS_KPI: Record<string, KpiData> = {
  tasksToday: { value: 87, diff: 12, trend: [65, 72, 78, 80, 85, 82, 87] },
  completed: { value: 54, diff: 5, trend: [40, 45, 48, 50, 52, 53, 54] },
  onReview: { value: 9, diff: 0, trend: [8, 10, 7, 9, 8, 9, 9] },
  fotVsPlan: { value: 97.4, diff: -2.6, trend: [95, 96, 94, 97, 98, 97, 97.4] },
}

const HR_KPI: Record<string, KpiData> = {
  activeEmployees: { value: 156, diff: 3, trend: [150, 152, 153, 154, 155, 155, 156] },
  onProbation: { value: 12, diff: 0, trend: [10, 11, 12, 11, 12, 12, 12] },
  terminatedMonth: { value: 4, diff: -2, trend: [6, 5, 5, 4, 4, 4, 4] },
  turnoverRate: { value: 8.5, diff: -1.2, trend: [10, 9.5, 9, 9, 8.8, 8.6, 8.5] },
}

const REVIEW_QUEUE: ReviewQueueItem[] = [
  { id: "1", title: "Выкладка молочной продукции", assignee: "Иванов И.", submittedAt: new Date(Date.now() - 45 * 60 * 1000), overdueMinutes: 15 },
  { id: "2", title: "Проверка ценников", assignee: "Петров А.", submittedAt: new Date(Date.now() - 30 * 60 * 1000) },
  { id: "3", title: "Инвентаризация склада", assignee: "Сидорова М.", submittedAt: new Date(Date.now() - 25 * 60 * 1000) },
  { id: "4", title: "Уборка торгового зала", assignee: "Козлов В.", submittedAt: new Date(Date.now() - 20 * 60 * 1000), overdueMinutes: 5 },
  { id: "5", title: "Приёмка товара", assignee: "Новикова Е.", submittedAt: new Date(Date.now() - 15 * 60 * 1000) },
]

const ANOMALIES: AnomalyItem[] = [
  { id: "1", store: DEMO_TOP_STORES[0]?.name ?? "Магазин", message: "OOS молочная группа +15% к норме", severity: "critical" },
  { id: "2", store: DEMO_TOP_STORES[1]?.name ?? "Магазин", message: "3 невыхода за неделю", severity: "warning" },
  { id: "3", store: DEMO_TOP_STORES[2]?.name ?? "Магазин", message: "Списания хлеб +8%", severity: "warning" },
]

const DAY_ALERTS: DayAlert[] = [
  { id: "1", message: "8 ч на паузе у задачи «Переоценка»", link: ADMIN_ROUTES.taskDetail("task-1") },
  { id: "2", message: "Нет смен на завтра в зоне Касса", link: ADMIN_ROUTES.schedule },
  { id: "3", message: "Возвраты по Иванов И. — 3 подряд", link: ADMIN_ROUTES.employeeDetail("emp-1") },
]

const ACTIVITY_ITEMS: ActivityItem[] = [
  { id: "1", timestamp: new Date(Date.now() - 5 * 60 * 1000), actor: "Иванов И.", action: "завершил задачу «Выкладка молочной продукции»", type: "TASK_COMPLETED", link: ADMIN_ROUTES.taskDetail("1") },
  { id: "2", timestamp: new Date(Date.now() - 12 * 60 * 1000), actor: "Петров А.", action: "отправил на проверку «Проверка ценников»", type: "TASK_COMPLETED", link: ADMIN_ROUTES.taskDetail("2") },
  { id: "3", timestamp: new Date(Date.now() - 25 * 60 * 1000), actor: "Система", action: "обнаружила аномалию: OOS молочная группа", type: "AI", link: ADMIN_ROUTES.aiSuggestions },
  { id: "4", timestamp: new Date(Date.now() - 35 * 60 * 1000), actor: "Сидорова М.", action: "начала задачу «Инвентаризация склада»", type: "TASK_CREATED", link: ADMIN_ROUTES.taskDetail("3") },
  { id: "5", timestamp: new Date(Date.now() - 45 * 60 * 1000), actor: "Козлов В.", action: "поставил задачу на паузу", type: "TASK_BLOCKED", link: ADMIN_ROUTES.taskDetail("4") },
  { id: "6", timestamp: new Date(Date.now() - 55 * 60 * 1000), actor: "Новикова Е.", action: "открыла смену", type: "EMPLOYEE", link: ADMIN_ROUTES.schedule },
  { id: "7", timestamp: new Date(Date.now() - 65 * 60 * 1000), actor: "ИИ-аналитика", action: "предложила новую цель: Снижение OOS", type: "GOAL", link: ADMIN_ROUTES.aiSuggestions },
  { id: "8", timestamp: new Date(Date.now() - 75 * 60 * 1000), actor: "Морозов Д.", action: "завершил задачу «Приёмка товара»", type: "TASK_COMPLETED", link: ADMIN_ROUTES.taskDetail("5") },
  { id: "9", timestamp: new Date(Date.now() - 85 * 60 * 1000), actor: "Волкова А.", action: "добавила комментарий к задаче", type: "COMMENT", link: ADMIN_ROUTES.taskDetail("6") },
  { id: "10", timestamp: new Date(Date.now() - 95 * 60 * 1000), actor: "Кузнецов С.", action: "архивировал задачу «Уборка склада»", type: "TASK_ARCHIVED", link: ADMIN_ROUTES.tasksArchive },
  { id: "11", timestamp: new Date(Date.now() - 105 * 60 * 1000), actor: "Система", action: "синхронизировала расписание из LAMA", type: "SYSTEM" },
  { id: "12", timestamp: new Date(Date.now() - 115 * 60 * 1000), actor: "Лебедева О.", action: "создала новую задачу", type: "TASK_CREATED", link: ADMIN_ROUTES.taskDetail("7") },
]

const PLAN_FACT_DATA = [
  { day: "Пн", plan: 210, fact: 195 },
  { day: "Вт", plan: 220, fact: 235 },
  { day: "Ср", plan: 215, fact: 210 },
  { day: "Чт", plan: 225, fact: 220 },
  { day: "Пт", plan: 230, fact: 225 },
  { day: "Сб", plan: 180, fact: 175 },
  { day: "Вс", plan: 150, fact: 155 },
]

const MORNING_BRIEF_STORE_DIRECTOR = {
  shiftUtilization: { onShift: 8, total: 9, late: 1, freeNow: 2, overloaded: 1 },
  plannedTasks: [
    { id: "1", title: "Выкладка молочной продукции", workType: "Выкладка", estimatedMinutes: 45 },
    { id: "2", title: "Проверка ценников в зале", workType: "Аудит", estimatedMinutes: 30 },
    { id: "3", title: "Приёмка утренней поставки", workType: "Приёмка", estimatedMinutes: 60, assignee: "Иванов И." },
  ] as MorningBriefTask[],
  reviewTasks: [
    { id: "4", title: "Инвентаризация склада", workType: "Инвентаризация", estimatedMinutes: 90, assignee: "Сидорова М." },
    { id: "5", title: "Уборка торгового зала", workType: "Уборка", estimatedMinutes: 30, assignee: "Козлов В." },
  ] as MorningBriefTask[],
  bonusTasks: [
    { id: "6", title: "Переоценка скоропорта", workType: "Переоценка", estimatedMinutes: 20 },
    { id: "7", title: "Доп. выкладка промо", workType: "Выкладка", estimatedMinutes: 25 },
  ] as MorningBriefTask[],
}

const MORNING_BRIEF_SUPERVISOR = {
  anomalies: ANOMALIES,
  goalsProgress: [
    { id: "g1", storeId: DEMO_TOP_STORES[0]?.id ?? 0, storeName: DEMO_TOP_STORES[0]?.name ?? "", category: "OOS_REDUCTION" as GoalCategory, title: "Снижение OOS молочной группы", progress: 68 },
    { id: "g2", storeId: DEMO_TOP_STORES[1]?.id ?? 0, storeName: DEMO_TOP_STORES[1]?.name ?? "", category: "WRITE_OFFS" as GoalCategory, title: "Снижение списаний хлеб", progress: 45 },
  ] as GoalProgress[],
  urgentSuggestions: [
    { id: "s1", title: `Переоценка скоропорта в ${DEMO_TOP_STORES[0]?.name ?? ""}`, storeName: DEMO_TOP_STORES[0]?.name ?? "", urgency: "high" as const },
    { id: "s2", title: "Доп. смена на выкладку", storeName: DEMO_TOP_STORES[1]?.name ?? "", urgency: "medium" as const },
  ] as AISuggestion[],
  bonusTasksTomorrow: 12,
}

const ACTIVE_GOAL = {
  id: "goal-1",
  category: "OOS_REDUCTION" as GoalCategory,
  title: "Снижение OOS молочной группы до 2%",
  progress: 68,
  storeId: 1,
}

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

function getGreetingKey(): "greeting_morning" | "greeting_afternoon" | "greeting_evening" {
  const hour = new Date().getHours()
  if (hour < 12) return "greeting_morning"
  if (hour < 18) return "greeting_afternoon"
  return "greeting_evening"
}

function isMorningBriefTime(): boolean {
  const hour = new Date().getHours()
  return hour < 11
}

function formatDateLong(locale: string): string {
  const now = new Date()
  const weekday = new Intl.DateTimeFormat(locale, { weekday: "long" }).format(now)
  const date = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric" }).format(now)
  return `${weekday.charAt(0).toUpperCase() + weekday.slice(1)}, ${date}`
}

function formatMinutesAgo(minutes: number, locale: string): string {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" })
  return rtf.format(-minutes, "minute")
}

const GOAL_CATEGORY_ICON: Record<GoalCategory, typeof Target> = {
  OOS_REDUCTION: Target,
  WRITE_OFFS: Target,
  PROMO_QUALITY: Target,
  PRICE_ACCURACY: Target,
  IMPULSE_ZONES: Target,
  PRODUCTIVITY: Target,
  CUSTOM: Target,
}

// ═══════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════

function MorningBriefStoreDirector({
  data,
  activeGoal,
  dayAlerts,
  onClose,
}: {
  data: typeof MORNING_BRIEF_STORE_DIRECTOR
  activeGoal: typeof ACTIVE_GOAL | null
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

function MorningBriefSupervisor({
  data,
  activeGoal,
  dayAlerts,
  onClose,
}: {
  data: typeof MORNING_BRIEF_SUPERVISOR
  activeGoal: typeof ACTIVE_GOAL | null
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

function ReviewQueueCard({ items }: { items: ReviewQueueItem[] }) {
  const t = useTranslations("screen.dashboard.review_queue")
  const locale = useLocale()

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.slice(0, 5).map((item) => {
          const minutesAgo = Math.floor((Date.now() - item.submittedAt.getTime()) / 60000)
          return (
            <Link
              key={item.id}
              href={ADMIN_ROUTES.taskDetail(item.id)}
              className="flex items-center justify-between rounded-lg border bg-card p-3 transition-colors hover:bg-accent"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.assignee} · {formatMinutesAgo(minutesAgo, locale)}</p>
              </div>
              {item.overdueMinutes && (
                <Badge variant="outline" className="shrink-0 ml-2 text-destructive border-destructive/30">
                  +{item.overdueMinutes} мин
                </Badge>
              )}
            </Link>
          )
        })}
        <Button variant="outline" className="w-full" asChild>
          <Link href={ADMIN_ROUTES.tasksReview}>
            {t("open_queue")}
            <ArrowRight className="size-4 ml-1" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}

function AnomaliesCard({ items }: { items: AnomalyItem[] }) {
  const t = useTranslations("screen.dashboard.anomalies")

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              "flex items-center gap-2 rounded-lg p-3",
              item.severity === "critical" ? "bg-destructive/10" : "bg-warning/10"
            )}
          >
            <AlertTriangle
              className={cn(
                "size-4 shrink-0",
                item.severity === "critical" ? "text-destructive" : "text-warning"
              )}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{item.store}</p>
              <p className="text-xs text-muted-foreground truncate">{item.message}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function QuickActionsCard({ role }: { role: FunctionalRole }) {
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

function PlanFactChart() {
  const t = useTranslations("screen.dashboard.plan_fact")
  const [period, setPeriod] = useState<"day" | "week" | "month">("week")

  const chartConfig: ChartConfig = {
    plan: {
      label: t("plan"),
      color: "oklch(var(--muted-foreground))",
    },
    fact: {
      label: t("fact"),
      color: "oklch(var(--primary))",
    },
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{t("title")}</CardTitle>
          <div className="flex gap-1">
            {(["day", "week", "month"] as const).map((p) => (
              <Button
                key={p}
                variant={period === p ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setPeriod(p)}
                className="h-7 text-xs"
              >
                {t(`period.${p}` as Parameters<typeof t>[0])}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[200px] md:h-[280px] w-full">
          <BarChart data={PLAN_FACT_DATA} barGap={4}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="day"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={40}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar
              dataKey="plan"
              fill="var(--color-plan)"
              radius={[4, 4, 0, 0]}
              maxBarSize={32}
            />
            <Bar
              dataKey="fact"
              fill="var(--color-fact)"
              radius={[4, 4, 0, 0]}
              maxBarSize={32}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

/** Roles that can see the Resource Balance block */
const RESOURCE_BALANCE_ROLES = new Set([
  "SUPERVISOR",
  "REGIONAL",
  "NETWORK_OPS",
  "HR_MANAGER",
] as const)

/**
 * Роли которые видят НОВЫЙ дашборд с двумя табами «Здоровье сети» / «Бюджет».
 * STORE_DIRECTOR, HR_MANAGER, OPERATOR — продолжают видеть старый task-focused вариант.
 */
const NETWORK_DASHBOARD_ROLES = new Set<FunctionalRole>([
  "SUPERVISOR",
  "REGIONAL",
  "NETWORK_OPS",
])

export function Dashboard() {
  const { user } = useAuth()

  // Network-level дашборд для SUPERVISOR / REGIONAL / NETWORK_OPS — отдельный компонент
  if ((NETWORK_DASHBOARD_ROLES as ReadonlySet<string>).has(user.role)) {
    return <NetworkDashboard />
  }

  return <LegacyDashboard />
}

function LegacyDashboard() {
  const { user } = useAuth()
  const t = useTranslations("screen.dashboard")
  const tActions = useTranslations("screen.dashboard.actions")
  const tKpi = useTranslations("screen.dashboard.kpi")
  const tActivity = useTranslations("screen.dashboard.activity")
  const locale = useLocale()

  const [morningBriefDismissed, setMorningBriefDismissed] = useState(false)
  const [activityTab, setActivityTab] = useState<"all" | "tasks" | "shifts" | "review">("all")
  const [resourceBalance, setResourceBalance] = useState<ResourceBalanceData | null>(null)

  const role = user.role
  const firstName = user.first_name
  const greetingKey = getGreetingKey()
  const showMorningBrief = isMorningBriefTime() && !morningBriefDismissed && (role === "STORE_DIRECTOR" || role === "SUPERVISOR")
  const isHrManager = role === "HR_MANAGER"

  const showResourceBalance = (RESOURCE_BALANCE_ROLES as ReadonlySet<string>).has(role)
  const freelanceModuleEnabled = user.organization.freelance_module_enabled
  const externalHrEnabled = user.organization.external_hr_enabled

  // Load resource balance data for eligible roles
  useEffect(() => {
    if (!showResourceBalance) return
    getDashboardResourceBalance().then((res) => setResourceBalance(res.data))
  }, [showResourceBalance])

  // Filter activity items by tab
  const filteredActivity = useMemo(() => {
    if (activityTab === "all") return ACTIVITY_ITEMS
    if (activityTab === "tasks") return ACTIVITY_ITEMS.filter((item) => item.type.startsWith("TASK"))
    if (activityTab === "shifts") return ACTIVITY_ITEMS.filter((item) => item.type === "EMPLOYEE")
    if (activityTab === "review") return ACTIVITY_ITEMS.filter((item) => item.type === "TASK_COMPLETED")
    return ACTIVITY_ITEMS
  }, [activityTab])

  // KPI data based on role
  const kpiData = isHrManager ? HR_KPI : OPERATIONS_KPI

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={`${t(greetingKey as Parameters<typeof t>[0])}, ${firstName}`}
        subtitle={formatDateLong(locale)}
        actions={
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild>
              <Link href={ADMIN_ROUTES.taskNew}>
                <Plus className="size-4 mr-2" />
                {tActions("create_task")}
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={ADMIN_ROUTES.schedule}>
                <CalendarPlus className="size-4 mr-2" />
                {tActions("plan_shift")}
              </Link>
            </Button>
          </div>
        }
      />

      {/* Morning Brief */}
      {showMorningBrief && role === "STORE_DIRECTOR" && (
        <MorningBriefStoreDirector
          data={MORNING_BRIEF_STORE_DIRECTOR}
          activeGoal={ACTIVE_GOAL}
          dayAlerts={DAY_ALERTS}
          onClose={() => setMorningBriefDismissed(true)}
        />
      )}
      {showMorningBrief && role === "SUPERVISOR" && (
        <MorningBriefSupervisor
          data={MORNING_BRIEF_SUPERVISOR}
          activeGoal={ACTIVE_GOAL}
          dayAlerts={DAY_ALERTS}
          onClose={() => setMorningBriefDismissed(true)}
        />
      )}

      {/* KPI Grid */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {isHrManager ? (
          <>
            <KpiCard
              label={tKpi("active_employees")}
              value={kpiData.activeEmployees.value}
              diff={kpiData.activeEmployees.diff}
              trend={kpiData.activeEmployees.trend}
              icon={Users}
            />
            <KpiCard
              label={tKpi("on_probation")}
              value={kpiData.onProbation.value}
              diff={kpiData.onProbation.diff}
              trend={kpiData.onProbation.trend}
              icon={Briefcase}
            />
            <KpiCard
              label={tKpi("terminated_month")}
              value={kpiData.terminatedMonth.value}
              diff={kpiData.terminatedMonth.diff}
              trend={kpiData.terminatedMonth.trend}
              icon={UserMinus}
            />
            <KpiCard
              label={tKpi("turnover_rate")}
              value={`${kpiData.turnoverRate.value}%`}
              diff={kpiData.turnoverRate.diff}
              trend={kpiData.turnoverRate.trend}
              icon={Percent}
            />
          </>
        ) : (
          <>
            <KpiCard
              label={tKpi("tasks_today")}
              value={kpiData.tasksToday.value}
              diff={kpiData.tasksToday.diff}
              trend={kpiData.tasksToday.trend}
              icon={CheckSquare}
            />
            <KpiCard
              label={tKpi("completed")}
              value={kpiData.completed.value}
              diff={kpiData.completed.diff}
              trend={kpiData.completed.trend}
              icon={CheckCircle2}
            />
            <KpiCard
              label={tKpi("on_review")}
              value={kpiData.onReview.value}
              diff={kpiData.onReview.diff}
              trend={kpiData.onReview.trend}
              icon={Clock}
              className={REVIEW_QUEUE.filter((r) => r.overdueMinutes).length > 0 ? "border-warning/50" : ""}
            />
            <KpiCard
              label={tKpi("fot_vs_plan")}
              value={`${kpiData.fotVsPlan.value}%`}
              diff={kpiData.fotVsPlan.diff}
              trend={kpiData.fotVsPlan.trend}
              icon={TrendingUp}
            />
          </>
        )}
      </div>

      {/* Resource Balance Block — SUPERVISOR / REGIONAL / NETWORK_OPS / HR_MANAGER */}
      {showResourceBalance && resourceBalance && (
        <ResourceBalanceCard
          data={resourceBalance}
          freelanceModuleEnabled={freelanceModuleEnabled}
          externalHrEnabled={externalHrEnabled}
        />
      )}

      {/* Main Content: Activity + Sidebar */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Activity Feed */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{tActivity("title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activityTab} onValueChange={(v) => setActivityTab(v as typeof activityTab)}>
              <TabsList className="mb-4">
                <TabsTrigger value="all">{tActivity("tabs.all")}</TabsTrigger>
                <TabsTrigger value="tasks">{tActivity("tabs.tasks")}</TabsTrigger>
                <TabsTrigger value="shifts">{tActivity("tabs.shifts")}</TabsTrigger>
                <TabsTrigger value="review">{tActivity("tabs.review")}</TabsTrigger>
              </TabsList>
            </Tabs>
            <ScrollArea className="h-[400px] md:h-[480px] pr-4">
              <ActivityFeed items={filteredActivity} />
            </ScrollArea>
            <div className="mt-4 pt-4 border-t">
              <Button variant="ghost" className="w-full" asChild>
                <Link href={ADMIN_ROUTES.notifications}>
                  {tActivity("view_all")}
                  <ArrowRight className="size-4 ml-1" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Sidebar Cards */}
        <div className="space-y-4 flex flex-col">
          {/* Mobile: reorder for STORE_DIRECTOR priority */}
          <div className="contents md:hidden">
            {!isHrManager && <AnomaliesCard items={ANOMALIES} />}
            {!isHrManager && <ReviewQueueCard items={REVIEW_QUEUE} />}
            <QuickActionsCard role={role} />
          </div>
          {/* Desktop: normal order */}
          <div className="hidden md:contents">
            {!isHrManager && <ReviewQueueCard items={REVIEW_QUEUE} />}
            {!isHrManager && <AnomaliesCard items={ANOMALIES} />}
            <QuickActionsCard role={role} />
          </div>
        </div>
      </div>

      {/* Plan vs Fact Chart */}
      {!isHrManager && <PlanFactChart />}
    </div>
  )
}
