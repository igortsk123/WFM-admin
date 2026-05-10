/**
 * Goals API — macro-goal management with AI proposals.
 * AI proposals are static mocks with a fake 1.5s delay.
 *
 * Backend swap notes:
 *  - `getGoalsOnBackend()` / `goalFromBackend()` — raw wrappers ready for
 *    REST swap once backend ships `/goals`. Signal sources транспортятся
 *    через `BackendGoal.ai_signal_source / ai_detection_method / ai_evidence`.
 *  - 3 signal sources (POS / ERP / Photo) — admin-only, описаны в
 *    `MIGRATION-NOTES.md` секция «AI-driven goals».
 */

import type {
  ApiResponse,
  ApiListResponse,
  ApiMutationResponse,
  ApiListParams,
  Goal,
  GoalStatus,
  User,
  AIEvidenceItem,
  AISignalSource,
  MoneyImpact,
} from "@/lib/types";
import { MOCK_GOALS } from "@/lib/mock-data/future-placeholders";
import { MOCK_USERS } from "@/lib/mock-data/users";
import type {
  BackendGoal,
  BackendAIEvidenceItem,
  BackendAISignalSource,
  BackendMoneyImpact,
} from "./_backend-types";

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

// ═══════════════════════════════════════════════════════════════════
// BACKEND WRAPPERS (admin-only, готовы к swap'у)
// ═══════════════════════════════════════════════════════════════════
//
// Когда backend дотянется до /goals, переключим getGoals() на
// getGoalsOnBackend() через NEXT_PUBLIC_USE_REAL_API. Сейчас функции
// зеркалят ожидаемый контракт + сериализацию AI-evidence.
//
// См. MIGRATION-NOTES.md → «AI-driven goals: 3 источника signal'ов».

/**
 * Maps a `BackendAIEvidenceItem` → admin `AIEvidenceItem`.
 * Главное отличие: backend использует `null` для отсутствующих полей,
 * admin — `undefined`. Мы нормализуем.
 */
export function aiEvidenceFromBackend(
  raw: BackendAIEvidenceItem,
): AIEvidenceItem {
  return {
    source: raw.source as AISignalSource,
    summary: raw.summary,
    summary_en: raw.summary_en ?? undefined,
    observed_from: raw.observed_from ?? undefined,
    observed_to: raw.observed_to ?? undefined,
    scope_hint: raw.scope_hint ?? undefined,
    scope_hint_en: raw.scope_hint_en ?? undefined,
    photo_url: raw.photo_url ?? undefined,
    photo_taken_by: raw.photo_taken_by ?? undefined,
    photo_taken_at: raw.photo_taken_at ?? undefined,
  };
}

/**
 * Maps a `BackendMoneyImpact` → admin `MoneyImpact`.
 * Сохраняем только поля без `null`, чтобы UI не получал null'ы из json'а.
 */
function moneyImpactFromBackend(
  raw: BackendMoneyImpact | null | undefined,
): MoneyImpact | undefined {
  if (!raw) return undefined;
  return {
    amount: raw.amount,
    period: raw.period,
    rationale_short: raw.rationale_short,
    rationale_breakdown: raw.rationale_breakdown,
    rationale_short_en: raw.rationale_short_en ?? undefined,
    rationale_breakdown_en: raw.rationale_breakdown_en ?? undefined,
    impact_type: raw.impact_type,
    significance_score: raw.significance_score ?? undefined,
  };
}

/**
 * Maps a `BackendGoal` → admin `Goal`.
 * Раскрывает AI-evidence + money_impact, нормализует null → undefined.
 */
export function goalFromBackend(raw: BackendGoal): Goal {
  return {
    id: raw.id,
    category: raw.category,
    title: raw.title,
    description: raw.description,
    title_en: raw.title_en ?? undefined,
    description_en: raw.description_en ?? undefined,
    starting_value: raw.starting_value ?? undefined,
    target_value: raw.target_value,
    target_unit: raw.target_unit,
    current_value: raw.current_value,
    direction: raw.direction ?? undefined,
    status: raw.status,
    store_id: raw.store_id ?? undefined,
    scope: raw.scope,
    proposed_by: raw.proposed_by,
    selected_by: raw.selected_by ?? undefined,
    selected_at: raw.selected_at ?? undefined,
    period_start: raw.period_start,
    period_end: raw.period_end,
    money_impact: moneyImpactFromBackend(raw.money_impact),
    ai_signal_source: (raw.ai_signal_source as AISignalSource | null) ?? undefined,
    ai_detection_method: raw.ai_detection_method ?? undefined,
    ai_detection_method_en: raw.ai_detection_method_en ?? undefined,
    ai_evidence: raw.ai_evidence
      ? raw.ai_evidence.map(aiEvidenceFromBackend)
      : undefined,
  };
}

/**
 * Stub raw wrapper for `GET /goals/list` — returns mocks until backend ships.
 * Когда backend завезёт /goals, заменим тело на fetch + map через goalFromBackend.
 *
 * @endpoint GET /goals/list (proposed, см. MIGRATION-NOTES)
 */
export async function getGoalsOnBackend(): Promise<{ goals: BackendGoal[] }> {
  await delay(50);
  // Пока backend не существует, возвращаем admin mocks как backend-shape.
  // Это нужно для типов / интеграционных тестов wrapper'а.
  const goals: BackendGoal[] = MOCK_GOALS.map((g) => ({
    id: g.id,
    category: g.category,
    title: g.title,
    description: g.description,
    title_en: g.title_en ?? null,
    description_en: g.description_en ?? null,
    starting_value: g.starting_value ?? null,
    target_value: g.target_value,
    target_unit: g.target_unit,
    current_value: g.current_value,
    direction: g.direction ?? null,
    status: g.status,
    store_id: g.store_id ?? null,
    scope: g.scope,
    proposed_by: g.proposed_by,
    selected_by: g.selected_by ?? null,
    selected_at: g.selected_at ?? null,
    period_start: g.period_start,
    period_end: g.period_end,
    money_impact: g.money_impact
      ? {
          amount: g.money_impact.amount,
          period: g.money_impact.period,
          rationale_short: g.money_impact.rationale_short,
          rationale_breakdown: g.money_impact.rationale_breakdown,
          rationale_short_en: g.money_impact.rationale_short_en ?? null,
          rationale_breakdown_en: g.money_impact.rationale_breakdown_en ?? null,
          impact_type: g.money_impact.impact_type,
          significance_score: g.money_impact.significance_score ?? null,
        }
      : null,
    ai_signal_source: (g.ai_signal_source as BackendAISignalSource) ?? null,
    ai_detection_method: g.ai_detection_method ?? null,
    ai_detection_method_en: g.ai_detection_method_en ?? null,
    ai_evidence: g.ai_evidence
      ? g.ai_evidence.map((ev) => ({
          source: ev.source as BackendAISignalSource,
          summary: ev.summary,
          summary_en: ev.summary_en ?? null,
          observed_from: ev.observed_from ?? null,
          observed_to: ev.observed_to ?? null,
          scope_hint: ev.scope_hint ?? null,
          scope_hint_en: ev.scope_hint_en ?? null,
          photo_url: ev.photo_url ?? null,
          photo_taken_by: ev.photo_taken_by ?? null,
          photo_taken_at: ev.photo_taken_at ?? null,
        }))
      : null,
  }));
  return { goals };
}
