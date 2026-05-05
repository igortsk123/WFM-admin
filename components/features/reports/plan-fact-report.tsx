"use client";

import { useState, useCallback, useMemo } from "react";
import useSWR from "swr";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import {
  CalendarClock,
  Clock,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  MessageSquare,
  X,
  Lock,
  Download,
  BarChart3,
  CalendarDays,
  RefreshCw,
} from "lucide-react";
import {
  ComposedChart,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Combobox } from "@/components/ui/combobox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/contexts/auth-context";
import { PageHeader } from "@/components/shared/page-header";
import { KpiCard } from "@/components/shared/kpi-card";
import { UserCell } from "@/components/shared/user-cell";
import { EmptyState } from "@/components/shared/empty-state";
import { ADMIN_ROUTES } from "@/lib/constants/routes";
import {
  getPlanFactReport,
  exportReport,
  type ReportPeriod,
  type PlanFactReportData,
  type PlanFactByUser,
  type PlanFactByWorkType,
} from "@/lib/api/reports";
import { getStores } from "@/lib/api/stores";

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

/** Color class for hours Δ% — positive = overrun = bad */
function getDeltaHoursClass(deltaPct: number): string {
  if (deltaPct < -5) return "text-info font-medium";
  if (deltaPct <= 5) return "text-foreground";
  if (deltaPct <= 15) return "text-warning font-medium";
  return "text-destructive font-medium";
}

function calcDeltaPct(planned: number, actual: number): number {
  if (planned === 0) return 0;
  return Math.round(((actual - planned) / planned) * 1000) / 10;
}

