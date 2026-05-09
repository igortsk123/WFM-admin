import type { PayoutPeriod, PayoutRow } from "@/lib/api/payouts";

// ─────────────────────────────────────────────────────────────────────────────
// SHARED TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type FilterMode = "all" | "anomalies" | "store" | "position";

export type PayoutPeriodWithRows = PayoutPeriod & { rows: PayoutRow[] };

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Threshold for marking a row as an anomaly (points above this value).
 * Mock heuristic — backend will replace with real anomaly detection.
 */
export const ANOMALY_POINTS_THRESHOLD = 1500;

/**
 * Bonus task value in points (mock — backend computes this).
 */
export const BONUS_TASK_POINTS = 150;

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

export function formatCurrency(amount: number): string {
  return (
    new Intl.NumberFormat("ru-RU", {
      style: "decimal",
      maximumFractionDigits: 0,
    }).format(amount) + " ₽"
  );
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat("ru", {
    day: "numeric",
    month: "short",
  }).format(date);
}

export function formatPoints(points: number): string {
  return new Intl.NumberFormat("ru-RU").format(points);
}

export function isAnomalyRow(row: PayoutRow): boolean {
  return row.points_earned > ANOMALY_POINTS_THRESHOLD;
}

export function userFromName(name: string): {
  last_name: string;
  first_name: string;
  middle_name?: string;
} {
  const parts = name.split(" ");
  return {
    last_name: parts[0] || "",
    first_name: parts[1] || "",
    middle_name: parts[2],
  };
}
