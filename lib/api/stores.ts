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
  Zone,
  ArchiveReason,
} from "@/lib/types";
import { MOCK_STORES } from "@/lib/mock-data/stores";
import { MOCK_USERS } from "@/lib/mock-data/users";
import { MOCK_SHIFTS } from "@/lib/mock-data/shifts";
import { MOCK_TASKS } from "@/lib/mock-data/tasks";
import { MOCK_ASSIGNMENTS } from "@/lib/mock-data/assignments";
import { MOCK_ZONES } from "@/lib/mock-data/zones";
import {
  TASKS_BY_STORE,
  SHIFTS_BY_STORE,
  SHIFTS_BY_STORE_DATE,
  ASSIGNMENTS_BY_STORE,
  USERS_BY_ID,
  PERMISSIONS_BY_USER,
} from "@/lib/mock-data/_indexes";
import { USE_REAL_API, apiUrl } from "./_config";
import { backendGet } from "./_client";
import { getCurrentOrgId } from "./_org-context";
import type { BackendStoreListData } from "./_backend-types";

const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));

/**
 * Real backend pilot: GET /users/stores → unwrap → adapt to StoreWithStats.
 * Backend возвращает только {id, name, address, external_code, created_at}.
 * Расширенные поля (city, region, format, manager_id, stats) не приходят —
 * заполняются undefined / нулями. UI должен gracefully fall back.
 *
 * Backend пока не поддерживает фильтры/пагинацию для /stores — возвращает все.
 * Pagination клиент-side для совместимости с admin signature.
 */
async function getStoresFromBackend(
  params: StoreListParams,
): Promise<ApiListResponse<StoreWithStats>> {
  const data = await backendGet<BackendStoreListData>(
    apiUrl("users", "/stores"),
  );
  const all = data.stores ?? [];

  const adapted: StoreWithStats[] = all.map((b) => ({
    id: b.id,
    name: b.name,
    external_code: b.external_code ?? "",
    address: b.address ?? "",
    object_type: "STORE",
    organization_id: "",
    legal_entity_id: 0,
    active: true,
    archived: false,
    // Stats не приходят с backend /stores — заполняются нулями.
    // Когда backend дотянет (см. MIGRATION-NOTES.md, request "GET /users/stores/list/with-stats")
    // — заменить нули на response.stats.*.
    tasks_today_count: 0,
    staff_count: 0,
    current_shifts_open_count: 0,
    current_shifts_total: 0,
    permissions_coverage_pct: 0,
    employees_count: 0,
    active_shifts_count: 0,
  }));

  // Search фильтр клиент-side (backend не поддерживает)
  let filtered = adapted;
  if (params.search) {
    const q = params.search.toLowerCase();
    filtered = filtered.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.external_code.toLowerCase().includes(q),
    );
  }

  const page = params.page ?? 1;
  const page_size = params.page_size ?? 20;
  const start = (page - 1) * page_size;
  const paginated = filtered.slice(start, start + page_size);

  return {
    data: paginated,
    total: filtered.length,
    page,
    page_size,
  };
}

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

/** Зона магазина с быстрыми счётчиками (для tab «Зоны»). */
export interface StoreZoneWithCounts extends Zone {
  /** Сотрудников, у которых хотя бы одна задача / привилегия в этой зоне (демо: оценочно). */
  employees_count: number;
  /** Задач в этой зоне сегодня. */
  tasks_today: number;
  /** Активных смен в этой зоне сегодня. */
  active_shifts_count: number;
  /** true — глобальная зона (store_id=null), false — локальная для этого магазина. */
  is_global: boolean;
}

/** KPI магазина за сегодня. */
export interface StoreKpiToday {
  /** Всего задач, созданных на сегодня. */
  tasks_today: number;
  /** Завершённых задач сегодня (state=COMPLETED). */
  completed_today: number;
  /** Задач на проверке (review_state=ON_REVIEW). */
  on_review_today: number;
  /** Использованный бюджет ФОТ за сегодня (0..100). Демо-значение. */
  fot_used_pct: number;
}

/** Subset User для отображения управляющего/супервайзера на detail-странице. */
export interface StoreContactPerson {
  id: number;
  first_name: string;
  last_name: string;
  avatar_url?: string;
}

/** Полная карточка магазина для экрана /stores/:id. */
export interface StoreDetail extends StoreWithStats {
  /** Управляющий магазина (subset для hero / sidebar card). */
  manager?: StoreContactPerson;
  /** Супервайзер (региональный куратор). */
  supervisor?: StoreContactPerson;
  /** Зоны магазина (глобальные + локальные) с счётчиками. */
  zones: StoreZoneWithCounts[];
  /** Всего сотрудников в магазине (по активным assignments). */
  team_count: number;
  /** Из них имеют активную / открытую смену сегодня. */
  team_active_count: number;
  /** KPI за сегодня. */
  kpi: StoreKpiToday;
  /** Время последней синхронизации с LAMA (alias для lama_synced_at — для UI). */
  last_synced_at?: string;
  /** Полный адрес одной строкой («Томск, пр. Ленина 80»). */
  address_full: string;
}

