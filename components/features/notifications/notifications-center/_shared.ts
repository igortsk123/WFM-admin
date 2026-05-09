// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

export const PAGE_SIZE = 10;

export const PERIOD_OPTIONS = ["30d", "7d", "today", "all"] as const;
export type PeriodOption = (typeof PERIOD_OPTIONS)[number];

export type TabValue = "all" | "unread" | "ai" | "archived";

export const TAB_VALUES: readonly TabValue[] = [
  "all",
  "unread",
  "ai",
  "archived",
] as const;

export const CATEGORY_OPTIONS: ReadonlyArray<{
  value: string;
  labelKey: string;
}> = [
  { value: "all", labelKey: "filters.category_all" },
  { value: "TASK_REVIEW", labelKey: "category.TASK_REVIEW" },
  { value: "TASK_REJECTED", labelKey: "category.TASK_REJECTED" },
  { value: "TASK_STATE_CHANGED", labelKey: "category.TASK_STATE_CHANGED" },
  { value: "AI_SUGGESTION_NEW", labelKey: "category.AI_SUGGESTION_NEW" },
  { value: "AI_ANOMALY", labelKey: "category.AI_ANOMALY" },
  { value: "GENERIC", labelKey: "category.GENERIC" },
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

export function getPeriodDates(period: PeriodOption): {
  date_from?: string;
  date_to?: string;
} {
  const now = new Date();
  if (period === "today") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return { date_from: start.toISOString() };
  }
  if (period === "7d") {
    const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return { date_from: start.toISOString() };
  }
  if (period === "30d") {
    const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return { date_from: start.toISOString() };
  }
  return {};
}