function formatDeltaPct(pct: number): string {
  return pct > 0 ? `+${pct}%` : `${pct}%`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

// ═══════════════════════════════════════════════════════════════════
// SKELETONS
// ═══════════════════════════════════════════════════════════════════

function PlanFactSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Загрузка отчёта">
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-10 w-full max-w-xs" />
      <Skeleton className="h-[400px] rounded-xl" />
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// PERIOD BANNER
// ═══════════════════════════════════════════════════════════════════

function PeriodBanner({
  t,
  storeLabel,
}: {
  t: ReturnType<typeof useTranslations>;
  storeLabel: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/40 px-4 py-2.5 text-sm text-muted-foreground">
      {t("period_banner.period_label")}:{" "}
      <span className="text-foreground font-medium">1–28 апреля 2026</span>
      {" · "}
      {t("period_banner.store_label")}:{" "}
      <span className="text-foreground font-medium">{storeLabel || t("period_banner.all_stores")}</span>
      {" · "}
      {t("period_banner.updated")}{" "}
      <span className="text-foreground">28 апр, 14:00</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// AI INSIGHT BANNER
// ═══════════════════════════════════════════════════════════════════

function AiBanner({
  t,
  storeId,
  onClose,
}: {
  t: ReturnType<typeof useTranslations>;
  storeId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  return (
    <div
      role="complementary"
      aria-label="AI аналитика"
      className="rounded-lg border border-info/30 bg-info/5 p-4 flex flex-col gap-3 sm:flex-row sm:items-start"
    >
      <Sparkles
        className="size-4 text-info shrink-0 mt-0.5 hidden sm:block"
        aria-hidden="true"
      />
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
              `${ADMIN_ROUTES.aiChat}?context_type=chart&context_id=plan-fact-overview` as never
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
          aria-label={t("ai_banner.ask_btn")}
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

function ChartAiButton({
  chartId,
  t,
}: {
  chartId: string;
  t: ReturnType<typeof useTranslations>;
}) {
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
        <TooltipContent side="top">
          <p className="text-xs">{t("ai_chart_tooltip")}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{t("ask_in_chat")}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ═══════════════════════════════════════════════════════════════════
// DAYS TAB
// ═══════════════════════════════════════════════════════════════════

function DaysTab({
  data,
  t,
}: {
  data: PlanFactReportData;
  t: ReturnType<typeof useTranslations>;
}) {
  const router = useRouter();

  const chartData = data.days.map((d) => ({
    label: formatDate(d.date),
    date: d.date,
    plan: d.planned_hours,
    fact: d.actual_hours,
    deviation: calcDeltaPct(d.planned_hours, d.actual_hours),
  }));

  return (
    <div className="space-y-6">
      {/* Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-medium">
            {t("days_tab.chart_title")}
          </CardTitle>
          <ChartAiButton chartId="plan-fact-by-days" t={t} />
        </CardHeader>
        <CardContent className="p-0 pb-4">
          <ResponsiveContainer width="100%" height={400} className="md:h-[400px] h-[240px]">
            <ComposedChart
              data={chartData}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                interval={3}
              />
              <YAxis
                yAxisId="hours"
                tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                label={{
                  value: t("chart.hours_axis"),
                  angle: -90,
                  position: "insideLeft",
                  offset: 10,
                  style: { fontSize: 11, fill: "var(--color-muted-foreground)" },
                }}
              />
              <YAxis
                yAxisId="pct"
                orientation="right"
                tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}%`}
              />
              <RechartsTooltip
                contentStyle={{
                  background: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={((value: number, name: string) => {
                  if (name === t("chart.deviation_pct")) return [`${value}%`, name];
                  return [`${value} ч`, name];
                }) as never}
              />
              <Legend
                wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
                iconType="circle"
                iconSize={8}
              />
              <Bar
                yAxisId="hours"
                dataKey="plan"
                name={t("chart.planned")}
                fill="var(--color-chart-2)"
                radius={[3, 3, 0, 0]}
                barSize={8}
              />
              <Bar
                yAxisId="hours"
                dataKey="fact"
                name={t("chart.actual")}
                fill="var(--color-chart-1)"
                radius={[3, 3, 0, 0]}
                barSize={8}
              />
              <Line
                yAxisId="pct"
                type="monotone"
                dataKey="deviation"
                name={t("chart.deviation_pct")}
                stroke="var(--color-warning)"
                strokeWidth={2}
                dot={false}
                strokeDasharray="4 2"
              />
              <ReferenceLine yAxisId="pct" y={0} stroke="var(--color-border)" strokeDasharray="4 2" />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">{t("days_tab.table_title")}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-28">{t("days_tab.col_date")}</TableHead>
                  <TableHead className="w-12 hidden sm:table-cell">{t("days_tab.col_weekday")}</TableHead>
                  <TableHead className="text-right">{t("days_tab.col_planned")}</TableHead>
                  <TableHead className="text-right">{t("days_tab.col_actual")}</TableHead>
                  <TableHead className="text-right">{t("days_tab.col_delta")}</TableHead>
                  <TableHead className="text-right">{t("days_tab.col_delta_pct")}</TableHead>
                  <TableHead className="text-right hidden md:table-cell">{t("days_tab.col_tasks_plan")}</TableHead>
                  <TableHead className="text-right hidden md:table-cell">{t("days_tab.col_tasks_fact")}</TableHead>
                  <TableHead className="text-right hidden lg:table-cell">{t("days_tab.col_completion")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.days.map((day) => {
                  const delta = day.actual_hours - day.planned_hours;
                  const deltaPct = calcDeltaPct(day.planned_hours, day.actual_hours);
                  return (
                    <TableRow
                      key={day.date}
                      className="cursor-pointer hover:bg-accent/50 transition-colors"
                      onClick={(e) => {
                        const path = `${ADMIN_ROUTES.tasks}?from=${day.date}&to=${day.date}`;
                        if (e.metaKey || e.ctrlKey) {
                          window.open(path, "_blank");
                        } else {
                          router.push(path as never);
                        }
                      }}
                    >
                      <TableCell className="font-medium text-sm">
                        {formatDate(day.date)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground hidden sm:table-cell">
                        {day.weekday}
                      </TableCell>
                      <TableCell className="text-right text-sm">{day.planned_hours}</TableCell>
                      <TableCell className="text-right text-sm">{day.actual_hours}</TableCell>
                      <TableCell className={cn("text-right text-sm", getDeltaHoursClass(deltaPct))}>
                        {delta > 0 ? `+${delta}` : delta}
                      </TableCell>
                      <TableCell className={cn("text-right text-sm", getDeltaHoursClass(deltaPct))}>
                        {formatDeltaPct(deltaPct)}
                      </TableCell>
                      <TableCell className="text-right text-sm hidden md:table-cell">{day.planned_tasks}</TableCell>
                      <TableCell className="text-right text-sm hidden md:table-cell">{day.completed_tasks}</TableCell>
                      <TableCell className="text-right text-sm hidden lg:table-cell">
                        {day.completion_rate}%
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// STORES TAB
// ═══════════════════════════════════════════════════════════════════

type StoreSort = "overspend" | "name";

function StoresTab({
  data,
  t,
}: {
  data: PlanFactReportData;
  t: ReturnType<typeof useTranslations>;
}) {
  const router = useRouter();
  const [onlyOverspend, setOnlyOverspend] = useState(true);
  const [sortBy, setSortBy] = useState<StoreSort>("overspend");

  const processed = useMemo(() => {
    let stores = data.by_store.map((s) => ({
      ...s,
      deltaPct: calcDeltaPct(s.total_planned_hours, s.total_actual_hours),
      deltaHours: s.total_actual_hours - s.total_planned_hours,
    }));

    if (onlyOverspend) {
      stores = stores.filter((s) => s.deltaPct > 5);
    }

    if (sortBy === "overspend") {
      stores.sort((a, b) => b.deltaPct - a.deltaPct);
    } else {
      stores.sort((a, b) => a.store_name.localeCompare(b.store_name));
    }

    return stores;
  }, [data.by_store, onlyOverspend, sortBy]);

  const overspend10Count = data.by_store.filter(
    (s) => calcDeltaPct(s.total_planned_hours, s.total_actual_hours) > 10
  ).length;

  const chartData = processed.slice(0, 8).map((s) => ({
    label: s.store_name.split(",")[0].replace("СПАР", "").replace("Food City", "FC").trim(),
    plan: s.total_planned_hours,
    fact: s.total_actual_hours,
    deltaPct: s.deltaPct,
  }));

  return (
    <div className="space-y-4">
      {/* Alert for >10% overspend */}
      {overspend10Count > 0 && (
        <div className="relative flex w-full items-start gap-3 rounded-lg border border-warning/40 bg-warning/5 px-4 py-3 text-sm">
          <AlertTriangle className="size-4 mt-0.5 shrink-0 text-warning" />
          <div className="flex flex-col gap-2 flex-1 min-w-0">
            <p className="font-medium text-foreground">
              {t("overspend_alert", { count: overspend10Count })}
            </p>
            <div className="flex flex-wrap gap-2">
              {data.by_store
                .filter((s) => calcDeltaPct(s.total_planned_hours, s.total_actual_hours) > 10)
                .map((s) => (
                  <Badge
                    key={s.store_id}
                    variant="outline"
                    className="cursor-pointer hover:bg-accent text-xs"
                    onClick={() =>
                      router.push(ADMIN_ROUTES.storeDetail(String(s.store_id)) as never)
                    }
                  >
                    {s.store_name.split(",")[0]}
                  </Badge>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Sub-toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Switch
            id="only-overspend"
            checked={onlyOverspend}
            onCheckedChange={setOnlyOverspend}
          />
          <Label htmlFor="only-overspend" className="text-sm cursor-pointer">
            {t("stores_tab.only_overspend")}
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{t("stores_tab.sort_by")}:</span>
          <Select
            value={sortBy}
            onValueChange={(v) => setSortBy(v as StoreSort)}
          >
            <SelectTrigger className="h-8 text-sm w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="overspend">{t("stores_tab.sort_overspend")}</SelectItem>
              <SelectItem value="name">{t("stores_tab.sort_name")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Sparkles className="size-3.5 text-muted-foreground shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed truncate">
              {t("ai_banner.ai_chart_comment")}
            </p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="text-xs h-7 gap-1 shrink-0"
            onClick={() =>
              router.push(
                `${ADMIN_ROUTES.aiChat}?context_type=chart&context_id=plan-fact-by-stores` as never
              )
            }
          >
            <MessageSquare className="size-3" />
            {t("ai_banner.ask_detail_btn")}
          </Button>
        </CardHeader>
        <CardContent className="p-0 pb-4">
          <ResponsiveContainer width="100%" height={400} className="md:h-[400px] h-[240px]">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 20, left: 0, bottom: 40 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                angle={-35}
                textAnchor="end"
                interval={0}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                tickLine={false}
                axisLine={false}
              />
              <RechartsTooltip
                contentStyle={{
                  background: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={((value: number, name: string) => [`${value} ч`, name]) as never}
              />
              <Legend
                wrapperStyle={{ fontSize: 12, paddingTop: 16 }}
                iconType="circle"
                iconSize={8}
              />
              <Bar
                dataKey="plan"
                name={t("chart.planned")}
                fill="var(--color-chart-2)"
                radius={[3, 3, 0, 0]}
                barSize={14}
              />
              <Bar
                dataKey="fact"
                name={t("chart.actual")}
                fill="var(--color-chart-1)"
                radius={[3, 3, 0, 0]}
                barSize={14}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Table */}
      {processed.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title={t("empty.no_data_title")}
          description={t("empty.no_data_subtitle")}
          className="py-10"
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[160px]">{t("stores_tab.col_store")}</TableHead>
                    <TableHead className="hidden sm:table-cell">{t("stores_tab.col_city")}</TableHead>
                    <TableHead className="text-right">{t("stores_tab.col_planned")}</TableHead>
                    <TableHead className="text-right">{t("stores_tab.col_actual")}</TableHead>
                    <TableHead className="text-right">{t("stores_tab.col_delta")}</TableHead>
                    <TableHead className="text-right">{t("stores_tab.col_delta_pct")}</TableHead>
                    <TableHead className="text-right hidden md:table-cell">{t("stores_tab.col_employees")}</TableHead>
                    <TableHead className="text-right hidden lg:table-cell">{t("stores_tab.col_completion")}</TableHead>
                    <TableHead className="text-center w-12">{t("stores_tab.col_ai")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processed.map((store) => (
                    <TableRow
                      key={store.store_id}
                      className="cursor-pointer hover:bg-accent/50 transition-colors"
                      onClick={(e) => {
                        const path = ADMIN_ROUTES.storeDetail(String(store.store_id));
                        if (e.metaKey || e.ctrlKey) {
                          window.open(path, "_blank");
                        } else {
                          router.push(path as never);
                        }
                      }}
                    >
                      <TableCell className="font-medium text-sm max-w-[200px] truncate">
                        {store.store_name}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground hidden sm:table-cell">
                        {store.city}
                      </TableCell>
                      <TableCell className="text-right text-sm">{store.total_planned_hours}</TableCell>
                      <TableCell className="text-right text-sm">{store.total_actual_hours}</TableCell>
                      <TableCell className={cn("text-right text-sm", getDeltaHoursClass(store.deltaPct))}>
                        {store.deltaHours > 0 ? `+${store.deltaHours}` : store.deltaHours}
                      </TableCell>
                      <TableCell className={cn("text-right text-sm", getDeltaHoursClass(store.deltaPct))}>
                        {formatDeltaPct(store.deltaPct)}
                      </TableCell>
                      <TableCell className="text-right text-sm hidden md:table-cell">
                        {store.employee_count}
                      </TableCell>
                      <TableCell className="text-right text-sm hidden lg:table-cell">
                        {store.avg_completion_rate}%
                      </TableCell>
                      <TableCell
                        className="text-center"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(
                            `${ADMIN_ROUTES.aiSuggestions}?store_id=${store.store_id}` as never
                          );
                        }}
                      >
                        <TooltipProvider delayDuration={0}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="size-7"
                                aria-label={t("stores_tab.ask_ai_for_store")}
                              >
                                <Sparkles className="size-3.5 text-muted-foreground" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              <p className="text-xs">{t("stores_tab.ask_ai_for_store")}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// USERS TAB
// ═══════════════════════════════════════════════════════════════════

function UsersTab({
  data,
  t,
  storeOptions,
}: {
  data: PlanFactReportData;
  t: ReturnType<typeof useTranslations>;
  storeOptions: { value: string; label: string }[];
}) {
  const router = useRouter();
  const [storeFilter, setStoreFilter] = useState<string>("");
  const [search] = useState<string>("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const filtered = useMemo(() => {
    let users = data.by_user as (PlanFactByUser & { deltaPct: number; deltaHours: number })[];
    users = users.map((u) => ({
      ...u,
      deltaPct: calcDeltaPct(u.planned_hours, u.actual_hours),
      deltaHours: u.actual_hours - u.planned_hours,
    }));
    if (storeFilter) {
      const storeName = storeOptions.find((s) => s.value === storeFilter)?.label ?? "";
      users = users.filter((u) => u.store_name.includes(storeName.split(",")[0]));
    }
    if (search) {
      users = users.filter((u) =>
        u.user_name.toLowerCase().includes(search.toLowerCase())
      );
    }
    return users;
  }, [data.by_user, storeFilter, search, storeOptions]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const nameParts = (name: string) => {
    const parts = name.split(" ");
    return {
      last_name: parts[0] ?? "—",
      first_name: parts[1] ?? "—",
      middle_name: parts[2],
    };
  };

  return (
    <div className="space-y-4">
      {/* Sub-toolbar */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="w-48">
          <Combobox
            options={[{ value: "", label: t("toolbar.all_stores") }, ...storeOptions.slice(1)]}
            value={storeFilter}
            onValueChange={(v) => {
              setStoreFilter(v);
              setPage(1);
            }}
            placeholder={t("toolbar.store_placeholder")}
          />
        </div>
      </div>

      {paginated.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title={t("empty.no_data_title")}
          description={t("empty.no_data_subtitle")}
          className="py-10"
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[160px]">{t("users_tab.col_user")}</TableHead>
                    <TableHead className="hidden lg:table-cell">{t("users_tab.col_store")}</TableHead>
                    <TableHead className="hidden md:table-cell">{t("users_tab.col_position")}</TableHead>
                    <TableHead className="text-right">{t("users_tab.col_planned")}</TableHead>
                    <TableHead className="text-right">{t("users_tab.col_actual")}</TableHead>
                    <TableHead className="text-right">{t("users_tab.col_delta")}</TableHead>
                    <TableHead className="text-right">{t("users_tab.col_delta_pct")}</TableHead>
                    <TableHead className="text-right hidden md:table-cell">{t("users_tab.col_tasks_plan")}</TableHead>
                    <TableHead className="text-right hidden md:table-cell">{t("users_tab.col_tasks_fact")}</TableHead>
                    <TableHead className="text-right hidden lg:table-cell">{t("users_tab.col_on_time")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((user) => {
                    const parts = nameParts(user.user_name);
                    const userObj = {
                      ...parts,
                      position_name: user.position,
                    };
                    return (
                      <TableRow
                        key={user.user_id}
                        className="cursor-pointer hover:bg-accent/50 transition-colors"
                        onClick={(e) => {
                          const path = ADMIN_ROUTES.employeeDetail(String(user.user_id));
                          if (e.metaKey || e.ctrlKey) {
                            window.open(path, "_blank");
                          } else {
                            router.push(path as never);
                          }
                        }}
                      >
                        <TableCell>
                          <UserCell user={userObj} />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground hidden lg:table-cell max-w-[160px] truncate">
                          {user.store_name}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground hidden md:table-cell">
                          {user.position}
                        </TableCell>
                        <TableCell className="text-right text-sm">{user.planned_hours}</TableCell>
                        <TableCell className="text-right text-sm">{user.actual_hours}</TableCell>
                        <TableCell className={cn("text-right text-sm", getDeltaHoursClass(user.deltaPct))}>
                          {user.deltaHours > 0 ? `+${user.deltaHours}` : user.deltaHours}
                        </TableCell>
                        <TableCell className={cn("text-right text-sm", getDeltaHoursClass(user.deltaPct))}>
                          {formatDeltaPct(user.deltaPct)}
                        </TableCell>
                        <TableCell className="text-right text-sm hidden md:table-cell">{user.total_planned}</TableCell>
                        <TableCell className="text-right text-sm hidden md:table-cell">{user.total_completed}</TableCell>
                        <TableCell className="text-right text-sm hidden lg:table-cell">
                          {user.on_time_rate}%
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  {(page - 1) * PAGE_SIZE + 1}–
                  {Math.min(page * PAGE_SIZE, filtered.length)}{" "}
                  из {filtered.length}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    ←
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    →
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// WORK TYPES TAB
// ═══════════════════════════════════════════════════════════════════

function WorkTypesTab({
  data,
  t,
}: {
  data: PlanFactReportData;
  t: ReturnType<typeof useTranslations>;
}) {
  const processed = useMemo(() =>
    (data.by_work_type as PlanFactByWorkType[])
      .map((wt) => ({
        ...wt,
        deltaPct: calcDeltaPct(wt.total_planned_hours, wt.total_actual_hours),
        deltaHours: wt.total_actual_hours - wt.total_planned_hours,
      }))
      .sort((a, b) => b.deltaPct - a.deltaPct),
    [data.by_work_type]
  );

  const chartData = processed.map((wt) => ({
    label: wt.work_type_name.length > 14 ? wt.work_type_name.slice(0, 13) + "…" : wt.work_type_name,
    plan: wt.total_planned_hours,
    fact: wt.total_actual_hours,
  }));

  return (
    <div className="space-y-6">
      {/* Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-medium">{t("chart.planned")} vs {t("chart.actual")}</CardTitle>
          <ChartAiButton chartId="plan-fact-by-work-types" t={t} />
        </CardHeader>
        <CardContent className="p-0 pb-4">
          <ResponsiveContainer width="100%" height={400} className="md:h-[400px] h-[280px]">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 20, left: 100, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type="category"
                dataKey="label"
                tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                width={96}
              />
              <RechartsTooltip
                contentStyle={{
                  background: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={((value: number, name: string) => [`${value} ч`, name]) as never}
              />
              <Legend
                wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                iconType="circle"
                iconSize={8}
              />
              <Bar
                dataKey="plan"
                name={t("chart.planned")}
                fill="var(--color-chart-2)"
                radius={[0, 3, 3, 0]}
                barSize={10}
              />
              <Bar
                dataKey="fact"
                name={t("chart.actual")}
                fill="var(--color-chart-1)"
                radius={[0, 3, 3, 0]}
                barSize={10}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[160px]">{t("work_types_tab.col_work_type")}</TableHead>
                  <TableHead className="text-right">{t("work_types_tab.col_planned")}</TableHead>
                  <TableHead className="text-right">{t("work_types_tab.col_actual")}</TableHead>
                  <TableHead className="text-right">{t("work_types_tab.col_delta")}</TableHead>
                  <TableHead className="text-right">{t("work_types_tab.col_delta_pct")}</TableHead>
                  <TableHead className="text-right hidden md:table-cell">{t("work_types_tab.col_tasks_done")}</TableHead>
                  <TableHead className="text-right hidden lg:table-cell">{t("work_types_tab.col_avg_duration")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processed.map((wt) => (
                  <TableRow key={wt.work_type_id}>
                    <TableCell className="font-medium text-sm">{wt.work_type_name}</TableCell>
                    <TableCell className="text-right text-sm">{wt.total_planned_hours}</TableCell>
                    <TableCell className="text-right text-sm">{wt.total_actual_hours}</TableCell>
                    <TableCell className={cn("text-right text-sm", getDeltaHoursClass(wt.deltaPct))}>
                      {wt.deltaHours > 0 ? `+${wt.deltaHours}` : wt.deltaHours}
                    </TableCell>
                    <TableCell className={cn("text-right text-sm", getDeltaHoursClass(wt.deltaPct))}>
                      {formatDeltaPct(wt.deltaPct)}
                    </TableCell>
                    <TableCell className="text-right text-sm hidden md:table-cell">
                      {wt.total_completed_tasks}
                    </TableCell>
                    <TableCell className="text-right text-sm hidden lg:table-cell">
                      {wt.avg_duration}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

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
  const ALLOWED_ROLES = ["NETWORK_OPS", "REGIONAL", "SUPERVISOR", "STORE_DIRECTOR"];
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
    <div className="sticky top-14 z-10 bg-background/95 backdrop-blur-sm border-b border-border pb-3 pt-1 -mx-4 px-4 md:-mx-6 md:px-6 space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Period tabs */}
        <div className="overflow-x-auto">
          <Tabs
            value={period}
            onValueChange={(v) => setPeriod(v as ReportPeriod)}
          >
            <TabsList className="h-9">
              <TabsTrigger value="week">{t("period.week")}</TabsTrigger>
              <TabsTrigger value="month">{t("period.month")}</TabsTrigger>
              <TabsTrigger value="quarter">{t("period.quarter")}</TabsTrigger>
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
            <Link href={ADMIN_ROUTES.reportsKpi}>
              <BarChart3 className="size-3.5" />
              {t("toolbar.kpi_btn")}
            </Link>
          </Button>
        </div>
      </div>

      {/* Second row: custom date + store */}
      <div className="flex flex-wrap gap-2 items-center">
        {period === "custom" && (
          <>
            <Popover open={fromPickerOpen} onOpenChange={setFromPickerOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  {t("toolbar.custom_from")}:{" "}
                  {customFrom
                    ? customFrom.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })
                    : "—"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={customFrom}
                  onSelect={(d) => { setCustomFrom(d); setFromPickerOpen(false); }}
                />
              </PopoverContent>
            </Popover>
            <Popover open={toPickerOpen} onOpenChange={setToPickerOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  {t("toolbar.custom_to")}:{" "}
                  {customTo
                    ? customTo.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })
                    : "—"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={customTo}
                  onSelect={(d) => { setCustomTo(d); setToPickerOpen(false); }}
                />
              </PopoverContent>
            </Popover>
          </>
        )}
        {!isStoreLocked && (
          <div className="w-56">
            <Combobox
              options={storeOptions}
              value={storeId}
              onValueChange={setStoreId}
              placeholder={t("toolbar.store_placeholder")}
            />
          </div>
        )}
      </div>
    </div>
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
  const worstDayFormatted = formatDate(cards.worstDay.date);

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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={CalendarClock}
          label={t("summary_cards.planned_hours")}
          value={`${cards.totalPlanned} ч`}
        />
        <KpiCard
          icon={Clock}
          label={t("summary_cards.actual_hours")}
          value={`${cards.totalActual} ч`}
          diff={cards.deltaPct}
          trend={reportData.days.slice(0, 14).map((d) => d.actual_hours)}
        />
        <KpiCard
          icon={TrendingUp}
          label={t("summary_cards.avg_deviation")}
          value={`${cards.avgDailyDelta > 0 ? "+" : ""}${cards.avgDailyDelta} ч/день`}
        />
        <KpiCard
          icon={AlertTriangle}
          label={t("summary_cards.worst_day")}
          value={worstDayFormatted}
        />
      </div>

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