/** Запись истории магазина (для tab «История» / audit log). */
export interface StoreHistoryEvent {
  id: string;
  /** ISO datetime. */
  ts: string;
  /** Тип события — расширяемый набор. */
  type:
    | "CREATED"
    | "UPDATED"
    | "MANAGER_CHANGED"
    | "SUPERVISOR_CHANGED"
    | "ZONE_ADDED"
    | "ZONE_REMOVED"
    | "LAMA_SYNC"
    | "ARCHIVED"
    | "RESTORED";
  /** Заголовок события на русском (готов к рендерингу). */
  title: string;
  /** Имя пользователя, выполнившего действие. */
  by_user_name: string;
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

export interface StoreHistoryParams {
  /** Лимит записей (по умолчанию 20). */
  limit?: number;
  /** Сдвиг для пагинации. */
  offset?: number;
  /** Фильтр по типу события. */
  type?: StoreHistoryEvent["type"];
}

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

/** Собираем «Город, адрес» в одну строку. */
function buildAddressFull(store: Store): string {
  const parts = [store.city, store.address].filter(Boolean);
  return parts.join(", ");
}

/** Считаем зоны с быстрыми счётчиками для конкретного магазина. */
function buildStoreZones(storeId: number): StoreZoneWithCounts[] {
  const relevant = MOCK_ZONES.filter(
    (z) => z.store_id === null || z.store_id === undefined || z.store_id === storeId,
  );

  // Pre-compute tasks/shifts per zone for this store (один проход на оба массива)
  const storeTasks = TASKS_BY_STORE.get(storeId) ?? [];
  const storeShifts = SHIFTS_BY_STORE.get(storeId) ?? [];

  const tasksByZone = new Map<number, number>();
  for (const t of storeTasks) {
    if (t.archived || t.zone_id == null) continue;
    tasksByZone.set(t.zone_id, (tasksByZone.get(t.zone_id) ?? 0) + 1);
  }
  const shiftsTodayByZone = new Map<number, number>();
  const userIdsByZone = new Map<number, Set<number>>();
  for (const s of storeShifts) {
    if (s.zone_id == null) continue;
    if (s.shift_date === TODAY) {
      shiftsTodayByZone.set(s.zone_id, (shiftsTodayByZone.get(s.zone_id) ?? 0) + 1);
    }
    let set = userIdsByZone.get(s.zone_id);
    if (!set) {
      set = new Set();
      userIdsByZone.set(s.zone_id, set);
    }
    set.add(s.user_id);
  }

  return relevant.map((zone) => ({
    ...zone,
    employees_count: userIdsByZone.get(zone.id)?.size ?? 0,
    tasks_today: tasksByZone.get(zone.id) ?? 0,
    active_shifts_count: shiftsTodayByZone.get(zone.id) ?? 0,
    is_global: zone.store_id === null || zone.store_id === undefined,
  }));
}

// ═══════════════════════════════════════════════════════════════════
// HELPERS — store stats enrichment
// ═══════════════════════════════════════════════════════════════════

/** Считает stats для одного магазина по mock-данным. Pure function.
 *  Использует pre-built indexes из lib/mock-data/_indexes.ts. */
function computeStoreStats(store: Store): {
  tasks_today_count: number;
  staff_count: number;
  current_shifts_open_count: number;
  current_shifts_total: number;
  permissions_coverage_pct: number;
} {
  // Tasks today — TASKS_BY_STORE дёргает O(1), потом мини-filter.
  const storeTasks = TASKS_BY_STORE.get(store.id) ?? [];
  const tasks_today_count = storeTasks.filter(
    (t) => !t.archived && t.created_at.slice(0, 10) === TODAY,
  ).length;

  // Staff: ASSIGNMENTS_BY_STORE → user_ids → USERS_BY_ID lookup.
  const storeAssigns = ASSIGNMENTS_BY_STORE.get(store.id) ?? [];
  const storeUserIds = new Set<number>();
  for (const a of storeAssigns) if (a.active) storeUserIds.add(a.user_id);

  let staff_count = 0;
  let usersWithPerms = 0;
  for (const uid of storeUserIds) {
    const u = USERS_BY_ID.get(uid);
    if (u && !u.archived) {
      staff_count++;
      const perms = PERMISSIONS_BY_USER.get(uid);
      if (perms?.some((p) => !p.revoked_at)) usersWithPerms++;
    }
  }

  // Shifts today — SHIFTS_BY_STORE_DATE прямой O(1).
  const todayShifts = SHIFTS_BY_STORE_DATE.get(`${store.id}:${TODAY}`) ?? [];
  const current_shifts_total = todayShifts.length;
  const current_shifts_open_count = todayShifts.filter(
    (s) => s.status === "OPENED",
  ).length;

  const permissions_coverage_pct =
    staff_count === 0
      ? 0
      : Math.round((usersWithPerms / staff_count) * 100);

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
  // Real backend swap: при NEXT_PUBLIC_USE_REAL_API=true идём в /users/stores
  // и адаптируем под admin-shape (StoreWithStats). Иначе остаёмся на моках.
  if (USE_REAL_API) {
    return getStoresFromBackend(params);
  }

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
    // Default подняли с 20 до 200 — у нас 133 LAMA-магазина, в большинстве
    // экранов нужны все сразу (комбобоксы, dropdown'ы). На страницах со
    // своей пагинацией всё равно явно передаётся page_size.
    page_size = 200,
    sort_by = "name",
    sort_dir = "asc",
  } = params;

