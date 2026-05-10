/**
 * AI Suggestions API — review, accept, reject, and report on AI proposals.
 * SUPERVISOR / REGIONAL / NETWORK_OPS can accept/reject.
 * STORE_DIRECTOR sees read-only feed.
 */

import type {
  ApiResponse,
  ApiListResponse,
  ApiMutationResponse,
  ApiListParams,
  AISuggestion,
  AISuggestionType,
  AISuggestionStatus,
  AISuggestionPriority,
  Task,
  Goal,
  GoalCategory,
  BonusTaskSource,
} from "@/lib/types";
import { MOCK_AI_SUGGESTIONS } from "@/lib/mock-data/ai-suggestions";
import { createTask } from "./tasks";
import { createManualGoal } from "./goals";
import { createBonusTask } from "./bonus";

const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

export interface AISuggestionListParams extends ApiListParams {
  type?: AISuggestionType;
  status?: AISuggestionStatus;
  store_id?: number;
  supervisor_id?: number;
  priority?: AISuggestionPriority;
}

export interface AcceptResult {
  created_entity_type: "task" | "goal" | "bonus_task";
  created_entity_id: string;
  /** Заголовок созданной сущности — для отображения в toast/карточке */
  created_entity_title: string;
}

/** Поля, обязательные для каждого типа предложения, чтобы автоматически создать сущность. */
const REQUIRED_FIELDS_BY_TYPE: Record<
  Exclude<AISuggestionType, "INSIGHT">,
  string[]
> = {
  TASK_SUGGESTION: ["title", "store_id", "work_type_id"],
  GOAL_SUGGESTION: ["category", "target_value"],
  BONUS_TASK_SUGGESTION: ["title", "store_id", "bonus_points"],
};

/** Результат проверки готовности payload к авто-созданию. */
export interface PayloadReadiness {
  ready: boolean;
  /** Список отсутствующих обязательных полей. */
  missing: string[];
}

/**
 * Проверяет, достаточно ли в proposed_payload полей чтобы автоматически
 * создать сущность нужного типа. Используется UI чтобы решить — звать
 * accept-and-create или открыть форму для дозаполнения.
 */
export function checkSuggestionReadiness(
  suggestion: AISuggestion
): PayloadReadiness {
  if (suggestion.type === "INSIGHT") {
    return { ready: true, missing: [] };
  }
  const required = REQUIRED_FIELDS_BY_TYPE[suggestion.type];
  const payload = suggestion.proposed_payload ?? {};
  const missing = required.filter((field) => {
    const value = payload[field];
    return value === undefined || value === null || value === "";
  });
  return { ready: missing.length === 0, missing };
}

// ═══════════════════════════════════════════════════════════════════
// LIST & GET
// ═══════════════════════════════════════════════════════════════════

/**
 * Get paginated AI suggestions with filtering.
 * @endpoint GET /ai/suggestions
 */
export async function getAiSuggestions(
  params: AISuggestionListParams = {}
): Promise<ApiListResponse<AISuggestion>> {
  await delay(350);

  const {
    type,
    status,
    store_id,
    priority,
    search,
    page = 1,
    page_size = 20,
    sort_by = "created_at",
    sort_dir = "desc",
  } = params;

  let filtered = [...MOCK_AI_SUGGESTIONS];

  if (type) filtered = filtered.filter((s) => s.type === type);
  if (status) filtered = filtered.filter((s) => s.status === status);
  if (priority) filtered = filtered.filter((s) => s.priority === priority);
  if (store_id) filtered = filtered.filter((s) => s.target_object_ids.includes(store_id));

  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.rationale.toLowerCase().includes(q)
    );
  }

  filtered.sort((a, b) => {
    // Priority ordering for PENDING suggestions: high > medium > low
    if (sort_by === "priority") {
      const order = { high: 0, medium: 1, low: 2 };
      const cmp = order[a.priority] - order[b.priority];
      return sort_dir === "asc" ? cmp : -cmp;
    }
    const aVal = String(a[sort_by as keyof AISuggestion] ?? "");
    const bVal = String(b[sort_by as keyof AISuggestion] ?? "");
    const cmp = aVal.localeCompare(bVal);
    return sort_dir === "asc" ? cmp : -cmp;
  });

  const total = filtered.length;
  const data = filtered.slice((page - 1) * page_size, page * page_size);

  return { data, total, page, page_size };
}

/**
 * Get a single AI suggestion by ID.
 * @endpoint GET /ai/suggestions/:id
 */
export async function getSuggestionById(id: string): Promise<ApiResponse<AISuggestion>> {
  await delay(250);
  const suggestion = MOCK_AI_SUGGESTIONS.find((s) => s.id === id);
  if (!suggestion) throw new Error(`AI suggestion ${id} not found`);
  return { data: suggestion };
}

// ═══════════════════════════════════════════════════════════════════
// ACTIONS
// ═══════════════════════════════════════════════════════════════════

/**
 * Accept an AI suggestion, optionally with edits to the proposed payload.
 * Сценарий:
 *   1. Сливает edits с suggestion.proposed_payload.
 *   2. Вызывает createTask / createManualGoal / createBonusTask по type'у.
 *   3. Возвращает id созданной сущности — UI показывает toast со ссылкой.
 *   4. INSIGHT не создаёт ничего (это аналитическая заметка) — просто
 *      помечается как ACCEPTED ("полезно").
 * @endpoint POST /ai/suggestions/:id/accept
 */
