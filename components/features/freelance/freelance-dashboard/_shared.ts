import type {
  BudgetUsage,
  FreelanceApplication,
  FreelancerAssignment,
} from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Mock "today" date — keeps dashboard data deterministic in development.
 * Matches `lib/mock-data/_today.ts` so cross-mock filtering is consistent.
 */
export const MOCK_TODAY_ISO = "2026-05-01";

// ─────────────────────────────────────────────────────────────────────────────
// SHARED TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type PeriodFilter = "DAY" | "WEEK" | "MONTH";

export interface DashboardData {
  usages: BudgetUsage[];
  pendingApps: FreelanceApplication[];
  pendingTotal: number;
  todayAssignments: FreelancerAssignment[];
}

export type DashboardStatus = "loading" | "error" | "empty" | "success";

export interface KpiTotals {
  budget: number;
  spent: number;
  remaining: number;
  forecast: number;
  forecastPct: number;
  currency: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

export function formatCurrency(amount: number, currency = "RUB"): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatTime(iso: string): string {
  return iso.slice(11, 16); // "HH:MM"
}

export function formatRelativeDate(iso: string): string {
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