  let filtered = [...MOCK_STORES];

  // Org scope: магазины только текущей организации (org-context).
  // Без этого в Combobox'ах при контексте «ЛАМА» появлялись магазины
  // ТехПродЗдрав (швейный цех) и base-mock'и из других orgs.
  const currentOrgId = getCurrentOrgId();
  filtered = filtered.filter((s) => s.organization_id === currentOrgId);

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
    filtered = filtered.filter((s) => s.region != null && region.includes(s.region));
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
        (s.city ?? "").toLowerCase().includes(q),
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
 * Get single store by ID with full enriched detail (manager, supervisor, zones, KPI).
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

  // Команда магазина — по активным assignments + не архивные пользователи.
  const teamUserIds = new Set(
    MOCK_ASSIGNMENTS.filter((a) => a.active && a.store_id === id).map((a) => a.user_id),
  );
  const team_count = Array.from(teamUserIds).filter((uid) => {
    const u = MOCK_USERS.find((x) => x.id === uid);
    return u && !u.archived;
  }).length;

  // Активная команда сегодня — у кого есть OPENED-смена сегодня в этом магазине.
  const team_active_count = new Set(
    MOCK_SHIFTS.filter(
      (s) =>
        s.store_id === id &&
        s.shift_date === TODAY &&
        (s.status === "OPENED" || s.status === "NEW"),
    ).map((s) => s.user_id),
  ).size;

  // KPI за сегодня по задачам магазина.
  const tasksToday = MOCK_TASKS.filter(
    (t) => t.store_id === id && !t.archived,
  );
  const tasks_today = tasksToday.length;
  const completed_today = tasksToday.filter((t) => t.state === "COMPLETED").length;
  const on_review_today = tasksToday.filter(
    (t) => t.review_state === "ON_REVIEW",
  ).length;
  // Демо-значение ФОТ — детерминированное от id, в диапазоне 35-95.
  const fot_used_pct = Math.min(95, 35 + (id * 13) % 60);

  const zones = buildStoreZones(id);

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
      zones,
      team_count,
      team_active_count,
      kpi: {
        tasks_today,
        completed_today,
        on_review_today,
        fot_used_pct,
      },
      last_synced_at: store.lama_synced_at,
      address_full: buildAddressFull(store),
    },
  };
}

/**
 * Get audit log entries for a single store.
 * @endpoint GET /stores/:id/history
 */
