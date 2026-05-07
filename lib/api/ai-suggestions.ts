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
} from "@/lib/types";
import { MOCK_AI_SUGGESTIONS } from "@/lib/mock-data/ai-suggestions";

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
 * Returns the created entity (task / goal / bonus_task) ID.
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

  const entityTypeMap: Record<AISuggestionType, AcceptResult["created_entity_type"]> = {
    TASK_SUGGESTION: "task",
    GOAL_SUGGESTION: "goal",
    BONUS_TASK_SUGGESTION: "bonus_task",
    INSIGHT: "task",
  };

  const createdId = `${entityTypeMap[suggestion.type]}-from-ai-${Date.now()}`;

  return {
    data: {
      created_entity_type: entityTypeMap[suggestion.type],
      created_entity_id: createdId,
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
