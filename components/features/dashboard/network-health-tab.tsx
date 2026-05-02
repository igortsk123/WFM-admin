"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { TrendingDown, TrendingUp, ChevronRight } from "lucide-react";

import type {
  DashboardPeriod,
  FormatHealthRow,
  NetworkHealthSummary,
  ObjectFormat,
  StoreHealthRow,
} from "@/lib/types";
import { getNetworkHealth } from "@/lib/api/dashboard";
import { Link } from "@/i18n/navigation";
import { ADMIN_ROUTES } from "@/lib/constants/routes";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { HealthGauge, type GaugeStatus } from "@/components/shared/health-gauge";
import { cn } from "@/lib/utils";

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

function gaugeStatus(score: number): GaugeStatus {
  if (score < 60) return "danger";
  if (score < 80) return "warning";
  return "success";
}

function formatLabelKey(format: ObjectFormat): string {
  const map: Record<ObjectFormat, string> = {
    SUPERMARKET: "format_supermarket",
    HYPERMARKET: "format_hypermarket",
    CONVENIENCE: "format_convenience",
    SMALL_SHOP: "format_small_shop",
    SEWING_WORKSHOP: "format_sewing_workshop",
    PRODUCTION_LINE: "format_production_line",
    WAREHOUSE_HUB: "format_warehouse_hub",
    OFFICE: "format_office",
  };
  return map[format];
}

function pluralizeRu(count: number, one: string, few: string, many: string): string {
  const n = Math.abs(count) % 100;
  const n1 = n % 10;
  if (n > 10 && n < 20) return many;
  if (n1 > 1 && n1 < 5) return few;
  if (n1 === 1) return one;
  return many;
}

function avatarInitials(name?: string): string {
  if (!name) return "?";
  const parts = name.split(" ").filter(Boolean);
  return parts.slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}

// ═══════════════════════════════════════════════════════════════════
// FORMAT BREAKDOWN ROW
// ═══════════════════════════════════════════════════════════════════

interface FormatBreakdownProps {
  formats: FormatHealthRow[];
  selected: ObjectFormat | "ALL";
  onSelect: (f: ObjectFormat | "ALL") => void;
}

