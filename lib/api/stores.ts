/**
 * Stores API — CRUD for store/workshop/department objects.
 * Foundation for chat 26 (stores-list) — pattern-list-with-filters.
 */

import type {
  ApiResponse,
  ApiListResponse,
  ApiMutationResponse,
  ApiListParams,
  Store,
  ObjectFormat,
  User,
} from "@/lib/types";
import { MOCK_STORES } from "@/lib/mock-data/stores";
import { MOCK_USERS } from "@/lib/mock-data/users";
import { MOCK_SHIFTS } from "@/lib/mock-data/shifts";
import { MOCK_TASKS } from "@/lib/mock-data/tasks";
import { MOCK_ASSIGNMENTS } from "@/lib/mock-data/assignments";
import { MOCK_PERMISSIONS } from "@/lib/mock-data/permissions";

const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));

/** Сегодняшняя дата в моках — синхронизируем с MOCK_SHIFTS / MOCK_TASKS. */
const TODAY = "2026-05-01";

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

/**
 * Store with computed stats — основная row-модель для stores-list.
 * Все stats посчитаны in-memory из MOCK_TASKS / MOCK_USERS / MOCK_ASSIGNMENTS / MOCK_SHIFTS.
 *
 * - tasks_today_count — сколько задач у магазина с created_at сегодня (NEW + IN_PROGRESS + PAUSED).
 * - staff_count — кол-во активных (не архивных) пользователей с активным assignment в этом магазине.
 * - current_shifts_open_count — кол-во OPENED смен сегодня.
 * - current_shifts_total — общее кол-во смен сегодня (NEW + OPENED + CLOSED). Используется для «X / Y».
 * - permissions_coverage_pct — какой % сотрудников магазина имеет хотя бы одну привилегию (granted, не revoked).
 *
 * Legacy-поля employees_count / active_shifts_count / manager_name оставлены для обратной
 * совместимости с уже существующими консьюмерами (tasks-list, store-detail и пр.).
 */
export interface StoreWithStats extends Store {
  /** Кол-во задач, созданных сегодня в этом магазине. */
  tasks_today_count: number;
  /** Кол-во активных сотрудников с active assignment в этом магазине. */
  staff_count: number;
  /** Кол-во OPENED смен сегодня. */
  current_shifts_open_count: number;
  /** Общее кол-во смен сегодня (NEW + OPENED + CLOSED). */
  current_shifts_total: number;
  /** % сотрудников магазина с хотя бы одной активной привилегией (0-100). */
  permissions_coverage_pct: number;
  /** Имя управляющего (legacy alias staff). */
  manager_name?: string;
  /** Legacy alias для staff_count (обратная совместимость). */
  employees_count: number;
  /** Legacy alias для current_shifts_open_count (обратная совместимость). */
  active_shifts_count: number;
}

export interface StoreDetail extends StoreWithStats {
  supervisor?: Pick<User, "id" | "first_name" | "last_name" | "avatar_url">;
  manager?: Pick<User, "id" | "first_name" | "last_name" | "avatar_url">;
}

/**
 * Filter parameters для list-with-filters экрана.
 * Поддерживает multi-фильтры (format, region) для filter-chips,
 * legacy single-поля city / store_type / active оставлены для обратной совместимости.
 */
export interface StoreListParams extends ApiListParams {
  /** Multi-фильтр по формату объекта. Магазин попадает если object_format в списке. */
  format?: ObjectFormat[];
  /** Multi-фильтр по региону. Магазин попадает если region в списке. */
  region?: string[];
  /** ID супервайзера (single). Один магазин = один supervisor. */
  supervisor_id?: number;
  /** Архивированные. По умолчанию false (только активные). */
  archived?: boolean;

  /** Legacy single city filter. */
  city?: string;
  /** Legacy single store_type filter. */
  store_type?: string;
  /** Legacy active flag. */
  active?: boolean;
}

// ═══════════════════════════════════════════════════════════════════
// HELPERS — store stats enrichment
// ═══════════════════════════════════════════════════════════════════

