// ═══════════════════════════════════════════════════════════════════
// Shared helpers / constants for kpi-report split components
// ═══════════════════════════════════════════════════════════════════

export const PIE_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
  "var(--color-muted-foreground)",
];

export const WORK_TYPE_LABELS = [
  "Касса",
  "Выкладка",
  "Уборка",
  "КСО",
  "Контроль качества",
  "Инвентаризация",
  "Складские работы",
];

export const ALLOWED_ROLES = [
  "NETWORK_OPS",
  "REGIONAL",
  "SUPERVISOR",
  "STORE_DIRECTOR",
];

export function getBestWorkType(userId: number): string {
  return WORK_TYPE_LABELS[userId % WORK_TYPE_LABELS.length];
}

export interface TrendDatum {
  date: string;
  completion: number;
  on_time: number;
  plan: number;
  actual: number;
  deviation: number;
}

/** Subsample sparklines into 12 trend points with dates */
export function buildTrendData(
  sparkCompletion: number[],
  sparkOnTime: number[],
  sparkPlan: number[],
  sparkActual: number[]
): TrendDatum[] {
  const len = Math.min(sparkCompletion.length, 12);
  const step = Math.floor(sparkCompletion.length / len);
  return Array.from({ length: len }, (_, i) => {
    const idx = Math.min(i * step, sparkCompletion.length - 1);
    const day = new Date(2026, 3, 1 + i * 2);
    const planVal = sparkPlan[idx] ?? 0;
    const actualVal = sparkActual[idx] ?? 0;
    return {
      date: `${day.getDate()} апр`,
      completion: sparkCompletion[idx] ?? 0,
      on_time: sparkOnTime[idx] ?? 0,
      plan: planVal,
      actual: actualVal,
      deviation:
        planVal > 0
          ? Math.round(((actualVal - planVal) / planVal) * 1000) / 10
          : 0,
    };
  });
}
