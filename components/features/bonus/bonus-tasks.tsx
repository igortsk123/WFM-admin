"use client";

import { useState, useCallback, useEffect, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { PageHeader } from "@/components/shared/page-header";

import { useAuth } from "@/lib/contexts/auth-context";
import { ADMIN_ROUTES } from "@/lib/constants/routes";
import type { BonusBudget } from "@/lib/types";
import type { BonusTaskWithSource, ReplacedByBonusKpi } from "@/lib/api/bonus";

import {
  getBonusBudgets,
  getBonusTasks,
  getBonusProposals,
  getBonusMetrics,
  getReplacedByBonusKpi,
} from "@/lib/api/bonus";
import { MOCK_GOALS } from "@/lib/mock-data/future-placeholders";

import { ActiveGoalCard } from "./bonus-tasks/active-goal-card";
import { BudgetPoolsSection } from "./bonus-tasks/budget-pools-section";
import { CreateBonusTaskDialog } from "./bonus-tasks/create-bonus-dialog";
import { EmployeePreviewSection } from "./bonus-tasks/employee-preview-section";
import { KpiRow } from "./bonus-tasks/kpi-row";
import { PeriodFilterChips } from "./bonus-tasks/period-filter";
import { SettingsMenu } from "./bonus-tasks/settings-menu";
import { TabActive } from "./bonus-tasks/tab-active";
import { TabAIProposals } from "./bonus-tasks/tab-ai-proposals";
import { TabCompleted } from "./bonus-tasks/tab-completed";
import { TabMetrics } from "./bonus-tasks/tab-metrics";
import type {
  BonusMetrics,
  PeriodFilter,
  VisibilityMode,
} from "./bonus-tasks/_shared";

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT: BonusTasks
// ═══════════════════════════════════════════════════════════════════

export function BonusTasks() {
  const t = useTranslations("screen.bonusTasks");
  const { user } = useAuth();

  const locale = user.preferred_locale ?? "ru";
  const isDirector = user.role === "STORE_DIRECTOR";
  const canCreate = ["SUPERVISOR", "REGIONAL", "NETWORK_OPS"].includes(user.role);
  const storeId = user.stores?.[0]?.id;

  // useTransition — таб/period фильтры как non-urgent (тяжёлый рендер вкладок).
  const [, startTransition] = useTransition();

  // ── State ────────────────────────────────────────────────────────
  const [period, setPeriod] = useState<PeriodFilter>("today");
  const [tab, setTab] = useState("active");
  const [visibilityMode, setVisibilityMode] = useState<VisibilityMode>("SUMMARY_ONLY");

  // Data states
  const [budgets, setBudgets] = useState<BonusBudget[]>([]);
  const [activeTasks, setActiveTasks] = useState<BonusTaskWithSource[]>([]);
  const [proposals, setProposals] = useState<BonusTaskWithSource[]>([]);
  const [completedTasks, setCompletedTasks] = useState<BonusTaskWithSource[]>([]);
  const [metrics, setMetrics] = useState<BonusMetrics | null>(null);
  const [replacedKpi, setReplacedKpi] = useState<ReplacedByBonusKpi | null>(null);
  const [activeGoal] = useState(MOCK_GOALS.find((g) => g.status === "ACTIVE") ?? null);

  // Loading states
  const [loadingBudgets, setLoadingBudgets] = useState(true);
  const [loadingActive, setLoadingActive] = useState(true);
  const [loadingProposals, setLoadingProposals] = useState(true);
  const [loadingCompleted, setLoadingCompleted] = useState(false);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [loadingKpi, setLoadingKpi] = useState(true);

  // Error states
  const [errorActive, setErrorActive] = useState(false);
  const [errorProposals, setErrorProposals] = useState(false);

  // ── Load data ────────────────────────────────────────────────────
  const loadBudgets = useCallback(async () => {
    setLoadingBudgets(true);
    try {
      const res = await getBonusBudgets({ store_id: storeId });
      setBudgets(res.data);
    } finally {
      setLoadingBudgets(false);
    }
  }, [storeId]);

  const loadActive = useCallback(async () => {
    setLoadingActive(true);
    setErrorActive(false);
    try {
      const res = await getBonusTasks({ store_id: storeId, page_size: 20 });
      setActiveTasks(res.data);
    } catch {
      setErrorActive(true);
    } finally {
      setLoadingActive(false);
    }
  }, [storeId]);

  const loadProposals = useCallback(async () => {
    setLoadingProposals(true);
    setErrorProposals(false);
    try {
      const res = await getBonusProposals(activeGoal?.id);
      setProposals(res.data);
    } catch {
      setErrorProposals(true);
    } finally {
      setLoadingProposals(false);
    }
  }, [activeGoal?.id]);

  const loadCompleted = useCallback(async () => {
    if (completedTasks.length > 0) return;
    setLoadingCompleted(true);
    try {
      const res = await getBonusTasks({
        store_id: storeId,
        status: "COMPLETED",
        page_size: 20,
      });
      setCompletedTasks(res.data);
    } finally {
      setLoadingCompleted(false);
    }
  }, [storeId, completedTasks.length]);

  const loadMetrics = useCallback(async () => {
    if (metrics) return;
    setLoadingMetrics(true);
    try {
      const res = await getBonusMetrics({ store_id: storeId });
      setMetrics(res.data);
    } finally {
      setLoadingMetrics(false);
    }
  }, [storeId, metrics]);

  const loadKpi = useCallback(async () => {
    setLoadingKpi(true);
    try {
      const res = await getReplacedByBonusKpi({ store_id: storeId });
      setReplacedKpi(res.data);
    } finally {
      setLoadingKpi(false);
    }
  }, [storeId]);

  useEffect(() => {
    loadBudgets();
    loadActive();
    loadProposals();
    loadKpi();
  }, [loadBudgets, loadActive, loadProposals, loadKpi]);

  useEffect(() => {
    if (tab === "completed") loadCompleted();
    if (tab === "metrics") loadMetrics();
  }, [tab, loadCompleted, loadMetrics]);

  // ── Handlers ─────────────────────────────────────────────────────
  const handleRemoveTask = useCallback((id: string) => {
    setActiveTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handlePublishProposal = useCallback(
    (id: string) => {
      const task = proposals.find((t) => t.id === id);
      if (task) {
        setActiveTasks((prev) => [task, ...prev]);
        setProposals((prev) => prev.filter((t) => t.id !== id));
        toast.success(t("toasts.proposal_published"));
      }
    },
    [proposals, t],
  );

  const handleRejectProposal = useCallback(
    (id: string) => {
      setProposals((prev) => prev.filter((t) => t.id !== id));
      toast.success(t("toasts.proposal_rejected"));
    },
    [t],
  );

  // ── Breadcrumbs ──────────────────────────────────────────────────
  const breadcrumbs = [
    { label: t("breadcrumbs.home"), href: ADMIN_ROUTES.dashboard },
    { label: t("breadcrumbs.goals_bonus"), href: ADMIN_ROUTES.goals },
    { label: t("breadcrumbs.bonus_tasks") },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <PageHeader
        title={t("page_title")}
        subtitle={isDirector ? t("page_subtitle_director") : t("page_subtitle")}
        breadcrumbs={breadcrumbs}
        actions={
          <div className="flex items-center gap-2">
            {canCreate && (
              <CreateBonusTaskDialog storeId={storeId} onCreated={loadActive} />
            )}
            <SettingsMenu
              visibilityMode={visibilityMode}
              onVisibilityChange={setVisibilityMode}
            />
          </div>
        }
      />

      {/* Period filter chips */}
      <PeriodFilterChips
        period={period}
        onChange={(v) => startTransition(() => setPeriod(v))}
      />

      {/* KPI Row */}
      <KpiRow
        activeTasksCount={activeTasks.length}
        loadingActive={loadingActive}
        proposalsCount={proposals.length}
        loadingProposals={loadingProposals}
        replacedKpi={replacedKpi}
        loadingKpi={loadingKpi}
        budgets={budgets}
        locale={locale}
      />

      {/* Budget pools */}
      <BudgetPoolsSection
        budgets={budgets}
        loading={loadingBudgets}
        user={user}
        locale={locale}
      />

      {/* Active goal card */}
      {activeGoal && (
        <ActiveGoalCard goal={activeGoal} proposalsCount={proposals.length} />
      )}

      {/* Main tabs */}
      <Tabs
        value={tab}
        onValueChange={(v) => startTransition(() => setTab(v))}
      >
        <TabsList className="h-9">
          <TabsTrigger value="active" className="text-xs">
            {t("tabs.active")}
            {activeTasks.length > 0 && (
              <span className="ml-1.5 rounded-full bg-primary/15 text-primary px-1.5 py-0.5 text-xs font-semibold">
                {activeTasks.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="ai_proposals" className="text-xs">
            {t("tabs.ai_proposals")}
            {proposals.length > 0 && (
              <span className="ml-1.5 rounded-full bg-primary/15 text-primary px-1.5 py-0.5 text-xs font-semibold">
                {proposals.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed" className="text-xs">
            {t("tabs.completed")}
          </TabsTrigger>
          <TabsTrigger value="metrics" className="text-xs">
            {t("tabs.metrics")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4">
          <TabActive
            tasks={activeTasks}
            loading={loadingActive}
            error={errorActive}
            canCreate={canCreate}
            onRetry={loadActive}
            onRemove={handleRemoveTask}
          />
        </TabsContent>

        <TabsContent value="ai_proposals" className="mt-4">
          <TabAIProposals
            proposals={proposals}
            loading={loadingProposals}
            error={errorProposals}
            canCreate={canCreate}
            activeGoal={activeGoal}
            onRetry={loadProposals}
            onPublish={handlePublishProposal}
            onReject={handleRejectProposal}
          />
        </TabsContent>

        <TabsContent value="completed" className="mt-4">
          <TabCompleted tasks={completedTasks} loading={loadingCompleted} />
        </TabsContent>

        <TabsContent value="metrics" className="mt-4">
          <TabMetrics metrics={metrics} loading={loadingMetrics} />
        </TabsContent>
      </Tabs>

      {/* Employee mobile preview section */}
      <EmployeePreviewSection storeId={storeId} locale={locale} />
    </div>
  );
}
