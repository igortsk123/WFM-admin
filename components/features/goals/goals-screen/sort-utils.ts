import type { Goal, PilotWave } from "@/lib/types";

/**
 * Sort comparator for goal cards / proposals:
 * 1. `tier: "priority"` всегда сверху (foundation-цели из deep-research).
 * 2. Внутри priority — по `pilot_wave` (A → B → C → D).
 * 3. money_impact.amount desc (для money-целей).
 * 4. significance_score desc (для не-money tie-breaker).
 * 5. без impact — в самом низу.
 */
const WAVE_ORDER: Record<PilotWave, number> = { A: 0, B: 1, C: 2, D: 3 };

export function compareByMoneyImpact(a: Goal, b: Goal): number {
  const aPriority = a.tier === "priority" ? 0 : 1;
  const bPriority = b.tier === "priority" ? 0 : 1;
  if (aPriority !== bPriority) return aPriority - bPriority;

  if (a.tier === "priority" && b.tier === "priority") {
    const aWave = a.pilot_wave ? WAVE_ORDER[a.pilot_wave] : 99;
    const bWave = b.pilot_wave ? WAVE_ORDER[b.pilot_wave] : 99;
    if (aWave !== bWave) return aWave - bWave;
  }

  const aMoney =
    a.money_impact?.impact_type === "money"
      ? a.money_impact.amount
      : 0;
  const bMoney =
    b.money_impact?.impact_type === "money"
      ? b.money_impact.amount
      : 0;

  if (aMoney !== bMoney) return bMoney - aMoney;

  const aScore = a.money_impact?.significance_score ?? 0;
  const bScore = b.money_impact?.significance_score ?? 0;
  if (aScore !== bScore) return bScore - aScore;

  // Stable fallback — by id для детерминированности
  return a.id.localeCompare(b.id);
}