/** Считает stats для одного магазина по mock-данным. Pure function. */
function computeStoreStats(store: Store): {
  tasks_today_count: number;
  staff_count: number;
  current_shifts_open_count: number;
  current_shifts_total: number;
  permissions_coverage_pct: number;
} {
  // Tasks today — created_at startsWith TODAY, не архивные.
  const tasks_today_count = MOCK_TASKS.filter(
    (t) =>
      t.store_id === store.id &&
      !t.archived &&
      t.created_at.slice(0, 10) === TODAY,
  ).length;

  // Staff — пользователи с активным assignment в этом магазине, не архивные.
  const storeUserIds = new Set(
    MOCK_ASSIGNMENTS.filter((a) => a.active && a.store_id === store.id).map(
      (a) => a.user_id,
    ),
  );
  const staffUsers = MOCK_USERS.filter(
    (u) => !u.archived && storeUserIds.has(u.id),
  );
  const staff_count = staffUsers.length;

  // Shifts today — все статусы.
  const todayShifts = MOCK_SHIFTS.filter(
    (s) => s.store_id === store.id && s.shift_date === TODAY,
  );
  const current_shifts_total = todayShifts.length;
  const current_shifts_open_count = todayShifts.filter(
    (s) => s.status === "OPENED",
  ).length;

  // Permissions coverage — % staff'а с хотя бы одной active permission.
  const staffIds = staffUsers.map((u) => u.id);
  const usersWithPerms = new Set(
    MOCK_PERMISSIONS.filter(
      (p) => !p.revoked_at && staffIds.includes(p.user_id),
    ).map((p) => p.user_id),
  );
  const permissions_coverage_pct =
    staff_count === 0
      ? 0
      : Math.round((usersWithPerms.size / staff_count) * 100);

  return {
    tasks_today_count,
    staff_count,
    current_shifts_open_count,
    current_shifts_total,
    permissions_coverage_pct,
  };
}

// ═══════════════════════════════════════════════════════════════════
// LIST & GET
// ═══════════════════════════════════════════════════════════════════

/**
 * Get paginated list of stores with computed stats.
 *
 * Поддерживаемые фильтры:
 *   - search: по name / external_code / address (case-insensitive)
 *   - format: multi ObjectFormat[]
 *   - region: multi string[]
 *   - supervisor_id: single number
 *   - archived: boolean (default false — активные)
 *   - sort_by / sort_dir / page / page_size — из ApiListParams
 *
 * @endpoint GET /stores/list
 */
export async function getStores(
  params: StoreListParams = {},
): Promise<ApiListResponse<StoreWithStats>> {
  await delay(350);

  const {
    search,
    format,
    region,
    supervisor_id,
    archived = false,
    // legacy
    city,
    store_type,
    active,
    page = 1,
    page_size = 20,
    sort_by = "name",
    sort_dir = "asc",
  } = params;

  let filtered = [...MOCK_STORES];

  // Archived (default = false → только активные)
  filtered = filtered.filter((s) => s.archived === archived);

  // Format multi
  if (format && format.length > 0) {
    filtered = filtered.filter(
      (s) => s.object_format != null && format.includes(s.object_format),
    );
  }

  // Region multi
  if (region && region.length > 0) {
    filtered = filtered.filter((s) => region.includes(s.region));
  }

  // Supervisor single
  if (supervisor_id != null) {
    filtered = filtered.filter((s) => s.supervisor_id === supervisor_id);
  }

  // Legacy filters
  if (city) filtered = filtered.filter((s) => s.city === city);
  if (store_type) filtered = filtered.filter((s) => s.store_type === store_type);
  if (active !== undefined) filtered = filtered.filter((s) => s.active === active);

  // Search
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.external_code.toLowerCase().includes(q) ||
        s.address.toLowerCase().includes(q) ||
        s.city.toLowerCase().includes(q),
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
    const stats = computeStoreStats(store);
    const manager = store.manager_id
      ? MOCK_USERS.find((u) => u.id === store.manager_id)
      : undefined;
    return {
      ...store,
      ...stats,
      manager_name: manager
        ? `${manager.last_name} ${manager.first_name}`
        : undefined,
      // Legacy aliases
      employees_count: stats.staff_count,
      active_shifts_count: stats.current_shifts_open_count,
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

  const stats = computeStoreStats(store);

  return {
    data: {
      ...store,
      ...stats,
      employees_count: stats.staff_count,
      active_shifts_count: stats.current_shifts_open_count,
      manager_name: manager
        ? `${manager.last_name} ${manager.first_name}`
        : undefined,
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
 * Bulk archive multiple stores.
 * @endpoint POST /stores/bulk-archive
 */
export async function bulkArchiveStores(ids: number[]): Promise<ApiMutationResponse> {
  await delay(450);
  if (ids.length === 0) {
    return { success: false, error: { code: "EMPTY_LIST", message: "No store IDs provided" } };
  }
  const missing = ids.filter((id) => !MOCK_STORES.find((s) => s.id === id));
  if (missing.length > 0) {
    return { success: false, error: { code: "NOT_FOUND", message: `Stores not found: ${missing.join(", ")}` } };
  }
  console.log("[v0] Bulk-archived stores:", ids);
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