export async function acceptAiSuggestion(
  id: string,
  edits?: Record<string, unknown>
): Promise<ApiResponse<AcceptResult>> {
  await delay(500);

  const suggestion = MOCK_AI_SUGGESTIONS.find((s) => s.id === id);
  if (!suggestion) throw new Error(`AI suggestion ${id} not found`);
  if (suggestion.status !== "PENDING" && suggestion.status !== "EDITED") {
    throw new Error(`Suggestion ${id} is already ${suggestion.status}`);
  }

  // INSIGHT — не создаём сущность, просто фиксируем "полезно".
  if (suggestion.type === "INSIGHT") {
    const insightId = `insight-ack-${Date.now()}`;
    return {
      data: {
        created_entity_type: "task",
        created_entity_id: insightId,
        created_entity_title: suggestion.title,
      },
    };
  }

  // Проверка обязательных полей — UI должен был отфильтровать заранее,
  // но дублируем здесь для прямых вызовов из bulk accept.
  const readiness = checkSuggestionReadiness(suggestion);
  if (!readiness.ready) {
    throw new Error(
      `Missing required fields for ${suggestion.type}: ${readiness.missing.join(", ")}`
    );
  }

  const merged: Record<string, unknown> = {
    ...suggestion.proposed_payload,
    ...edits,
  };

  if (suggestion.type === "TASK_SUGGESTION") {
    const taskData: Partial<Task> = {
      title: merged.title as string,
      store_id: merged.store_id as number,
      zone_id: (merged.zone_id as number) ?? 1,
      work_type_id: merged.work_type_id as number,
      planned_minutes: merged.planned_minutes as number | undefined,
      requires_photo: (merged.requires_photo as boolean) ?? false,
      acceptance_policy:
        (merged.acceptance_policy as Task["acceptance_policy"]) ?? "MANUAL",
      source: "AI",
    };
    const result = await createTask(taskData);
    if (!result.success || !result.id) {
      throw new Error(result.error?.message ?? "Failed to create task from suggestion");
    }
    return {
      data: {
        created_entity_type: "task",
        created_entity_id: result.id,
        created_entity_title: taskData.title ?? suggestion.title,
      },
    };
  }

  if (suggestion.type === "GOAL_SUGGESTION") {
    const goalData: Partial<Goal> = {
      title: suggestion.title,
      description: suggestion.description,
      category: merged.category as GoalCategory,
      target_value: merged.target_value as number,
      target_unit: (merged.target_unit as string) ?? "%",
      current_value: 0,
      scope: (merged.scope as Goal["scope"]) ?? "NETWORK",
      proposed_by: "AI",
    };
    const result = await createManualGoal(goalData);
    if (!result.success || !result.id) {
      throw new Error(result.error?.message ?? "Failed to create goal from suggestion");
    }
    return {
      data: {
        created_entity_type: "goal",
        created_entity_id: result.id,
        created_entity_title: goalData.title ?? suggestion.title,
      },
    };
  }

  // BONUS_TASK_SUGGESTION
  const bonusData: Partial<Task> & {
    bonus_points: number;
    bonus_source: BonusTaskSource;
    goal_id?: string;
  } = {
    title: merged.title as string,
    store_id: merged.store_id as number,
    work_type_id: merged.work_type_id as number,
    planned_minutes: merged.planned_minutes as number | undefined,
    bonus_points: merged.bonus_points as number,
    bonus_source: merged.goal_id ? "GOAL_LINKED" : "SUPERVISOR_BUDGET",
    goal_id: merged.goal_id as string | undefined,
    source: "AI",
  };
  const result = await createBonusTask(bonusData);
  if (!result.success || !result.id) {
    throw new Error(
      result.error?.message ?? "Failed to create bonus task from suggestion"
    );
  }
  return {
    data: {
      created_entity_type: "bonus_task",
      created_entity_id: result.id,
      created_entity_title: bonusData.title ?? suggestion.title,
    },
  };
}

/**
 * Reject an AI suggestion with a mandatory reason.
 * Reason is saved for audit and used to improve future suggestions.
 * @endpoint POST /ai/suggestions/:id/reject
 */
export async function rejectAiSuggestion(
  id: string,
  reason: string,
  comment?: string
): Promise<ApiMutationResponse> {
  await delay(400);

  if (!reason.trim()) {
    return { success: false, error: { code: "REASON_REQUIRED", message: "Rejection reason is required" } };
  }

  const suggestion = MOCK_AI_SUGGESTIONS.find((s) => s.id === id);
  if (!suggestion) return { success: false, error: { code: "NOT_FOUND", message: `Suggestion ${id} not found` } };
  if (suggestion.status !== "PENDING" && suggestion.status !== "EDITED") {
    return { success: false, error: { code: "INVALID_STATUS", message: `Suggestion is already ${suggestion.status}` } };
  }

  return { success: true };
}

/**
 * Save edits to a suggestion without accepting — marks status as EDITED.
 * @endpoint PATCH /ai/suggestions/:id
 */
export async function editAiSuggestion(
  id: string,
  edits: Record<string, unknown>
): Promise<ApiMutationResponse> {
  await delay(300);

  const suggestion = MOCK_AI_SUGGESTIONS.find((s) => s.id === id);
  if (!suggestion) return { success: false, error: { code: "NOT_FOUND", message: `Suggestion ${id} not found` } };

  return { success: true };
}

/**
 * Report a systemic AI quality issue to the development team.
 * Used by NETWORK_OPS to signal degraded AI quality for a scope.
 * @endpoint POST /ai/issues
 */
export async function reportAiIssue(
  scope: { scope_type: string; scope_id?: string | number },
  issue_type: string,
  period: { from: string; to: string },
  comment: string
): Promise<ApiMutationResponse> {
  await delay(400);
  if (!comment.trim()) {
    return { success: false, error: { code: "COMMENT_REQUIRED", message: "Comment is required for AI issue report" } };
  }
  return { success: true };
}
