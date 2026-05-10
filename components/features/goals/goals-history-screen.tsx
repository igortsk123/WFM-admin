"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  AlertCircle,
  ArrowRight,
  CalendarRange,
  CheckCircle2,
  Clock,
  Coins,
  History,
  Target,
  TrendingDown,
  XCircle,
} from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  EmptyState,
  KpiCardGrid,
  PageHeader,
  StatusBadge,
  type KpiCardItem,
  type StatusConfig,
} from "@/components/shared";
import { getGoals } from "@/lib/api/goals";
import { ADMIN_ROUTES } from "@/lib/constants/routes";
import type { Goal, Locale, User } from "@/lib/types";
import {
  formatCurrency,
  formatDate,
  formatNumber,
} from "@/lib/utils/format";
import { pickLocalized } from "@/lib/utils/locale-pick";

import { CategoryBadge } from "./goals-screen/category-badge";
import { compareByMoneyImpact } from "./goals-screen/sort-utils";
import { MOCK_SCOPE_OPTIONS, type GoalsT } from "./goals-screen/_shared";

// ═══════════════════════════════════════════════════════════════════
// LOCAL TYPES
// ═══════════════════════════════════════════════════════════════════

type StatusFilter = "all" | "achieved" | "archived";
type PeriodFilter = "30" | "90" | "365" | "all";
type ScopeFilter = string; // "network" | store id | "all"

type GoalRecord = Goal & {
  selected_by_user?: Pick<User, "id" | "first_name" | "last_name">;
};

type HistoryStatusKey = "achieved" | "missed";

// "Today" anchor matches mock-data convention (see goals.ts).
const TODAY = new Date("2026-05-01");

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

/** A historical goal is "achieved" if the final value reached the target,
 * accounting for direction. Otherwise it is considered "missed". */
function isGoalAchieved(goal: Goal): boolean {
  const direction = goal.direction
    ?? (goal.starting_value !== undefined && goal.target_value < goal.starting_value
      ? "decrease"
      : "increase");
  return direction === "decrease"
    ? goal.current_value <= goal.target_value
    : goal.current_value >= goal.target_value;
}

function daysBetween(startISO: string, endISO: string): number {
  const start = new Date(startISO).getTime();
  const end = new Date(endISO).getTime();
  return Math.max(0, Math.round((end - start) / (1000 * 60 * 60 * 24)));
}

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

