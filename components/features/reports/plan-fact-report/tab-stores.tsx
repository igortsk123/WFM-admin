import { useMemo, useState } from "react";
import type { useTranslations } from "next-intl";
import {
  AlertTriangle,
  Sparkles,
  MessageSquare,
  BarChart3,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/shared/empty-state";
import { useRouter } from "@/i18n/navigation";
import { ADMIN_ROUTES } from "@/lib/constants/routes";
import type { PlanFactReportData } from "@/lib/api/reports";

import { calcDeltaPct, formatDeltaPct, getDeltaHoursClass } from "./_shared";

type StoreSort = "overspend" | "name";

export function StoresTab({
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
