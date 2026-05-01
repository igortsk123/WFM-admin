/**
 * Freelance Applications API — creation, approval workflows, budget simulation.
 * All mutations update related budget usages in-memory for demo consistency.
 */

import type {
  ApiResponse,
  ApiListResponse,
  ApiMutationResponse,
  ApiListParams,
  FreelanceApplication,
  ApplicationStatus,
  ApplicationSource,
  BudgetUsage,
} from "@/lib/types";
import { MOCK_FREELANCE_APPLICATIONS } from "@/lib/mock-data/freelance-applications";
import { MOCK_BUDGET_USAGES } from "@/lib/mock-data/freelance-budget-usage";

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));

const rand = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

/** Simulate occasional 500 errors on certain endpoints (~5%) */
const maybeError = () => Math.random() < 0.05;

/** Hourly rate lookup by work_type_id (mirrors ServiceNorm data for SUPERMARKET) */
const HOURLY_RATES: Record<number, number> = {
  2: 350,  // Касса
  4: 380,  // Выкладка
  5: 360,  // Переоценка
  6: 420,  // Инвентаризация
  12: 280, // Уборка
  13: 400, // Складские работы
};

function getHourlyRate(workTypeId: number): number {
  return HOURLY_RATES[workTypeId] ?? 350;
}

/** Mock budget check for store_id=1 in April (overspend demo) */
function isBudgetExceeded(storeId: number): boolean {
  const usage = MOCK_BUDGET_USAGES.find(
    (u) => u.store_id === storeId && u.overspend > 0
  );
  return !!usage;
}

// In-memory mutable copy so mutations reflect in the same session
let _applications = [...MOCK_FREELANCE_APPLICATIONS];

export function _resetApplicationsMock() {
  _applications = [...MOCK_FREELANCE_APPLICATIONS];
}

// ═══════════════════════════════════════════════════════════════════
// LIST & GET
// ═══════════════════════════════════════════════════════════════════

/**
 * Get paginated, filtered list of freelance applications.
 * @param params Filters: store_id, status, source, date_from, date_to, work_type_id, unassigned
 * @returns Paginated FreelanceApplication list
 * @endpoint GET /freelance/applications
 * @roles STORE_DIRECTOR (own store), SUPERVISOR / REGIONAL / NETWORK_OPS / HR_MANAGER
 */
export async function getFreelanceApplications(
  params: ApiListParams & {
    store_id?: number;
    status?: ApplicationStatus;
    source?: ApplicationSource;
    date_from?: string;
    date_to?: string;
    work_type_id?: number;
    unassigned?: boolean;
  } = {}
): Promise<ApiListResponse<FreelanceApplication>> {
  await delay(rand(200, 400));

  const {
    store_id,
    status,
    source,
    date_from,
    date_to,
    work_type_id,
    unassigned,
    search,
    page = 1,
    page_size = 20,
    sort_by = "created_at",
    sort_dir = "desc",
  } = params;

  let filtered = [..._applications];

  if (store_id) filtered = filtered.filter((a) => a.store_id === store_id);
  if (status) filtered = filtered.filter((a) => a.status === status);
  if (source) filtered = filtered.filter((a) => a.source === source);
  if (work_type_id) filtered = filtered.filter((a) => a.work_type_id === work_type_id);
  if (date_from) filtered = filtered.filter((a) => a.planned_date >= date_from);
  if (date_to) filtered = filtered.filter((a) => a.planned_date <= date_to);
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (a) =>
        a.store_name.toLowerCase().includes(q) ||
        a.work_type_name.toLowerCase().includes(q) ||
        a.created_by_name.toLowerCase().includes(q)
    );
  }
  if (unassigned === true) {
    // EXTERNAL APPROVED_FULL without assignments, or INTERNAL APPROVED without assignee
    filtered = filtered.filter(
      (a) =>
        (a.source === "EXTERNAL" && a.status === "APPROVED_FULL") ||
        (a.source === "INTERNAL" &&
          (a.status === "APPROVED_FULL" || a.status === "APPROVED_PARTIAL"))
    );
  }

  // Sort
  filtered.sort((a, b) => {
    const aVal = String(a[sort_by as keyof FreelanceApplication] ?? "");
    const bVal = String(b[sort_by as keyof FreelanceApplication] ?? "");
    const cmp = aVal.localeCompare(bVal);
    return sort_dir === "asc" ? cmp : -cmp;
  });

  const total = filtered.length;
  const start = (page - 1) * page_size;

  return { data: filtered.slice(start, start + page_size), total, page, page_size };
}