function FormatBreakdown({ formats, selected, onSelect }: FormatBreakdownProps) {
  const t = useTranslations("screen.dashboard.health");

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <button
        type="button"
        onClick={() => onSelect("ALL")}
        className={cn(
          "rounded-xl border bg-card p-3 text-left transition-colors hover:bg-accent",
          selected === "ALL" && "border-primary ring-1 ring-primary",
        )}
      >
        <div className="text-xs text-muted-foreground">{t("all_formats")}</div>
        <div className="mt-1 text-base font-semibold">—</div>
      </button>
      {formats.map((f) => {
        const isUp = f.diff_pct >= 0;
        const Icon = isUp ? TrendingUp : TrendingDown;
        const tone = isUp ? "text-emerald-600 dark:text-emerald-400" : "text-destructive";
        const isActive = selected === f.format;
        return (
          <button
            key={f.format}
            type="button"
            onClick={() => onSelect(f.format)}
            className={cn(
              "rounded-xl border bg-card p-3 text-left transition-colors hover:bg-accent",
              isActive && "border-primary ring-1 ring-primary",
            )}
          >
            <div className="text-xs text-muted-foreground">
              {t(formatLabelKey(f.format) as Parameters<typeof t>[0])}
            </div>
            <div className={cn("mt-1 flex items-center gap-1 text-base font-semibold tabular-nums", tone)}>
              <Icon className="size-4" />
              {isUp ? "+" : ""}{f.diff_pct}%
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// STORE ROW
// ═══════════════════════════════════════════════════════════════════

function StoreHealthRowItem({ row }: { row: StoreHealthRow }) {
  const t = useTranslations("screen.dashboard.health");

  let statusBadge: React.ReactNode;
  if (row.status === "IDLE") {
    statusBadge = (
      <Badge variant="outline" className="border-destructive/40 bg-destructive/10 text-destructive">
        {t("status_idle")}
      </Badge>
    );
  } else if (row.status === "ANOMALY") {
    statusBadge = (
      <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
        {t("status_anomaly", { pct: row.anomaly_pct ?? 0 })}
      </Badge>
    );
  } else {
    statusBadge = (
      <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
        {t("status_normal")}
      </Badge>
    );
  }

  const isUp = row.coverage_pct_diff >= 0;
  const TrendIcon = isUp ? TrendingUp : TrendingDown;
  const trendTone = isUp ? "text-emerald-600 dark:text-emerald-400" : "text-destructive";

  return (
    <Link
      href={ADMIN_ROUTES.storeDetail(String(row.store_id))}
      className="block rounded-lg border bg-card p-3 transition-colors hover:bg-accent"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold">{row.store_name}</span>
            {statusBadge}
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
            <div>
              <div className="text-muted-foreground">{t("row_forecast")}</div>
              <div className="mt-0.5 text-sm font-semibold tabular-nums">
                {row.forecast_hours}{t("row_hours_unit")}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">{t("row_assigned")}</div>
              <div className="mt-0.5 text-sm font-semibold tabular-nums">
                {row.assigned_hours}{t("row_hours_unit")}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">{t("row_coverage")}</div>
              <div className={cn("mt-0.5 flex items-center gap-1 text-sm font-semibold tabular-nums", trendTone)}>
                <TrendIcon className="size-3.5" />
                {isUp ? "+" : ""}{row.coverage_pct_diff}%
              </div>
            </div>
          </div>
        </div>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
      </div>
      {row.supervisor_name && (
        <div className="mt-3 flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
          <span>{t("supervisor_label")}</span>
          <div className="flex items-center gap-2">
            <Avatar className="size-6">
              <AvatarFallback className="text-[10px]">
                {avatarInitials(row.supervisor_name)}
              </AvatarFallback>
            </Avatar>
            <span className="font-medium text-foreground">{row.supervisor_name}</span>
          </div>
        </div>
      )}
    </Link>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN TAB
// ═══════════════════════════════════════════════════════════════════

export function NetworkHealthTab({ period = "current_month" }: { period?: DashboardPeriod }) {
  const t = useTranslations("screen.dashboard.health");

  const [data, setData] = useState<NetworkHealthSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [formatFilter, setFormatFilter] = useState<ObjectFormat | "ALL">("ALL");
  const [storesTab, setStoresTab] = useState<"lagging" | "leaders">("lagging");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getNetworkHealth(period).then((res) => {
      if (!cancelled) {
        setData(res.data);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [period]);

  const filteredStores = useMemo(() => {
    if (!data) return [];
    let list = data.stores;
    if (formatFilter !== "ALL") {
      list = list.filter((s) => s.format === formatFilter);
    }
    if (storesTab === "lagging") {
      return [...list].sort((a, b) => a.coverage_pct_diff - b.coverage_pct_diff);
    }
    return [...list].sort((a, b) => b.coverage_pct_diff - a.coverage_pct_diff);
  }, [data, formatFilter, storesTab]);

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const status = gaugeStatus(data.score);
  const statusLabelKey = data.score < 60 ? "below_norm" : data.score < 80 ? "warning_norm" : "in_norm";

  // Trend text
  const coverageDiff = data.trend_7d.coverage_pct_diff;
  const coverageStr = `${coverageDiff > 0 ? "+" : ""}${coverageDiff}%`;
  const anomalyN = data.trend_7d.anomalies_diff_count;
  const anomalyAbs = Math.abs(anomalyN);
  const pluralKey = pluralizeRu(anomalyAbs, "anomaly_count_one", "anomaly_count_few", "anomaly_count_many");
  const anomalyStr = `${anomalyN <= 0 ? "" : "+"}${anomalyN} ${t(pluralKey as Parameters<typeof t>[0], { count: anomalyAbs })}`;

  return (
    <div className="space-y-6">
      {/* Hero gauge */}
      <Card>
        <CardContent className="flex flex-col items-center gap-4 p-6">
          <HealthGauge
            value={data.score}
            min={0}
            max={100}
            status={status}
            statusLabel={t(statusLabelKey as Parameters<typeof t>[0])}
            size={240}
          />
          <p className="max-w-md text-center text-sm text-muted-foreground">
            {t("trend_summary", { coverage_diff: coverageStr, anomaly_diff: anomalyStr })}
          </p>
        </CardContent>
      </Card>

      {/* Format breakdown */}
      <FormatBreakdown
        formats={data.by_format}
        selected={formatFilter}
        onSelect={setFormatFilter}
      />

      {/* Stores list */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("summary_for")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={storesTab} onValueChange={(v) => setStoresTab(v as "lagging" | "leaders")}>
            <TabsList className="grid w-full max-w-xs grid-cols-2">
              <TabsTrigger value="lagging">{t("tab_lagging")}</TabsTrigger>
              <TabsTrigger value="leaders">{t("tab_leaders")}</TabsTrigger>
            </TabsList>
            <TabsContent value={storesTab} className="mt-4">
              {filteredStores.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">{t("empty_stores")}</p>
              ) : (
                <div className="space-y-2">
                  {filteredStores.map((row) => (
                    <StoreHealthRowItem key={row.store_id} row={row} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
          <div className="mt-4 flex justify-center">
            <Button variant="ghost" asChild>
              <Link href={ADMIN_ROUTES.stores}>{t("details_btn")}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
