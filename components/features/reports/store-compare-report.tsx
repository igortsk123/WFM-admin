"use client";

import { useState, useCallback, useMemo } from "react";
import useSWR from "swr";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import {
  Sparkles,
  MessageSquare,
  X,
  Lock,
  Download,
  Table2,
  LayoutGrid,
  ScatterChart,
  AlertCircle,
  RefreshCw,
  BarChart2,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
} from "lucide-react";
import {
  LineChart,
  Line,
  ScatterChart as RechartsScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  ReferenceLine,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/contexts/auth-context";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ADMIN_ROUTES } from "@/lib/constants/routes";
import {
  getStoreCompareReport,
  exportReport,
  type ReportPeriod,
  type StoreCompareReportData,
  type StoreComparisonRow,
  type StoreQuadrant,
} from "@/lib/api/reports";
import { Link } from "@/i18n/navigation";

// ═══════════════════════════════════════════════════════════════════
// CONSTANTS & TYPES
// ═══════════════════════════════════════════════════════════════════

type ViewMode = "table" | "heatmap" | "scatter";
type SortField = keyof Pick<
  StoreComparisonRow,
  | "store_name"
  | "completion_rate"
  | "return_rate"
  | "on_time_rate"
  | "hours_diff_pct"
  | "fot_diff_pct"
  | "rank"
>;
type SortDir = "asc" | "desc" | "none";

type MetricKey =
  | "completion_rate"
  | "return_rate"
  | "on_time_rate"
  | "hours_diff_pct"
  | "fot_diff_pct";

const METRICS: MetricKey[] = [
  "completion_rate",
  "return_rate",
  "on_time_rate",
  "hours_diff_pct",
  "fot_diff_pct",
];

// Extract city from store name (last word before comma or at start)
function extractCity(storeName: string): string {
  const lower = storeName.toLowerCase();
  if (lower.includes("томск")) return "Томск";
  if (lower.includes("кемерово")) return "Кемерово";
  if (lower.includes("новосибирск")) return "Новосибирск";
  return "—";
}

// Mock employees count derived from store_id
function mockEmployees(storeId: number): number {
  const map: Record<number, number> = {
    1: 42, 2: 38, 3: 35, 4: 51, 5: 47, 6: 33, 7: 29, 8: 31,
  };
  return map[storeId] ?? 30;
}

// Mock tasks done derived from completion_rate
function mockTasksDone(row: StoreComparisonRow): number {
  return Math.round(row.completion_rate * 3.2);
}

// ── Quintile coloring (5 buckets, success → neutral → warning) ────
function getQuintileClass(value: number, allValues: number[], inverted = false): string {
  const sorted = [...allValues].sort((a, b) => a - b);
  const n = sorted.length;
  const rank = sorted.findIndex((v) => v >= value);
  const pct = rank / Math.max(n - 1, 1);
  // For normal metrics: top 20% = success, bottom 20% = warning
  // For inverted (return_rate, lower is better): flip
  const adjusted = inverted ? 1 - pct : pct;
  if (adjusted >= 0.8) return "bg-success/10 text-success";
  if (adjusted >= 0.6) return "bg-success/5 text-foreground";
  if (adjusted >= 0.4) return "";
  if (adjusted >= 0.2) return "bg-warning/5 text-foreground";
  return "bg-warning/10 text-warning";
}

// Heatmap cell color (0–1 normalized)
function getHeatmapBg(norm: number): string {
  if (norm >= 0.8) return "bg-success/20";
  if (norm >= 0.6) return "bg-success/10";
  if (norm >= 0.4) return "bg-muted/30";
  if (norm >= 0.2) return "bg-warning/10";
  return "bg-warning/20";
}

// ── Quadrant badge config ─────────────────────────────────────────
const QUADRANT_BADGE: Record<StoreQuadrant, string> = {
  LEADERS: "bg-success/10 text-success border-success/20",
  GROWING: "bg-accent/80 text-accent-foreground border-accent-foreground/20",
  STABLE: "bg-info/10 text-info border-info/20",
  DECLINING: "bg-warning/10 text-warning border-warning/20",
};

// ─────────────────────────────────────────────────────────────────
// SKELETONS
// ─────────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="space-y-2" aria-busy="true">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-lg" />
      ))}
    </div>
  );
}

