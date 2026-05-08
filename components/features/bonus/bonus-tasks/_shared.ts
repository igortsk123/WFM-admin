import type { BonusTaskWithSource, ReplacedByBonusKpi } from "@/lib/api/bonus";
import { getBonusMetrics } from "@/lib/api/bonus";

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

export type PeriodFilter = "today" | "week" | "prev_week";
export type VisibilityMode = "SUMMARY_ONLY" | "ALWAYS_LIST";

export type BonusMetrics = Awaited<ReturnType<typeof getBonusMetrics>>["data"];

// ═══════════════════════════════════════════════════════════════════
// TRANSLATION HELPER TYPES
// ═══════════════════════════════════════════════════════════════════

export type BonusT = (key: string, values?: Record<string, string | number>) => string;
export type CommonT = (key: string) => string;

// ═══════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════

export const BONUS_SOURCE_COLORS: Record<string, string> = {
  YESTERDAY_INCOMPLETE: "bg-warning/15 text-warning border-warning/30",
  SUPERVISOR_BUDGET: "bg-info/15 text-info border-info/30",
  GOAL_LINKED: "bg-success/15 text-success border-success/30",
};

export const PERIOD_OPTIONS: PeriodFilter[] = ["today", "week", "prev_week"];

export const BONUS_SOURCES: Array<BonusTaskWithSource["bonus_source"]> = [
  "SUPERVISOR_BUDGET",
  "GOAL_LINKED",
  "YESTERDAY_INCOMPLETE",
];

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

export const fmtRub = (n: number, locale: string) =>
  new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(n);
