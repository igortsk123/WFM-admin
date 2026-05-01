/**
 * Bonus API — budget management, bonus tasks, and performance metrics.
 * AI proposals are static mocks (fake 1.5s delay).
 */

import type {
  ApiResponse,
  ApiListResponse,
  ApiMutationResponse,
  ApiListParams,
  BonusBudget,
  Task,
  BonusTaskSource,
  User,
} from "@/lib/types";
import { MOCK_BONUS_BUDGETS } from "@/lib/mock-data/future-placeholders";
import { MOCK_TASKS } from "@/lib/mock-data/tasks";
import { MOCK_USERS } from "@/lib/mock-data/users";
import { MOCK_STORES } from "@/lib/mock-data/stores";

const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

export interface BonusTaskWithSource extends Task {
  bonus_points: number;
  bonus_source: BonusTaskSource;
}

export interface BonusMetrics {
  distribution: {
    top_pct: number;
    avg_pct: number;
    low_pct: number;
  };
  top_performers: User[];
  avg_time_to_claim_min: number;
  coverage_pct: number;
  by_store: Array<{ store_id: number; avg_points_per_user: number }>;
  honest_curve_alert?: string;
}

// ═══════════════════════════════════════════════════════════════════
// BUDGETS
// ═══════════════════════════════════════════════════════════════════

/**
 * Get bonus budgets for a scope.
 * @endpoint GET /bonus/budgets
 */
export async function getBonusBudgets(
  scope: { store_id?: number; supervisor_id?: number } = {}
): Promise<ApiListResponse<BonusBudget>> {
  await delay(300);

  let filtered = [...MOCK_BONUS_BUDGETS];
  if (scope.store_id) filtered = filtered.filter((b) => b.store_id === scope.store_id);
  if (scope.supervisor_id) filtered = filtered.filter((b) => b.supervisor_id === scope.supervisor_id);

  return { data: filtered, total: filtered.length, page: 1, page_size: 50 };
}

/**
 * Update supervisor's bonus point budget for a period.
 * @endpoint PATCH /bonus/budgets
 */
export async function updateSupervisorBudget(
  storeId: number,
  totalPoints: number,
  periodStart: string,
  periodEnd: string
): Promise<ApiMutationResponse> {
  await delay(400);
  if (totalPoints < 0) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Total points must be non-negative" } };
  }
  console.log("[v0] Updated bonus budget for store:", storeId, { totalPoints, periodStart, periodEnd });
  return { success: true };
}

// ═══════════════════════════════════════════════════════════════════
// BONUS TASKS
// ═══════════════════════════════════════════════════════════════════

/**
 * Get paginated list of bonus tasks.
 * @endpoint GET /bonus/tasks
 */
export async function getBonusTasks(
  params: ApiListParams & {
    store_id?: number;
    status?: string;
    goal_id?: string;
  } = {}
): Promise<ApiListResponse<BonusTaskWithSource>> {
  await delay(350);

  const { store_id, goal_id, page = 1, page_size = 20 } = params;

  let filtered = MOCK_TASKS.filter((t) => t.type === "BONUS" && !t.archived);

  if (store_id) filtered = filtered.filter((t) => t.store_id === store_id);
  if (goal_id) filtered = filtered.filter((t) => t.goal_id === goal_id);

  const total = filtered.length;
  const paginated = filtered.slice((page - 1) * page_size, page * page_size);

  const data: BonusTaskWithSource[] = paginated.map((t) => ({
    ...t,
    bonus_points: t.bonus_points ?? 100,
    bonus_source: (t.source === "AI" ? "GOAL_LINKED" : "SUPERVISOR_BUDGET") as BonusTaskSource,
  }));

  return { data, total, page, page_size };
}

/**
 * Get AI proposals for bonus tasks (static mock, 1.5s fake delay).
 * @endpoint GET /bonus/ai-proposals
 */
export async function getBonusProposals(
  goalId?: string
): Promise<ApiListResponse<BonusTaskWithSource>> {
  // Fake AI analysis delay
  await delay(1500);

  console.log("[v0] AI bonus proposals requested for goal:", goalId);

  const proposals = MOCK_TASKS.filter((t) => t.type === "BONUS")
    .slice(0, 3)
    .map((t) => ({
      ...t,
      bonus_points: t.bonus_points ?? 150,
      bonus_source: "GOAL_LINKED" as BonusTaskSource,
    }));

  return { data: proposals, total: proposals.length, page: 1, page_size: 10 };
}

/**
 * Create a new bonus task (deducts from budget).
 * @endpoint POST /bonus/tasks
 */
export async function createBonusTask(
  data: Partial<Task> & { bonus_points: number; bonus_source: BonusTaskSource; goal_id?: string }
): Promise<ApiMutationResponse> {
  await delay(450);
  if (!data.title || !data.store_id) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Title and store are required" } };
  }
  if (data.bonus_points <= 0) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Bonus points must be positive" } };
  }
  const newId = `bonus-task-${Date.now()}`;
  console.log("[v0] Created bonus task:", newId, data);
  return { success: true, id: newId };
}

/**
 * Remove a bonus task — points are returned to the budget.
 * @endpoint POST /bonus/tasks/:id/remove
 */
export async function removeBonusTask(id: string, reason: string): Promise<ApiMutationResponse> {
  await delay(400);
  if (!reason.trim()) {
    return { success: false, error: { code: "REASON_REQUIRED", message: "Reason is required" } };
  }
  console.log("[v0] Removed bonus task:", id, "reason:", reason);
  return { success: true };
}

// ═══════════════════════════════════════════════════════════════════
// METRICS
// ═══════════════════════════════════════════════════════════════════

/**
 * Get bonus program performance metrics.
 * @endpoint GET /bonus/metrics
 */
export async function getBonusMetrics(
  scope: { store_id?: number; period_start?: string; period_end?: string } = {}
): Promise<ApiResponse<BonusMetrics>> {
  await delay(400);

  console.log("[v0] Bonus metrics scope:", scope);

  const topPerformers = MOCK_USERS.filter((u) => !u.archived && u.type === "STAFF").slice(0, 3);
  const byStore = MOCK_STORES.filter((s) => !s.archived).slice(0, 5).map((s) => ({
    store_id: s.id,
    avg_points_per_user: Math.round(800 + Math.random() * 400),
  }));

  return {
    data: {
      distribution: {
        top_pct: 15,
        avg_pct: 62,
        low_pct: 23,
      },
      top_performers: topPerformers,
      avg_time_to_claim_min: 12,
      coverage_pct: 78,
      by_store: byStore,
      honest_curve_alert:
        scope.store_id === 4
          ? "Распределение у СПАР-НСК-001 смещено: топ 2 сотрудника получают 60% баллов. Проверить равномерность задач."
          : undefined,
    },
  };
}
