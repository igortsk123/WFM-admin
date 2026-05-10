import type { Goal } from "@/lib/types";

/**
 * Sort comparator for goal cards / proposals:
 * 1. money_impact.amount desc (для money-целей)
 * 2. significance_score desc (для не-money tie-breaker)
 * 3. без impact — в самом низу
 */
export function compareByMoneyImpact(a: Goal, b: Goal): number {
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