/**
 * Get full details for a single application including budget impact and history.
 * @param id Application ID
 * @returns Application + budget_usage array + simulated_cost + history events
 * @endpoint GET /freelance/applications/:id
 * @roles STORE_DIRECTOR (own), SUPERVISOR / REGIONAL / NETWORK_OPS / HR_MANAGER
 */
export async function getFreelanceApplicationById(
  id: string
): Promise<
  ApiResponse<
    FreelanceApplication & {
      budget_usage: BudgetUsage[];
      simulated_cost: number;
      history: Array<{
        occurred_at: string;
        actor_id: number;
        actor_name: string;
        action: string;
        comment?: string;
      }>;
    }
  >
> {
  await delay(rand(250, 450));

  const app = _applications.find((a) => a.id === id);
  if (!app) throw new Error(`Application ${id} not found`);

  const usage = MOCK_BUDGET_USAGES.filter((u) => u.store_id === app.store_id);
  const rate = getHourlyRate(app.work_type_id);
  const simulated_cost = (app.approved_hours ?? app.requested_hours) * rate;

  const history: Array<{
    occurred_at: string;
    actor_id: number;
    actor_name: string;
    action: string;
    comment?: string;
  }> = [
    {
      occurred_at: app.created_at,
      actor_id: app.created_by,
      actor_name: app.created_by_name,
      action: "CREATED",
    },
  ];

  if (app.decided_at && app.decided_by && app.decided_by_name) {
    const actionMap: Record<ApplicationStatus, string> = {
      APPROVED_FULL: "APPROVED_FULL",
      APPROVED_PARTIAL: "APPROVED_PARTIAL",
      REJECTED: "REJECTED",
      REPLACED_WITH_BONUS: "REPLACED_WITH_BONUS",
      MIXED: "APPROVED_MIXED",
      CANCELLED: "CANCELLED",
      DRAFT: "DRAFT",
      PENDING: "PENDING",
    };
    history.push({
      occurred_at: app.decided_at,
      actor_id: app.decided_by,
      actor_name: app.decided_by_name,
      action: actionMap[app.status] ?? app.status,
      comment: app.decision_comment ?? undefined,
    });
  }

  return { data: { ...app, budget_usage: usage, simulated_cost, history } };
}

// ═══════════════════════════════════════════════════════════════════
// CREATE
// ═══════════════════════════════════════════════════════════════════

/**
 * Create a new freelance application.
 * @param data store_id, planned_date, requested_hours, work_type_id, comment, urgent, retroactive
 * @returns New application ID
 * @endpoint POST /freelance/applications
 * @roles STORE_DIRECTOR, SUPERVISOR, REGIONAL, NETWORK_OPS
 * @note urgent=true or retroactive=true requires SUPERVISOR / REGIONAL / NETWORK_OPS (mock: 403 if store_director_creates_urgent)
 */
export async function createFreelanceApplication(data: {
  store_id: number;
  planned_date: string;
  requested_hours: number;
  work_type_id: number;
  comment?: string;
  urgent?: boolean;
  retroactive?: boolean;
  creator_role?: string; // supplied by UI context for mock validation
}): Promise<ApiMutationResponse> {
  await delay(rand(300, 500));

  const { store_id, planned_date, requested_hours, work_type_id, urgent, retroactive, creator_role } = data;

  if (!store_id || !planned_date || !requested_hours || !work_type_id) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: "store_id, planned_date, requested_hours and work_type_id are required" },
    };
  }

  if ((urgent || retroactive) && creator_role === "STORE_DIRECTOR") {
    return {
      success: false,
      error: {
        code: "FORBIDDEN",
        message: "Срочные и ретроактивные заявки могут создавать только SUPERVISOR / REGIONAL / NETWORK_OPS",
      },
    };
  }

  const newId = `app-${Date.now()}`;
  _applications = [
    ..._applications,
    {
      id: newId,
      source: "INTERNAL",
      status: "PENDING",
      store_id,
      store_name: `Объект #${store_id}`,
      planned_date,
      requested_hours,
      work_type_id,
      work_type_name: `Тип работ #${work_type_id}`,
      comment: data.comment,
      created_by: 0,
      created_by_name: "Текущий пользователь",
      created_by_role: (creator_role as FreelanceApplication["created_by_role"]) ?? "STORE_DIRECTOR",
      created_at: new Date().toISOString(),
      urgent: urgent ?? false,
      retroactive: retroactive ?? false,
    },
  ];

  return { success: true, id: newId };
}

