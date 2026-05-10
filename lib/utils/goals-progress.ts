/**
 * Goal progress helpers.
 *
 * Учитывают направление метрики (increase / decrease):
 * для убывающих метрик (OOS, списания, расхождения) прогресс
 * считается как `closedGap / totalGap`, где
 *   - totalGap = |target - starting|
 *   - closedGap = starting - current (для decrease) или current - starting (для increase)
 *
 * Если starting_value не задан — fallback на старую логику `current / target * 100`
 * (корректно только для растущих целей вроде PRODUCTIVITY).
 */

import type { Goal, GoalDirection } from "@/lib/types";

/** Источник для расчёта прогресса. Принимаем минимум что нужно. */
export interface GoalProgressInput {
  starting_value?: number;
  current_value: number;
  target_value: number;
  direction?: GoalDirection;
}

/**
 * Определить направление метрики.
 * Если задано явно — используем; иначе выводим из target vs starting:
 * target < starting → decrease, иначе increase.
 */
export function inferGoalDirection(goal: GoalProgressInput): GoalDirection {
  if (goal.direction) return goal.direction;
  if (typeof goal.starting_value === "number") {
    return goal.target_value < goal.starting_value ? "decrease" : "increase";
  }
  // Без starting_value направление не известно — по умолчанию increase
  // (старая логика была current/target).
  return "increase";
}

/**
 * Прогресс цели в процентах (0–100, округлён).
 *
 * Пример: starting=6.2, current=5.9, target=5.3, decrease
 *   totalGap = |5.3 - 6.2| = 0.9
 *   closedGap = 6.2 - 5.9 = 0.3
 *   progress = round(0.3 / 0.9 * 100) = 33%
 */
export function computeGoalProgress(goal: GoalProgressInput): number {
  const direction = inferGoalDirection(goal);

  // Без starting_value — fallback на старую логику.
  if (typeof goal.starting_value !== "number") {
    if (goal.target_value === 0) return 0;
    const ratio = (goal.current_value / goal.target_value) * 100;
    return Math.max(0, Math.min(100, Math.round(ratio)));
  }

  const totalGap = Math.abs(goal.target_value - goal.starting_value);
  if (totalGap === 0) return 100; // target == starting

  const closedGap =
    direction === "decrease"
      ? goal.starting_value - goal.current_value
      : goal.current_value - goal.starting_value;

  const ratio = (Math.max(0, closedGap) / totalGap) * 100;
  return Math.max(0, Math.min(100, Math.round(ratio)));
}

/**
 * Версия для случая, когда current_value пришёл свежий из getGoalProgress
 * (а starting/target — из самого Goal). Удобно в active-goal-banner.
 */
export function computeGoalProgressWithCurrent(
  goal: Pick<Goal, "starting_value" | "target_value" | "direction"> & {
    current_value?: number;
  },
  freshCurrent: number
): number {
  return computeGoalProgress({
    starting_value: goal.starting_value,
    current_value: freshCurrent,
    target_value: goal.target_value,
    direction: goal.direction,
  });
}
