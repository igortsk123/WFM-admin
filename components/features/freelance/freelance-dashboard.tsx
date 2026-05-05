"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  Plus,
  AlertTriangle,
  Info,
  RefreshCw,
  ChevronRight,
  Wallet,
  TrendingUp,
  TrendingDown,
  Clock,
  MapPin,
  MapPinOff,
  Inbox,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/contexts/auth-context";
import { ADMIN_ROUTES } from "@/lib/constants/routes";
import type {
  BudgetUsage,
  FreelanceApplication,
  FreelancerAssignment,
  ApplicationSource,
  BudgetPeriod,
} from "@/lib/types";
import { getBudgetUsage } from "@/lib/api/freelance-budget";
import { getFreelanceApplications } from "@/lib/api/freelance-applications";
import { getAssignmentsByApplication } from "@/lib/api/freelance-assignments";
import { MOCK_FREELANCE_ASSIGNMENTS } from "@/lib/mock-data/freelance-assignments";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { ButtonGroup } from "@/components/ui/button-group";

import { PageHeader } from "@/components/shared/page-header";
import { KpiCard } from "@/components/shared/kpi-card";
import { UserCell } from "@/components/shared/user-cell";
import { ResponsiveDataTable } from "@/components/shared/responsive-data-table";
import { EmptyState } from "@/components/shared/empty-state";

import type { ColumnDef } from "@tanstack/react-table";

// ═══════════════════════════════════════════════════════════════════
// MOCK TODAY (matches _today.ts)
// ═══════════════════════════════════════════════════════════════════
const MOCK_TODAY_ISO = "2026-05-01";

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

function formatCurrency(amount: number, currency = "RUB"): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatTime(iso: string): string {
  return iso.slice(11, 16); // "HH:MM"
}

function formatRelativeDate(iso: string): string {
  const date = iso.slice(0, 10);
  if (date === MOCK_TODAY_ISO) return "Сегодня";
  const tomorrow = new Date(new Date(MOCK_TODAY_ISO).getTime() + 86400000)
    .toISOString()
    .slice(0, 10);
  if (date === tomorrow) return "Завтра";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
  }).format(new Date(date));
}

type PeriodFilter = "DAY" | "WEEK" | "MONTH";

interface DashboardData {
  usages: BudgetUsage[];
  pendingApps: FreelanceApplication[];
  pendingTotal: number;
  todayAssignments: FreelancerAssignment[];
}

// ═══════════════════════════════════════════════════════════════════
// SKELETON
// ═══════════════════════════════════════════════════════════════════

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// BUDGET TABLE ROW CARD (mobile)
// ═══════════════════════════════════════════════════════════════════

