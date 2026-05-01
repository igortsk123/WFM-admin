/**
 * Goals API — macro-goal management with AI proposals.
 * AI proposals are static mocks with a fake 1.5s delay.
 */

import type {
  ApiResponse,
  ApiListResponse,
  ApiMutationResponse,
  ApiListParams,
  Goal,
  GoalStatus,
  User,
} from "@/lib/types";
import { MOCK_GOALS } from "@/lib/mock-data/future-placeholders";
import { MOCK_USERS } from "@/lib/mock-data/users";

const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

export interface GoalProposal extends Goal {
  potential_value: string;
}

export interface GoalProgress {
  current_value: number;
  target_value: number;
  days_left: number;
  eta_date: string;
  recommended_subtasks: string[];
}

// ═══════════════════════════════════════════════════════════════════
// LIST
// ═══════════════════════════════════════════════════════════════════

/**
 * Get paginated list of goals.
 * @endpoint GET /goals/list
 */
export async function getGoals(
  params: ApiListParams & {
    store_id?: number;
    status?: GoalStatus;
    period_start?: string;
    period_end?: string;
  } = {}
): Promise<ApiListResponse<Goal & { selected_by_user?: Pick<User, "id" | "first_name" | "last_name"> }>> {
  await delay(350);

  const { store_id, status, period_start, period_end, page = 1, page_size = 20 } = params;

  let filtered = [...MOCK_GOALS];

  if (store_id) filtered = filtered.filter((g) => g.store_id === store_id || g.scope === "NETWORK");
  if (status) filtered = filtered.filter((g) => g.status === status);
  if (period_start) filtered = filtered.filter((g) => g.period_start >= period_start);
  if (period_end) filtered = filtered.filter((g) => g.period_end <= period_end);

  const total = filtered.length;
  const paginated = filtered.slice((page - 1) * page_size, page * page_size);

  const data = paginated.map((g) => {
    const user = g.selected_by ? MOCK_USERS.find((u) => u.id === g.selected_by) : undefined;
    return {
      ...g,
      selected_by_user: user
        ? { id: user.id, first_name: user.first_name, last_name: user.last_name }
        : undefined,
    };
  });

  return { data, total, page, page_size };
}

/**
 * Get AI-proposed goals for a scope (static mock, 1.5s fake delay).
 * @endpoint GET /goals/ai-proposals
 */
export async function getGoalProposals(
  scope: { store_id?: number; organization_id?: string }
): Promise<ApiListResponse<GoalProposal>> {
  // Fake AI analysis delay
  await delay(1500);

  console.log("[v0] AI goal proposals requested for scope:", scope);

  const proposals: GoalProposal[] = MOCK_GOALS.filter(
    (g) => g.status === "PROPOSED"
  ).map((g) => ({
    ...g,
    potential_value: generatePotentialValue(g.category),
  }));

  return { data: proposals, total: proposals.length, page: 1, page_size: proposals.length };
}

function generatePotentialValue(category: Goal["category"]): string {
  const values: Record<string, string> = {
    OOS_REDUCTION: "−₽24 000 потерь продаж в неделю",
    WRITE_OFFS: "−₽18 500 списаний в неделю",
    PROMO_QUALITY: "+8% конверсии промо-зоны",
    PRICE_ACCURACY: "−0 жалоб на кассе",
    IMPULSE_ZONES: "+₽12 000 выручки в неделю",
    PRODUCTIVITY: "+5.4% задач вовремя",
    CUSTOM: "Эффект зависит от цели",
  };
  return values[category] ?? "Расчётный эффект доступен после активации";
}

// ═══════════════════════════════════════════════════════════════════
// ACTIONS
// ═══════════════════════════════════════════════════════════════════

/**
 * Accept an AI-proposed goal and activate it.
 * @endpoint POST /goals/:id/select
 */
export async function selectGoal(goalId: string): Promise<ApiMutationResponse> {
  await delay(400);
  const goal = MOCK_GOALS.find((g) => g.id === goalId);
  if (!goal) return { success: false, error: { code: "NOT_FOUND", message: `Goal ${goalId} not found` } };
  if (goal.status === "ACTIVE") return { success: false, error: { code: "ALREADY_ACTIVE", message: "Goal is already active" } };
  console.log("[v0] Selected goal:", goalId);
  return { success: true };
}

/**
 * Remove / deactivate a goal with an audit reason.
 * @endpoint POST /goals/:id/remove
 */
export async function removeGoal(goalId: string, reason: string): Promise<ApiMutationResponse> {
  await delay(400);
  if (!reason.trim()) {
    return { success: false, error: { code: "REASON_REQUIRED", message: "Reason is required for audit" } };
  }
  const goal = MOCK_GOALS.find((g) => g.id === goalId);
  if (!goal) return { success: false, error: { code: "NOT_FOUND", message: `Goal ${goalId} not found` } };
  console.log("[v0] Removed goal:", goalId, "reason:", reason);
  return { success: true };
}

/**
 * Create a manual goal (non-AI).
 * @endpoint POST /goals
 */
export async function createManualGoal(data: Partial<Goal>): Promise<ApiMutationResponse> {
  await delay(450);
  if (!data.title || !data.category) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Title and category are required" } };
  }
  const newId = `goal-manual-${Date.now()}`;
  console.log("[v0] Created manual goal:", newId, data);
  return { success: true, id: newId };
}

// ═══════════════════════════════════════════════════════════════════
// PROGRESS
// ═══════════════════════════════════════════════════════════════════

/**
 * Get goal progress details with ETA and recommended subtasks.
 * @endpoint GET /goals/:id/progress
 */
export async function getGoalProgress(goalId: string): Promise<ApiResponse<GoalProgress>> {
  await delay(350);

  const goal = MOCK_GOALS.find((g) => g.id === goalId);
  if (!goal) throw new Error(`Goal ${goalId} not found`);

  const periodEnd = new Date(goal.period_end);
  const today = new Date("2026-05-01");
  const daysLeft = Math.max(0, Math.round((periodEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));

  const etaDate = new Date(today.getTime() + daysLeft * 0.8 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  return {
    data: {
      current_value: goal.current_value,
      target_value: goal.target_value,
      days_left: daysLeft,
      eta_date: etaDate,
      recommended_subtasks: [
        "Провести внеплановый обход зоны",
        "Проверить ценники после последней выгрузки",
        "Сверить фактические остатки со складом",
        "Назначить бонусную задачу в приоритетную зону",
      ],
    },
  };
}
