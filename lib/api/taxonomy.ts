/**
 * Taxonomy API — WorkTypes, Zones, Positions, ProductCategories.
 * Reference data used across tasks, scheduling, and permissions.
 */

import type {
  ApiResponse,
  ApiListResponse,
  ApiMutationResponse,
  ApiListParams,
  WorkType,
  Zone,
  Position,
  ProductCategory,
} from "@/lib/types";
import { MOCK_WORK_TYPES } from "@/lib/mock-data/work-types";
import { MOCK_ZONES } from "@/lib/mock-data/zones";
import { MOCK_POSITIONS } from "@/lib/mock-data/positions";
import { MOCK_PRODUCT_CATEGORIES } from "@/lib/mock-data/product-categories";
import { MOCK_TASKS } from "@/lib/mock-data/tasks";
import { MOCK_STORES } from "@/lib/mock-data/stores";

const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

export interface WorkTypeWithCount extends WorkType {
  /** Кол-во задач этого типа за все время (legacy alias). */
  tasks_count: number;
  /** Кол-во задач этого типа за последние 30 дней. */
  usage_count?: number;
}

/** Filter params для work-types list (chat 30). */
export interface WorkTypeListParams extends ApiListParams {
  /** Search по name / code / description. */
  search?: string;
  /** Группа (string из MOCK_WORK_TYPES.group). */
  group?: string;
  /** Фильтр по флагу requires_photo_default. */
  requires_photo?: boolean;
  /** Минимальное кол-во hints. */
  hints_min?: number;
}

export interface ZoneWithCounts extends Zone {
  tasks_count: number;
  stores_count: number;
}

export interface PositionWithCounts extends Position {
  employees_count: number;
  stores_count: number;
}

// ═══════════════════════════════════════════════════════════════════
// WORK TYPES
// ═══════════════════════════════════════════════════════════════════

/**
 * Get paginated list of work types with task counts + usage_count за 30 дней.
 * @endpoint GET /taxonomy/work-types
 */
export async function getWorkTypes(
  params: WorkTypeListParams = {}
): Promise<ApiListResponse<WorkTypeWithCount>> {
  await delay(300);

  const {
    search,
    group,
    requires_photo,
    hints_min,
    page = 1,
    page_size = 50,
    sort_by = "name",
    sort_dir = "asc",
  } = params;

  let filtered = [...MOCK_WORK_TYPES];

  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (w) =>
        w.name.toLowerCase().includes(q) ||
        w.code.toLowerCase().includes(q) ||
        (w.description?.toLowerCase().includes(q) ?? false),
    );
  }

  if (group) {
    filtered = filtered.filter((w) => w.group === group);
  }

  if (requires_photo !== undefined) {
    filtered = filtered.filter((w) => w.requires_photo_default === requires_photo);
  }

  if (hints_min !== undefined && hints_min > 0) {
    filtered = filtered.filter((w) => w.hints_count >= hints_min);
  }

  filtered.sort((a, b) => {
    const aVal = String(a[sort_by as keyof WorkType] ?? "");
    const bVal = String(b[sort_by as keyof WorkType] ?? "");
    const cmp = aVal.localeCompare(bVal);
    return sort_dir === "asc" ? cmp : -cmp;
  });

  const total = filtered.length;
  const paginated = filtered.slice((page - 1) * page_size, page * page_size);

  // Date threshold for usage_count (30 days back from TODAY=2026-05-01)
  const TODAY = new Date("2026-05-01T00:00:00+07:00");
  const cutoff = new Date(TODAY.getTime() - 30 * 24 * 60 * 60 * 1000);

  const data: WorkTypeWithCount[] = paginated.map((wt) => ({
    ...wt,
    tasks_count: MOCK_TASKS.filter((t) => t.work_type_id === wt.id && !t.archived).length,
    usage_count: MOCK_TASKS.filter(
      (t) =>
        t.work_type_id === wt.id &&
        !t.archived &&
        new Date(t.created_at) >= cutoff,
    ).length,
  }));

  return { data, total, page, page_size };
}

/**
 * Create a new work type.
 * @endpoint POST /taxonomy/work-types
 */
export async function createWorkType(data: Partial<WorkType>): Promise<ApiMutationResponse> {
  await delay(400);
  if (!data.name || !data.code) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Name and code are required" } };
  }
  const newId = Date.now();
  console.log("[v0] Created work type:", newId, data);
  return { success: true, id: String(newId) };
}

/**
 * Update work type.
 * @endpoint PATCH /taxonomy/work-types/:id
 */
export async function updateWorkType(id: number, data: Partial<WorkType>): Promise<ApiMutationResponse> {
  await delay(350);
  const wt = MOCK_WORK_TYPES.find((w) => w.id === id);
  if (!wt) return { success: false, error: { code: "NOT_FOUND", message: `WorkType ${id} not found` } };
  console.log("[v0] Updated work type:", id, data);
  return { success: true };
}

/**
 * Delete work type (only if no active tasks).
 * @endpoint DELETE /taxonomy/work-types/:id
 */
export async function deleteWorkType(id: number): Promise<ApiMutationResponse> {
  await delay(350);
  const activeTasks = MOCK_TASKS.filter((t) => t.work_type_id === id && !t.archived).length;
  if (activeTasks > 0) {
    return {
      success: false,
      error: { code: "HAS_DEPENDENCIES", message: `Cannot delete: ${activeTasks} active tasks use this work type` },
    };
  }
  console.log("[v0] Deleted work type:", id);
  return { success: true };
}