function BudgetMobileCard({
  row,
  onClick,
}: {
  row: BudgetUsage;
  onClick: () => void;
}) {
  const overspendClass =
    row.overspend_pct >= 10
      ? "border-l-4 border-l-destructive"
      : row.overspend_pct > 0
        ? "border-l-4 border-l-warning"
        : "";

  return (
    <button
      type="button"
      className={cn(
        "w-full text-left space-y-1.5",
        overspendClass
      )}
      onClick={onClick}
    >
      <p className="text-sm font-medium text-foreground truncate">
        {row.store_name}
      </p>
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          {row.period_start.slice(0, 7)}
        </span>
        <span>
          Лимит: {formatCurrency(row.limit_amount, row.currency)}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span>
          Потрачено:{" "}
          <strong className="text-foreground">
            {formatCurrency(row.actual_amount, row.currency)}
          </strong>
        </span>
        {row.overspend > 0 && (
          <span className={cn("font-medium", row.overspend_pct >= 10 ? "text-destructive" : "text-warning")}>
            +{formatCurrency(row.overspend, row.currency)} ({row.overspend_pct}%)
          </span>
        )}
      </div>
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════
// PENDING APPLICATION ROW
// ═══════════════════════════════════════════════════════════════════

function PendingApplicationRow({ app }: { app: FreelanceApplication }) {
  return (
    <Link
      href={ADMIN_ROUTES.freelanceApplicationDetail(app.id)}
      className="flex items-start justify-between gap-3 rounded-lg p-3 hover:bg-muted/50 transition-colors min-h-[44px]"
    >
      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground truncate">
            {app.store_name}
          </span>
          {app.urgent && (
            <Badge variant="destructive" className="shrink-0 text-xs h-5">
              Срочно
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>{app.work_type_name}</span>
          <span>·</span>
          <span>{app.requested_hours} ч</span>
          <span>·</span>
          <span>{formatRelativeDate(app.planned_date)}</span>
        </div>
        <span className="text-xs text-muted-foreground">{app.created_by_name}</span>
      </div>
      <ChevronRight className="size-4 text-muted-foreground shrink-0 mt-0.5" aria-hidden="true" />
    </Link>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TODAY ASSIGNMENT ROW
// ═══════════════════════════════════════════════════════════════════

function TodayAssignmentRow({ assignment }: { assignment: FreelancerAssignment }) {
  const geoMismatch = assignment.geo_check_in_match === false;
  const nameParts = assignment.freelancer_name.split(" ");

  const userCellUser = {
    last_name: nameParts[0] ?? "",
    first_name: nameParts[1] ?? "",
    middle_name: nameParts[2],
  };

  const statusLabel: Record<string, string> = {
    SCHEDULED: "Запланирован",
    CHECKED_IN: "Отметился",
    WORKING: "На объекте",
  };

  return (
    <div className="flex items-start justify-between gap-3 rounded-lg p-3 hover:bg-muted/50 transition-colors min-h-[44px]">
      <div className="flex flex-col gap-1 min-w-0 flex-1">
        <UserCell user={userCellUser} />
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground pl-[42px]">
          <span>{formatTime(assignment.scheduled_start)}–{formatTime(assignment.scheduled_end)}</span>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        {geoMismatch ? (
          <Badge
            variant="destructive"
            className="text-xs h-5 flex items-center gap-1"
          >
            <MapPinOff className="size-3" aria-hidden="true" />
            Не на объекте
          </Badge>
        ) : (
          <Badge
            variant="secondary"
            className="text-xs h-5"
          >
            {statusLabel[assignment.status] ?? assignment.status}
          </Badge>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

export function FreelanceDashboard() {
  const t = useTranslations("screen.freelanceDashboard");
  const tCommon = useTranslations("common");
  const { user } = useAuth();

  const isSupervisor = user.role === "SUPERVISOR";
  const isStoreDirector = user.role === "STORE_DIRECTOR";
  const isClientDirect =
    user.organization.payment_mode === "CLIENT_DIRECT";
  const externalHrEnabled = user.organization.external_hr_enabled;

  // ── Filters ────────────────────────────────────────────────────────
  const [period, setPeriod] = useState<PeriodFilter>("MONTH");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [storeFilter, setStoreFilter] = useState<string>("all");

  // ── Load state ─────────────────────────────────────────────────────
  const [status, setStatus] = useState<"loading" | "error" | "empty" | "success">("loading");
  const [data, setData] = useState<DashboardData | null>(null);

  // ── Store options ──────────────────────────────────────────────────
  const storeOptions: ComboboxOption[] = [
    { value: "all", label: "Все объекты" },
    ...(user.stores ?? []).map((s) => ({
      value: String(s.id),
      label: s.name,
    })),
  ];

  const sourceOptions: ComboboxOption[] = [
    { value: "all", label: t("filters.source_all") },
    { value: "INTERNAL", label: t("filters.source_internal") },
    { value: "EXTERNAL", label: t("filters.source_external") },
  ];

  // ── Period → budget period mapping ────────────────────────────────
  const budgetPeriod: BudgetPeriod =
    period === "DAY" ? "DAY" : period === "WEEK" ? "WEEK" : "MONTH";

  // ── Data fetch ─────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setStatus("loading");
    try {
      const storeIds =
        storeFilter !== "all"
          ? [Number(storeFilter)]
          : (user.stores ?? []).map((s) => s.id);

      const source: ApplicationSource | undefined =
        sourceFilter !== "all" ? (sourceFilter as ApplicationSource) : undefined;

      const [usageResult, appsResult] = await Promise.all([
        getBudgetUsage({ store_ids: storeIds, period: budgetPeriod }),
        getFreelanceApplications({
          status: "PENDING",
          source,
          page_size: 5,
          sort_by: "created_at",
          sort_dir: "desc",
        }),
      ]);

      // Today's assignments: from mock, filter by scheduled_date=today and correct statuses
      const todayAssignments = MOCK_FREELANCE_ASSIGNMENTS.filter(
        (a) =>
          a.scheduled_start.slice(0, 10) === MOCK_TODAY_ISO &&
          ["SCHEDULED", "CHECKED_IN", "WORKING"].includes(a.status)
      );

      const isDataEmpty =
        usageResult.data.length === 0 && appsResult.total === 0;

      setData({
        usages: usageResult.data,
        pendingApps: appsResult.data,
        pendingTotal: appsResult.total,
        todayAssignments,
      });
      setStatus(isDataEmpty ? "empty" : "success");
    } catch {
      setStatus("error");
    }
  }, [period, sourceFilter, storeFilter, budgetPeriod, user.stores]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Derived KPI totals ─────────────────────────────────────────────
  const kpiTotals = (() => {
    if (!data) return null;
    const budget = data.usages.reduce((s, u) => s + u.limit_amount, 0);
    const spent = data.usages.reduce((s, u) => s + u.actual_amount, 0);
    const remaining = data.usages.reduce(
      (s, u) => s + Math.max(0, u.limit_amount - u.actual_amount),
      0
    );
    const planned = data.usages.reduce((s, u) => s + u.planned_amount, 0);
    const forecastPct =
      planned > 0 ? Math.round(((spent - planned) / planned) * 100) : 0;
    const currency = data.usages[0]?.currency ?? "RUB";
    return { budget, spent, remaining, forecast: planned, forecastPct, currency };
  })();

  // ── Overspend alert ────────────────────────────────────────────────
  const overspentStores =
    data?.usages.filter((u) => u.overspend_pct >= 10) ?? [];

  // ── Budget table columns ───────────────────────────────────────────
  const budgetColumns: ColumnDef<BudgetUsage>[] = [
    {
      accessorKey: "store_name",
      header: t("budget_table.columns.object"),
      cell: ({ row }) => (
        <span className="font-medium text-foreground text-sm">
          {row.original.store_name}
        </span>
      ),
    },
    {
      id: "period",
      header: t("budget_table.columns.period"),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.period_start.slice(0, 7)}
        </span>
      ),
    },
    {
      accessorKey: "limit_amount",
      header: t("budget_table.columns.limit"),
      cell: ({ row }) => (
        <span className="text-sm tabular-nums">
          {formatCurrency(row.original.limit_amount, row.original.currency)}
        </span>
      ),
    },
    {
      accessorKey: "actual_amount",
      header: t("budget_table.columns.spent"),
      cell: ({ row }) => (
        <span className="text-sm tabular-nums">
          {formatCurrency(row.original.actual_amount, row.original.currency)}
        </span>
      ),
    },
    {
      accessorKey: "planned_amount",
      header: t("budget_table.columns.by_plan"),
      cell: ({ row }) => (
        <span className="text-sm tabular-nums text-muted-foreground">
          {formatCurrency(row.original.planned_amount, row.original.currency)}
        </span>
      ),
    },
    {
      id: "overspend",
      header: t("budget_table.columns.overspend"),
      cell: ({ row }) => {
        const { overspend, overspend_pct, currency } = row.original;
        if (overspend <= 0) return <span className="text-sm text-muted-foreground">—</span>;
        return (
          <span
            className={cn(
              "text-sm font-medium tabular-nums",
              overspend_pct >= 10 ? "text-destructive" : "text-warning"
            )}
          >
            +{formatCurrency(overspend, currency)} ({overspend_pct}%)
          </span>
        );
      },
    },
    {
      id: "status",
      header: t("budget_table.columns.status"),
      cell: ({ row }) => {
        const { overspend_pct } = row.original;
        if (overspend_pct >= 10)
          return (
            <Badge variant="destructive" className="text-xs">
              Перерасход
            </Badge>
          );
        if (overspend_pct > 0)
          return (
            <Badge
              className="text-xs bg-warning/10 text-warning border-warning/20"
              variant="outline"
            >
              Предупреждение
            </Badge>
          );
        return (
          <Badge
            className="text-xs bg-success/10 text-success border-success/20"
            variant="outline"
          >
            В норме
          </Badge>
        );
      },
    },
  ];

  // ── Row click handler ──────────────────────────────────────────────
  function handleBudgetRowClick(row: BudgetUsage) {
    const params = new URLSearchParams({
      store_id: String(row.store_id),
      date_from: row.period_start,
      date_to: row.period_end,
    });
    window.location.href = `${ADMIN_ROUTES.freelanceApplications}?${params.toString()}`;
  }

  // ── Render ─────────────────────────────────────────────────────────

  // Loading state
  if (status === "loading") {
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-36" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-9 w-52" />
          <Skeleton className="h-9 w-44" />
          <Skeleton className="h-9 w-44" />
        </div>
        <DashboardSkeleton />
      </div>
    );
  }

  // Error state
  if (status === "error") {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <AlertTriangle className="size-10 text-destructive" aria-hidden="true" />
        <p className="text-lg font-medium">{tCommon("error")}</p>
        <p className="text-sm text-muted-foreground">{tCommon("retry")}</p>
        <Button onClick={loadData} variant="outline" className="gap-2">
          <RefreshCw className="size-4" aria-hidden="true" />
          {tCommon("retry")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Banners ─────────────────────────────────────────────── */}

      {/* CLIENT_DIRECT info banner */}
      {isClientDirect && (
        <Alert className="border-info/20 bg-info/5">
          <Info className="size-4 text-info" aria-hidden="true" />
          <AlertDescription className="text-sm text-info">
            Режим: оплата клиентом самостоятельно. Стоимость отображается справочно по нормативам.
          </AlertDescription>
        </Alert>
      )}

      {/* Overspend alert */}
      {overspentStores.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" aria-hidden="true" />
          <AlertTitle>
            Перерасход на {overspentStores.length}{" "}
            {overspentStores.length === 1 ? "объекте" : "объектах"}. Согласование заявок по ним заблокировано.
          </AlertTitle>
          <AlertDescription>
            <Link
              href={`${ADMIN_ROUTES.freelanceApplications}?overspend=true`}
              className="underline underline-offset-2"
            >
              Смотреть список объектов с перерасходом →
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {/* ── Page header ─────────────────────────────────────────── */}
      <PageHeader
        title={t("page_title")}
        actions={
          !isStoreDirector && (
            <Button asChild size="sm" className="gap-2 min-h-[44px]">
              <Link href={ADMIN_ROUTES.freelanceApplicationNew}>
                <Plus className="size-4" aria-hidden="true" />
                <span>{t("actions.new_application")}</span>
              </Link>
            </Button>
          )
        }
      />

      {/* ── Filters ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Period segmented control */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground shrink-0 hidden sm:inline">
            {t("filters.period_label")}:
          </span>
          <ButtonGroup>
            {(["DAY", "WEEK", "MONTH"] as PeriodFilter[]).map((p) => (
              <Button
                key={p}
                size="sm"
                variant={period === p ? "default" : "outline"}
                onClick={() => setPeriod(p)}
                className="min-h-[44px] px-3 text-xs"
                aria-pressed={period === p}
              >
                {t(`filters.period_${p.toLowerCase()}` as "filters.period_day" | "filters.period_week" | "filters.period_month")}
              </Button>
            ))}
          </ButtonGroup>
        </div>

        {/* Source combobox — only if external_hr_enabled */}
        {externalHrEnabled && (
          <Combobox
            options={sourceOptions}
            value={sourceFilter}
            onValueChange={(v) => setSourceFilter(v || "all")}
            placeholder={t("filters.source_all")}
            className="w-44 min-h-[44px] text-xs"
          />
        )}

        {/* Store combobox */}
        {storeOptions.length > 2 && (
          <Combobox
            options={storeOptions}
            value={storeFilter}
            onValueChange={(v) => setStoreFilter(v || "all")}
            placeholder={t("filters.scope_label")}
            className="w-56 min-h-[44px] text-xs"
          />
        )}
      </div>

      {/* ── EMPTY STATE ─────────────────────────────────────────── */}
      {status === "empty" && (
        <EmptyState
          icon={Inbox}
          title="Внештат пока не используется"
          description="Создайте первую заявку, чтобы начать работу с модулем внештата."
          action={
            !isStoreDirector
              ? {
                  label: t("actions.new_application"),
                  href: ADMIN_ROUTES.freelanceApplicationNew,
                  icon: Plus,
                }
              : undefined
          }
        />
      )}

      {status === "success" && data && (
        <>
          {/* ── SECTION 1: KPI Cards ────────────────────────────── */}
          {kpiTotals && (
            <section aria-label="KPI бюджета внештата">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <KpiCard
                  label={
                    isClientDirect
                      ? `${t("kpi.budget")} (${t("kpi.client_direct_hint")})`
                      : t("kpi.budget")
                  }
                  value={formatCurrency(kpiTotals.budget, kpiTotals.currency)}
                  icon={Wallet}
                />
                <KpiCard
                  label={t("kpi.spent")}
                  value={formatCurrency(kpiTotals.spent, kpiTotals.currency)}
                  diff={
                    kpiTotals.forecast > 0
                      ? Math.round((kpiTotals.spent / kpiTotals.forecast - 1) * 100)
                      : undefined
                  }
                  icon={TrendingUp}
                />
                <KpiCard
                  label={t("kpi.remaining")}
                  value={formatCurrency(kpiTotals.remaining, kpiTotals.currency)}
                  icon={TrendingDown}
                />
                <KpiCard
                  label={t("kpi.forecast")}
                  value={formatCurrency(kpiTotals.forecast, kpiTotals.currency)}
                  diff={kpiTotals.forecastPct !== 0 ? kpiTotals.forecastPct : undefined}
                  icon={Clock}
                />
              </div>
            </section>
          )}

          {/* ── SECTION 2: Budget table ─────────────────────────── */}
          <section aria-label="Бюджеты по объектам">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{t("budget_table.title")}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ResponsiveDataTable
                  columns={budgetColumns}
                  data={data.usages}
                  isLoading={false}
                  isEmpty={data.usages.length === 0}
                  emptyMessage={{
                    title: "Лимиты бюджета не настроены",
                    description: isSupervisor
                      ? "Обратитесь к региональному менеджеру для настройки лимитов."
                      : "Настройте лимиты бюджета для объектов.",
                  }}
                  onRowClick={(row) => handleBudgetRowClick(row)}
                  mobileCardRender={(row) => (
                    <BudgetMobileCard
                      row={row}
                      onClick={() => handleBudgetRowClick(row)}
                    />
                  )}
                  className="[&_tr]:cursor-pointer"
                />

                {/* Empty state CTA for REGIONAL+ */}
                {data.usages.length === 0 && !isSupervisor && !isStoreDirector && (
                  <div className="flex justify-center py-4">
                    <Button asChild variant="outline" size="sm" className="gap-2">
                      <Link href={ADMIN_ROUTES.freelanceBudgetLimits}>
                        <Plus className="size-4" aria-hidden="true" />
                        Настроить лимит
                      </Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          {/* ── SECTION 3: Activity columns ─────────────────────── */}
          <section aria-label="Свежая активность">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {/* Left: Pending applications */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">На согласовании</CardTitle>
                    {data.pendingTotal > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {data.pendingTotal}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {data.pendingApps.length === 0 ? (
                    <div className="px-4 pb-4">
                      <EmptyState
                        icon={Inbox}
                        title="Нет заявок на согласовании"
                        description=""
                      />
                    </div>
                  ) : (
                    <>
                      <ul className="divide-y divide-border" role="list">
                        {data.pendingApps.map((app) => (
                          <li key={app.id} role="listitem">
                            <PendingApplicationRow app={app} />
                          </li>
                        ))}
                      </ul>
                      <div className="border-t border-border px-4 py-3">
                        <Link
                          href={`${ADMIN_ROUTES.freelanceApplications}?status=PENDING`}
                          className="flex items-center justify-between text-sm text-primary hover:underline"
                        >
                          <span>
                            Все на согласовании ({data.pendingTotal})
                          </span>
                          <ChevronRight className="size-4" aria-hidden="true" />
                        </Link>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Right: Today's assignments */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      Сегодня на объектах
                    </CardTitle>
                    {data.todayAssignments.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {data.todayAssignments.length}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {data.todayAssignments.length === 0 ? (
                    <div className="px-4 pb-4">
                      <EmptyState
                        icon={MapPin}
                        title="Сегодня нет выходов"
                        description="Нет запланированных исполнителей на сегодня."
                      />
                    </div>
                  ) : (
                    <>
                      <ul className="divide-y divide-border" role="list">
                        {data.todayAssignments.map((a) => (
                          <li key={a.id} role="listitem">
                            <TodayAssignmentRow assignment={a} />
                          </li>
                        ))}
                      </ul>
                      <div className="border-t border-border px-4 py-3">
                        <Link
                          href={`${ADMIN_ROUTES.freelanceServices}?date_from=${MOCK_TODAY_ISO}&date_to=${MOCK_TODAY_ISO}`}
                          className="flex items-center justify-between text-sm text-primary hover:underline"
                        >
                          <span>Все услуги сегодня</span>
                          <ChevronRight className="size-4" aria-hidden="true" />
                        </Link>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