export function GoalsHistoryScreen() {
  const t = useTranslations("screen.goalsHistory");
  const tGoals = useTranslations("screen.goals");
  const tCommon = useTranslations("common");
  const locale = useLocale() as Locale;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [goals, setGoals] = useState<GoalRecord[]>([]);

  // Filters
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("365");
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>("all");

  // ═══════════════════════════════════════════════════════════════════
  // FETCH
  // ═══════════════════════════════════════════════════════════════════

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        // Pull both completed & archived in two calls. getGoals is paginated;
        // mock dataset is small so we use the default page size.
        const [completedRes, archivedRes] = await Promise.all([
          getGoals({ status: "COMPLETED", page_size: 100 }),
          getGoals({ status: "ARCHIVED", page_size: 100 }),
        ]);
        if (cancelled) return;
        setGoals([...completedRes.data, ...archivedRes.data]);
      } catch {
        if (!cancelled) setError(tCommon("error"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchData();
    return () => {
      cancelled = true;
    };
  }, [tCommon]);

  // ═══════════════════════════════════════════════════════════════════
  // FILTERED LIST
  // ═══════════════════════════════════════════════════════════════════

  const filteredGoals = useMemo(() => {
    const filtered = goals.filter((g) => {
      // Status filter
      if (statusFilter === "achieved" && !isGoalAchieved(g)) return false;
      if (statusFilter === "archived" && g.status !== "ARCHIVED") return false;

      // Period filter (relative to TODAY, by period_end)
      if (periodFilter !== "all") {
        const days = parseInt(periodFilter, 10);
        const cutoff = new Date(TODAY);
        cutoff.setDate(cutoff.getDate() - days);
        if (new Date(g.period_end) < cutoff) return false;
      }

      // Scope filter
      if (scopeFilter !== "all") {
        if (scopeFilter === "network" && g.scope !== "NETWORK") return false;
        if (scopeFilter !== "network") {
          const storeId = parseInt(scopeFilter, 10);
          if (g.scope === "NETWORK") return false;
          if (g.store_id !== storeId) return false;
        }
      }

      return true;
    });
    // Sort by money desc → significance desc → id (см. sort-utils)
    return [...filtered].sort(compareByMoneyImpact);
  }, [goals, statusFilter, periodFilter, scopeFilter]);

  // ═══════════════════════════════════════════════════════════════════
  // KPI SUMMARY
  // ═══════════════════════════════════════════════════════════════════

  const summary = useMemo(() => {
    const total = filteredGoals.length;
    const achieved = filteredGoals.filter(isGoalAchieved).length;
    const successRate = total > 0 ? Math.round((achieved / total) * 100) : 0;

    // Money realized = sum of money_impact.amount for achieved goals
    const moneyRealized = filteredGoals
      .filter(isGoalAchieved)
      .reduce((sum, g) => sum + (g.money_impact?.amount ?? 0), 0);

    // Average duration (days) of finished goals
    const durations = filteredGoals.map((g) =>
      daysBetween(g.period_start, g.period_end),
    );
    const avgDays =
      durations.length > 0
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : 0;

    return { total, successRate, moneyRealized, avgDays };
  }, [filteredGoals]);

  const kpiItems: KpiCardItem[] = [
    {
      key: "total",
      label: t("summary.total"),
      value: formatNumber(summary.total, locale),
      icon: Target,
    },
    {
      key: "success",
      label: t("summary.success_rate"),
      value: `${summary.successRate}%`,
      icon: CheckCircle2,
    },
    {
      key: "money",
      label: t("summary.money_realized"),
      value: formatCurrency(summary.moneyRealized, locale),
      icon: Coins,
    },
    {
      key: "avg_days",
      label: t("summary.avg_duration"),
      value: t("summary.days_value", { days: summary.avgDays }),
      icon: Clock,
    },
  ];

  // ═══════════════════════════════════════════════════════════════════
  // STATUS BADGE CONFIG
  // ═══════════════════════════════════════════════════════════════════

  const statusBadgeConfig: StatusConfig<HistoryStatusKey> = {
    achieved: {
      label: t("status.achieved"),
      tone: "success",
    },
    missed: {
      label: t("status.missed"),
      tone: "destructive",
    },
  };

  // ═══════════════════════════════════════════════════════════════════
  // BREADCRUMBS
  // ═══════════════════════════════════════════════════════════════════

  const breadcrumbs = [
    { label: tGoals("breadcrumbs.home"), href: ADMIN_ROUTES.dashboard },
    { label: tGoals("breadcrumbs.goals"), href: ADMIN_ROUTES.goals },
    { label: t("breadcrumb") },
  ];

  // ═══════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={t("page_title")}
          subtitle={t("page_subtitle")}
          breadcrumbs={breadcrumbs}
        />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-xl bg-muted/50 animate-pulse"
            />
          ))}
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-32 rounded-xl bg-muted/50 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={t("page_title")}
          subtitle={t("page_subtitle")}
          breadcrumbs={breadcrumbs}
        />
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("page_title")}
        subtitle={t("page_subtitle")}
        breadcrumbs={breadcrumbs}
      />

      {/* KPI summary */}
      <KpiCardGrid items={kpiItems} columns={4} />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as StatusFilter)}
        >
          <SelectTrigger className="w-full sm:w-auto sm:min-w-[200px]">
            <CheckCircle2 className="size-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder={t("filters.status")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filters.status_all")}</SelectItem>
            <SelectItem value="achieved">{t("filters.status_achieved")}</SelectItem>
            <SelectItem value="archived">{t("filters.status_archived")}</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={periodFilter}
          onValueChange={(v) => setPeriodFilter(v as PeriodFilter)}
        >
          <SelectTrigger className="w-full sm:w-auto sm:min-w-[200px]">
            <CalendarRange className="size-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder={t("filters.period")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="30">{t("filters.period_30")}</SelectItem>
            <SelectItem value="90">{t("filters.period_90")}</SelectItem>
            <SelectItem value="365">{t("filters.period_365")}</SelectItem>
            <SelectItem value="all">{t("filters.period_all")}</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={scopeFilter}
          onValueChange={(v) => setScopeFilter(v)}
        >
          <SelectTrigger className="w-full sm:w-auto sm:min-w-[220px]">
            <Target className="size-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder={t("filters.scope")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filters.scope_all")}</SelectItem>
            {MOCK_SCOPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.id} value={opt.id}>
                {opt.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {filteredGoals.length === 0 ? (
        <EmptyState
          icon={History}
          title={t("empty_title")}
          description={t("empty_description")}
        />
      ) : (
        <div className="space-y-3">
          {filteredGoals.map((goal) => (
            <GoalHistoryCard
              key={goal.id}
              goal={goal}
              statusBadgeConfig={statusBadgeConfig}
              locale={locale}
              t={t}
              tGoals={tGoals}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// CARD SUB-COMPONENT
// ═══════════════════════════════════════════════════════════════════

interface GoalHistoryCardProps {
  goal: GoalRecord;
  statusBadgeConfig: StatusConfig<HistoryStatusKey>;
  locale: Locale;
  t: GoalsT;
  tGoals: GoalsT;
}

function GoalHistoryCard({
  goal,
  statusBadgeConfig,
  locale,
  t,
  tGoals,
}: GoalHistoryCardProps) {
  const achieved = isGoalAchieved(goal);
  const status: HistoryStatusKey = achieved ? "achieved" : "missed";
  const title = pickLocalized(goal.title, goal.title_en, locale);
  const description = pickLocalized(goal.description, goal.description_en, locale);

  const setBy = goal.selected_by_user
    ? `${goal.selected_by_user.first_name} ${goal.selected_by_user.last_name}`
    : null;

  const isArchived = goal.status === "ARCHIVED";
  const moneyAmount = goal.money_impact?.amount;
  const startingValue = goal.starting_value ?? goal.current_value;

  return (
    <Card className="rounded-xl">
      <CardContent className="p-4 sm:p-5 space-y-3">
        {/* Header row: category + statuses */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CategoryBadge category={goal.category} t={tGoals} />
          <div className="flex items-center gap-2">
            <StatusBadge status={status} config={statusBadgeConfig} />
            {isArchived && (
              <span
                className="inline-flex items-center gap-1 text-xs text-muted-foreground"
                title={t("status.archived_hint")}
              >
                <XCircle className="size-3.5" aria-hidden="true" />
                {tGoals("history.status_archived")}
              </span>
            )}
          </div>
        </div>

        {/* Title + description */}
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground leading-snug">
            {title}
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
            {description}
          </p>
        </div>

        {/* Was → became → target row */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs font-medium text-foreground">
            {tGoals("active_goal.narrative.was")}: {startingValue}
            {goal.target_unit}
          </span>
          <ArrowRight className="size-3.5 text-muted-foreground" aria-hidden="true" />
          <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs font-medium text-foreground">
            {tGoals("active_goal.narrative.now")}: {goal.current_value}
            {goal.target_unit}
          </span>
          <ArrowRight className="size-3.5 text-muted-foreground" aria-hidden="true" />
          <span
            className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold ${
              achieved
                ? "bg-success/10 text-success"
                : "bg-destructive/10 text-destructive"
            }`}
          >
            <Target className="size-3" aria-hidden="true" />
            {goal.target_value}
            {goal.target_unit}
          </span>
        </div>

        {/* Footer meta */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground border-t border-border pt-3">
          <span className="inline-flex items-center gap-1">
            <CalendarRange className="size-3.5" aria-hidden="true" />
            {formatDate(new Date(goal.period_start), locale)} —{" "}
            {formatDate(new Date(goal.period_end), locale)}
          </span>

          {moneyAmount !== undefined && moneyAmount > 0 && achieved && (
            <span className="inline-flex items-center gap-1 text-success">
              <Coins className="size-3.5" aria-hidden="true" />
              {t("card.money_realized")}: {formatCurrency(moneyAmount, locale)}
            </span>
          )}

          {moneyAmount !== undefined && moneyAmount > 0 && !achieved && (
            <span className="inline-flex items-center gap-1">
              <TrendingDown className="size-3.5" aria-hidden="true" />
              {t("card.money_potential")}: {formatCurrency(moneyAmount, locale)}
            </span>
          )}

          {setBy && (
            <span>
              {t("card.set_by", { user: setBy })}
            </span>
          )}

          <Button
            asChild
            variant="ghost"
            size="sm"
            className="ml-auto h-7 px-2 text-xs"
          >
            <a href={ADMIN_ROUTES.goalDetail(goal.id)}>
              {t("card.open")}
              <ArrowRight className="size-3 ml-1" aria-hidden="true" />
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