// ═══════════════════════════════════════════════════════════════════
// ZONES
// ═══════════════════════════════════════════════════════════════════

/**
 * Get list of zones, optionally scoped to a store or globally.
 * @endpoint GET /taxonomy/zones
 */
export async function getZones(
  params: ApiListParams & { store_id?: number; scope?: "GLOBAL" | "STORE" } = {}
): Promise<ApiListResponse<ZoneWithCounts>> {
  await delay(300);

  const { store_id, scope, search, page = 1, page_size = 50 } = params;

  let filtered = [...MOCK_ZONES];

  if (scope === "GLOBAL") filtered = filtered.filter((z) => !z.store_id);
  if (scope === "STORE") filtered = filtered.filter((z) => !!z.store_id);
  if (store_id) filtered = filtered.filter((z) => !z.store_id || z.store_id === store_id);

  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter((z) => z.name.toLowerCase().includes(q) || z.code.toLowerCase().includes(q));
  }

  const total = filtered.length;
  const paginated = filtered.slice((page - 1) * page_size, page * page_size);

  const data: ZoneWithCounts[] = paginated.map((zone) => ({
    ...zone,
    tasks_count: MOCK_TASKS.filter((t) => t.zone_id === zone.id && !t.archived).length,
    stores_count: zone.store_id ? 1 : MOCK_STORES.filter((s) => !s.archived).length,
  }));

  return { data, total, page, page_size };
}

/**
 * Create a new zone.
 * @endpoint POST /taxonomy/zones
 */
export async function createZone(data: Partial<Zone>): Promise<ApiMutationResponse> {
  await delay(400);
  if (!data.name || !data.code) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Name and code are required" } };
  }
  const newId = Date.now();
  console.log("[v0] Created zone:", newId, data);
  return { success: true, id: String(newId) };
}

/**
 * Update zone.
 * @endpoint PATCH /taxonomy/zones/:id
 */
export async function updateZone(id: number, data: Partial<Zone>): Promise<ApiMutationResponse> {
  await delay(350);
  const zone = MOCK_ZONES.find((z) => z.id === id);
  if (!zone) return { success: false, error: { code: "NOT_FOUND", message: `Zone ${id} not found` } };
  console.log("[v0] Updated zone:", id, data);
  return { success: true };
}

/**
 * Delete zone (only if no active tasks).
 * @endpoint DELETE /taxonomy/zones/:id
 */
export async function deleteZone(id: number): Promise<ApiMutationResponse> {
  await delay(350);
  const activeTasks = MOCK_TASKS.filter((t) => t.zone_id === id && !t.archived).length;
  if (activeTasks > 0) {
    return {
      success: false,
      error: { code: "HAS_DEPENDENCIES", message: `Cannot delete: ${activeTasks} active tasks use this zone` },
    };
  }
  console.log("[v0] Deleted zone:", id);
  return { success: true };
}

// ═══════════════════════════════════════════════════════════════════
// POSITIONS
// ═══════════════════════════════════════════════════════════════════

/**
 * Get list of formal HR positions.
 * @endpoint GET /taxonomy/positions
 */
export async function getPositions(
  params: ApiListParams = {}
): Promise<ApiListResponse<PositionWithCounts>> {
  await delay(250);

  const { search, page = 1, page_size = 50 } = params;

  let filtered = [...MOCK_POSITIONS];

  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (p) => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)
    );
  }

  const total = filtered.length;
  const paginated = filtered.slice((page - 1) * page_size, page * page_size);

  const data: PositionWithCounts[] = paginated.map((pos, idx) => ({
    ...pos,
    employees_count: 3 + idx * 2,
    stores_count: MOCK_STORES.filter((s) => !s.archived).length,
  }));

  return { data, total, page, page_size };
}

/**
 * Create a new position.
 * @endpoint POST /taxonomy/positions
 */
export async function createPosition(data: Partial<Position>): Promise<ApiMutationResponse> {
  await delay(400);
  if (!data.name || !data.code) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Name and code are required" } };
  }
  const newId = Date.now();
  console.log("[v0] Created position:", newId, data);
  return { success: true, id: String(newId) };
}

/**
 * Update position.
 * @endpoint PATCH /taxonomy/positions/:id
 */
export async function updatePosition(id: number, data: Partial<Position>): Promise<ApiMutationResponse> {
  await delay(350);
  const pos = MOCK_POSITIONS.find((p) => p.id === id);
  if (!pos) return { success: false, error: { code: "NOT_FOUND", message: `Position ${id} not found` } };
  console.log("[v0] Updated position:", id, data);
  return { success: true };
}

/**
 * Delete position.
 * @endpoint DELETE /taxonomy/positions/:id
 */
export async function deletePosition(id: number): Promise<ApiMutationResponse> {
  await delay(350);
  console.log("[v0] Deleted position:", id);
  return { success: true };
}

// ═══════════════════════════════════════════════════════════════════
// PRODUCT CATEGORIES
// ═══════════════════════════════════════════════════════════════════

/**
 * Get full list of product categories (53 LAMA categories for task tagging).
 * @endpoint GET /taxonomy/product-categories
 */
export async function getProductCategories(): Promise<ApiListResponse<ProductCategory>> {
  await delay(200);
  return {
    data: MOCK_PRODUCT_CATEGORIES,
    total: MOCK_PRODUCT_CATEGORIES.length,
    page: 1,
    page_size: MOCK_PRODUCT_CATEGORIES.length,
  };
}
