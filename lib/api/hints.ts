/**
 * Hints API - Task hints management for work types and zones.
 * Hints are contextual tips shown to workers during task execution.
 */

import type {
  ApiListParams,
  ApiListResponse,
  ApiMutationResponse,
  ApiResponse,
  Hint,
} from "@/lib/types";
import { MOCK_HINTS } from "@/lib/mock-data/hints";
import { MOCK_WORK_TYPES } from "@/lib/mock-data/work-types";
import { MOCK_ZONES } from "@/lib/mock-data/zones";
import { WORK_TYPES_BY_ID, ZONES_BY_ID } from "@/lib/mock-data/_indexes";

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

// ═══════════════════════════════════════════════════════════════════
// HINTS MANAGEMENT (chat 33)
// ═══════════════════════════════════════════════════════════════════

/** Hint enriched with work-type / zone names для table view. */
export interface HintWithLabels extends Hint {
  work_type_name?: string;
  zone_name?: string;
}

/** Filter params для hints management screen. */
export interface HintsListParams extends ApiListParams {
  search?: string;
  work_type_id?: number;
  zone_id?: number;
  /** Только пары без подсказок (для filter «Без подсказок»). */
  empty_pairs_only?: boolean;
}

/** Coverage stats для hints management. */
export interface HintsCoverage {
  total_hints: number;
  covered_pairs: number;
  total_pairs: number;
  empty_pairs: Array<{
    work_type_id: number;
    work_type_name: string;
    zone_id: number;
    zone_name: string;
  }>;
}

/**
 * Get all hints with optional filters (for table view + management screen).
 * @endpoint GET /tasks/hints/list
 */
export async function getAllHints(
  params: HintsListParams = {},
): Promise<ApiListResponse<HintWithLabels>> {
  await delay(280);

  const {
    search,
    work_type_id,
    zone_id,
    page = 1,
    page_size = 50,
    sort_by = "created_at",
    sort_dir = "desc",
  } = params;

  let filtered = [...MOCK_HINTS];

  if (work_type_id) filtered = filtered.filter((h) => h.work_type_id === work_type_id);
  if (zone_id) filtered = filtered.filter((h) => h.zone_id === zone_id);
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter((h) => h.text.toLowerCase().includes(q));
  }

  filtered.sort((a, b) => {
    const aVal = String(a[sort_by as keyof Hint] ?? "");
    const bVal = String(b[sort_by as keyof Hint] ?? "");
    const cmp = aVal.localeCompare(bVal);
    return sort_dir === "asc" ? cmp : -cmp;
  });

  const total = filtered.length;
  const paginated = filtered.slice((page - 1) * page_size, page * page_size);

  const data: HintWithLabels[] = paginated.map((h) => ({
    ...h,
    work_type_name: WORK_TYPES_BY_ID.get(h.work_type_id)?.name,
    zone_name: ZONES_BY_ID.get(h.zone_id)?.name,
  }));

  return { data, total, page, page_size };
}

/**
 * Get hints coverage stats: how many WT×Zone pairs have hints, which are empty.
 * Используется в stats row на hints management screen.
 * @endpoint GET /tasks/hints/coverage
 */
export async function getHintsCoverage(): Promise<ApiResponse<HintsCoverage>> {
  await delay(220);

  // Globally-approved zones (для пар нужны только zones, доступные везде; локальные — отдельно).
  const globalZones = MOCK_ZONES.filter((z) => z.approved && !z.store_id);

  const covered_keys = new Set<string>();
  for (const h of MOCK_HINTS) covered_keys.add(`${h.work_type_id}:${h.zone_id}`);

  const empty_pairs: HintsCoverage["empty_pairs"] = [];
  let total_pairs = 0;

  for (const wt of MOCK_WORK_TYPES) {
    for (const z of globalZones) {
      total_pairs++;
      if (!covered_keys.has(`${wt.id}:${z.id}`)) {
        empty_pairs.push({
          work_type_id: wt.id,
          work_type_name: wt.name,
          zone_id: z.id,
          zone_name: z.name,
        });
      }
    }
  }

  return {
    data: {
      total_hints: MOCK_HINTS.length,
      covered_pairs: total_pairs - empty_pairs.length,
      total_pairs,
      empty_pairs,
    },
  };
}

/**
 * Reorder hints within a work-type × zone pair (drag-drop sort).
 * @endpoint POST /tasks/hints/reorder
 */
export async function reorderHints(
  workTypeId: number,
  zoneId: number,
  hintIds: number[],
): Promise<ApiMutationResponse> {
  await delay(220);
  console.log(`[v0] Reordered hints for WT=${workTypeId} Zone=${zoneId}:`, hintIds);
  return { success: true };
}

// ═══════════════════════════════════════════════════════════════════
// REAL BACKEND wrappers — /tasks/hints/* (svc_tasks)
// ═══════════════════════════════════════════════════════════════════

import { apiUrl as _hApiUrl } from "./_config";
import {
  backendGet as _hGet,
  backendPost as _hPost,
  backendPatch as _hPatch,
  backendDelete as _hDel,
} from "./_client";
import type {
  BackendHint,
  BackendHintListData,
  BackendHintCreate,
  BackendHintUpdate,
} from "./_backend-types";

/** GET /tasks/hints?work_type_id=&zone_id= — подсказки для пары. */
export async function getHintsFromBackend(
  workTypeId: number,
  zoneId: number,
): Promise<BackendHintListData> {
  return _hGet<BackendHintListData>(
    _hApiUrl("tasks", `/hints?work_type_id=${workTypeId}&zone_id=${zoneId}`),
  );
}

/** POST /tasks/hints — создание подсказки (только MANAGER). */
export async function createHintOnBackend(
  data: BackendHintCreate,
): Promise<BackendHint> {
  return _hPost<BackendHint>(_hApiUrl("tasks", `/hints`), data);
}

/** PATCH /tasks/hints/{id} — обновление текста (только MANAGER). */
export async function updateHintOnBackend(
  id: number,
  data: BackendHintUpdate,
): Promise<BackendHint> {
  return _hPatch<BackendHint>(_hApiUrl("tasks", `/hints/${id}`), data);
}

/** DELETE /tasks/hints/{id} — удалить подсказку (только MANAGER). */
export async function deleteHintOnBackend(id: number): Promise<void> {
  await _hDel(_hApiUrl("tasks", `/hints/${id}`));
}
