// ═══════════════════════════════════════════════════════════════════
// Shared helpers for plan-fact-report split components
// ═══════════════════════════════════════════════════════════════════

/** Color class for hours Δ% — positive = overrun = bad */
export function getDeltaHoursClass(deltaPct: number): string {
  if (deltaPct < -5) return "text-info font-medium";
  if (deltaPct <= 5) return "text-foreground";
  if (deltaPct <= 15) return "text-warning font-medium";
  return "text-destructive font-medium";
}

export function calcDeltaPct(planned: number, actual: number): number {
  if (planned === 0) return 0;
  return Math.round(((actual - planned) / planned) * 1000) / 10;
}

export function formatDeltaPct(pct: number): string {
  return pct > 0 ? `+${pct}%` : `${pct}%`;
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

export const ALLOWED_ROLES = ["NETWORK_OPS", "REGIONAL", "SUPERVISOR", "STORE_DIRECTOR"];