// ═══════════════════════════════════════════════════════════════════
// APPROVE / REJECT / CANCEL
// ═══════════════════════════════════════════════════════════════════

/**
 * Fully approve a freelance application.
 * For INTERNAL applications with budget overspend → 409 BUDGET_EXCEEDED.
 * For EXTERNAL applications → passes with warning (budget is advisory only).
 * @param id Application ID
 * @param comment Optional approval comment
 * @returns Success / 409 budget exceeded / 403 for CLIENT_DIRECT pass-through
 * @endpoint POST /freelance/applications/:id/approve-full
 * @roles SUPERVISOR, REGIONAL, NETWORK_OPS
 */
export async function approveApplicationFull(
  id: string,
  comment?: string
): Promise<ApiMutationResponse> {
  await delay(rand(300, 500));

  const app = _applications.find((a) => a.id === id);
  if (!app) {
    return { success: false, error: { code: "NOT_FOUND", message: `Application ${id} not found` } };
  }
  if (app.status !== "PENDING") {
    return {
      success: false,
      error: { code: "INVALID_STATUS", message: `Cannot approve application in status ${app.status}` },
    };
  }

  // Budget block logic: source-based, NOT payment_mode-based
  if (app.source === "INTERNAL") {
    const budgetExceeded = isBudgetExceeded(app.store_id);
    if (budgetExceeded) {
      const usage = MOCK_BUDGET_USAGES.find((u) => u.store_id === app.store_id && u.overspend > 0);
      return {
        success: false,
        error: {
          code: "BUDGET_EXCEEDED",
          message: `Превышен месячный бюджет. Лимит: ${usage?.limit_amount.toLocaleString("ru")} ₽, факт: ${usage?.actual_amount.toLocaleString("ru")} ₽, перерасход ${usage?.overspend_pct}%. Согласование заблокировано.`,
        },
      };
    }
  }

  // EXTERNAL: passes with warning
  const warning =
    app.source === "EXTERNAL"
      ? "Заявка из внешней HR-системы, бюджет справочный"
      : undefined;

  _applications = _applications.map((a) =>
    a.id === id
      ? {
          ...a,
          status: "APPROVED_FULL" as ApplicationStatus,
          approved_hours: a.requested_hours,
          decided_by: 4,
          decided_by_name: "Романов И. А.",
          decided_at: new Date().toISOString(),
          decision_comment: comment ?? null,
        }
      : a
  );

  return { success: true, ...(warning ? { warning } : {}) };
}

/**
 * Partially approve a freelance application with fewer hours than requested.
 * @param id Application ID
 * @param approvedHours Hours approved (must be < requested_hours)
 * @param comment Optional comment
 * @returns Success or validation error
 * @endpoint POST /freelance/applications/:id/approve-partial
 * @roles SUPERVISOR, REGIONAL, NETWORK_OPS
 */
export async function approveApplicationPartial(
  id: string,
  approvedHours: number,
  comment?: string
): Promise<ApiMutationResponse> {
  await delay(rand(300, 450));

  const app = _applications.find((a) => a.id === id);
  if (!app) {
    return { success: false, error: { code: "NOT_FOUND", message: `Application ${id} not found` } };
  }
  if (app.status !== "PENDING") {
    return { success: false, error: { code: "INVALID_STATUS", message: `Cannot approve in status ${app.status}` } };
  }
  if (approvedHours >= app.requested_hours) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: "approvedHours must be less than requested_hours; use approve-full instead" },
    };
  }
  if (approvedHours <= 0) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "approvedHours must be > 0" } };
  }

  _applications = _applications.map((a) =>
    a.id === id
      ? {
          ...a,
          status: "APPROVED_PARTIAL" as ApplicationStatus,
          approved_hours: approvedHours,
          decided_by: 4,
          decided_by_name: "Романов И. А.",
          decided_at: new Date().toISOString(),
          decision_comment: comment ?? null,
        }
      : a
  );

  return { success: true };
}

