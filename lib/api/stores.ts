/**
 * Stores API — CRUD for store/workshop/department objects.
 */

import type {
  ApiResponse,
  ApiListResponse,
  ApiMutationResponse,
  ApiListParams,
  Store,
  User,
} from "@/lib/types";
import { MOCK_STORES } from "@/lib/mock-data/stores";
import { MOCK_USERS } from "@/lib/mock-data/users";
import { MOCK_SHIFTS } from "@/lib/mock-data/shifts";

const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

export interface StoreWithStats extends Store {
  employees_count: number;
  active_shifts_count: number;
  manager_name?: string;
}

export interface StoreDetail extends StoreWithStats {
  supervisor?: Pick<User, "id" | "first_name" | "last_name" | "avatar_url">;
  manager?: Pick<User, "id" | "first_name" | "last_name" | "avatar_url">;
}

export interface StoreListParams extends ApiListParams {
  city?: string;
  store_type?: string;
  active?: boolean;
}

// ═══════════════════════════════════════════════════════════════════
// LIST & GET
// ═══════════════════════════════════════════════════════════════════

/**
 * Get paginated list of stores with employee and shift counts.
 * @endpoint GET /stores/list
 */
export async function getStores(
  params: StoreListParams = {}
): Promise<ApiListResponse<StoreWithStats>> {
  await delay(350);

  const {
    city,
    store_type,
    active,
    search,
    page = 1,
    page_size = 20,
    sort_by = "name",
    sort_dir = "asc",
  } = params;

  let filtered = MOCK_STORES.filter((s) => !s.archived);

  if (city) filtered = filtered.filter((s) => s.city === city);
  if (store_type) filtered = filtered.filter((s) => s.store_type === store_type);
  if (active !== undefined) filtered = filtered.filter((s) => s.active === active);

  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.address.toLowerCase().includes(q) ||
        s.city.toLowerCase().includes(q)
    );
  }

  filtered.sort((a, b) => {
    const aVal = String(a[sort_by as keyof Store] ?? "");
    const bVal = String(b[sort_by as keyof Store] ?? "");
    const cmp = aVal.localeCompare(bVal);
    return sort_dir === "asc" ? cmp : -cmp;
  });

  const total = filtered.length;
  const paginated = filtered.slice((page - 1) * page_size, page * page_size);

  const enriched: StoreWithStats[] = paginated.map((store) => {
    const employees = MOCK_USERS.filter(
      (u) => !u.archived && u.type === "STAFF"
    ).length;
    const activeShifts = MOCK_SHIFTS.filter(
      (s) => s.store_id === store.id && s.status === "OPENED"
    ).length;
    const manager = store.manager_id
      ? MOCK_USERS.find((u) => u.id === store.manager_id)
      : undefined;
    return {
      ...store,
      employees_count: Math.max(0, employees - store.id * 3 + 15),
      active_shifts_count: activeShifts,
      manager_name: manager
        ? `${manager.last_name} ${manager.first_name}`
        : undefined,
    };
  });

  return { data: enriched, total, page, page_size };
}

/**
 * Get single store by ID with full detail and staff info.
 * @endpoint GET /stores/:id
 */
export async function getStoreById(id: number): Promise<ApiResponse<StoreDetail>> {
  await delay(350);

  const store = MOCK_STORES.find((s) => s.id === id);
  if (!store) throw new Error(`Store with ID ${id} not found`);

  const manager = store.manager_id
    ? MOCK_USERS.find((u) => u.id === store.manager_id)
    : undefined;
  const supervisor = store.supervisor_id
    ? MOCK_USERS.find((u) => u.id === store.supervisor_id)
    : undefined;

  const employees_count = Math.max(0, MOCK_USERS.filter((u) => !u.archived && u.type === "STAFF").length - store.id * 3 + 15);
  const active_shifts_count = MOCK_SHIFTS.filter(
    (s) => s.store_id === store.id && s.status === "OPENED"
  ).length;

  return {
    data: {
      ...store,
      employees_count,
      active_shifts_count,
      manager_name: manager ? `${manager.last_name} ${manager.first_name}` : undefined,
      manager: manager
        ? {
            id: manager.id,
            first_name: manager.first_name,
            last_name: manager.last_name,
            avatar_url: manager.avatar_url,
          }
        : undefined,
      supervisor: supervisor
        ? {
            id: supervisor.id,
            first_name: supervisor.first_name,
            last_name: supervisor.last_name,
            avatar_url: supervisor.avatar_url,
          }
        : undefined,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════
// CRUD
// ═══════════════════════════════════════════════════════════════════

/**
 * Create a new store / object.
 * @endpoint POST /stores
 */
export async function createStore(data: Partial<Store>): Promise<ApiMutationResponse> {
  await delay(400);
  if (!data.name || !data.city) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Name and city are required" } };
  }
  const newId = Date.now();
  console.log("[v0] Created store:", newId, data);
  return { success: true, id: String(newId) };
}

/**
 * Update store data.
 * @endpoint PATCH /stores/:id
 */
export async function updateStore(id: number, data: Partial<Store>): Promise<ApiMutationResponse> {
  await delay(350);
  const store = MOCK_STORES.find((s) => s.id === id);
  if (!store) {
    return { success: false, error: { code: "NOT_FOUND", message: `Store ${id} not found` } };
  }
  console.log("[v0] Updated store:", id, data);
  return { success: true };
}

/**
 * Archive a store (soft-delete).
 * @endpoint POST /stores/:id/archive
 */
export async function archiveStore(id: number): Promise<ApiMutationResponse> {
  await delay(350);
  const store = MOCK_STORES.find((s) => s.id === id);
  if (!store) {
    return { success: false, error: { code: "NOT_FOUND", message: `Store ${id} not found` } };
  }
  if (store.archived) {
    return { success: false, error: { code: "ALREADY_ARCHIVED", message: "Store is already archived" } };
  }
  console.log("[v0] Archived store:", id);
  return { success: true };
}

/**
 * Force-sync store schedule from LAMA planner.
 * @endpoint POST /stores/:id/sync-lama
 */
export async function syncLama(id: number): Promise<ApiMutationResponse> {
  await delay(500);
  console.log("[v0] Triggered LAMA sync for store:", id);
  return { success: true };
}
