"use client";

import { useState, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import useSWR from "swr";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { Lock, AlertCircle, RefreshCw, BarChart2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/lib/contexts/auth-context";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ADMIN_ROUTES } from "@/lib/constants/routes";
import {
  getStoreCompareReport,
  exportReport,
  type ReportPeriod,
  type StoreCompareReportData,
} from "@/lib/api/reports";

import { extractCity, type ViewMode } from "./store-compare-report/_shared";
import { AiBanner } from "./store-compare-report/ai-banner";
import { Toolbar } from "./store-compare-report/toolbar";
import {
  TableSkeleton,
  HeatmapSkeleton,
  ScatterSkeleton,
} from "./store-compare-report/skeletons";
import { TableView } from "./store-compare-report/table-view";

const HeatmapChart = dynamic(
  () =>
    import("./store-compare-report/charts/heatmap-chart").then(
      (m) => m.HeatmapChart
    ),
  { ssr: false, loading: () => <HeatmapSkeleton /> }
);
const ScatterChartView = dynamic(
  () =>
    import("./store-compare-report/charts/scatter-chart").then(
      (m) => m.ScatterChartView
    ),
  { ssr: false, loading: () => <ScatterSkeleton /> }
);

export function StoreCompareReport() {
  const t = useTranslations("screen.reportsCompare");
  const tCommon = useTranslations("common");
  const { user } = useAuth();
  const router = useRouter();

  // ── Toolbar state ─────────────────────────────────────────────
  const [period, setPeriod] = useState<ReportPeriod>("month");
  const [view, setView] = useState<ViewMode>("table");
  const [cityFilter, setCityFilter] = useState<string>("");
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();

  // ── UI state ──────────────────────────────────────────────────
  const [showAiBanner, setShowAiBanner] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // ── Forbidden check ───────────────────────────────────────────
  const ALLOWED_ROLES = ["NETWORK_OPS", "REGIONAL"];
  const isForbidden = !ALLOWED_ROLES.includes(user.role);

  // ── SWR ───────────────────────────────────────────────────────
  const cacheKey = `compare-report-${period}-${customFrom?.toISOString() ?? ""}-${customTo?.toISOString() ?? ""}`;
  const {
    data: report,
    error,
    isLoading,
    mutate,
  } = useSWR<StoreCompareReportData>(
    isForbidden ? null : cacheKey,
    () =>
      getStoreCompareReport({
        period,
        from: customFrom?.toISOString(),
        to: customTo?.toISOString(),
      }).then((r) => r.data),
    { revalidateOnFocus: false },
  );

  // ── City options ──────────────────────────────────────────────
  const cityOptions = useMemo(() => {
    if (!report) return [{ value: "", label: t("toolbar.all_cities") }];
    const cities = [...new Set(report.stores.map((s) => extractCity(s.store_name)))];
    return [
      { value: "", label: t("toolbar.all_cities") },
      ...cities.map((c) => ({ value: c, label: c })),
    ];
  }, [report, t]);

  // ── Filtered stores ───────────────────────────────────────────
  const filteredStores = useMemo(() => {
    if (!report) return [];
    if (!cityFilter) return report.stores;
    return report.stores.filter((s) => extractCity(s.store_name) === cityFilter);
  }, [report, cityFilter]);

  // ── Export ────────────────────────────────────────────────────
  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      const blob = await exportReport("compare", "csv");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `store-compare-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(t("toasts.exported_csv"));
    } catch {
      toast.error(t("toasts.export_failed"));
    } finally {
      setIsExporting(false);
    }
  }, [t]);

  // ── Period banner text ─────────────────────────────────────────
  const periodBannerText = useMemo(() => {
    if (!report) return "";
    const from = new Date(report.period_start).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const to = new Date(report.period_end).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    return `${filteredStores.length} магазин${filteredStores.length === 1 ? "" : filteredStores.length < 5 ? "а" : "ов"} · ${from} – ${to}`;
  }, [report, filteredStores.length]);

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
        <p className="text-sm text-muted-foreground max-w-xs">{t("forbidden_desc")}</p>
        <Button variant="outline" onClick={() => router.back()}>
          {tCommon("back")}
        </Button>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Page header */}
      <PageHeader
        title={t("page_title")}
        subtitle={t("page_subtitle")}
        breadcrumbs={[
          { label: t("breadcrumbs.reports"), href: ADMIN_ROUTES.reportsKpi },
          { label: t("breadcrumbs.compare") },
        ]}
      />

      {/* Sticky toolbar */}
      <Toolbar
        t={t}
        period={period}
        onPeriodChange={setPeriod}
        view={view}
        onViewChange={setView}
        cityFilter={cityFilter}
        onCityFilterChange={setCityFilter}
        cityOptions={cityOptions}
        customFrom={customFrom}
        customTo={customTo}
        onCustomRangeChange={(from, to) => {
          setCustomFrom(from);
          setCustomTo(to);
        }}
        isExporting={isExporting}
        isLoading={isLoading}
        onExport={handleExport}
      />

      {/* Period banner */}
      {!isLoading && report && (
        <div className="rounded-lg border border-border bg-muted/40 px-4 py-2.5 text-sm text-muted-foreground">
          {periodBannerText}
        </div>
      )}
      {isLoading && <Skeleton className="h-10 w-full rounded-lg" />}

      {/* AI Insight banner */}
      {showAiBanner && !isLoading && report && (
        <AiBanner t={t} onClose={() => setShowAiBanner(false)} />
      )}
      {isLoading && <Skeleton className="h-20 w-full rounded-lg" />}

      {/* Error state */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>{t("error_title")}</span>
            <Button variant="outline" size="sm" onClick={() => mutate()} className="gap-1.5">
              <RefreshCw className="size-3.5" />
              {t("retry")}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Loading skeleton per view */}
      {isLoading && (
        <div>
          {view === "table" && <TableSkeleton />}
          {view === "heatmap" && <HeatmapSkeleton />}
          {view === "scatter" && <ScatterSkeleton />}
        </div>
      )}

      {/* Empty: too few stores */}
      {!isLoading && !error && filteredStores.length < 2 && (
        <EmptyState
          icon={BarChart2}
          title={t("empty.too_few_stores_title")}
          description={t("empty.too_few_stores_subtitle")}
        />
      )}

      {/* Content */}
      {!isLoading && !error && filteredStores.length >= 2 && (
        <>
          {view === "table" && <TableView stores={filteredStores} t={t} />}
          {view === "heatmap" && <HeatmapChart stores={filteredStores} t={t} />}
          {view === "scatter" && (
            <ScatterChartView
              stores={filteredStores}
              medians={report!.network_medians}
              t={t}
            />
          )}
        </>
      )}
    </div>
  );
}
