"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import {
  CheckCircle2,
  RotateCcw,
  Clock,
  BarChart3,
  Download,
  GitCompareArrows,
  Sparkles,
  MessageSquare,
  X,
  Lock,
  BarChart2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Combobox } from "@/components/ui/combobox";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/contexts/auth-context";
import { PageHeader } from "@/components/shared/page-header";
import { KpiCard } from "@/components/shared/kpi-card";
import { UserCell } from "@/components/shared/user-cell";
import { EmptyState } from "@/components/shared/empty-state";
import { ADMIN_ROUTES } from "@/lib/constants/routes";
import {
  getKpiReport,
  exportReport,
  type ReportPeriod,
  type KpiReportData,
  type KpiPerformer,
} from "@/lib/api/reports";
import { getStores } from "@/lib/api/stores";

// ═══════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════

const PIE_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
  "var(--color-muted-foreground)",
];

const WORK_TYPE_LABELS = [
  "Касса",
  "Выкладка",
  "Уборка",
  "КСО",
  "Контроль качества",
  "Инвентаризация",
  "Складские работы",
];

function getBestWorkType(userId: number): string {
  return WORK_TYPE_LABELS[userId % WORK_TYPE_LABELS.length];
}

/** Subsample sparklines into 12 trend points with dates */
function buildTrendData(
  sparkCompletion: number[],
  sparkOnTime: number[],
  sparkPlan: number[],
  sparkActual: number[]
) {
  const len = Math.min(sparkCompletion.length, 12);
  const step = Math.floor(sparkCompletion.length / len);
  return Array.from({ length: len }, (_, i) => {
    const idx = Math.min(i * step, sparkCompletion.length - 1);
    const day = new Date(2026, 3, 1 + i * 2);
    const planVal = sparkPlan[idx] ?? 0;
    const actualVal = sparkActual[idx] ?? 0;
    return {
      date: `${day.getDate()} апр`,
      completion: sparkCompletion[idx] ?? 0,
      on_time: sparkOnTime[idx] ?? 0,
      plan: planVal,
      actual: actualVal,
      deviation: planVal > 0
        ? Math.round(((actualVal - planVal) / planVal) * 1000) / 10
        : 0,
    };
  });
}

// ═══════════════════════════════════════════════════════════════════
// SKELETONS
// ═══════════════════════════════════════════════════════════════════

function KpiSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Загрузка отчёта">
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// PERIOD BANNER
// ═══════════════════════════════════════════════════════════════════

