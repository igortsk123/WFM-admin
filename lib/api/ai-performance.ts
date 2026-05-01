/**
 * AI Performance API — dashboards for AI quality monitoring and network goal overview.
 * Used by NETWORK_OPS to track AI suggestions effectiveness.
 */

import type {
  ApiResponse,
  ApiListResponse,
  ApiListParams,
  AIPerformanceMetrics,
  Store,
  Goal,
  User,
} from "@/lib/types";
import { MOCK_AI_SUGGESTIONS } from "@/lib/mock-data/ai-suggestions";
import { MOCK_GOALS } from "@/lib/mock-data/future-placeholders";
import { MOCK_STORES } from "@/lib/mock-data/stores";
import { MOCK_USERS } from "@/lib/mock-data/users";

const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

export type AiPerformanceScope = "NETWORK" | "REGION" | "SUPERVISOR_LIST" | "STORE";

export interface NetworkGoalStore extends Store {
  active_goal?: Goal & { trend_7d: number[]; days_left: number; set_by: User };
}

export interface SupervisorAiQuality {
  supervisor: User;
  stores_count: number;
  ai_metrics: AIPerformanceMetrics;
  alert?: "low_accept_rate" | "rejection_spike" | null;
}

// ═══════════════════════════════════════════════════════════════════
// AI PERFORMANCE
// ═══════════════════════════════════════════════════════════════════

/**
 * Get AI performance metrics for a given scope.
 * @endpoint GET /ai/performance
 */
export async function getAiPerformance(params: {
  scope_type: AiPerformanceScope;
  scope_id?: string | number;
  period_start: string;
  period_end: string;
}): Promise<ApiResponse<AIPerformanceMetrics>> {
  await delay(400);

  const { scope_type, scope_id, period_start, period_end } = params;

  const allSuggestions = MOCK_AI_SUGGESTIONS;
  const accepted = allSuggestions.filter((s) => s.status === "ACCEPTED").length;
  const rejected = allSuggestions.filter((s) => s.status === "REJECTED").length;
  const total = allSuggestions.length;

  // Reason aggregation from rejected suggestions
  const rejectedSuggestions = allSuggestions.filter((s) => s.status === "REJECTED" && s.decision_reason);
  const reasonCounts: Record<string, number> = {};
  rejectedSuggestions.forEach((s) => {
    const r = s.decision_reason ?? "Не указана";
    reasonCounts[r] = (reasonCounts[r] ?? 0) + 1;
  });
  const topRejectReasons = Object.entries(reasonCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([reason, count]) => ({ reason, count }));

  const acceptRate = total > 0 ? Math.round((accepted / total) * 1000) / 10 : 0;

  return {
    data: {
      scope_type,
      scope_id,
      period_start,
      period_end,
      suggestions_generated: total,
      suggestions_accepted: accepted,
      suggestions_rejected: rejected,
      accept_rate_pct: acceptRate,
      average_decision_time_min: 18,
      helpful_rate_pct: 73.2,
      top_reject_reasons: topRejectReasons,
      anomalies: acceptRate < 50
        ? [
            {
              type: "low_accept_rate",
              description: `Accept rate ${acceptRate}% is below the recommended 60% threshold.`,
              severity: "med",
            },
          ]
        : [],
    },
  };
}

// ═══════════════════════════════════════════════════════════════════
// NETWORK GOALS
// ═══════════════════════════════════════════════════════════════════

/**
 * Get all stores with their active goal status for network-level overview.
 * @endpoint GET /goals/network
 */
export async function getNetworkGoals(
  params: ApiListParams & {
    tenant_id?: string;
    region?: string;
    has_goal?: boolean;
  } = {}
): Promise<ApiListResponse<NetworkGoalStore>> {
  await delay(400);

  const { has_goal, region, page = 1, page_size = 20 } = params;

  let stores = MOCK_STORES.filter((s) => !s.archived);

  if (region) stores = stores.filter((s) => s.region.includes(region));

  const activeGoals = MOCK_GOALS.filter((g) => g.status === "ACTIVE");

  const enriched: NetworkGoalStore[] = stores.map((store) => {
    const activeGoal = activeGoals.find(
      (g) => g.scope === "NETWORK" || g.store_id === store.id
    );

    if (!activeGoal) return store;

    const setByUser = activeGoal.selected_by
      ? MOCK_USERS.find((u) => u.id === activeGoal.selected_by)
      : undefined;

    const periodEnd = new Date(activeGoal.period_end);
    const today = new Date("2026-05-01");
    const daysLeft = Math.max(0, Math.round((periodEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));

    // Fake 7-day trend
    const trend_7d = [6.2, 5.9, 5.8, 5.9, 5.7, 5.8, activeGoal.current_value];

    return {
      ...store,
      active_goal: {
        ...activeGoal,
        trend_7d,
        days_left: daysLeft,
        set_by: setByUser ?? MOCK_USERS[0],
      },
    };
  });

  const filtered = has_goal !== undefined
    ? enriched.filter((s) => has_goal ? !!s.active_goal : !s.active_goal)
    : enriched;

  const total = filtered.length;
  const data = filtered.slice((page - 1) * page_size, page * page_size);

  return { data, total, page, page_size };
}

// ═══════════════════════════════════════════════════════════════════
// SUPERVISORS AI QUALITY
// ═══════════════════════════════════════════════════════════════════

/**
 * Get per-supervisor AI quality metrics for network oversight.
 * @endpoint GET /goals/network/supervisors
 */
export async function getSupervisorsAiQuality(params: {
  period_start: string;
  period_end: string;
}): Promise<ApiListResponse<SupervisorAiQuality>> {
  await delay(450);

  const supervisors = MOCK_USERS.filter(
    (u) => !u.archived && u.type === "STAFF"
  ).slice(3, 7); // Use a few users as mock supervisors

  const { period_start, period_end } = params;

  const data: SupervisorAiQuality[] = supervisors.map((supervisor, idx) => {
    const acceptRate = [78, 31, 65, 82][idx] ?? 70;
    const generated = [18, 12, 24, 15][idx] ?? 15;
    const accepted = Math.round(generated * (acceptRate / 100));
    const rejected = generated - accepted;

    const alert: SupervisorAiQuality["alert"] =
      acceptRate < 40 ? "rejection_spike" : acceptRate < 55 ? "low_accept_rate" : null;

    return {
      supervisor,
      stores_count: [2, 3, 1, 2][idx] ?? 1,
      ai_metrics: {
        scope_type: "SUPERVISOR_LIST",
        scope_id: supervisor.id,
        period_start,
        period_end,
        suggestions_generated: generated,
        suggestions_accepted: accepted,
        suggestions_rejected: rejected,
        accept_rate_pct: acceptRate,
        average_decision_time_min: [12, 34, 8, 15][idx] ?? 15,
        top_reject_reasons: [],
      },
      alert,
    };
  });

  return { data, total: data.length, page: 1, page_size: 20 };
}