/**
 * Reject a freelance application with a mandatory comment.
 * @param id Application ID
 * @param comment Rejection reason (min 10 chars)
 * @returns Success or validation error
 * @endpoint POST /freelance/applications/:id/reject
 * @roles SUPERVISOR, REGIONAL, NETWORK_OPS
 */
export async function rejectApplication(
  id: string,
  comment: string
): Promise<ApiMutationResponse> {
  await delay(rand(250, 400));

  if (!comment || comment.trim().length < 10) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Комментарий должен быть не менее 10 символов" },
    };
  }

  const app = _applications.find((a) => a.id === id);
  if (!app) {
    return { success: false, error: { code: "NOT_FOUND", message: `Application ${id} not found` } };
  }
  if (app.status !== "PENDING") {
    return { success: false, error: { code: "INVALID_STATUS", message: `Cannot reject in status ${app.status}` } };
  }

  _applications = _applications.map((a) =>
    a.id === id
      ? {
          ...a,
          status: "REJECTED" as ApplicationStatus,
          decided_by: 4,
          decided_by_name: "Романов И. А.",
          decided_at: new Date().toISOString(),
          decision_comment: comment,
        }
      : a
  );

  return { success: true };
}

/**
 * Replace a freelance application with bonus budget (REPLACED_WITH_BONUS status).
 * Creates a linked BonusBudget (mock side-effect).
 * @param id Application ID
 * @param comment Reason for replacement (min 10 chars)
 * @returns Success with new bonus budget ID
 * @endpoint POST /freelance/applications/:id/replace-with-bonus
 * @roles SUPERVISOR, REGIONAL, NETWORK_OPS
 */
export async function replaceWithBonus(
  id: string,
  comment: string
): Promise<ApiMutationResponse> {
  await delay(rand(300, 500));

  if (!comment || comment.trim().length < 10) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Комментарий должен быть не менее 10 символов" },
    };
  }

  const app = _applications.find((a) => a.id === id);
  if (!app) {
    return { success: false, error: { code: "NOT_FOUND", message: `Application ${id} not found` } };
  }
  if (app.status !== "PENDING") {
    return { success: false, error: { code: "INVALID_STATUS", message: `Cannot replace in status ${app.status}` } };
  }

  const bonusBudgetId = `budget-${Date.now()}`;
  _applications = _applications.map((a) =>
    a.id === id
      ? {
          ...a,
          status: "REPLACED_WITH_BONUS" as ApplicationStatus,
          decided_by: 4,
          decided_by_name: "Романов И. А.",
          decided_at: new Date().toISOString(),
          decision_comment: comment,
          replaced_with_bonus_budget_id: bonusBudgetId,
        }
      : a
  );

  return { success: true, id: bonusBudgetId };
}

/**
 * Approve an application as a mix: part freelance hours + part bonus hours.
 * freelanceHours + bonusHours must equal requested_hours.
 * @param id Application ID
 * @param freelanceHours Hours covered by freelance contract
 * @param bonusHours Hours covered by bonus budget
 * @param comment Explanation (min 10 chars)
 * @returns Success or validation error
 * @endpoint POST /freelance/applications/:id/approve-mixed
 * @roles SUPERVISOR, REGIONAL, NETWORK_OPS
 */
export async function approveMixed(
  id: string,
  freelanceHours: number,
  bonusHours: number,
  comment: string
): Promise<ApiMutationResponse> {
  await delay(rand(300, 500));

  if (!comment || comment.trim().length < 10) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Комментарий должен быть не менее 10 символов" },
    };
  }

  const app = _applications.find((a) => a.id === id);
  if (!app) {
    return { success: false, error: { code: "NOT_FOUND", message: `Application ${id} not found` } };
  }
  if (app.status !== "PENDING") {
    return { success: false, error: { code: "INVALID_STATUS", message: `Cannot approve-mixed in status ${app.status}` } };
  }
  if (freelanceHours + bonusHours !== app.requested_hours) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: `freelanceHours (${freelanceHours}) + bonusHours (${bonusHours}) must equal requested_hours (${app.requested_hours})`,
      },
    };
  }

  const bonusBudgetId = `budget-${Date.now()}`;
  _applications = _applications.map((a) =>
    a.id === id
      ? {
          ...a,
          status: "MIXED" as ApplicationStatus,
          approved_hours: app.requested_hours,
          mixed_freelance_hours: freelanceHours,
          mixed_bonus_hours: bonusHours,
          replaced_with_bonus_budget_id: bonusBudgetId,
          decided_by: 4,
          decided_by_name: "Романов И. А.",
          decided_at: new Date().toISOString(),
          decision_comment: comment,
        }
      : a
  );

  return { success: true, id: bonusBudgetId };
}

