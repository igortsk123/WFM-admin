"use client";

import { useState, useCallback, useMemo } from "react";
import useSWR from "swr";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { AlertTriangle, Lock, CalendarDays, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/lib/contexts/auth-context";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ADMIN_ROUTES } from "@/lib/constants/routes";
import {
  getPlanFactReport,
  exportReport,
  type ReportPeriod,
  type PlanFactReportData,
} from "@/lib/api/reports";
import { getStores } from "@/lib/api/stores";

import { ALLOWED_ROLES, calcDeltaPct } from "./plan-fact-report/_shared";
import { PlanFactSkeleton } from "./plan-fact-report/plan-fact-skeleton";
import { PeriodBanner } from "./plan-fact-report/period-banner";
import { AiBanner } from "./plan-fact-report/ai-banner";
import { PlanFactToolbar } from "./plan-fact-report/toolbar";
import { SummaryCards } from "./plan-fact-report/summary-cards";
import { DaysTab } from "./plan-fact-report/tab-days";
import { StoresTab } from "./plan-fact-report/tab-stores";
import { UsersTab } from "./plan-fact-report/tab-users";
import { WorkTypesTab } from "./plan-fact-report/tab-work-types";

export function PlanFactReport() {
  const t = useTranslations("screen.reportsPlanFact");
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
  const [activeTab, setActiveTab] = useState("stores");

  // ── UI state ──────────────────────────────────────────────────
  const [showAiBanner, setShowAiBanner] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // ── Forbidden check ───────────────────────────────────────────
  const isForbidden = !ALLOWED_ROLES.includes(user.role);

  // ── SWR data ──────────────────────────────────────────────────
  const reportKey = `plan-fact-${period}-${storeId}-${customFrom?.toISOString() ?? ""}-${customTo?.toISOString() ?? ""}`;
  const {
    data: reportData,
    error,
    isLoading,
    mutate,
  } = useSWR<PlanFactReportData>(
    isForbidden ? null : reportKey,
    () =>
      getPlanFactReport({
        period,
        store_id: storeId ? Number(storeId) : undefined,
        from: customFrom?.toISOString(),
        to: customTo?.toISOString(),
      }).then((r) => r.data),
    { revalidateOnFocus: false }
  );

  const { data: storesData } = useSWR(
    "stores-for-plan-fact",
    () => getStores({ archived: false }).then((r) => r.data),
    { revalidateOnFocus: false }
  );

  const storeOptions = [
    { value: "", label: t("toolbar.all_stores") },
    ...(storesData ?? []).map((s) => ({ value: String(s.id), label: s.name })),
  ];

  // ── Export ────────────────────────────────────────────────────
  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      const blob = await exportReport("plan-fact", "xlsx");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `plan-fact-${new Date().toISOString().slice(0, 10)}.xlsx`;
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
    : "";

  // ── Summary computations ──────────────────────────────────────
  const summaryCards = useMemo(() => {
    if (!reportData) return null;
    const totalPlanned = reportData.days.reduce((s, d) => s + d.planned_hours, 0);
    const totalActual = reportData.days.reduce((s, d) => s + d.actual_hours, 0);
    const deltaHours = totalActual - totalPlanned;
    const deltaPct = calcDeltaPct(totalPlanned, totalActual);
    const avgDailyDelta = Math.round((deltaHours / reportData.days.length) * 10) / 10;
    const worstDay = reportData.worst_day;
    return { totalPlanned, totalActual, deltaHours, deltaPct, avgDailyDelta, worstDay };
  }, [reportData]);

  // ─────────────────────────────────────────────────────────────
  // FORBIDDEN
  // ─────────────────────────────────────────────────────────────
  if (isForbidden) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-muted">
          <Lock className="size-8 text-muted-foreground" strokeWidth={1.5} />
        </span>
        <h2 className="text-xl font-semibold">{t("forbidden_title")}</h2>
        <p className="text-sm text-muted-foreground">{t("forbidden_desc")}</p>
        <Button variant="outline" onClick={() => router.back()}>
          {t("breadcrumbs.home")}
        </Button>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // TOOLBAR
  // ─────────────────────────────────────────────────────────────
  const isStoreLocked = user.role === "STORE_DIRECTOR";

  const toolbar = (
    <PlanFactToolbar
      t={t}
      period={period}
      setPeriod={setPeriod}
      storeId={storeId}
      setStoreId={setStoreId}
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

  // ─────────────────────────────────────────────────────────────
  // LOADING
  // ─────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6">
        {toolbar}
        <PlanFactSkeleton />
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // ERROR
  // ─────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="space-y-6">
        {toolbar}
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>{t("error_title")}</AlertTitle>
          <AlertDescription className="flex items-center gap-3 mt-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => mutate()}
            >
              <RefreshCw className="size-3.5" />
              Повторить
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // EMPTY
  // ─────────────────────────────────────────────────────────────
  if (!reportData || reportData.days.length === 0) {
    return (
      <div className="space-y-6">
        {toolbar}
        <EmptyState
          icon={CalendarDays}
          title={t("empty.no_data_title")}
          description={t("empty.no_data_subtitle")}
          className="min-h-[40vh]"
        />
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // POPULATED
  // ─────────────────────────────────────────────────────────────
  const cards = summaryCards!;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <PageHeader
        title={t("page_title")}
        subtitle={t("page_subtitle")}
        breadcrumbs={[
          { label: t("breadcrumbs.reports"), href: ADMIN_ROUTES.reportsKpi },
          { label: t("breadcrumbs.plan_fact") },
        ]}
      />

      {/* Toolbar */}
      {toolbar}

      {/* Period banner */}
      <PeriodBanner t={t} storeLabel={scopeLabel} />

      {/* AI insight banner */}
      {showAiBanner && (
        <AiBanner
          t={t}
          storeId={storeId}
          onClose={() => setShowAiBanner(false)}
        />
      )}

      {/* Summary cards */}
      <SummaryCards t={t} reportData={reportData} cards={cards} />

      {/* Breakdown tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto">
          <TabsList className="h-9 mb-6">
            <TabsTrigger value="days">{t("breakdown.days")}</TabsTrigger>
            <TabsTrigger value="stores">{t("breakdown.stores")}</TabsTrigger>
            <TabsTrigger value="users">{t("breakdown.users")}</TabsTrigger>
            <TabsTrigger value="work_types">{t("breakdown.work_types")}</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="days" className="mt-0">
          <DaysTab data={reportData} t={t} />
        </TabsContent>

        <TabsContent value="stores" className="mt-0">
          <StoresTab data={reportData} t={t} />
        </TabsContent>

        <TabsContent value="users" className="mt-0">
          <UsersTab data={reportData} t={t} storeOptions={storeOptions} />
        </TabsContent>

        <TabsContent value="work_types" className="mt-0">
          <WorkTypesTab data={reportData} t={t} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