export async function getStoreHistory(
  id: number,
  params: StoreHistoryParams = {},
): Promise<ApiListResponse<StoreHistoryEvent>> {
  await delay(250);

  const store = MOCK_STORES.find((s) => s.id === id);
  if (!store) {
    return { data: [], total: 0, page: 1, page_size: params.limit ?? 20 };
  }

  const manager = store.manager_id
    ? MOCK_USERS.find((u) => u.id === store.manager_id)
    : undefined;
  const supervisor = store.supervisor_id
    ? MOCK_USERS.find((u) => u.id === store.supervisor_id)
    : undefined;

  const managerName = manager
    ? `${manager.last_name} ${manager.first_name[0]}.`
    : "Система";
  const supervisorName = supervisor
    ? `${supervisor.last_name} ${supervisor.first_name[0]}.`
    : "Система";

  const baseTs = new Date(`${TODAY}T09:00:00+07:00`).getTime();
  const offsetIso = (hoursAgo: number) =>
    new Date(baseTs - hoursAgo * 3600 * 1000).toISOString();

  let events: StoreHistoryEvent[] = [
    {
      id: `evt-${id}-1`,
      ts: offsetIso(0.5),
      type: "LAMA_SYNC",
      title: "Синхронизация LAMA выполнена",
      by_user_name: "Система",
    },
    {
      id: `evt-${id}-2`,
      ts: offsetIso(3),
      type: "ZONE_ADDED",
      title: "Добавлена зона «Кофейная зона»",
      by_user_name: managerName,
    },
    {
      id: `evt-${id}-3`,
      ts: offsetIso(26),
      type: "UPDATED",
      title: "Обновлены контакты и часы работы",
      by_user_name: managerName,
    },
    {
      id: `evt-${id}-4`,
      ts: offsetIso(72),
      type: "MANAGER_CHANGED",
      title: "Назначен новый управляющий",
      by_user_name: supervisorName,
    },
    {
      id: `evt-${id}-5`,
      ts: offsetIso(168),
      type: "SUPERVISOR_CHANGED",
      title: "Закреплён супервайзер",
      by_user_name: "Соколова А. Б.",
    },
    {
      id: `evt-${id}-6`,
      ts: offsetIso(720),
      type: "CREATED",
      title: "Магазин зарегистрирован в системе",
      by_user_name: "Соколова А. Б.",
    },
  ];

  if (params.type) {
    events = events.filter((e) => e.type === params.type);
  }

  const total = events.length;
  const offset = params.offset ?? 0;
  const limit = params.limit ?? 20;
  const sliced = events.slice(offset, offset + limit);

  return {
    data: sliced,
    total,
    page: Math.floor(offset / limit) + 1,
    page_size: limit,
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
  return { success: true, id: String(newId) };
}

/**
 * Update store data (partial). Supports both Store fields and ID-references.
 * @endpoint PATCH /stores/:id
 */
export async function updateStore(
  id: number,
  patch: Partial<Store>,
): Promise<ApiMutationResponse> {
  await delay(350);
  const store = MOCK_STORES.find((s) => s.id === id);
  if (!store) {
    return { success: false, error: { code: "NOT_FOUND", message: `Store ${id} not found` } };
  }
  return { success: true };
}

/**
 * Archive a store (soft-delete) with reason.
 * @endpoint POST /stores/:id/archive
 */
export async function archiveStore(
  id: number,
  reason: ArchiveReason = "OTHER",
): Promise<ApiMutationResponse> {
  await delay(350);
  const store = MOCK_STORES.find((s) => s.id === id);
  if (!store) {
    return { success: false, error: { code: "NOT_FOUND", message: `Store ${id} not found` } };
  }
  if (store.archived) {
    return { success: false, error: { code: "ALREADY_ARCHIVED", message: "Store is already archived" } };
  }
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
  return { success: true };
}

/**
 * Restore an archived store.
 * @endpoint POST /stores/:id/restore
 */
export async function restoreStore(id: number): Promise<ApiMutationResponse> {
  await delay(300);
  const store = MOCK_STORES.find((s) => s.id === id);
  if (!store) {
    return { success: false, error: { code: "NOT_FOUND", message: `Store ${id} not found` } };
  }
  if (!store.archived) {
    return { success: false, error: { code: "NOT_ARCHIVED", message: "Store is not archived" } };
  }
  return { success: true };
}

/**
 * Force-sync schedule for a single store from LAMA planner (per-store action).
 * @endpoint POST /stores/:id/sync-lama
 */
export async function syncLamaForStore(id: number): Promise<ApiMutationResponse> {
  await delay(600);
  const store = MOCK_STORES.find((s) => s.id === id);
  if (!store) {
    return { success: false, error: { code: "NOT_FOUND", message: `Store ${id} not found` } };
  }
  return { success: true };
}

/**
 * Legacy alias (используется в общем экране integrations / sync-banner).
 * @endpoint POST /stores/:id/sync-lama
 * @deprecated Используй syncLamaForStore для нового UI.
 */
export async function syncLama(id: number): Promise<ApiMutationResponse> {
  return syncLamaForStore(id);
}

/** @endpoint POST /stores/:store_id/zones */
export async function createStoreZone(
  storeId: number,
  data: { name: string; code?: string },
): Promise<ApiMutationResponse> {
  await delay(300);
  if (!data.name?.trim()) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Name is required" } };
  }
  return { success: true, id: String(Date.now()) };
}

/** @endpoint PATCH /stores/:store_id/zones/:zone_id */
export async function updateStoreZone(
  storeId: number,
  zoneId: number,
  patch: { name?: string; code?: string },
): Promise<ApiMutationResponse> {
  await delay(300);
  return { success: true };
}

/** @endpoint DELETE /stores/:store_id/zones/:zone_id */
export async function deleteStoreZone(
  storeId: number,
  zoneId: number,
): Promise<ApiMutationResponse> {
  await delay(300);
  return { success: true };
}
