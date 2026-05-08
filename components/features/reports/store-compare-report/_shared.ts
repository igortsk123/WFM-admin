import type { useTranslations } from "next-intl";
import type {
  StoreComparisonRow,
  StoreQuadrant,
} from "@/lib/api/reports";

// ─────────────────────────────────────────────────────────
// Shared types
// ─────────────────────────────────────────────────────────

export type T = ReturnType<typeof useTranslations>;

export type ViewMode = "table" | "heatmap" | "scatter";

export type SortField = keyof Pick<
  StoreComparisonRow,
  | "store_name"
  | "completion_rate"
  | "return_rate"
  | "on_time_rate"
  | "hours_diff_pct"
  | "fot_diff_pct"
  | "rank"
>;

export type SortDir = "asc" | "desc" | "none";

export type MetricKey =
  | "completion_rate"
  | "return_rate"
  | "on_time_rate"
  | "hours_diff_pct"
  | "fot_diff_pct";

// ─────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────

export const QUADRANT_BADGE: Record<StoreQuadrant, string> = {
  LEADERS: "bg-success/10 text-success border-success/20",
  GROWING: "bg-accent/80 text-accent-foreground border-accent-foreground/20",
  STABLE: "bg-info/10 text-info border-info/20",
  DECLINING: "bg-warning/10 text-warning border-warning/20",
};

export const HEATMAP_METRICS: { key: MetricKey; inverted?: boolean }[] = [
  { key: "completion_rate" },
  { key: "return_rate", inverted: true },
  { key: "on_time_rate" },
  { key: "hours_diff_pct" },
  { key: "fot_diff_pct" },
];

export const SCATTER_METRIC_OPTS: MetricKey[] = [
  "completion_rate",
  "return_rate",
  "on_time_rate",
  "hours_diff_pct",
  "fot_diff_pct",
];

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

// Extract city from store name (last word before comma or at start)
export function extractCity(storeName: string): string {
  const lower = storeName.toLowerCase();
  if (lower.includes("томск")) return "Томск";
  if (lower.includes("кемерово")) return "Кемерово";
  if (lower.includes("новосибирск")) return "Новосибирск";
  return "—";
}

// Mock employees count derived from store_id
export function mockEmployees(storeId: number): number {
  const map: Record<number, number> = {
    1: 42, 2: 38, 3: 35, 4: 51, 5: 47, 6: 33, 7: 29, 8: 31,
  };
  return map[storeId] ?? 30;
}

// Mock tasks done derived from completion_rate
export function mockTasksDone(row: StoreComparisonRow): number {
  return Math.round(row.completion_rate * 3.2);
}

// ── Quintile coloring (5 buckets, success → neutral → warning) ────
export function getQuintileClass(
  value: number,
  allValues: number[],
  inverted = false,
): string {
  const sorted = [...allValues].sort((a, b) => a - b);
  const n = sorted.length;
  const rank = sorted.findIndex((v) => v >= value);
  const pct = rank / Math.max(n - 1, 1);
  // For normal metrics: top 20% = success, bottom 20% = warning
  // For inverted (return_rate, lower is better): flip
  const adjusted = inverted ? 1 - pct : pct;
  if (adjusted >= 0.8) return "bg-success/10 text-success";
  if (adjusted >= 0.6) return "bg-success/5 text-foreground";
  if (adjusted >= 0.4) return "";
  if (adjusted >= 0.2) return "bg-warning/5 text-foreground";
  return "bg-warning/10 text-warning";
}

// Heatmap cell color (0–1 normalized)
export function getHeatmapBg(norm: number): string {
  if (norm >= 0.8) return "bg-success/20";
  if (norm >= 0.6) return "bg-success/10";
  if (norm >= 0.4) return "bg-muted/30";
  if (norm >= 0.2) return "bg-warning/10";
  return "bg-warning/20";
}
