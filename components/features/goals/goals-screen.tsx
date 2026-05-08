"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";

import { PageHeader } from "@/components/shared";
import type { Goal, FunctionalRole, Locale } from "@/lib/types";
import {
  getGoals,
  getGoalProposals,
  selectGoal,
  removeGoal,
  createManualGoal,
  getGoalProgress,
  type GoalProposal,
  type GoalProgress,
} from "@/lib/api/goals";
import { ADMIN_ROUTES } from "@/lib/constants/routes";

import { ActiveGoalBanner } from "./goals-screen/active-goal-banner";
import { AIProposalsSection } from "./goals-screen/ai-proposals-section";
import { CatalogSection } from "./goals-screen/catalog-section";
import { LoadingState } from "./goals-screen/loading-states";
import { ProgressDashboard } from "./goals-screen/progress-dashboard";
import { GoalsToolbar } from "./goals-screen/toolbar";
import type {
  GoalWithUser,
  PeriodFilter,
} from "./goals-screen/_shared";

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

export function GoalsScreen() {
  const t = useTranslations("screen.goals");
  const tCommon = useTranslations("common");
  const locale = useLocale() as Locale;

  // State
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<PeriodFilter>("current");
  const [scopeId, setScopeId] = useState("network");
  const [scopeOpen, setScopeOpen] = useState(false);

  // Data
  const [activeGoal, setActiveGoal] = useState<GoalWithUser | null>(null);
  const [proposals, setProposals] = useState<GoalProposal[]>([]);
  const [allGoals, setAllGoals] = useState<GoalWithUser[]>([]);
  const [goalProgress, setGoalProgress] = useState<GoalProgress | null>(null);

  // Dialog states
  const [selectDialogOpen, setSelectDialogOpen] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<GoalProposal | null>(null);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Mock role for demo (in real app, comes from context)
  const currentRole: FunctionalRole = "SUPERVISOR";
  const canManageGoals = ["SUPERVISOR", "REGIONAL", "NETWORK_OPS"].includes(currentRole);

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch all goals
      const goalsRes = await getGoals({
        store_id: scopeId !== "network" ? parseInt(scopeId) : undefined,
      });
      setAllGoals(goalsRes.data);

      // Find active goal
      const active = goalsRes.data.find((g) => g.status === "ACTIVE") ?? null;
      setActiveGoal(active);

      // Fetch progress for active goal
      if (active) {
        const progressRes = await getGoalProgress(active.id);
        setGoalProgress(progressRes.data);
      } else {
        setGoalProgress(null);
      }

      setLoading(false);

      // Fetch AI proposals (with 1.5s delay built in)
      setAiLoading(true);
      const proposalsRes = await getGoalProposals({
        store_id: scopeId !== "network" ? parseInt(scopeId) : undefined,
      });
      setProposals(proposalsRes.data);
      setAiLoading(false);
    } catch {
      setError(t("toasts.error"));
      setLoading(false);
      setAiLoading(false);
    }
  }, [scopeId, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handlers
  async function handleSelectGoal(proposal: GoalProposal) {
    try {
      await selectGoal(proposal.id);
      toast.success(t("toasts.selected"));
      setSelectDialogOpen(false);
      setSelectedProposal(null);
      fetchData();
    } catch {
      toast.error(t("toasts.error"));
    }
  }

  async function handleRemoveGoal(reason: string) {
    if (!activeGoal) return;
    try {
      await removeGoal(activeGoal.id, reason);
      toast.success(t("toasts.removed"));
      setRemoveDialogOpen(false);
      fetchData();
    } catch {
      toast.error(t("toasts.error"));
    }
  }

  async function handleCreateGoal(data: Partial<Goal>) {
    try {
      await createManualGoal(data);
      toast.success(t("toasts.created"));
      setCreateDialogOpen(false);
      fetchData();
    } catch {
      toast.error(t("toasts.error"));
    }
  }

  // Breadcrumbs
  const breadcrumbs = [
    { label: t("breadcrumbs.home"), href: ADMIN_ROUTES.dashboard },
    { label: t("breadcrumbs.goals") },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={t("page_title")}
          subtitle={t("page_subtitle")}
          breadcrumbs={breadcrumbs}
        />
        <LoadingState />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={t("page_title")}
          subtitle={t("page_subtitle")}
          breadcrumbs={breadcrumbs}
        />
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={fetchData}>
              {tCommon("retry")}
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <PageHeader
          title={t("page_title")}
          subtitle={t("page_subtitle")}
          breadcrumbs={breadcrumbs}
        />

        {/* Toolbar */}
        <GoalsToolbar
          period={period}
          setPeriod={setPeriod}
          scopeId={scopeId}
          setScopeId={setScopeId}
          scopeOpen={scopeOpen}
          setScopeOpen={setScopeOpen}
          allGoals={allGoals}
          locale={locale}
          t={t}
        />

        {/* Section 1: Active Goal Banner */}
        <ActiveGoalBanner
          activeGoal={activeGoal}
          goalProgress={goalProgress}
          canManageGoals={canManageGoals}
          removeDialogOpen={removeDialogOpen}
          setRemoveDialogOpen={setRemoveDialogOpen}
          onRemove={handleRemoveGoal}
          locale={locale}
          t={t}
          tCommon={tCommon}
        />

        {/* Section 2: AI Proposals */}
        <AIProposalsSection
          proposals={proposals}
          aiLoading={aiLoading}
          hasActiveGoal={!!activeGoal}
          canManageGoals={canManageGoals}
          selectDialogOpen={selectDialogOpen}
          setSelectDialogOpen={setSelectDialogOpen}
          selectedProposal={selectedProposal}
          setSelectedProposal={setSelectedProposal}
          onSelect={handleSelectGoal}
          t={t}
          tCommon={tCommon}
        />

        {/* Section 3: Progress Dashboard (only if active goal) */}
        {activeGoal && goalProgress && (
          <ProgressDashboard
            activeGoal={activeGoal}
            goalProgress={goalProgress}
            locale={locale}
            t={t}
          />
        )}

        {/* Section 4: Goal Catalog */}
        <CatalogSection
          canManageGoals={canManageGoals}
          createDialogOpen={createDialogOpen}
          setCreateDialogOpen={setCreateDialogOpen}
          onCreate={handleCreateGoal}
          t={t}
          tCommon={tCommon}
        />
      </div>
    </TooltipProvider>
  );
}
