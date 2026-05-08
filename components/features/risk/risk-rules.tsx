"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { Clock, Filter, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import { PageHeader } from "@/components/shared/page-header";

import {
  getRiskRules,
  getRiskMetrics,
  deleteRiskRule,
  createRiskRule,
  type RiskRuleConfig,
  type RiskMetrics,
} from "@/lib/api/risk";

import { StatCard } from "./risk-rules/stat-card";
import { RuleEditorDrawer } from "./risk-rules/rule-editor-drawer";
import { RulesTab } from "./risk-rules/tab-rules";
import { SimulationTab } from "./risk-rules/tab-simulation";
import { HistoryTab } from "./risk-rules/tab-history";

const MetricsTab = dynamic(
  () => import("./risk-rules/tab-metrics").then((m) => m.MetricsTab),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[420px] w-full" />,
  }
);

export function RiskRules() {
  const t = useTranslations("screen.riskRules");

  // Data state
  const [rules, setRules] = useState<RiskRuleConfig[]>([]);
  const [metrics, setMetrics] = useState<RiskMetrics | null>(null);
  const [loadingRules, setLoadingRules] = useState(true);
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [error, setError] = useState(false);

  // Drawer state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<RiskRuleConfig | null>(null);

  // Load data
  useEffect(() => {
    getRiskRules()
      .then((res) => {
        setRules(res.data);
        setLoadingRules(false);
      })
      .catch(() => {
        setError(true);
        setLoadingRules(false);
      });

    getRiskMetrics()
      .then((res) => {
        setMetrics(res.data);
        setLoadingMetrics(false);
      })
      .catch(() => {
        setLoadingMetrics(false);
      });
  }, []);

  const handleEdit = useCallback((rule: RiskRuleConfig) => {
    setEditingRule(rule);
    setEditorOpen(true);
  }, []);

  const handleDuplicate = useCallback(
    async (rule: RiskRuleConfig) => {
      const newRule = {
        ...rule,
        id: `rule-dup-${Date.now()}`,
        work_type_name: `${rule.work_type_name} (копия)`,
      };
      const { id, ...rest } = newRule;
      await createRiskRule(rest);
      toast.success(t("toasts.rule_created"));
      setRules((prev) => [...prev, newRule]);
    },
    [t]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteRiskRule(id);
      toast.success(t("toasts.rule_deleted"));
      setRules((prev) => prev.filter((r) => r.id !== id));
    },
    [t]
  );

  const handleSaved = useCallback((updated: RiskRuleConfig) => {
    setRules((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  }, []);

  const handleCreateNew = useCallback(() => {
    if (rules.length === 0) return;
    // Open editor with a clone of the first rule as template
    const template: RiskRuleConfig = {
      ...rules[0],
      id: `rule-new-${Date.now()}`,
      work_type_name: "Новый тип",
      mode: "FULL_REVIEW",
      sample_rate: undefined,
      photo_required: false,
      triggers_config: [
        { key: "NEW_PERFORMER", enabled: false, threshold: 5 },
        { key: "STORE_HIGH_DEFECT", enabled: false, threshold: 10 },
        { key: "PERFORMER_RECENT_REJECTS", enabled: false, threshold: 3 },
        { key: "TASK_ADDITIONAL", enabled: false },
      ],
    };
    setEditingRule(template);
    setEditorOpen(true);
  }, [rules]);

  // Stats derived from metrics
  const reviewTimeDiff = metrics
    ? Math.round(
        ((metrics.prev_avg_review_minutes - metrics.avg_review_minutes) /
          metrics.prev_avg_review_minutes) *
          100
      )
    : 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <PageHeader
        breadcrumbs={[
          { label: t("breadcrumbs.home"), href: "/" },
          { label: t("breadcrumbs.future") },
          { label: t("breadcrumbs.risk") },
        ]}
        title={t("page_title")}
        subtitle={t("page_subtitle")}
        actions={
          <Badge
            variant="outline"
            className="bg-purple-500/10 text-purple-600 border-purple-500/30 text-xs font-semibold"
          >
            {t("beta_badge")}
          </Badge>
        }
      />

      {/* Error state */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>{t("toasts.error")}</AlertTitle>
          <AlertDescription>
            <Button
              variant="link"
              size="sm"
              className="p-0 h-auto"
              onClick={() => {
                setError(false);
                setLoadingRules(true);
                getRiskRules()
                  .then((res) => {
                    setRules(res.data);
                    setLoadingRules(false);
                  })
                  .catch(() => {
                    setError(true);
                    setLoadingRules(false);
                  });
              }}
            >
              Повторить
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Stats cards */}
      {loadingMetrics ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : metrics ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard
            icon={Clock}
            title={t("stats.avg_review_title")}
            hero={t("stats.avg_review_value", { minutes: metrics.avg_review_minutes })}
            sub={t("stats.avg_review_prev", { minutes: metrics.prev_avg_review_minutes })}
            diff={t("stats.avg_review_diff", { percent: reviewTimeDiff })}
          />
          <StatCard
            icon={Filter}
            title={t("stats.reviewed_share_title")}
            hero={t("stats.reviewed_share_value", { percent: metrics.reviewed_share_pct })}
            sub={t("stats.reviewed_share_prev", { percent: metrics.prev_reviewed_share_pct })}
            hint={t("stats.reviewed_share_saved", { hours: metrics.hours_saved_per_month.toLocaleString("ru-RU") })}
          />
          <StatCard
            icon={AlertTriangle}
            title={t("stats.defect_rate_title")}
            hero={t("stats.defect_rate_value", { percent: metrics.defect_rate_pct })}
            hint={t("stats.defect_rate_hint")}
          />
        </div>
      ) : null}

      {/* Main tabs */}
      <Tabs defaultValue="rules">
        <TabsList className="w-full sm:w-auto overflow-x-auto">
          <TabsTrigger value="rules">{t("tabs.rules")}</TabsTrigger>
          <TabsTrigger value="simulation">{t("tabs.simulation")}</TabsTrigger>
          <TabsTrigger value="history">{t("tabs.history")}</TabsTrigger>
          <TabsTrigger value="metrics">{t("tabs.metrics")}</TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="mt-4">
          <RulesTab
            rules={rules}
            loading={loadingRules}
            onEdit={handleEdit}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
            onCreateNew={handleCreateNew}
          />
        </TabsContent>

        <TabsContent value="simulation" className="mt-4">
          <SimulationTab />
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <HistoryTab />
        </TabsContent>

        <TabsContent value="metrics" className="mt-4">
          <MetricsTab metrics={metrics} loading={loadingMetrics} />
        </TabsContent>
      </Tabs>

      {/* Rule editor drawer */}
      <RuleEditorDrawer
        rule={editingRule}
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        onSaved={handleSaved}
      />
    </div>
  );
}
