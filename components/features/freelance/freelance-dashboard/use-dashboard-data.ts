"use client";

import { useState, useEffect, useCallback } from "react";

import { useAuth } from "@/lib/contexts/auth-context";
import { ADMIN_ROUTES } from "@/lib/constants/routes";
import { getBudgetUsage } from "@/lib/api/freelance-budget";
import { getFreelanceApplications } from "@/lib/api/freelance-applications";
import { MOCK_FREELANCE_ASSIGNMENTS } from "@/lib/mock-data/freelance-assignments";
import type {
  ApplicationSource,
  BudgetPeriod,
  BudgetUsage,
} from "@/lib/types";

import {
  MOCK_TODAY_ISO,
  type DashboardData,
  type DashboardStatus,
  type KpiTotals,
  type PeriodFilter,
} from "./_shared";

interface UseDashboardDataResult {
  status: DashboardStatus;
  data: DashboardData | null;
  period: PeriodFilter;
  setPeriod: (p: PeriodFilter) => void;
  sourceFilter: string;
  setSourceFilter: (v: string) => void;
  storeFilter: string;
  setStoreFilter: (v: string) => void;
  kpiTotals: KpiTotals | null;
  overspentStores: BudgetUsage[];
  reload: () => void;
  handleBudgetRowClick: (row: BudgetUsage) => void;
}

export function useDashboardData(): UseDashboardDataResult {
  const { user } = useAuth();

  // ── Filters ──────────────────────────────────────────────────────────────
  const [period, setPeriod] = useState<PeriodFilter>("MONTH");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [storeFilter, setStoreFilter] = useState<string>("all");

  // ── Load state ───────────────────────────────────────────────────────────
  const [status, setStatus] = useState<DashboardStatus>("loading");
  const [data, setData] = useState<DashboardData | null>(null);

  // ── Period → budget period mapping ──────────────────────────────────────
  const budgetPeriod: BudgetPeriod =
    period === "DAY" ? "DAY" : period === "WEEK" ? "WEEK" : "MONTH";

  // ── Data fetch ───────────────────────────────────────────────────────────
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
  }, [sourceFilter, storeFilter, budgetPeriod, user.stores]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Derived KPI totals ───────────────────────────────────────────────────
  const kpiTotals: KpiTotals | null = (() => {
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

  // ── Overspend list ───────────────────────────────────────────────────────
  const overspentStores =
    data?.usages.filter((u) => u.overspend_pct >= 10) ?? [];

  // ── Row click → navigate to applications filtered by store/period ───────
  function handleBudgetRowClick(row: BudgetUsage) {
    const params = new URLSearchParams({
      store_id: String(row.store_id),
      date_from: row.period_start,
      date_to: row.period_end,
    });
    window.location.href = `${ADMIN_ROUTES.freelanceApplications}?${params.toString()}`;
  }

  return {
    status,
    data,
    period,
    setPeriod,
    sourceFilter,
    setSourceFilter,
    storeFilter,
    setStoreFilter,
    kpiTotals,
    overspentStores,
    reload: loadData,
    handleBudgetRowClick,
  };
}
