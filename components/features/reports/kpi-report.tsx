"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { Lock, AlertCircle, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/lib/contexts/auth-context";
import { PageHeader } from "@/components/shared/page-header";
import {
  getKpiReport,
  exportReport,
  type ReportPeriod,
  type KpiReportData,
} from "@/lib/api/reports";
import { getStores } from "@/lib/api/stores";

import { KpiSkeleton } from "./kpi-report/kpi-skeleton";
import { PeriodBanner } from "./kpi-report/period-banner";
import { AiBanner } from "./kpi-report/ai-banner";
import { KpiToolbar } from "./kpi-report/toolbar";
import { SummaryCards } from "./kpi-report/summary-cards";
import { CompletionTrendChart } from "./kpi-report/charts/completion-trend-chart";
import { HoursTrendChart } from "./kpi-report/charts/hours-trend-chart";
import { WorkTypeBarChart } from "./kpi-report/charts/work-type-bar-chart";
import { ZonePieChart } from "./kpi-report/charts/zone-pie-chart";
import { LeaderboardsSection } from "./kpi-report/leaderboards-section";
import { ALLOWED_ROLES, buildTrendData } from "./kpi-report/_shared";

export function KpiReport() {
  const t = useTranslations("screen.reportsKpi");
  const { user } = useAuth();
  const router = useRouter();

  // ── Toolbar state ─────────────────────────────────────────────
  const [period, setPeriod] = useState<ReportPeriod>("month");
  const [storeId, setStoreId] = useState<string>(
    user.role === "STORE_DIRECTOR" && user.stores[0]
      ? String(user.stores[0].id)
      : ""
  );
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();
  const [fromPickerOpen, setFromPickerOpen] = useState(false);
  const [toPickerOpen, setToPickerOpen] = useState(false);

  // ── UI state ──────────────────────────────────────────────────
  const [showAiBanner, setShowAiBanner] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // ── Forbidden check ───────────────────────────────────────────
  const isForbidden = !ALLOWED_ROLES.includes(user.role);

  // ── SWR: KPI report data ──────────────────────────────────────
  const kpiKey = `kpi-report-${period}-${storeId}-${customFrom?.toISOString() ?? ""}-${customTo?.toISOString() ?? ""}`;
  const {
    data: kpiData,
    error: kpiError,
    isLoading: kpiLoading,
    mutate: kpiMutate,
  } = useSWR<KpiReportData>(
    isForbidden ? null : kpiKey,
    () =>
      getKpiReport({
        period,
        store_id: storeId ? Number(storeId) : undefined,
        from: customFrom?.toISOString(),
        to: customTo?.toISOString(),
      }).then((r) => r.data),
    { revalidateOnFocus: false }
  );

  // ── SWR: Stores list for combobox ─────────────────────────────
  const { data: storesData } = useSWR(
    "stores-for-kpi",
    () => getStores({ archived: false }).then((r) => r.data),
    { revalidateOnFocus: false }
  );

  const storeOptions = [
    { value: "", label: t("toolbar.all_stores") },
    ...(storesData ?? []).map((s) => ({
      value: String(s.id),
      label: s.name,
    })),
  ];

  // ── Toolbar actions ───────────────────────────────────────────
  const handlePeriodChange = useCallback((newPeriod: ReportPeriod) => {
    setPeriod(newPeriod);
  }, []);

  const handleStoreChange = useCallback((newStoreId: string) => {
    setStoreId(newStoreId);
  }, []);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      const blob = await exportReport("kpi", "xlsx");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `kpi-report-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(t("toasts.exported_xlsx"));
    } catch {
      toast.error(t("toasts.export_failed"));
    } finally {
      setIsExporting(false);
    }
  }, [t]);

  // ── Scope label ───────────────────────────────────────────────
  const scopeLabel = storeId
    ? (storesData?.find((s) => s.id === Number(storeId))?.name ?? "")
    : t("scope_network");

  // ═════════════════════════════════════════════════════════════
  // FORBIDDEN
  // ═════════════════════════════════════════════════════════════
  if (isForbidden) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-muted">
          <Lock className="size-8 text-muted-foreground" strokeWidth={1.5} />
        </span>
        <h2 className="text-xl font-semibold">{t("forbidden_title")}</h2>
        <p className="text-sm text-muted-foreground">{t("forbidden_desc")}</p>
        <Button variant="outline" onClick={() => router.back()}>
          Назад
        </Button>
      </div>
    );
  }

  const isStoreLocked = user.role === "STORE_DIRECTOR";

  const toolbar = (
    <KpiToolbar
      t={t}
      period={period}
      onPeriodChange={handlePeriodChange}
      storeId={storeId}
      onStoreChange={handleStoreChange}
      storeOptions={storeOptions}
      customFrom={customFrom}
      setCustomFrom={setCustomFrom}
      customTo={customTo}
      setCustomTo={setCustomTo}
      fromPickerOpen={fromPickerOpen}
      setFromPickerOpen={setFromPickerOpen}
      toPickerOpen={toPickerOpen}
      setToPickerOpen={setToPickerOpen}
      isStoreLocked={isStoreLocked}
      onExport={handleExport}
      isExporting={isExporting}
    />
  );

  // ═════════════════════════════════════════════════════════════
  // LOADING STATE
  // ═════════════════════════════════════════════════════════════
  if (kpiLoading || !kpiData) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="KPI"
          subtitle={t("page_subtitle")}
          breadcrumbs={[
            { label: t("breadcrumbs.reports") },
            { label: t("breadcrumbs.kpi") },
          ]}
        />
        {toolbar}
        <KpiSkeleton />
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════
  // ERROR STATE
  // ═════════════════════════════════════════════════════════════
  if (kpiError) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="KPI"
          subtitle={t("page_subtitle")}
          breadcrumbs={[
            { label: t("breadcrumbs.reports") },
            { label: t("breadcrumbs.kpi") },
          ]}
        />
        {toolbar}
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>{t("error_desc")}</span>
            <Button size="sm" variant="outline" onClick={() => kpiMutate()}>
              <RefreshCw className="size-3.5 mr-1.5" />
              Повторить
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════
  // METRICS EXTRACTION (for trends)
  // ═════════════════════════════════════════════════════════════
  const metrics = kpiData.metrics;
  const completionMetric = metrics.find((m) => m.key === "completion_rate");
  const onTimeMetric = metrics.find((m) => m.key === "on_time_rate");
  const hoursPlan = metrics.find((m) => m.key === "hours_plan");
  const hoursActual = metrics.find((m) => m.key === "hours_actual");

  const trendData =
    completionMetric && onTimeMetric && hoursPlan && hoursActual
      ? buildTrendData(
          completionMetric.sparkline,
          onTimeMetric.sparkline,
          hoursPlan.sparkline,
          hoursActual.sparkline
        )
      : [];

  const handleResetPeriod = () => handlePeriodChange("month");

  // ═════════════════════════════════════════════════════════════
  // POPULATED
  // ═════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6">
      {/* Page header */}
      <PageHeader
        title="KPI"
        subtitle={t("page_subtitle")}
        breadcrumbs={[
          { label: t("breadcrumbs.reports") },
          { label: t("breadcrumbs.kpi") },
        ]}
      />

      {/* Sticky toolbar */}
      {toolbar}

      {/* Period banner */}
      <PeriodBanner scope={scopeLabel} />

      {/* AI insight banner */}
      {showAiBanner && (
        <AiBanner
          storeId={storeId}
          t={t}
          onClose={() => setShowAiBanner(false)}
        />
      )}

      {/* Section 1 — 4 KPI Cards */}
      <SummaryCards t={t} metrics={metrics} />

      {/* Section 2 — Trend charts */}
      <section aria-label={t("sections.trends")}>
        <div className="grid gap-6 lg:grid-cols-2">
          <CompletionTrendChart
            t={t}
            data={trendData}
            onChangePeriod={handleResetPeriod}
          />
          <HoursTrendChart
            t={t}
            data={trendData}
            onChangePeriod={handleResetPeriod}
          />
        </div>
      </section>

      {/* Section 3 — Breakdown charts */}
      <section aria-label={t("sections.breakdown")}>
        <div className="grid gap-6 lg:grid-cols-2">
          <WorkTypeBarChart t={t} data={kpiData.by_work_type} />
          <ZonePieChart t={t} data={kpiData.by_zone} />
        </div>
      </section>

      {/* Section 4 — Leaderboards */}
      <LeaderboardsSection
        t={t}
        topPerformers={kpiData.top_performers}
        needsSupport={kpiData.needs_support}
      />
    </div>
  );
}
