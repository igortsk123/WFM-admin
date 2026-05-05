"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Target, AlertTriangle, TrendingUp, Clock } from "lucide-react";

import { useAuth } from "@/lib/contexts/auth-context";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader, KpiCard } from "@/components/shared";
import { ADMIN_ROUTES } from "@/lib/constants/routes";
import { StoresTab } from "./network-goals-stores-tab";
import { SupervisorsTab } from "./network-goals-supervisors-tab";
import { RegionsTab } from "./network-goals-regions-tab";
import { AiQualityPanel } from "./network-goals-ai-quality-panel";

export function NetworkGoalsDashboard() {
  const t = useTranslations("screen.networkGoals");
  const { user } = useAuth();

  const isNetworkOpsOrRegional = ["NETWORK_OPS", "REGIONAL"].includes(user.role);
  const [activeTab, setActiveTab] = React.useState("by_stores");

  // Mock KPI data
  const kpiData = {
    activeGoals: 8,
    storesWithoutGoal: 3,
    avgProgress: 67,
    aiAcceptRate: 72,
    aiAlarmCount: 1,
    anomaliesCount: 2,
    productivity: 84,
    planCompletion: 76,
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <PageHeader
        title={t("page_title")}
        subtitle={t("page_subtitle")}
        breadcrumbs={[
          { label: t("breadcrumbs.home"), href: ADMIN_ROUTES.dashboard },
          { label: t("breadcrumbs.goals_bonus"), href: ADMIN_ROUTES.goals },
          { label: t("breadcrumbs.network") },
        ]}
      />

      {/* KPI Cards - Role-based */}
      {isNetworkOpsOrRegional ? (
        <NetworkOpsKpiRow kpiData={kpiData} />
      ) : (
        <SupervisorKpiRow kpiData={kpiData} />
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto scrollbar-hide md:justify-start border-b border-border rounded-none bg-transparent p-0 h-auto">
          <TabsTrigger
            value="by_stores"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5"
          >
            {t("tabs.by_stores")}
          </TabsTrigger>
          <TabsTrigger
            value="by_supervisors"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5"
          >
            {t("tabs.by_supervisors")}
          </TabsTrigger>
          {isNetworkOpsOrRegional && (
            <TabsTrigger
              value="by_regions"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5"
            >
              {t("tabs.by_regions")}
            </TabsTrigger>
          )}
          <TabsTrigger
            value="ai_quality"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5"
          >
            {t("tabs.ai_quality")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="by_stores" className="mt-6">
          <StoresTab />
        </TabsContent>

        <TabsContent value="by_supervisors" className="mt-6">
          <SupervisorsTab />
        </TabsContent>

        {isNetworkOpsOrRegional && (
          <TabsContent value="by_regions" className="mt-6">
            <RegionsTab />
          </TabsContent>
        )}

        <TabsContent value="ai_quality" className="mt-6">
          <AiQualityPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// KPI ROWS
// ═══════════════════════════════════════════════════════════════════

interface KpiRowProps {
  kpiData: {
    activeGoals: number;
    storesWithoutGoal: number;
    avgProgress: number;
    aiAcceptRate: number;
    aiAlarmCount: number;
    anomaliesCount: number;
    productivity: number;
    planCompletion: number;
  };
}

function NetworkOpsKpiRow({ kpiData }: KpiRowProps) {
  const t = useTranslations("screen.networkGoals.kpi_network_ops");

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <KpiCard
        icon={Target}
        label={t("active_goals_title")}
        value={kpiData.activeGoals}
        diff={5}
        trend={[5, 6, 7, 7, 8, 8, 8]}
      />
      <KpiCard
        icon={TrendingUp}
        label={t("avg_progress_title")}
        value={`${kpiData.avgProgress}%`}
        diff={3}
        trend={[60, 62, 64, 65, 66, 67, 67]}
      />
      <KpiCard
        icon={Clock}
        label={t("ai_accept_rate_title")}
        value={`${kpiData.aiAcceptRate}%`}
        diff={-2}
        trend={[78, 76, 74, 73, 72, 72, 72]}
      />
      <KpiCard
        icon={AlertTriangle}
        label={t("ai_alarm_title")}
        value={kpiData.aiAlarmCount}
        diff={kpiData.aiAlarmCount > 0 ? -100 : 0}
      />
    </div>
  );
}

function SupervisorKpiRow({ kpiData }: KpiRowProps) {
  const t = useTranslations("screen.networkGoals.kpi_supervisor");

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <KpiCard
        icon={Target}
        label={t("active_goals_title")}
        value={kpiData.activeGoals}
        diff={5}
        trend={[5, 6, 7, 7, 8, 8, 8]}
      />
      <KpiCard
        icon={AlertTriangle}
        label={t("anomalies_title")}
        value={kpiData.anomaliesCount}
        diff={kpiData.anomaliesCount > 0 ? -50 : 0}
      />
      <KpiCard
        icon={TrendingUp}
        label={t("productivity_title")}
        value={`${kpiData.productivity}%`}
        diff={2}
        trend={[80, 81, 82, 82, 83, 84, 84]}
      />
      <KpiCard
        icon={Clock}
        label={t("completion_title")}
        value={`${kpiData.planCompletion}%`}
        diff={4}
        trend={[70, 71, 72, 73, 74, 75, 76]}
      />
    </div>
  );
}