function HeatmapSkeleton() {
  return (
    <div className="grid gap-1" style={{ gridTemplateColumns: "200px repeat(6, 1fr)" }}>
      {Array.from({ length: 9 * 7 }).map((_, i) => (
        <Skeleton key={i} className="h-10 rounded" />
      ))}
    </div>
  );
}

function ScatterSkeleton() {
  return <Skeleton className="h-[500px] w-full rounded-xl" />;
}

// ─────────────────────────────────────────────────────────────────
// AI INSIGHT BANNER
// ─────────────────────────────────────────────────────────────────

interface AiBannerProps {
  t: ReturnType<typeof useTranslations>;
  onClose: () => void;
}

function AiBanner({ t, onClose }: AiBannerProps) {
  const router = useRouter();
  return (
    <div
      role="complementary"
      aria-label="AI аналитика"
      className="rounded-lg border border-info/30 bg-info/5 p-4 flex flex-col gap-3 sm:flex-row sm:items-start"
    >
      <Sparkles className="size-4 text-info shrink-0 mt-0.5 hidden sm:block" aria-hidden="true" />
      <p className="flex-1 text-sm text-foreground leading-relaxed">
        {t("ai_banner.text")}
      </p>
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        <Button
          size="sm"
          className="gap-1.5"
          onClick={() =>
            router.push(
              `${ADMIN_ROUTES.aiSuggestions}?store_id=Food-City-Tomsk-001` as never
            )
          }
        >
          <Sparkles className="size-3.5" aria-hidden="true" />
          {t("ai_banner.suggestions_btn")}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={() =>
            router.push(
              `${ADMIN_ROUTES.aiChat}?context_type=chart&context_id=stores-compare` as never
            )
          }
        >
          <MessageSquare className="size-3.5" aria-hidden="true" />
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

// ─────────────────────────────────────────────────────────────────
// SPARKLINE (inline recharts)
// ─────────────────────────────────────────────────────────────────

function Sparkline({ data, color = "var(--color-chart-1)" }: { data: number[]; color?: string }) {
  const chartData = data.map((v, i) => ({ i, v }));
  return (
    <ResponsiveContainer width={80} height={24}>
      <LineChart data={chartData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
        <Line
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ─────────────────────────────────────────────────────────────────
// TABLE VIEW
// ─────────────────────────────────────────────────────────────────

interface TableViewProps {
  stores: StoreComparisonRow[];
  t: ReturnType<typeof useTranslations>;
}

function TableView({ stores, t }: TableViewProps) {
  const router = useRouter();
  const [sortField, setSortField] = useState<SortField>("rank");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const allCompletion = stores.map((s) => s.completion_rate);
  const allReturn = stores.map((s) => s.return_rate);
  const allOnTime = stores.map((s) => s.on_time_rate);
  const allHours = stores.map((s) => s.hours_diff_pct);
  const allFot = stores.map((s) => s.fot_diff_pct);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : d === "desc" ? "none" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  const sorted = useMemo(() => {
    if (sortDir === "none") return [...stores].sort((a, b) => a.rank - b.rank);
    return [...stores].sort((a, b) => {
      const av = a[sortField] as number | string;
      const bv = b[sortField] as number | string;
      const diff = typeof av === "string"
        ? av.localeCompare(bv as string)
        : (av as number) - (bv as number);
      return sortDir === "asc" ? diff : -diff;
    });
  }, [stores, sortField, sortDir]);

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ChevronsUpDown className="size-3 opacity-40" />;
    if (sortDir === "asc") return <ChevronUp className="size-3" />;
    if (sortDir === "desc") return <ChevronDown className="size-3" />;
    return <ChevronsUpDown className="size-3 opacity-40" />;
  }

  function SortableHead({
    field,
    children,
    className,
  }: {
    field: SortField;
    children: React.ReactNode;
    className?: string;
  }) {
    return (
      <TableHead
        className={cn("cursor-pointer select-none whitespace-nowrap", className)}
        onClick={() => handleSort(field)}
      >
        <span className="inline-flex items-center gap-1">
          {children}
          <SortIcon field={field} />
        </span>
      </TableHead>
    );
  }

  return (
    <div className="space-y-3">
      {/* Hint alert */}
      <Alert className="border-info/20 bg-info/5">
        <AlertCircle className="size-4 text-info" />
        <AlertDescription className="text-sm text-info">
          {t("hint_alert")}
        </AlertDescription>
      </Alert>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <SortableHead field="rank" className="w-10 pl-4">
                {t("table.columns.rank")}
              </SortableHead>
              <SortableHead field="store_name" className="min-w-[200px] sticky left-0 bg-muted/30 z-10">
                {t("table.columns.store")}
              </SortableHead>
              <TableHead className="whitespace-nowrap">{t("table.columns.city")}</TableHead>
              <TableHead className="whitespace-nowrap text-right">{t("table.columns.employees")}</TableHead>
              <TableHead className="whitespace-nowrap text-right">{t("table.columns.tasks_done")}</TableHead>
              <SortableHead field="completion_rate" className="whitespace-nowrap text-right">
                {t("table.columns.completion_rate")}
              </SortableHead>
              <SortableHead field="return_rate" className="whitespace-nowrap text-right">
                {t("table.columns.return_rate")}
              </SortableHead>
              <SortableHead field="on_time_rate" className="whitespace-nowrap text-right">
                {t("table.columns.on_time_rate")}
              </SortableHead>
              <SortableHead field="hours_diff_pct" className="whitespace-nowrap text-right">
                {t("table.columns.hours_diff_pct")}
              </SortableHead>
              <SortableHead field="fot_diff_pct" className="whitespace-nowrap text-right">
                {t("table.columns.fot_diff_pct")}
              </SortableHead>
              <TableHead className="whitespace-nowrap">{t("table.columns.trend")}</TableHead>
              <TableHead className="whitespace-nowrap">{t("table.columns.quadrant")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((row) => {
              const city = extractCity(row.store_name);
              const employees = mockEmployees(row.store_id);
              const tasksDone = mockTasksDone(row);

              return (
                <TableRow
                  key={row.store_id}
                  className="cursor-pointer hover:bg-accent/40 transition-colors"
                  onClick={(e) => {
                    const path = ADMIN_ROUTES.storeDetail(String(row.store_id));
                    if (e.metaKey || e.ctrlKey) window.open(path, "_blank");
                    else router.push(path as never);
                  }}
                >
                  <TableCell className="pl-4 text-muted-foreground font-mono text-xs">
                    {row.rank}
                  </TableCell>
                  <TableCell className="sticky left-0 bg-background z-10 font-medium max-w-[220px]">
                    <Link
                      href={ADMIN_ROUTES.storeDetail(String(row.store_id))}
                      className="hover:text-primary transition-colors line-clamp-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {row.store_name}
                    </Link>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">
                      {row.store_external_code}
                    </p>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {city}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {employees}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {tasksDone}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right text-sm font-medium rounded-sm",
                      getQuintileClass(row.completion_rate, allCompletion)
                    )}
                  >
                    {row.completion_rate}%
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right text-sm font-medium",
                      getQuintileClass(row.return_rate, allReturn, true)
                    )}
                  >
                    {row.return_rate}%
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right text-sm font-medium",
                      getQuintileClass(row.on_time_rate, allOnTime)
                    )}
                  >
                    {row.on_time_rate}%
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right text-sm",
                      getQuintileClass(row.hours_diff_pct, allHours)
                    )}
                  >
                    {row.hours_diff_pct > 0 ? "+" : ""}
                    {row.hours_diff_pct}%
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right text-sm",
                      getQuintileClass(row.fot_diff_pct, allFot)
                    )}
                  >
                    {row.fot_diff_pct > 0 ? "+" : ""}
                    {row.fot_diff_pct}%
                  </TableCell>
                  <TableCell>
                    <Sparkline data={row.sparkline_completion} />
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn("text-xs whitespace-nowrap", QUADRANT_BADGE[row.quadrant])}
                    >
                      {t(`comparison_badge.${row.quadrant}`)}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {sorted.map((row) => (
          <Card
            key={row.store_id}
            className="cursor-pointer"
            onClick={() => router.push(ADMIN_ROUTES.storeDetail(String(row.store_id)) as never)}
          >
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm leading-snug">{row.store_name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{row.store_external_code}</p>
                </div>
                <Badge
                  variant="outline"
                  className={cn("text-xs shrink-0", QUADRANT_BADGE[row.quadrant])}
                >
                  {t(`comparison_badge.${row.quadrant}`)}
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground">{t("table.columns.completion_rate")}</p>
                  <p className={cn("font-semibold text-sm", getQuintileClass(row.completion_rate, allCompletion))}>
                    {row.completion_rate}%
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t("table.columns.return_rate")}</p>
                  <p className={cn("font-semibold text-sm", getQuintileClass(row.return_rate, allReturn, true))}>
                    {row.return_rate}%
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t("table.columns.on_time_rate")}</p>
                  <p className="font-semibold text-sm">{row.on_time_rate}%</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Sparkline data={row.sparkline_completion} />
                <span className="text-xs text-muted-foreground">
                  #{row.rank}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// HEATMAP VIEW
// ─────────────────────────────────────────────────────────────────

const HEATMAP_METRICS: { key: MetricKey; inverted?: boolean }[] = [
  { key: "completion_rate" },
  { key: "return_rate", inverted: true },
  { key: "on_time_rate" },
  { key: "hours_diff_pct" },
  { key: "fot_diff_pct" },
];

interface HeatmapViewProps {
  stores: StoreComparisonRow[];
  t: ReturnType<typeof useTranslations>;
}

function HeatmapView({ stores, t }: HeatmapViewProps) {
  const [sortByCode, setSortByCode] = useState(false);

  const sorted = useMemo(
    () =>
      sortByCode
        ? [...stores].sort((a, b) => a.store_external_code.localeCompare(b.store_external_code))
        : [...stores].sort((a, b) => a.rank - b.rank),
    [stores, sortByCode]
  );

  // Normalize metric value 0–1
  function normalize(value: number, key: MetricKey, inverted = false): number {
    const vals = stores.map((s) => s[key] as number);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    if (max === min) return 0.5;
    const norm = (value - min) / (max - min);
    return inverted ? 1 - norm : norm;
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto md:overflow-visible">
        <div
          className="min-w-[600px]"
          style={{ display: "grid", gridTemplateColumns: "200px repeat(5, 1fr)", gap: "2px" }}
          role="grid"
          aria-label="Тепловая карта метрик магазинов"
        >
          {/* Header row */}
          <button
            className="flex items-center gap-1 px-2 py-2 text-xs font-semibold text-muted-foreground bg-muted/30 rounded-tl-lg hover:bg-muted/50 transition-colors text-left"
            onClick={() => setSortByCode((v) => !v)}
          >
            {t("table.columns.store")}
            <ChevronsUpDown className="size-3 opacity-50" />
          </button>
          {HEATMAP_METRICS.map(({ key }) => (
            <div
              key={key}
              className="px-2 py-2 text-xs font-semibold text-muted-foreground bg-muted/30 text-center rounded-t-sm"
            >
              {t(`metric.${key}`)}
            </div>
          ))}

          {/* Data rows */}
          {sorted.map((row, rIdx) => (
            <>
              <div
                key={`name-${row.store_id}`}
                className={cn(
                  "px-3 py-2.5 text-xs font-medium leading-snug bg-card",
                  rIdx === sorted.length - 1 ? "rounded-bl-lg" : ""
                )}
              >
                <span className="text-muted-foreground font-mono mr-1.5 text-[10px]">
                  {row.store_external_code}
                </span>
                <br />
                <span className="line-clamp-2">{row.store_name.split(",")[0]}</span>
              </div>
              {HEATMAP_METRICS.map(({ key, inverted }, cIdx) => {
                const value = row[key] as number;
                const norm = normalize(value, key, inverted);
                const bgClass = getHeatmapBg(norm);
                const rank = sorted.length - sorted.findIndex((s) => s.store_id === row.store_id);
                const isLast =
                  rIdx === sorted.length - 1 && cIdx === HEATMAP_METRICS.length - 1;
                return (
                  <TooltipProvider key={`cell-${row.store_id}-${key}`} delayDuration={0}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className={cn(
                            "flex items-center justify-center px-1 py-2 text-xs font-mono cursor-default transition-opacity hover:opacity-80",
                            bgClass,
                            isLast ? "rounded-br-lg" : ""
                          )}
                        >
                          {value > 0 && !["hours_diff_pct", "fot_diff_pct"].includes(key) ? "" : ""}
                          {["hours_diff_pct", "fot_diff_pct"].includes(key) && value > 0 ? "+" : ""}
                          {value}
                          {["completion_rate", "return_rate", "on_time_rate"].includes(key) ? "%" : "%"}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs max-w-[200px]">
                        <p className="font-medium">{row.store_name}</p>
                        <p className="text-muted-foreground">{t(`metric.${key}`)}: {value}%</p>
                        <p className="text-muted-foreground">
                          {t("heatmap.tooltip_rank", { rank: sorted.indexOf(row) + 1, total: sorted.length })}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
            </>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{t("common.legend") ?? "Легенда"}:</span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm bg-success/20 inline-block border border-success/30" />
          {t("heatmap.legend_leaders")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm bg-muted/50 inline-block border border-border" />
          {t("heatmap.legend_median")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm bg-warning/20 inline-block border border-warning/30" />
          {t("heatmap.legend_support")}
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// SCATTER VIEW
// ─────────────────────────────────────────────────────────────────

const SCATTER_METRIC_OPTS: MetricKey[] = [
  "completion_rate",
  "return_rate",
  "on_time_rate",
  "hours_diff_pct",
  "fot_diff_pct",
];

interface ScatterViewProps {
  stores: StoreComparisonRow[];
  medians: { completion_rate: number; return_rate: number; on_time_rate: number };
  t: ReturnType<typeof useTranslations>;
}

// Custom dot for scatter
function CustomScatterDot(props: {
  cx?: number;
  cy?: number;
  r?: number;
  payload?: StoreComparisonRow & { xVal: number; yVal: number };
  onClick?: () => void;
}) {
  const { cx = 0, cy = 0, r = 12, payload, onClick } = props;
  const color =
    payload?.quadrant === "LEADERS"
      ? "var(--color-success)"
      : payload?.quadrant === "DECLINING"
      ? "var(--color-warning)"
      : payload?.quadrant === "GROWING"
      ? "var(--color-accent-foreground)"
      : "var(--color-muted-foreground)";
  return (
    <circle
      cx={cx}
      cy={cy}
      r={r}
      fill={color}
      fillOpacity={0.75}
      stroke={color}
      strokeWidth={1.5}
      cursor="pointer"
      onClick={onClick}
    />
  );
}

// Custom scatter tooltip
function ScatterDotTooltip({
  active,
  payload,
  xMetric,
  yMetric,
  t,
}: {
  active?: boolean;
  payload?: Array<{ payload: StoreComparisonRow & { xVal: number; yVal: number; zVal: number } }>;
  xMetric: MetricKey;
  yMetric: MetricKey;
  t: ReturnType<typeof useTranslations>;
}) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-card shadow-lg p-3 text-xs space-y-1 max-w-[200px]">
      <p className="font-semibold text-sm leading-snug">{data.store_name}</p>
      <p className="text-muted-foreground">{t(`metric.${xMetric}`)}: {data.xVal}%</p>
      <p className="text-muted-foreground">{t(`metric.${yMetric}`)}: {data.yVal}%</p>
    </div>
  );
}

function ScatterView({ stores, medians, t }: ScatterViewProps) {
  const router = useRouter();
  const [xMetric, setXMetric] = useState<MetricKey>("completion_rate");
  const [yMetric, setYMetric] = useState<MetricKey>("on_time_rate");
  const [sizeMetric, setSizeMetric] = useState<MetricKey>("hours_diff_pct");

  const scatterData = useMemo(
    () =>
      stores.map((s) => ({
        ...s,
        xVal: s[xMetric] as number,
        yVal: s[yMetric] as number,
        zVal: Math.max(20, Math.abs(s[sizeMetric] as number) * 10 + 20),
      })),
    [stores, xMetric, yMetric, sizeMetric]
  );

  const xValues = scatterData.map((d) => d.xVal);
  const yValues = scatterData.map((d) => d.yVal);
  const xMedian = stores.map((s) => s[xMetric] as number).sort((a, b) => a - b)[Math.floor(stores.length / 2)] ?? 0;
  const yMedian = stores.map((s) => s[yMetric] as number).sort((a, b) => a - b)[Math.floor(stores.length / 2)] ?? 0;
  const xMin = Math.min(...xValues) - 2;
  const xMax = Math.max(...xValues) + 2;
  const yMin = Math.min(...yValues) - 2;
  const yMax = Math.max(...yValues) + 2;

  return (
    <div className="space-y-4">
      {/* Axis selectors */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
            <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
              <label className="text-xs text-muted-foreground font-medium">
                {t("scatter_view.x_axis_label")}
              </label>
              <Select value={xMetric} onValueChange={(v) => setXMetric(v as MetricKey)}>
                <SelectTrigger className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCATTER_METRIC_OPTS.map((m) => (
                    <SelectItem key={m} value={m}>{t(`metric.${m}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
              <label className="text-xs text-muted-foreground font-medium">
                {t("scatter_view.y_axis_label")}
              </label>
              <Select value={yMetric} onValueChange={(v) => setYMetric(v as MetricKey)}>
                <SelectTrigger className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCATTER_METRIC_OPTS.map((m) => (
                    <SelectItem key={m} value={m}>{t(`metric.${m}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
              <label className="text-xs text-muted-foreground font-medium">
                {t("scatter_view.size_label")}
              </label>
              <Select value={sizeMetric} onValueChange={(v) => setSizeMetric(v as MetricKey)}>
                <SelectTrigger className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCATTER_METRIC_OPTS.map((m) => (
                    <SelectItem key={m} value={m}>{t(`metric.${m}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scatter chart */}
      <div className="relative w-full overflow-x-auto">
        <div className="min-w-[340px] h-[500px]">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsScatterChart margin={{ top: 24, right: 40, left: 8, bottom: 24 }}>
              {/* Quadrant backgrounds */}
              <defs>
                <clipPath id="quadrant-tr">
                  <rect x="0%" y="0%" width="100%" height="50%" />
                </clipPath>
                <clipPath id="quadrant-bl">
                  <rect x="0%" y="50%" width="100%" height="50%" />
                </clipPath>
              </defs>

              <XAxis
                type="number"
                dataKey="xVal"
                name={t(`metric.${xMetric}`)}
                domain={[xMin, xMax]}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                label={{
                  value: t(`metric.${xMetric}`),
                  position: "insideBottom",
                  offset: -12,
                  fontSize: 11,
                  fill: "var(--color-muted-foreground)",
                }}
              />
              <YAxis
                type="number"
                dataKey="yVal"
                name={t(`metric.${yMetric}`)}
                domain={[yMin, yMax]}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                label={{
                  value: t(`metric.${yMetric}`),
                  angle: -90,
                  position: "insideLeft",
                  offset: 12,
                  fontSize: 11,
                  fill: "var(--color-muted-foreground)",
                }}
              />
              <ZAxis type="number" dataKey="zVal" range={[200, 800]} />
              <RechartsTooltip
                content={
                  <ScatterDotTooltip xMetric={xMetric} yMetric={yMetric} t={t} />
                }
              />

              {/* Median reference lines */}
              <ReferenceLine
                x={xMedian}
                stroke="var(--color-muted-foreground)"
                strokeDasharray="4 3"
                strokeWidth={1}
              />
              <ReferenceLine
                y={yMedian}
                stroke="var(--color-muted-foreground)"
                strokeDasharray="4 3"
                strokeWidth={1}
              />

              <Scatter
                data={scatterData}
                shape={(props: unknown) => {
                  const p = props as {
                    cx?: number;
                    cy?: number;
                    r?: number;
                    payload?: StoreComparisonRow & { xVal: number; yVal: number };
                  };
                  return (
                    <CustomScatterDot
                      {...p}
                      onClick={() =>
                        router.push(
                          ADMIN_ROUTES.storeDetail(String(p.payload?.store_id ?? "")) as never
                        )
                      }
                    />
                  );
                }}
              >
                {scatterData.map((entry) => (
                  <Cell
                    key={entry.store_id}
                    fill={
                      entry.quadrant === "LEADERS"
                        ? "var(--color-success)"
                        : entry.quadrant === "DECLINING"
                        ? "var(--color-warning)"
                        : "var(--color-muted-foreground)"
                    }
                  />
                ))}
              </Scatter>
            </RechartsScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quadrant legend */}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {(["LEADERS", "GROWING", "STABLE", "DECLINING"] as StoreQuadrant[]).map((q) => (
          <span key={q} className="flex items-center gap-1.5">
            <span
              className={cn(
                "size-3 rounded-full inline-block",
                q === "LEADERS" ? "bg-success" :
                q === "DECLINING" ? "bg-warning" :
                q === "GROWING" ? "bg-accent-foreground" :
                "bg-muted-foreground"
              )}
            />
            {t(`comparison_badge.${q}`)}
          </span>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

export function StoreCompareReport() {
  const t = useTranslations("screen.reportsCompare");
  const { user } = useAuth();
  const router = useRouter();

  // ── Toolbar state ─────────────────────────────────────────────
  const [period, setPeriod] = useState<ReportPeriod>("month");
  const [view, setView] = useState<ViewMode>("table");
  const [cityFilter, setCityFilter] = useState<string>("");
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();
  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);

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
    { revalidateOnFocus: false }
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
          {t("common") ?? "Назад"}
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
      <div className="sticky top-14 z-10 bg-background/95 backdrop-blur-sm border-b border-border pb-3 pt-1 -mx-4 px-4 md:-mx-6 md:px-6 space-y-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
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

          {/* Right side: view toggle + export */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* View toggle */}
            <ToggleGroup
              type="single"
              value={view}
              onValueChange={(v) => v && setView(v as ViewMode)}
              variant="outline"
              className="overflow-x-auto"
            >
              <ToggleGroupItem
                value="table"
                aria-label={t("view.table")}
                className="min-w-11 gap-1.5 px-2 md:px-3"
              >
                <Table2 className="size-4 shrink-0" />
                <span className="hidden md:inline text-xs">{t("view.table")}</span>
              </ToggleGroupItem>
              <ToggleGroupItem
                value="heatmap"
                aria-label={t("view.heatmap")}
                className="min-w-11 gap-1.5 px-2 md:px-3"
              >
                <LayoutGrid className="size-4 shrink-0" />
                <span className="hidden md:inline text-xs">{t("view.heatmap")}</span>
              </ToggleGroupItem>
              <ToggleGroupItem
                value="scatter"
                aria-label={t("view.scatter")}
                className="min-w-11 gap-1.5 px-2 md:px-3"
              >
                <ScatterChart className="size-4 shrink-0" />
                <span className="hidden md:inline text-xs">{t("view.scatter")}</span>
              </ToggleGroupItem>
            </ToggleGroup>

            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 shrink-0"
              onClick={handleExport}
              disabled={isExporting || isLoading}
            >
              <Download className="size-3.5" />
              <span className="hidden sm:inline">{t("toolbar.export_csv")}</span>
            </Button>
          </div>
        </div>

        {/* Second row: custom date pickers + city grouping */}
        <div className="flex flex-wrap gap-2 items-center">
          {period === "custom" && (
            <>
              <Popover open={fromOpen} onOpenChange={setFromOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    {t("toolbar.custom_range_from")}:{" "}
                    {customFrom
                      ? customFrom.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })
                      : "—"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={customFrom}
                    onSelect={(d) => { setCustomFrom(d); setFromOpen(false); }}
                  />
                </PopoverContent>
              </Popover>
              <Popover open={toOpen} onOpenChange={setToOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    {t("toolbar.custom_range_to")}:{" "}
                    {customTo
                      ? customTo.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })
                      : "—"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={customTo}
                    onSelect={(d) => { setCustomTo(d); setToOpen(false); }}
                  />
                </PopoverContent>
              </Popover>
            </>
          )}

          {/* City grouping combobox */}
          {cityOptions.length > 2 && (
            <Combobox
              options={cityOptions}
              value={cityFilter}
              onValueChange={setCityFilter}
              placeholder={t("toolbar.group_by_city")}
              searchPlaceholder="Поиск города..."
              className="w-full sm:w-[220px] h-9 text-sm"
            />
          )}
        </div>
      </div>

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
          {view === "heatmap" && <HeatmapView stores={filteredStores} t={t} />}
          {view === "scatter" && (
            <ScatterView
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
