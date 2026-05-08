"use client"

import { useState, useMemo, useEffect } from "react"
import dynamic from "next/dynamic"
import { useTranslations, useLocale } from "next-intl"
import {
  Plus,
  CalendarPlus,
  CheckSquare,
  CheckCircle2,
  Clock,
  TrendingUp,
  Users,
  Briefcase,
  UserMinus,
  Percent,
  ArrowRight,
} from "lucide-react"

import { Link } from "@/i18n/navigation"
import { useAuth } from "@/lib/contexts/auth-context"
import { ADMIN_ROUTES } from "@/lib/constants/routes"
import type { FunctionalRole } from "@/lib/types"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"

import { PageHeader } from "@/components/shared/page-header"
import { KpiCard } from "@/components/shared/kpi-card"
import { ActivityFeed } from "@/components/shared/activity-feed"

import { ResourceBalanceCard } from "./resource-balance-card"
import { NetworkDashboard } from "./network-dashboard"
import { getDashboardResourceBalance, type ResourceBalanceData } from "@/lib/api/dashboard"

import {
  ACTIVE_GOAL,
  ACTIVITY_ITEMS,
  ANOMALIES,
  DAY_ALERTS,
  HR_KPI,
  MORNING_BRIEF_STORE_DIRECTOR,
  MORNING_BRIEF_SUPERVISOR,
  OPERATIONS_KPI,
  REVIEW_QUEUE,
  formatDateLong,
  getGreetingKey,
  isMorningBriefTime,
} from "./dashboard/_shared"
import { MorningBriefStoreDirector } from "./dashboard/morning-brief-store-director"
import { MorningBriefSupervisor } from "./dashboard/morning-brief-supervisor"
import { ReviewQueueCard } from "./dashboard/review-queue-card"
import { AnomaliesCard } from "./dashboard/anomalies-card"
import { QuickActionsCard } from "./dashboard/quick-actions-card"

const PlanFactChart = dynamic(
  () => import("./dashboard/plan-fact-chart").then((m) => m.PlanFactChart),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[300px] w-full" />,
  },
)

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
