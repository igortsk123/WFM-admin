"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronRight, Bell } from "lucide-react";

import type {
  BudgetSummary,
  DashboardPeriod,
  FormatBudgetRow,
  ObjectFormat,
  StoreBudgetRow,
} from "@/lib/types";
import { getBudgetSummary } from "@/lib/api/dashboard";
import { Link } from "@/i18n/navigation";
import { ADMIN_ROUTES } from "@/lib/constants/routes";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { HealthGauge, type GaugeStatus } from "@/components/shared/health-gauge";
import { cn } from "@/lib/utils";

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

function gaugeStatusFromBudget(s: BudgetSummary["status"]): GaugeStatus {
  if (s === "EXCEEDED") return "danger";
  if (s === "RISK") return "warning";
  return "success";
}

function formatRub(amount: number, locale: string): string {
  if (amount >= 1_000_000) {
    const mln = amount / 1_000_000;
    const formatted = mln.toLocaleString(locale, {
      minimumFractionDigits: mln >= 10 ? 0 : 1,
      maximumFractionDigits: 1,
    });
    return formatted;
  }
  if (amount >= 1_000) {
    return Math.round(amount / 1_000).toLocaleString(locale);
  }
  return amount.toLocaleString(locale);
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

function avatarInitials(name?: string): string {
  if (!name) return "?";
  const parts = name.split(" ").filter(Boolean);
  return parts.slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}

// ═══════════════════════════════════════════════════════════════════
// FORMAT BREAKDOWN
// ═══════════════════════════════════════════════════════════════════

interface FormatBreakdownProps {
  formats: FormatBudgetRow[];
  selected: ObjectFormat | "ALL";
  onSelect: (f: ObjectFormat | "ALL") => void;
  locale: string;
}

function FormatBreakdown({ formats, selected, onSelect, locale }: FormatBreakdownProps) {
  const tHealth = useTranslations("screen.dashboard.health");
  const tBudget = useTranslations("screen.dashboard.budget");

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
        <div className="text-xs text-muted-foreground">{tHealth("all_formats")}</div>
        <div className="mt-1 text-base font-semibold">—</div>
      </button>
      {formats.map((f) => {
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
              {tHealth(formatLabelKey(f.format) as Parameters<typeof tHealth>[0])}
            </div>
            <div className="mt-1 text-base font-semibold tabular-nums">
              <span className="text-amber-600 dark:text-amber-400">
                {formatRub(f.spent_rub, locale)}
              </span>
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                {tBudget("value_unit_mln")} / {formatRub(f.total_rub, locale)} {tBudget("value_unit_mln")}
              </span>
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

function StoreBudgetRowItem({ row, locale }: { row: StoreBudgetRow; locale: string }) {
  const t = useTranslations("screen.dashboard.budget");
  const tHealth = useTranslations("screen.dashboard.health");

  let statusBadge: React.ReactNode;
  if (row.status === "EXCEEDED") {
    statusBadge = (
      <Badge variant="outline" className="border-destructive/40 bg-destructive/10 text-destructive">
        {t("status_exceeded", {
          amount: `${formatRub(row.risk_amount_rub ?? 0, locale)} ${t("value_unit_thousand")}`,
        })}
      </Badge>
    );
  } else if (row.status === "RISK") {
    statusBadge = (
      <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
        {t("status_risk", {
          amount: `${formatRub(row.risk_amount_rub ?? 0, locale)} ${t("value_unit_thousand")}`,
        })}
      </Badge>
    );
  } else {
    statusBadge = (
      <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
        {t("status_normal")}
      </Badge>
    );
  }

  const progressPct = Math.min(100, Math.round((row.spent_rub / row.total_rub) * 100));

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
          <div className="mt-2 flex items-center gap-3">
            <span className="text-xs text-muted-foreground">{t("row_spent")}</span>
            <span className="text-sm font-semibold tabular-nums">
              {formatRub(row.spent_rub, locale)} {t("value_unit_thousand")}
            </span>
            <span className="text-xs text-muted-foreground">/</span>
            <span className="text-sm tabular-nums text-muted-foreground">
              {formatRub(row.total_rub, locale)} {t("value_unit_thousand")}
            </span>
          </div>
          <Progress value={progressPct} className="mt-2 h-1.5" />
        </div>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
      </div>
      {row.supervisor_name && (
        <div className="mt-3 flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
          <span>{tHealth("supervisor_label")}</span>
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

export function BudgetTab({
  period = "current_month",
  locale = "ru",
}: {
  period?: DashboardPeriod;
  locale?: string;
}) {
  const t = useTranslations("screen.dashboard.budget");

  const [data, setData] = useState<BudgetSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [formatFilter, setFormatFilter] = useState<ObjectFormat | "ALL">("ALL");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getBudgetSummary(period).then((res) => {
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
    if (formatFilter === "ALL") return data.stores;
    return data.stores.filter((s) => s.format === formatFilter);
  }, [data, formatFilter]);

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const status = gaugeStatusFromBudget(data.status);
  const statusLabelKey = data.status === "OK" ? "on_plan" : data.status === "RISK" ? "risk_shortage" : "exceeded";
  // Convert to mln for gauge display (13 of 23.3 mln)
  const spentMln = Math.round((data.spent_rub / 1_000_000) * 10) / 10;
  const totalMln = Math.round((data.total_rub / 1_000_000) * 10) / 10;
  const totalDisplay = totalMln.toLocaleString(locale);
  const valueSuffix = `${t("of")} ${totalDisplay} ${t("value_unit_mln")}`;

  // Pace summary string
  const paceStr = data.pace_diff_pct > 0
    ? t("pace_summary", {
        pace: data.pace_diff_pct,
        risk: `${formatRub(data.risk_amount_rub, locale)} ${t("value_unit_mln")}`,
      })
    : t("pace_summary_under", { pace: Math.abs(data.pace_diff_pct) });

  return (
    <div className="space-y-6">
      {/* Approve banner */}
      {data.pending_approvals_count > 0 && (
        <Link
          href={`${ADMIN_ROUTES.freelanceApplications}?status=PENDING`}
          className="flex items-center justify-between rounded-lg border border-primary/40 bg-primary/5 px-4 py-3 transition-colors hover:bg-primary/10"
        >
          <div className="flex items-center gap-3">
            <Bell className="size-4 text-primary" />
            <span className="text-sm font-medium">
              {t("approve_pending", { count: data.pending_approvals_count })}
            </span>
          </div>
          <ChevronRight className="size-4 text-primary" />
        </Link>
      )}

      {/* Hero gauge */}
      <Card>
        <CardContent className="flex flex-col items-center gap-4 p-6">
          <HealthGauge
            value={spentMln}
            valueSuffix={valueSuffix}
            min={0}
            max={totalMln}
            status={status}
            statusLabel={t(statusLabelKey as Parameters<typeof t>[0])}
            size={240}
          />
          <p className="max-w-md text-center text-sm text-muted-foreground">{paceStr}</p>
        </CardContent>
      </Card>

      {/* Format breakdown */}
      <FormatBreakdown
        formats={data.by_format}
        selected={formatFilter}
        onSelect={setFormatFilter}
        locale={locale}
      />

      {/* Stores list */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("by_stores")}</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredStores.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">—</p>
          ) : (
            <div className="space-y-2">
              {filteredStores.map((row) => (
                <StoreBudgetRowItem key={row.store_id} row={row} locale={locale} />
              ))}
            </div>
          )}
          <div className="mt-4 flex justify-center">
            <Button variant="ghost" asChild>
              <Link href={ADMIN_ROUTES.freelanceApplications}>{t("details_btn")}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