/**
 * Cancel a freelance application (only DRAFT or PENDING status).
 * @param id Application ID
 * @param reason Cancellation reason
 * @returns Success or error
 * @endpoint POST /freelance/applications/:id/cancel
 * @roles STORE_DIRECTOR (own), SUPERVISOR, REGIONAL, NETWORK_OPS
 */
export async function cancelApplication(
  id: string,
  reason: string
): Promise<ApiMutationResponse> {
  await delay(rand(200, 350));

  const app = _applications.find((a) => a.id === id);
  if (!app) {
    return { success: false, error: { code: "NOT_FOUND", message: `Application ${id} not found` } };
  }
  if (app.status !== "DRAFT" && app.status !== "PENDING") {
    return {
      success: false,
      error: { code: "INVALID_STATUS", message: "Only DRAFT or PENDING applications can be cancelled" },
    };
  }

  _applications = _applications.map((a) =>
    a.id === id
      ? {
          ...a,
          status: "CANCELLED" as ApplicationStatus,
          decision_comment: reason,
          decided_at: new Date().toISOString(),
          decided_by: 0,
          decided_by_name: "Текущий пользователь",
        }
      : a
  );

  return { success: true };
}

// ═══════════════════════════════════════════════════════════════════
// SIMULATE
// ═══════════════════════════════════════════════════════════════════

/**
 * Simulate approval cost and budget impact for a given number of hours.
 * Used in approval UI — user moves hour slider, sees live budget preview.
 * @param id Application ID
 * @param hours Hours to simulate
 * @returns Projected cost, after-approval budget usage, blocked flag
 * @endpoint POST /freelance/applications/:id/simulate
 * @roles SUPERVISOR, REGIONAL, NETWORK_OPS
 */
export async function simulateApplicationApproval(
  id: string,
  hours: number
): Promise<
  ApiResponse<{
    cost: number;
    currency: string;
    after_approval: BudgetUsage;
    blocked: boolean;
    blocked_reason?: string;
  }>
> {
  await delay(rand(600, 800)); // heavier endpoint

  if (maybeError()) {
    throw new Error("Временная ошибка сервера. Повторите попытку.");
  }

  const app = _applications.find((a) => a.id === id);
  if (!app) throw new Error(`Application ${id} not found`);

  const rate = getHourlyRate(app.work_type_id);
  const cost = hours * rate;

  const existing = MOCK_BUDGET_USAGES.find((u) => u.store_id === app.store_id) ?? {
    store_id: app.store_id,
    store_name: app.store_name,
    period: "MONTH" as const,
    period_start: "2026-05-01",
    period_end: "2026-05-31",
    limit_amount: 90000,
    planned_amount: 3000,
    actual_amount: 0,
    overspend: 0,
    overspend_pct: 0,
    currency: "RUB" as const,
  };

  const newActual = existing.actual_amount + cost;
  const newOverspend = Math.max(0, newActual - existing.limit_amount);
  const afterApproval: BudgetUsage = {
    ...existing,
    actual_amount: newActual,
    overspend: newOverspend,
    overspend_pct: newOverspend > 0 ? Math.round((newOverspend / existing.limit_amount) * 100) : 0,
  };

  // Block logic: only for INTERNAL source
  const blocked = app.source === "INTERNAL" && newActual > existing.limit_amount;
  const blocked_reason = blocked
    ? `После согласования бюджет превысит лимит на ${newOverspend.toLocaleString("ru")} ₽`
    : undefined;

  return { data: { cost, currency: existing.currency, after_approval: afterApproval, blocked, blocked_reason } };
}
