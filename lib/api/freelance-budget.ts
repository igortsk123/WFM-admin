/**
 * Freelance Budget API — limits and usage tracking.
 * In CLIENT_DIRECT mode, usage amounts are advisory (total_amount_indicative).
 * For INTERNAL source applications, budget still participates in approval blocking
 * regardless of payment_mode (see freelance-applications.ts for block logic).
 */

import type {
  ApiListResponse,
  ApiMutationResponse,
  ApiListParams,
  BudgetLimit,
  BudgetUsage,
  BudgetPeriod,
} from "@/lib/types";
import { MOCK_BUDGET_LIMITS } from "@/lib/mock-data/freelance-budget-limits";
import { MOCK_BUDGET_USAGES } from "@/lib/mock-data/freelance-budget-usage";

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));
const rand = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

// Mutable copies for demo mutations
let _limits = [...MOCK_BUDGET_LIMITS];

export function _resetBudgetMock() {
  _limits = [...MOCK_BUDGET_LIMITS];
}

// ═══════════════════════════════════════════════════════════════════
// BUDGET LIMITS
// ═══════════════════════════════════════════════════════════════════

/**
 * Get paginated list of budget limits.
 * @param params store_id filter
 * @returns Paginated BudgetLimit list
 * @endpoint GET /freelance/budget-limits
 * @roles REGIONAL, NETWORK_OPS (read), SUPERVISOR (read-only)
 */
export async function getBudgetLimits(
  params: ApiListParams & { store_id?: number } = {}
): Promise<ApiListResponse<BudgetLimit>> {
  await delay(rand(200, 400));

  const {
    store_id,
    search,
    page = 1,
    page_size = 20,
    sort_by = "store_id",
    sort_dir = "asc",
  } = params;

  let filtered = [..._limits];

  if (store_id) filtered = filtered.filter((l) => l.store_id === store_id);
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter((l) => l.store_name.toLowerCase().includes(q));
  }

  filtered.sort((a, b) => {
    const aVal = String(a[sort_by as keyof BudgetLimit] ?? "");
    const bVal = String(b[sort_by as keyof BudgetLimit] ?? "");
    const cmp = aVal.localeCompare(bVal);
    return sort_dir === "asc" ? cmp : -cmp;
  });

  const total = filtered.length;
  const start = (page - 1) * page_size;

  return { data: filtered.slice(start, start + page_size), total, page, page_size };
}

/**
 * Create a new budget limit for a store.
 * @param data Partial BudgetLimit data (store_id, period, amount, currency, valid_from required)
 * @returns New limit ID
 * @endpoint POST /freelance/budget-limits
 * @roles REGIONAL, NETWORK_OPS only (SUPERVISOR → 403)
 */
export async function createBudgetLimit(
  data: Partial<BudgetLimit>
): Promise<ApiMutationResponse> {
  await delay(rand(300, 500));

  const { store_id, period, amount, currency, valid_from } = data;

  if (!store_id || !period || !amount || !currency || !valid_from) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "store_id, period, amount, currency and valid_from are required",
      },
    };
  }

  if (amount <= 0) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: "amount must be greater than 0" },
    };
  }

  const newId = `bl-${Date.now()}`;
  _limits = [
    ..._limits,
    {
      id: newId,
      store_id,
      store_name: data.store_name ?? `Объект #${store_id}`,
      period,
      amount,
      currency,
      valid_from,
      valid_to: data.valid_to ?? null,
      set_by: 4,
      set_by_name: "Романов И. А.",
      set_at: new Date().toISOString(),
    },
  ];

  return { success: true, id: newId };
}

/**
 * Update an existing budget limit.
 * @param id Budget limit ID
 * @param data Fields to update (amount, valid_to, etc.)
 * @returns Success or not found
 * @endpoint PATCH /freelance/budget-limits/:id
 * @roles REGIONAL, NETWORK_OPS only (SUPERVISOR → 403)
 */
export async function updateBudgetLimit(
  id: string,
  data: Partial<BudgetLimit>
): Promise<ApiMutationResponse> {
  await delay(rand(250, 450));

  const limit = _limits.find((l) => l.id === id);
  if (!limit) {
    return { success: false, error: { code: "NOT_FOUND", message: `Budget limit ${id} not found` } };
  }

  if (data.amount !== undefined && data.amount <= 0) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: "amount must be greater than 0" },
    };
  }

  _limits = _limits.map((l) =>
    l.id === id
      ? { ...l, ...data, id, set_at: new Date().toISOString(), set_by: 4, set_by_name: "Романов И. А." }
      : l
  );

  return { success: true };
}

// ═══════════════════════════════════════════════════════════════════
// BUDGET USAGE
// ═══════════════════════════════════════════════════════════════════

/**
 * Get budget usage aggregates for stores in a given period.
 * Used in the dashboard and in the approval screen's budget widget.
 *
 * In CLIENT_DIRECT mode: amounts are advisory (total_amount_indicative semantics).
 * For INTERNAL source applications, these usages still participate in approval
 * blocking regardless of payment_mode. For EXTERNAL source → advisory only.
 *
 * @param params store_ids, period, period_start, period_end
 * @returns Paginated BudgetUsage list
 * @endpoint GET /freelance/budget-usage
 * @roles STORE_DIRECTOR (own store), SUPERVISOR, REGIONAL, NETWORK_OPS
 */
export async function getBudgetUsage(params: {
  store_ids?: number[];
  period?: BudgetPeriod;
  period_start?: string;
  period_end?: string;
}): Promise<ApiListResponse<BudgetUsage>> {
  await delay(rand(200, 400));

  const { store_ids, period, period_start, period_end } = params;

  let filtered = [...MOCK_BUDGET_USAGES];

  if (store_ids && store_ids.length > 0) {
    filtered = filtered.filter((u) => store_ids.includes(u.store_id));
  }
  if (period) {
    filtered = filtered.filter((u) => u.period === period);
  }
  if (period_start) {
    filtered = filtered.filter((u) => u.period_start >= period_start);
  }
  if (period_end) {
    filtered = filtered.filter((u) => u.period_end <= period_end);
  }

  return { data: filtered, total: filtered.length, page: 1, page_size: filtered.length };
}
