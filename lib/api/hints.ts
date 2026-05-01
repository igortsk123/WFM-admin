/**
 * Hints API - Task hints management for work types and zones.
 * Hints are contextual tips shown to workers during task execution.
 */

import type {
  ApiListResponse,
  ApiMutationResponse,
  Hint,
} from "@/lib/types";
import { MOCK_HINTS } from "@/lib/mock-data/hints";

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

const delay = (ms: number = 300) => new Promise((r) => setTimeout(r, ms));

// ═══════════════════════════════════════════════════════════════════
// CRUD OPERATIONS
// ═══════════════════════════════════════════════════════════════════

/**
 * Get hints for a specific work type and zone combination.
 * @param workTypeId Work type ID
 * @param zoneId Zone ID
 * @returns List of hints for the work type + zone
 * @endpoint GET /tasks/hints
 */
export async function getHints(
  workTypeId: number,
  zoneId: number
): Promise<ApiListResponse<Hint>> {
  await delay(250);

  const filtered = MOCK_HINTS.filter(
    (h) => h.work_type_id === workTypeId && h.zone_id === zoneId
  );

  return {
    data: filtered,
    total: filtered.length,
    page: 1,
    page_size: filtered.length,
  };
}

/**
 * Create a new hint.
 * @param data Partial hint data
 * @returns Success status with new hint ID
 * @endpoint POST /tasks/hints
 */
export async function createHint(
  data: Partial<Hint>
): Promise<ApiMutationResponse> {
  await delay(350);

  const { work_type_id, zone_id, text } = data;

  if (!work_type_id || !zone_id || !text?.trim()) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Work type, zone, and text are required",
      },
    };
  }

  // Check for duplicate hint
  const exists = MOCK_HINTS.some(
    (h) =>
      h.work_type_id === work_type_id &&
      h.zone_id === zone_id &&
      h.text.toLowerCase() === text.toLowerCase()
  );
  if (exists) {
    return {
      success: false,
      error: {
        code: "DUPLICATE_HINT",
        message: "A hint with this text already exists for this work type and zone",
      },
    };
  }

  const newId = Math.max(...MOCK_HINTS.map((h) => h.id)) + 1;
  console.log(`[v0] Created hint ${newId}:`, data);

  return {
    success: true,
    id: String(newId),
  };
}

/**
 * Update an existing hint.
 * @param id Hint ID
 * @param data Partial hint data to update
 * @returns Success status
 * @endpoint PATCH /tasks/hints/:id
 */
export async function updateHint(
  id: string,
  data: Partial<Hint>
): Promise<ApiMutationResponse> {
  await delay(300);

  const hint = MOCK_HINTS.find((h) => String(h.id) === id);
  if (!hint) {
    return {
      success: false,
      error: {
        code: "HINT_NOT_FOUND",
        message: `Hint with ID ${id} not found`,
      },
    };
  }

  if (data.text !== undefined && !data.text.trim()) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Hint text cannot be empty",
      },
    };
  }

  console.log(`[v0] Updated hint ${id}:`, data);
  return { success: true };
}

/**
 * Delete a hint.
 * @param id Hint ID
 * @returns Success status
 * @endpoint DELETE /tasks/hints/:id
 */
export async function deleteHint(id: string): Promise<ApiMutationResponse> {
  await delay(300);

  const hint = MOCK_HINTS.find((h) => String(h.id) === id);
  if (!hint) {
    return {
      success: false,
      error: {
        code: "HINT_NOT_FOUND",
        message: `Hint with ID ${id} not found`,
      },
    };
  }

  console.log(`[v0] Deleted hint ${id}`);
  return { success: true };
}