function PeriodBanner({ scope }: { scope: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/40 px-4 py-2.5 text-sm text-muted-foreground">
      Период:{" "}
      <span className="text-foreground font-medium">1 апреля 2026 — 28 апреля 2026</span>
      {" · "}
      {scope}
      {" · "}
      Обновлено <span className="text-foreground">28 апр, 14:00</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// AI INSIGHT BANNER
// ═══════════════════════════════════════════════════════════════════

interface AiBannerProps {
  storeId: string;
  t: ReturnType<typeof useTranslations>;
  onClose: () => void;
}

function AiBanner({ storeId, t, onClose }: AiBannerProps) {
  const router = useRouter();
  return (
    <div
      role="complementary"
      aria-label="AI аналитика"
      className="rounded-lg border border-info/30 bg-info/5 p-4 flex flex-col gap-3 sm:flex-row sm:items-start"
    >
      <Sparkles className="size-4 text-info shrink-0 mt-0.5 hidden sm:block" />
      <p className="flex-1 text-sm text-foreground leading-relaxed">
        {t("ai_banner.text")}
      </p>
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        <Button
          size="sm"
          className="gap-1.5"
          onClick={() =>
            router.push(
              `${ADMIN_ROUTES.aiSuggestions}${storeId ? `?store_id=${storeId}` : ""}` as never
            )
          }
        >
          <Sparkles className="size-3.5" />
          {t("ai_banner.suggestions_btn")}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={() =>
            router.push(
              `${ADMIN_ROUTES.aiChat}?context_type=chart&context_id=kpi-overview` as never
            )
          }
        >
          <MessageSquare className="size-3.5" />
          {t("ai_banner.ask_btn")}
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="size-8 shrink-0"
          onClick={onClose}
          aria-label="Закрыть"
        >
          <X className="size-4" />
        </Button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// CHART AI BUTTON
// ═══════════════════════════════════════════════════════════════════

interface ChartAiButtonProps {
  chartId: string;
  label: string;
  t: ReturnType<typeof useTranslations>;
}

function ChartAiButton({ chartId, label, t }: ChartAiButtonProps) {
  const router = useRouter();
  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            className="size-7"
            onClick={() =>
              router.push(
                `${ADMIN_ROUTES.aiChat}?context_type=chart&context_id=${chartId}` as never
              )
            }
            aria-label={t("ai_chart_tooltip")}
          >
            <Sparkles className="size-3.5 text-muted-foreground" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="text-xs">{label}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("ask_in_chat")}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ═══════════════════════════════════════════════════════════════════
// LEADERBOARD TABLE
// ═══════════════════════════════════════════════════════════════════

interface LeaderboardTableProps {
  performers: KpiPerformer[];
  type: "top" | "support";
  t: ReturnType<typeof useTranslations>;
}

function LeaderboardTable({ performers, type, t }: LeaderboardTableProps) {
  const router = useRouter();

  if (performers.length === 0) {
    return (
      <EmptyState
        icon={BarChart2}
        title={t("empty.no_data_title")}
        description={t("empty.no_data_subtitle")}
        className="py-10"
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10">{t("leaderboards.col_rank")}</TableHead>
          <TableHead>{t("leaderboards.col_employee")}</TableHead>
          <TableHead className="hidden md:table-cell">
            {t("leaderboards.col_store")}
          </TableHead>
          {type === "top" ? (
            <>
              <TableHead className="text-right hidden sm:table-cell">
                {t("leaderboards.col_tasks")}
              </TableHead>
              <TableHead className="text-right">
                {t("leaderboards.col_completion")}
              </TableHead>
              <TableHead className="text-right">
                {t("leaderboards.col_score")}
              </TableHead>
            </>
          ) : (
            <>
              <TableHead className="text-right hidden sm:table-cell">
                {t("leaderboards.col_returns")}
              </TableHead>
              <TableHead className="text-right">
                {t("leaderboards.col_completion")}
              </TableHead>
              <TableHead className="hidden sm:table-cell">
                {t("leaderboards.col_strength")}
              </TableHead>
            </>
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {performers.map((p, index) => {
          const rank = index + 1;
          const isTopThree = type === "top" && rank <= 3;
          const nameParts = p.user_name.split(" ");
          const user = {
            first_name: nameParts[1] ?? "—",
            last_name: nameParts[0] ?? "—",
            middle_name: nameParts[2],
            position_name: p.store_name,
          };

          return (
            <TableRow
              key={p.user_id}
              className={cn(
                "cursor-pointer hover:bg-accent/50 transition-colors",
                type === "support" && "bg-warning/5 hover:bg-warning/10"
              )}
              onClick={(e) => {
                const path = ADMIN_ROUTES.employeeDetail(String(p.user_id));
                if (e.metaKey || e.ctrlKey) {
                  window.open(path, "_blank");
                } else {
                  router.push(path as never);
                }
              }}
            >
              <TableCell>
                <span
                  className={cn(
                    "text-base font-semibold w-8 inline-block text-center",
                    isTopThree ? "text-success" : "text-muted-foreground"
                  )}
                >
                  {rank}
                </span>
              </TableCell>
              <TableCell>
                <UserCell user={user} />
              </TableCell>
              <TableCell className="text-sm text-muted-foreground hidden md:table-cell max-w-[160px] truncate">
                {p.store_name}
              </TableCell>
              {type === "top" ? (
                <>
                  <TableCell className="text-right text-sm hidden sm:table-cell">
                    {p.tasks_completed}
                  </TableCell>
                  <TableCell className="text-right text-sm font-medium">
                    {p.completion_rate}%
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-sm font-semibold text-primary">
                      {p.rating.toFixed(1)}
                    </span>
                  </TableCell>
                </>
              ) : (
                <>
                  <TableCell className="text-right text-sm hidden sm:table-cell">
                    <span className="text-warning font-medium">
                      {Math.round(
                        p.tasks_completed * ((100 - p.completion_rate) / 100)
                      )}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-sm font-medium">
                    {p.completion_rate}%
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant="secondary" className="text-xs">
                      {getBestWorkType(p.user_id)}
                    </Badge>
                  </TableCell>
                </>
              )}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

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
  const ALLOWED_ROLES = [
    "NETWORK_OPS",
    "REGIONAL",
    "SUPERVISOR",
    "STORE_DIRECTOR",
  ];
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

  // ═════════════════════════════════════════════════════════════
  // TOOLBAR (always rendered for sticky placement)
  // ═════════════════════════════════════════════════════════════
  const isStoreLocked = user.role === "STORE_DIRECTOR";

  const toolbar = (
    <div className="sticky top-14 z-10 bg-background/95 backdrop-blur-sm border-b border-border pb-3 pt-1 -mx-4 px-4 md:-mx-6 md:px-6 space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Period tabs — horizontal scroll on mobile */}
        <div className="overflow-x-auto">
          <Tabs
            value={period}
            onValueChange={(v) => handlePeriodChange(v as ReportPeriod)}
          >
            <TabsList className="h-9">
              <TabsTrigger value="week">{t("period.week")}</TabsTrigger>
              <TabsTrigger value="month">{t("period.month")}</TabsTrigger>
              <TabsTrigger value="quarter">{t("period.quarter")}</TabsTrigger>
              <TabsTrigger value="year">{t("period.year")}</TabsTrigger>
              <TabsTrigger value="custom">{t("period.custom")}</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={handleExport}
            disabled={isExporting}
          >
            <Download className="size-3.5" />
            {t("toolbar.export_btn")}
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" asChild>
            <Link href={ADMIN_ROUTES.reportsCompare}>
              <GitCompareArrows className="size-3.5" />
              {t("toolbar.compare_btn")}
            </Link>
          </Button>
        </div>
      </div>

      {/* Second row */}
      <div className="flex flex-wrap gap-2 items-center">
        {period === "custom" && (
          <>
            <Popover open={fromPickerOpen} onOpenChange={setFromPickerOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  {t("custom_range_from")}:{" "}
                  {customFrom
                    ? customFrom.toLocaleDateString("ru-RU", {
                        day: "numeric",
                        month: "short",
                      })
                    : "—"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={customFrom}
                  onSelect={(d) => {
                    setCustomFrom(d);
                    setFromPickerOpen(false);
                  }}
                />
              </PopoverContent>
            </Popover>
            <Popover open={toPickerOpen} onOpenChange={setToPickerOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  {t("custom_range_to")}:{" "}
                  {customTo
                    ? customTo.toLocaleDateString("ru-RU", {
                        day: "numeric",
                        month: "short",
                      })
                    : "—"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={customTo}
                  onSelect={(d) => {
                    setCustomTo(d);
                    setToPickerOpen(false);
                  }}
                />
              </PopoverContent>
            </Popover>
          </>
        )}

        {/* Store combobox */}
        <div
          className={cn(
            "w-full sm:w-64",
            isStoreLocked && "opacity-60 pointer-events-none"
          )}
        >
          <Combobox
            options={storeOptions}
            value={storeId}
            onValueChange={handleStoreChange}
            placeholder={t("toolbar.store_placeholder")}
            searchPlaceholder="Поиск магазина..."
            emptyText="Магазин не найден"
          />
        </div>
      </div>
    </div>
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
            <Button
              size="sm"
              variant="outline"
              onClick={() => kpiMutate()}
            >
              <RefreshCw className="size-3.5 mr-1.5" />
              Повторить
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════
  // METRICS EXTRACTION
  // ═════════════════════════════════════════════════════════════
  const metrics = kpiData.metrics;
  const completionMetric = metrics.find((m) => m.key === "completion_rate");
  const returnMetric = metrics.find((m) => m.key === "return_rate");
  const onTimeMetric = metrics.find((m) => m.key === "on_time_rate");
  const hoursPlan = metrics.find((m) => m.key === "hours_plan");
  const hoursActual = metrics.find((m) => m.key === "hours_actual");

  const hoursDiff =
    hoursActual && hoursPlan ? hoursActual.value - hoursPlan.value : 0;
  const hoursDiffPct =
    hoursPlan && hoursPlan.value > 0
      ? Math.round((hoursDiff / hoursPlan.value) * 1000) / 10
      : 0;

  const trendData =
    completionMetric && onTimeMetric && hoursPlan && hoursActual
      ? buildTrendData(
          completionMetric.sparkline,
          onTimeMetric.sparkline,
          hoursPlan.sparkline,
          hoursActual.sparkline
        )
      : [];

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

      {/* ══════════════════════════════════════════════════════════
          SECTION 1 — 4 KPI Cards
      ════════════════════════════════════════════════════════════ */}
      <section aria-label={t("sections.kpi_overview")}>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label={t("metrics.completion_rate")}
            value={`${completionMetric?.value ?? 0}%`}
            diff={completionMetric?.change_pct}
            trend={completionMetric?.sparkline}
            icon={CheckCircle2}
          />
          {/* Return rate — inverse: lower is better */}
          <KpiCard
            label={t("metrics.return_rate")}
            value={`${returnMetric?.value ?? 0}%`}
            diff={returnMetric ? -returnMetric.change_pct : undefined}
            trend={returnMetric?.sparkline}
            icon={RotateCcw}
          />
          <KpiCard
            label={t("metrics.on_time_rate")}
            value={`${onTimeMetric?.value ?? 0}%`}
            diff={onTimeMetric?.change_pct}
            trend={onTimeMetric?.sparkline}
            icon={Clock}
          />
          <KpiCard
            label="План / Факт часы"
            value={`${(hoursPlan?.value ?? 0).toLocaleString("ru-RU")} / ${(hoursActual?.value ?? 0).toLocaleString("ru-RU")} ч`}
            diff={hoursDiffPct}
            trend={hoursActual?.sparkline}
            icon={BarChart3}
            className={Math.abs(hoursDiffPct) > 5 ? "border-warning" : undefined}
          />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          SECTION 2 — Trend charts
      ════════════════════════════════════════════════════════════ */}
      <section aria-label={t("sections.trends")}>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Completion + on-time dynamics */}
          <Card className="rounded-xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base font-semibold">
                  {t("trends.completion_title")}
                </CardTitle>
                <ChartAiButton
                  chartId="kpi-completion-trend"
                  label={t("trends.completion_title")}
                  t={t}
                />
              </div>
            </CardHeader>
            <CardContent>
              {trendData.length === 0 ? (
                <EmptyState
                  icon={BarChart2}
                  title={t("empty.no_data_title")}
                  description={t("empty.no_data_subtitle")}
                  action={{
                    label: "Сменить период",
                    onClick: () => handlePeriodChange("month"),
                  }}
                />
              ) : (
                <ResponsiveContainer width="100%" height={240} className="md:!h-[300px]">
                  <LineChart
                    data={trendData}
                    margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--color-border)"
                      opacity={0.5}
                    />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      domain={[70, 100]}
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v: number) => `${v}%`}
                    />
                    <RechartsTooltip
                      formatter={(v: number, name: string) => [`${v.toFixed(1)}%`, name]}
                      contentStyle={{
                        background: "var(--color-card)",
                        border: "1px solid var(--color-border)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />
                    <Line
                      type="monotone"
                      dataKey="completion"
                      name={t("trends.completion_line")}
                      stroke="var(--color-chart-1)"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="on_time"
                      name={t("trends.on_time_line")}
                      stroke="var(--color-chart-2)"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Plan vs Actual hours */}
          <Card className="rounded-xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base font-semibold">
                  {t("trends.hours_title")}
                </CardTitle>
                <ChartAiButton
                  chartId="kpi-hours-trend"
                  label={t("trends.hours_title")}
                  t={t}
                />
              </div>
            </CardHeader>
            <CardContent>
              {trendData.length === 0 ? (
                <EmptyState
                  icon={BarChart2}
                  title={t("empty.no_data_title")}
                  description={t("empty.no_data_subtitle")}
                  action={{
                    label: "Сменить период",
                    onClick: () => handlePeriodChange("month"),
                  }}
                />
              ) : (
                <ResponsiveContainer width="100%" height={240} className="md:!h-[300px]">
                  <LineChart
                    data={trendData}
                    margin={{ top: 4, right: 20, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--color-border)"
                      opacity={0.5}
                    />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      yAxisId="left"
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v: number) => `${v}%`}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        background: "var(--color-card)",
                        border: "1px solid var(--color-border)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="plan"
                      name={t("trends.plan_line")}
                      stroke="var(--color-muted-foreground)"
                      strokeWidth={1.5}
                      strokeDasharray="5 3"
                      dot={false}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="actual"
                      name={t("trends.actual_line")}
                      stroke="var(--color-chart-1)"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="deviation"
                      name={t("trends.deviation_line")}
                      stroke="var(--color-chart-3)"
                      strokeWidth={1.5}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          SECTION 3 — Breakdown charts
      ════════════════════════════════════════════════════════════ */}
      <section aria-label={t("sections.breakdown")}>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* By work type */}
          <Card className="rounded-xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base font-semibold">
                  {t("breakdown.work_type_title")}
                </CardTitle>
                <ChartAiButton
                  chartId="kpi-by-work-type"
                  label={t("breakdown.work_type_title")}
                  t={t}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {t("breakdown.click_hint")}
              </p>
            </CardHeader>
            <CardContent>
              {kpiData.by_work_type.length === 0 ? (
                <EmptyState
                  icon={BarChart2}
                  title={t("empty.no_data_title")}
                  description={t("empty.no_data_subtitle")}
                />
              ) : (
                <ResponsiveContainer width="100%" height={240} className="md:!h-[300px]">
                  <BarChart
                    data={[...kpiData.by_work_type].sort(
                      (a, b) => b.completion_rate - a.completion_rate
                    )}
                    margin={{ top: 4, right: 4, left: -20, bottom: 44 }}
                    onClick={(d) => {
                      if (d?.activePayload?.[0]) {
                        const workTypeId = (
                          d.activePayload[0].payload as { id: number }
                        ).id;
                        router.push(
                          `${ADMIN_ROUTES.tasks}?work_type_id=${workTypeId}` as never
                        );
                      }
                    }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--color-border)"
                      opacity={0.5}
                      vertical={false}
                    />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      angle={-35}
                      textAnchor="end"
                      interval={0}
                    />
                    <YAxis
                      domain={[60, 100]}
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v: number) => `${v}%`}
                    />
                    <RechartsTooltip
                      formatter={(v: number) => [
                        `${v.toFixed(1)}%`,
                        t("breakdown.completion_label"),
                      ]}
                      contentStyle={{
                        background: "var(--color-card)",
                        border: "1px solid var(--color-border)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      cursor={{ fill: "var(--color-accent)", opacity: 0.4 }}
                    />
                    <Bar
                      dataKey="completion_rate"
                      fill="var(--color-chart-1)"
                      radius={[4, 4, 0, 0]}
                      cursor="pointer"
                      maxBarSize={40}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* By zone — pie chart */}
          <Card className="rounded-xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base font-semibold">
                  {t("breakdown.zone_title")}
                </CardTitle>
                <ChartAiButton
                  chartId="kpi-by-zone"
                  label={t("breakdown.zone_title")}
                  t={t}
                />
              </div>
            </CardHeader>
            <CardContent>
              {kpiData.by_zone.length === 0 ? (
                <EmptyState
                  icon={BarChart2}
                  title={t("empty.no_data_title")}
                  description={t("empty.no_data_subtitle")}
                />
              ) : (
                <div className="flex flex-col items-center gap-4 md:flex-row md:items-center">
                  <div className="w-full md:w-1/2">
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={kpiData.by_zone}
                          dataKey="tasks_total"
                          nameKey="label"
                          cx="50%"
                          cy="50%"
                          innerRadius={52}
                          outerRadius={88}
                          paddingAngle={2}
                        >
                          {kpiData.by_zone.map((_, index) => (
                            <Cell
                              key={index}
                              fill={PIE_COLORS[index % PIE_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          formatter={(v: number, name: string) => [v, name]}
                          contentStyle={{
                            background: "var(--color-card)",
                            border: "1px solid var(--color-border)",
                            borderRadius: 8,
                            fontSize: 12,
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-col gap-2 w-full md:w-1/2">
                    {kpiData.by_zone.map((zone, index) => (
                      <div
                        key={zone.id}
                        className="flex items-center justify-between gap-2 text-sm"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="size-2.5 rounded-full shrink-0"
                            style={{
                              background:
                                PIE_COLORS[index % PIE_COLORS.length],
                            }}
                          />
                          <span className="text-foreground truncate">
                            {zone.label}
                          </span>
                        </div>
                        <span className="text-muted-foreground shrink-0 font-medium">
                          {zone.completion_rate}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          SECTION 4 — Leaderboards
      ════════════════════════════════════════════════════════════ */}
      <section aria-label={t("sections.leaderboards")}>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Top 10 */}
          <Card className="rounded-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">
                {t("leaderboards.top_title")}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <LeaderboardTable
                  performers={kpiData.top_performers.slice(0, 10)}
                  type="top"
                  t={t}
                />
              </div>
            </CardContent>
          </Card>

          {/* Needs support */}
          <Card className="rounded-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">
                {t("leaderboards.support_title")}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {t("leaderboards.support_hint")}
              </p>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <LeaderboardTable
                  performers={kpiData.needs_support}
                  type="support"
                  t={t}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
