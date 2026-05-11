import type { FunctionalRole, Task, Shift, UnassignedTaskBlock } from "@/lib/types";
import { MOCK_TASKS } from "@/lib/mock-data/tasks";
import { MOCK_USERS } from "@/lib/mock-data/users";
import { MOCK_NOTIFICATIONS } from "@/lib/mock-data/notifications";
import { MOCK_UNASSIGNED_BLOCKS } from "@/lib/mock-data/_lama-unassigned-blocks";
import { LAMA_EMPLOYEE_ZONES } from "@/lib/mock-data/_lama-employee-zones";
import { LAMA_EMPLOYEE_WORK_TYPES } from "@/lib/mock-data/_lama-employee-work-types";
import { LAMA_FALLBACK_MEDIANS } from "@/lib/mock-data/_lama-fallback-medians";
import {
  EMPLOYEE_STATS,
  STICKINESS_BY_DATE,
  SHOP_EMPLOYEE_WT_COUNT,
  SHOP_EMPLOYEE_ZONE_WT_COUNT,
  EMPLOYEE_SHIFT_START_BY_DATE,
} from "@/lib/mock-data/_lama-distribution-stats";
import {
  LAMA_PLANNING_POOL,
  type PlanningEmployee,
} from "@/lib/mock-data/_lama-planning-pool";
import {
  USERS_BY_ID,
  USERS_BY_EXTERNAL_ID,
  STORES_BY_ID,
  SHIFTS_BY_STORE_DATE,
  SHIFTS_BY_STORE,
  TASKS_BY_ASSIGNEE,
} from "@/lib/mock-data/_indexes";
import type { ApiListResponse, ApiResponse, ApiMutationResponse } from "./types";

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

export interface EmployeeUtilization {
  user: {
    id: number;
    first_name: string;
    last_name: string;
    middle_name?: string;
    avatar_url?: string;
    position_name?: string;
    /** Зоны где сотрудник работал (из LAMA history + mock tasks). */
    zones?: string[];
    /** Типы работ что сотрудник уже выполнял (LAMA history) — fallback для
     *  фильтра «подходящие» когда у задачи нет зоны (Касса/КСО/...). */
    work_types?: string[];
  };
  shift_total_min: number;
  assigned_min: number;
  utilization_pct: number;
  has_bonus_task: boolean;
  shift_start: string;
  shift_end: string;
}

export interface TaskDistributionAllocation {
  userId: number;
  minutes: number;
}

export interface UnassignedTask extends Task {
  distributed_minutes: number;
  remaining_minutes: number;
}

// ═══════════════════════════════════════════════════════════════════
// MOCK DATA — fake UNASSIGNED_TASKS_OVERRIDE удалён, заменён на
// реальные LAMA-задачи из live API в lib/mock-data/_lama-real.ts.
// getStoreUnassignedTasks читает напрямую из MOCK_TASKS (filter
// assignee_id=null + store_id).
// ═══════════════════════════════════════════════════════════════════

// LEGACY TASK_DESCRIPTORS + UNASSIGNED_TASKS_OVERRIDE удалены полностью.
// История: git show 1a7c52ba:lib/api/distribution.ts (перед заменой
// на реальные LAMA данные из live API).

// Track task allocations in memory for demo
const taskAllocations: Map<string, TaskDistributionAllocation[]> = new Map();

// ═══════════════════════════════════════════════════════════════════
// API FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

/** Hard cap чтоб даже на гипермаркете с 80+ unassigned задачами UI не лагал. */
const UNASSIGNED_HARD_CAP = 100;

/**
 * Дефолтный шаблон блоков для магазина без LAMA-данных.
 *
 * Минуты — РЕАЛЬНЫЕ медианы из 498 LAMA-задач по 21 магазину live API
 * (см. .tmp_lama_block_stats.json). Группировка по (work_type, zone),
 * считается median minutes на магазин.
 *
 * Используется как fallback в getStoreUnassignedTasks чтобы экран
 * не был пустым на не-LAMA магазинах (Abricos, СПАР, Foodcity и т.д.).
 */
function generateDefaultBlocksForStore(storeId: number): UnassignedTaskBlock[] {
  const today = new Date().toISOString().slice(0, 10);
  const createdAt = new Date().toISOString();
  // Шаблон блоков из auto-generated файла _lama-fallback-medians.ts.
  // Регенерируется daily через GitHub Actions workflow (lama-snapshot.yml)
  // → нет необходимости вручную обновлять медианы при изменении LAMA данных.

  // Priority по minutes (синхронно с tools/lama/regenerate-from-snapshots.py:calc_priority)
  const priorityFor = (m: number): number =>
    m >= 480 ? 1 : m >= 240 ? 2 : m >= 120 ? 3 : m >= 60 ? 4 : 5;

  return LAMA_FALLBACK_MEDIANS.map((t, idx) => ({
    id: `block-default-${storeId}-${idx}`,
    store_id: storeId,
    store_name: `Магазин #${storeId}`,
    date: today,
    work_type_id: t.wt_id,
    work_type_name: t.wt_name,
    zone_id: t.zone_id,
    zone_name: t.zone_name,
    title: `${t.wt_name}: ${t.zone_name}`,
    total_minutes: t.minutes,
    distributed_minutes: 0,
    remaining_minutes: t.minutes,
    priority: priorityFor(t.minutes),
    source: "LAMA" as const,
    created_at: createdAt,
    is_distributed: false,
    spawned_task_ids: [],
  }));
}

/**
 * Get unassigned tasks for a store on a specific date.
 * Returns tasks where assignee_id is null and zone_id is set,
 * PLUS LAMA blocks (UnassignedTaskBlock) сконвертированные в UnassignedTask
 * чтобы UI отображал блоки как обычные задачи в TaskZoneGroup с пиккером.
 * Capped at UNASSIGNED_HARD_CAP.
 */
export async function getStoreUnassignedTasks(
  storeId: number,
  _date: string
): Promise<ApiListResponse<UnassignedTask>> {
  await new Promise((r) => setTimeout(r, 300));

  // 1. Обычные нераспределённые task'и (assignee_id=null) из MOCK_TASKS.
  const allUnassigned = MOCK_TASKS.filter(
    (t) =>
      t.store_id === storeId &&
      t.assignee_id === null &&
      t.assigned_to_permission === null &&
      !t.archived
  );

  // 2. LAMA-блоки этого магазина — конвертируем в UnassignedTask чтобы
  //    UI рендерил их как обычные карточки в TaskZoneGroup с пиккером.
  //    При assign блок будет распознан по id (начинается с "block-").
  //    Дату игнорируем — блоки актуальны на любую дату пока is_distributed=false.
  let storeBlocks = MOCK_UNASSIGNED_BLOCKS.filter(
    (b) => b.store_id === storeId && !b.is_distributed,
  );

  // Fallback: если для магазина нет блоков (например base-моки Abricos/SPAR
  // или LAMA-магазин без задач в snapshot'е) — генерируем дефолтный набор
  // 10 блоков по типичным зонам/работам ритейла. Это даёт user'у
  // непустой экран на ЛЮБОМ магазине.
  if (storeBlocks.length === 0) {
    storeBlocks = generateDefaultBlocksForStore(storeId);
  }
  const blocksAsTasks: Task[] = storeBlocks.map((b) => ({
    id: b.id,
    title: b.title,
    description: `Блок ЛАМА: ${b.work_type_name} в зоне ${b.zone_name} (${b.total_minutes} мин на день)`,
    type: "PLANNED",
    kind: "SINGLE",
    source: "PLANNED",
    planned_minutes: b.remaining_minutes,
    store_id: b.store_id,
    store_name: b.store_name,
    zone_id: b.zone_id,
    zone_name: b.zone_name,
    work_type_id: b.work_type_id,
    work_type_name: b.work_type_name,
    product_category_id: b.product_category_id ?? null,
    product_category_name: b.product_category_name ?? null,
    creator_id: 0,
    creator_name: "ЛАМА",
    assignee_id: null,
    assignee_name: null,
    assigned_to_permission: null,
    state: "NEW",
    review_state: "NONE",
    acceptance_policy: "MANUAL",
    requires_photo: false,
    archived: false,
    priority: b.priority,
    created_at: b.created_at,
    updated_at: b.created_at,
  }));

  const combined = [...allUnassigned, ...blocksAsTasks];

  // Cap для предотвращения UI-лага на больших магазинах.
  const capped = combined.slice(0, UNASSIGNED_HARD_CAP);

  // Calculate distribution status for each task
  const unassignedTasks: UnassignedTask[] = capped.map((task) => {
    const allocations = taskAllocations.get(task.id) || [];
    const distributedMinutes = allocations.reduce((sum, a) => sum + a.minutes, 0);

    return {
      ...task,
      distributed_minutes: distributedMinutes,
      remaining_minutes: task.planned_minutes - distributedMinutes,
    };
  });

  return {
    data: unassignedTasks,
    total: combined.length,
    page: 1,
    page_size: UNASSIGNED_HARD_CAP,
  };
}

// ─────────────────────────────────────────────────────────────────────
// LAMA planning-pool helpers
// ─────────────────────────────────────────────────────────────────────

/**
 * Resolve admin store_id → LAMA `shop_code` (external_code).
 * Возвращает undefined для не-LAMA магазинов или несуществующих store_id.
 */
function getShopCodeFromStoreId(storeId: number): string | undefined {
  return STORES_BY_ID.get(storeId)?.external_code;
}

/**
 * Синтетическая длительность смены для сотрудника из LAMA planning pool —
 * 12 часов (09:00–21:00). В planning pool сами смены не приходят, только
 * список доступных сотрудников; реальные смены остались в SHIFTS_BY_STORE_DATE,
 * но для LAMA магазинов их не индексируют → в моке выдаём типичный диапазон
 * чтобы UI мог посчитать utilization.
 */
const PLANNING_POOL_SHIFT_START_HOUR = 9;
const PLANNING_POOL_SHIFT_END_HOUR = 21;
const PLANNING_POOL_SHIFT_TOTAL_MIN =
  (PLANNING_POOL_SHIFT_END_HOUR - PLANNING_POOL_SHIFT_START_HOUR) * 60;

/** Распарсить «Фамилия Имя Отчество» из планинг-пула в (last, first, middle). */
function splitPlanningName(fullName: string): {
  last_name: string;
  first_name: string;
  middle_name?: string;
} {
  const parts = fullName.trim().split(/\s+/);
  return {
    last_name: parts[0] ?? "",
    first_name: parts[1] ?? "",
    middle_name: parts[2],
  };
}

/**
 * Построить `EmployeeUtilization[]` из LAMA planning pool для магазина.
 * Резолвит каждого `PlanningEmployee` в admin User через `external_id` index;
 * если не найдено — fallback на split имени из planning pool.
 *
 * Поскольку planning pool — это всегда «всё ещё нераспределено», начальный
 * `assigned_min = 0`. Зоны и work_types берутся из LAMA history (если есть).
 */
function buildEmployeesFromPlanningPool(
  employees: readonly PlanningEmployee[],
  date: string,
): EmployeeUtilization[] {
  // Синтетические границы смены — общий диапазон для всего пула.
  const shiftStartIso = `${date}T${String(PLANNING_POOL_SHIFT_START_HOUR).padStart(2, "0")}:00:00`;
  const shiftEndIso = `${date}T${String(PLANNING_POOL_SHIFT_END_HOUR).padStart(2, "0")}:00:00`;

  return employees.map((pe) => {
    const adminUser = USERS_BY_EXTERNAL_ID.get(pe.employee_id);
    const userId = adminUser?.id ?? pe.employee_id;
    const { last_name, first_name, middle_name } = adminUser
      ? {
          last_name: adminUser.last_name,
          first_name: adminUser.first_name,
          middle_name: adminUser.middle_name,
        }
      : splitPlanningName(pe.name);

    // Зоны/work_types из LAMA snapshot history. Ключ — `userId` (admin user.id
    // когда есть в USERS_BY_EXTERNAL_ID, иначе LAMA employee_id). regenerate-
    // from-snapshots.py пишет map с тем же resolved-id ключом, так что
    // unmapped employees тоже находят свои зоны (включая peer-inferred).
    const zones = LAMA_EMPLOYEE_ZONES[userId];
    // preferred_work_types — ручная корректировка директором (override LAMA).
    const workTypes = adminUser?.preferred_work_types
      ?? LAMA_EMPLOYEE_WORK_TYPES[userId];

    return {
      user: {
        id: userId,
        first_name,
        last_name,
        middle_name,
        avatar_url: adminUser?.avatar_url,
        position_name: pe.position_name,
        zones: zones ? [...zones] : [],
        work_types: workTypes ? [...workTypes] : [],
      },
      shift_total_min: PLANNING_POOL_SHIFT_TOTAL_MIN,
      assigned_min: 0,
      utilization_pct: 0,
      has_bonus_task: false,
      shift_start: shiftStartIso,
      shift_end: shiftEndIso,
    };
  });
}

/**
 * Get employee utilization for a store on a specific date.
 * Combines shift data with assigned tasks to calculate workload.
 *
 * Приоритет источников:
 * 1. **LAMA planning pool** (если магазин имеет shop_code в `LAMA_PLANNING_POOL`) —
 *    «сегодняшние» live данные о доступных сотрудниках. Источник правды для
 *    /tasks/distribute по LAMA магазинам — даже если в `SHIFTS_BY_STORE_DATE`
 *    нет совпадения по дате, planning pool всё равно даст сотрудников.
 * 2. **SHIFTS_BY_STORE_DATE** (синтетические смены) — fallback для не-LAMA
 *    магазинов (Abricos / SPAR / Foodcity / прочие base-моки).
 * 3. **Closest-date shift** — если на запрошенную date нет смен, берём ближайшую.
 */
export async function getStoreEmployeesUtilization(
  storeId: number,
  date: string
): Promise<ApiResponse<EmployeeUtilization[]>> {
  await new Promise((r) => setTimeout(r, 350));

  // 1. LAMA planning pool имеет приоритет — это «сегодня» для LAMA магазинов.
  //    Решает баг «нет смен на этот день» когда SHIFTS_BY_STORE_DATE пустой,
  //    но planning pool содержит actual список сотрудников магазина.
  const shopCode = getShopCodeFromStoreId(storeId);
  const planningPool = shopCode ? LAMA_PLANNING_POOL[shopCode] : undefined;
  if (planningPool && planningPool.available_employees.length > 0) {
    const fromPool = buildEmployeesFromPlanningPool(
      planningPool.available_employees,
      date,
    );
    // Сортируем: lowest utilization first (consistent с non-LAMA веткой).
    fromPool.sort((a, b) => a.utilization_pct - b.utilization_pct);
    return { data: fromPool };
  }

  // 2. Fallback: синтетические смены — для не-LAMA магазинов.
  // Use indexed lookup: O(1) вместо O(n) фильтра.
  let shifts = SHIFTS_BY_STORE_DATE.get(`${storeId}:${date}`) ?? [];

  // Pre-collect: какие зоны вообще «работают» в этом магазине — собираем из
  // ВСЕХ исторических task'ов магазина. Используется как fallback для
  // сотрудников у кого личной истории нет.
  const storeZonesSet = new Set<string>();
  for (const t of MOCK_TASKS) {
    if (t.store_id === storeId && t.zone_name && t.zone_name !== "Без зоны") {
      storeZonesSet.add(t.zone_name);
    }
  }
  // Если в магазине вообще нет history (база-mock без LAMA tasks) — берём
  // дефолтный набор для ритейла.
  const DEFAULT_RETAIL_ZONES = [
    "Фреш 1", "Фреш 2", "Бакалея", "Алкоголь", "Пиво, чипсы",
    "Напитки б/а", "Кондитерка, чай, кофе", "Заморозка",
    "Кассовая зона", "Торговый зал (общая)",
  ];
  const storeZones = storeZonesSet.size > 0
    ? Array.from(storeZonesSet)
    : DEFAULT_RETAIL_ZONES;

  // Fallback: если на запрошенную date нет смен — ищем ближайшую дату с данными
  // в этом магазине (например на mock TODAY=2026-05-01 нет ЛАМА-смен,
  // они на 2026-05-04..10 — берём ближайший).
  if (shifts.length === 0) {
    const allStoreShifts = SHIFTS_BY_STORE.get(storeId) ?? [];
    if (allStoreShifts.length > 0) {
      const targetTs = new Date(date).getTime();
      const dateGroups = new Map<string, typeof allStoreShifts>();
      for (const s of allStoreShifts) {
        const arr = dateGroups.get(s.shift_date) ?? [];
        arr.push(s);
        dateGroups.set(s.shift_date, arr);
      }
      const closestDate = Array.from(dateGroups.keys()).sort(
        (a, b) =>
          Math.abs(new Date(a).getTime() - targetTs) -
          Math.abs(new Date(b).getTime() - targetTs),
      )[0];
      shifts = dateGroups.get(closestDate) ?? [];
    }
  }

  if (shifts.length === 0) {
    return { data: [] };
  }

  // Calculate utilization for each employee on shift
  const utilizations: EmployeeUtilization[] = shifts.map((shift) => {
    const user = USERS_BY_ID.get(shift.user_id);

    // Calculate shift duration in minutes
    const shiftStart = new Date(shift.planned_start);
    const shiftEnd = new Date(shift.planned_end);
    const shiftTotalMin = Math.round((shiftEnd.getTime() - shiftStart.getTime()) / 60000);

    // Tasks for this user — O(1) lookup, потом малый filter.
    const userTasks = TASKS_BY_ASSIGNEE.get(shift.user_id) ?? [];
    const assignedTasks = userTasks.filter(
      (t) =>
        t.store_id === storeId &&
        !t.archived &&
        t.state !== "COMPLETED"
    );

    const assignedMin = assignedTasks.reduce((sum, t) => sum + t.planned_minutes, 0);

    // Check if user has any bonus tasks
    const hasBonusTask = assignedTasks.some((t) => t.type === "BONUS");

    // Calculate utilization percentage
    const utilizationPct = shiftTotalMin > 0
      ? Math.round((assignedMin / shiftTotalMin) * 100)
      : 0;

    // Зоны сотрудника — приоритет источников:
    // 1. LAMA_EMPLOYEE_ZONES — реальные зоны из snapshot'ов (хоть 1 task в зоне → работает).
    // 2. История admin-tasks (mock TASKS_BY_ASSIGNEE).
    // 3. Зона текущей смены.
    // 4. Fallback: все зоны магазина (чтобы DistributionSheet показывал хоть кого-то).
    const zonesFromHistory = new Set<string>();
    const lamaZones = LAMA_EMPLOYEE_ZONES[shift.user_id];
    if (lamaZones) {
      for (const z of lamaZones) zonesFromHistory.add(z);
    }
    for (const t of userTasks) {
      if (t.zone_name && t.zone_name !== "Без зоны") {
        zonesFromHistory.add(t.zone_name);
      }
    }
    if (shift.zone_name) zonesFromHistory.add(shift.zone_name);
    if (zonesFromHistory.size === 0) {
      for (const z of storeZones) zonesFromHistory.add(z);
    }

    // Work types сотрудника — fallback для фильтра «подходящие» когда у
    // задачи нет зоны. Приоритет:
    //   1. preferred_work_types — ручная корректировка директором (override).
    //   2. LAMA snapshot history.
    //   3. История admin-tasks (work_type_name из MOCK_TASKS).
    const workTypesFromHistory = new Set<string>();
    if (user?.preferred_work_types && user.preferred_work_types.length > 0) {
      for (const w of user.preferred_work_types) workTypesFromHistory.add(w);
    } else {
      const lamaWorkTypes = LAMA_EMPLOYEE_WORK_TYPES[shift.user_id];
      if (lamaWorkTypes) {
        for (const w of lamaWorkTypes) workTypesFromHistory.add(w);
      }
      for (const t of userTasks) {
        if (t.work_type_name) workTypesFromHistory.add(t.work_type_name);
      }
    }

    return {
      user: {
        id: shift.user_id,
        first_name: user?.first_name || shift.user_name.split(" ")[1] || "",
        last_name: user?.last_name || shift.user_name.split(" ")[0] || "",
        middle_name: user?.middle_name,
        avatar_url: user?.avatar_url,
        position_name: shift.zone_name,
        zones: Array.from(zonesFromHistory),
        work_types: Array.from(workTypesFromHistory),
      },
      shift_total_min: shiftTotalMin,
      assigned_min: assignedMin,
      utilization_pct: utilizationPct,
      has_bonus_task: hasBonusTask,
      shift_start: shift.planned_start,
      shift_end: shift.planned_end,
    };
  });

  // Sort by utilization (lowest first - most available)
  utilizations.sort((a, b) => a.utilization_pct - b.utilization_pct);

  return { data: utilizations };
}

/**
 * Get shifts for a store on a specific date.
 */
export async function getStoreShiftsToday(
  storeId: number,
  date: string
): Promise<ApiListResponse<Shift>> {
  await new Promise((r) => setTimeout(r, 200));

  const shifts = SHIFTS_BY_STORE_DATE.get(`${storeId}:${date}`) ?? [];

  return { data: shifts, total: shifts.length, page: 1, page_size: shifts.length };
}

// ═══════════════════════════════════════════════════════════════════
// UNASSIGNED TASK BLOCKS — главное API распределения задач
// ═══════════════════════════════════════════════════════════════════
//
// Блоки приходят из LAMA как сводки трудозатрат на магазин:
// «Выкладка ФРОВ — 480 минут на день». Директор/ИИ их распределяет
// на конкретных сотрудников → блок «лопается» на N задач в MOCK_TASKS.
//
// Backend сейчас НЕ имеет endpoint'а для блоков (admin-only концепция).
// Будем просить backend добавить /tasks/unassigned-blocks (см. MIGRATION-NOTES).

/** In-memory state блоков (мутируем при распределении). */
const blockState: Map<string, UnassignedTaskBlock> = new Map(
  MOCK_UNASSIGNED_BLOCKS.map((b) => [b.id, { ...b }]),
);

/**
 * Set магазинов у которых есть LAMA-данные (реальные блоки нераспределённых задач).
 * Используется на /tasks/distribute чтобы скрывать из дропдауна магазины без данных
 * (для них генерится fallback по медианам — но user'у это менее интересно, лучше
 * показать только те где есть реальная картина).
 *
 * @endpoint GET /tasks/distribute/active-stores (admin-only — backend пока без блоков)
 */
const ACTIVE_LAMA_STORE_IDS_SET = new Set<number>(
  MOCK_UNASSIGNED_BLOCKS.map((b) => b.store_id),
);

export function getActiveLamaStoreIds(): Set<number> {
  return ACTIVE_LAMA_STORE_IDS_SET;
}

/**
 * Получить нераспределённые блоки для магазина на дату.
 *
 * @admin-only — backend пока не имеет эндпоинта для блоков.
 *               См. MIGRATION-NOTES.md, request "GET /tasks/unassigned-blocks".
 */
export async function getStoreUnassignedBlocks(
  storeId: number,
  date: string,
): Promise<ApiListResponse<UnassignedTaskBlock>> {
  await new Promise((r) => setTimeout(r, 250));

  const all = Array.from(blockState.values()).filter(
    (b) =>
      b.store_id === storeId &&
      b.date === date &&
      !b.is_distributed,
  );

  // Sort: priority (1 = critical) сверху, потом по time_total убыв.
  all.sort((a, b) => {
    const pa = a.priority ?? 50;
    const pb = b.priority ?? 50;
    if (pa !== pb) return pa - pb;
    return b.total_minutes - a.total_minutes;
  });

  return { data: all, total: all.length, page: 1, page_size: all.length };
}

export interface BlockAllocation {
  user_id: number;
  user_name: string;
  minutes: number;
}

/**
 * Распределить блок на сотрудников. Лопает блок:
 *   - в MOCK_TASKS добавляются N новых Task (по одной на каждого user_id)
 *   - блок помечается is_distributed=true (или partial если minutes < total)
 *   - возвращает spawned task IDs
 *
 * @admin-only — это admin distribute flow, backend получит уже готовые Task'и.
 */
export async function distributeBlock(
  blockId: string,
  allocations: BlockAllocation[],
): Promise<ApiMutationResponse & { task_ids?: string[] }> {
  await new Promise((r) => setTimeout(r, 350));

  const block = blockState.get(blockId);
  if (!block) {
    return {
      success: false,
      error: { code: "BLOCK_NOT_FOUND", message: `Block ${blockId} not found` },
    };
  }
  if (block.is_distributed) {
    return {
      success: false,
      error: { code: "ALREADY_DISTRIBUTED", message: "Блок уже распределён" },
    };
  }

  const totalAllocated = allocations.reduce((s, a) => s + a.minutes, 0);
  if (totalAllocated > block.remaining_minutes) {
    return {
      success: false,
      error: {
        code: "EXCEEDS_REMAINING",
        message: `Распределено ${totalAllocated} мин, но в блоке осталось ${block.remaining_minutes} мин`,
      },
    };
  }

  // Spawn N tasks (по одной на каждого user_id из allocations)
  const today = new Date().toISOString();
  const spawnedIds: string[] = [];
  for (const alloc of allocations) {
    const taskId = `task-from-${blockId}-${alloc.user_id}-${Date.now()}`;
    const newTask: Task = {
      id: taskId,
      title: block.title,
      description: `Распределено директором из блока «${block.title}» (${block.total_minutes} мин на ${block.zone_name})`,
      type: "PLANNED",
      kind: "SINGLE",
      source: "PLANNED",
      planned_minutes: alloc.minutes,
      store_id: block.store_id,
      store_name: block.store_name,
      zone_id: block.zone_id,
      zone_name: block.zone_name,
      work_type_id: block.work_type_id,
      work_type_name: block.work_type_name,
      product_category_id: block.product_category_id ?? null,
      product_category_name: block.product_category_name ?? null,
      creator_id: 0, // будет установлен из контекста UI
      creator_name: "Директор магазина",
      assignee_id: alloc.user_id,
      assignee_name: alloc.user_name,
      assigned_to_permission: null,
      state: "NEW",
      review_state: "NONE",
      acceptance_policy: "MANUAL",
      requires_photo: false,
      archived: false,
      priority: block.priority,
      created_at: today,
      updated_at: today,
    };
    MOCK_TASKS.push(newTask);
    spawnedIds.push(taskId);
  }

  // Update block state
  block.distributed_minutes += totalAllocated;
  block.remaining_minutes = block.total_minutes - block.distributed_minutes;
  block.is_distributed = block.remaining_minutes <= 0;
  block.spawned_task_ids = [...(block.spawned_task_ids ?? []), ...spawnedIds];

  return { success: true, task_ids: spawnedIds };
}

/**
 * Assign/distribute a task to one or more users.
 * Supports partial distribution across multiple employees.
 */
export async function assignTaskToUser(
  taskId: string,
  assignments: TaskDistributionAllocation[]
): Promise<ApiMutationResponse> {
  await new Promise((r) => setTimeout(r, 400));

  // Если taskId — это id блока ЛАМА (начинается с "block-"), то делегируем
  // в distributeBlock: блок «лопается» на N конкретных Task'ов.
  if (taskId.startsWith("block-")) {
    const blockAllocs: BlockAllocation[] = assignments.map((a) => {
      const user = MOCK_USERS.find((u) => u.id === a.userId);
      const fullName = user ? `${user.last_name} ${user.first_name}` : `User #${a.userId}`;
      return { user_id: a.userId, user_name: fullName, minutes: a.minutes };
    });
    const res = await distributeBlock(taskId, blockAllocs);
    return res;
  }

  // Validate task exists
  const task = MOCK_TASKS.find((t) => t.id === taskId);

  if (!task) {
    return {
      success: false,
      error: {
        code: "NOT_FOUND",
        message: "Task not found",
      },
    };
  }

  // Validation удалена: директор может назначить сверх плана задачи
  // (сценарий «нужно больше работы по этой задаче чем изначально считали»).
  // Над-шифтовое over-allocation детектится в компоненте через
  // notifyOverShiftAssignment (нужны employees state и shift hours).

  // Store allocations (история распределения — для distribution-page state)
  taskAllocations.set(taskId, assignments);

  // Создаём реальные задачи на конкретных сотрудников.
  // Каждое распределение = отдельная Task в MOCK_TASKS, доступная в /tasks
  // и /tasks/{id}. Это «дробление» родительской unassigned-задачи на исполняемые.
  const now = new Date().toISOString();
  for (const a of assignments) {
    const user = MOCK_USERS.find((u) => u.id === a.userId);
    if (!user) continue;
    const userName = `${user.last_name} ${user.first_name}`;
    const childId = `${taskId}--user-${a.userId}-${Date.now()}`;
    const childTask: Task = {
      ...task,
      id: childId,
      title: `${task.title} — ${userName}`,
      planned_minutes: a.minutes,
      assignee_id: a.userId,
      assignee_name: userName,
      assigned_to_permission: null,
      state: "NEW",
      review_state: "NONE",
      source: task.source ?? "PLANNED",
      // editable_by_store false — задача спущена сверху, директор только распределил
      editable_by_store: false,
      created_at: now,
      updated_at: now,
    };
    MOCK_TASKS.push(childTask);
  }

  return { success: true };
}

/**
 * Get current allocations for a task.
 */
export async function getTaskAllocations(
  taskId: string
): Promise<ApiResponse<TaskDistributionAllocation[]>> {
  await new Promise((r) => setTimeout(r, 100));

  const allocations = taskAllocations.get(taskId) || [];

  return { data: allocations };
}

/**
 * Clear all allocations for a task.
 */
export async function clearTaskAllocations(
  taskId: string
): Promise<ApiMutationResponse> {
  await new Promise((r) => setTimeout(r, 100));

  taskAllocations.delete(taskId);

  return { success: true };
}

// ═══════════════════════════════════════════════════════════════════
// OVER-SHIFT NOTIFICATION
// ═══════════════════════════════════════════════════════════════════

export interface OverShiftEntry {
  userId: number;
  userName: string;
  shiftMin: number;
  /** Сколько в итоге назначено: server assigned + плановые allocations */
  totalAfterMin: number;
}

/**
 * Уведомить supervisor+ о том что директор назначил сотруднику работы
 * сверх его плановой смены. Создаёт GENERIC-уведомления в MOCK_NOTIFICATIONS
 * для каждого supervisor этого магазина.
 *
 * В моке использует hardcoded supervisor user_id=4 (Романов И. А.) — в живом
 * backend будет резолвиться через store-supervisor mapping.
 *
 * @endpoint POST /api/distribution/notify-over-shift
 */
export async function notifyOverShiftAssignment(
  storeId: number,
  overShifts: OverShiftEntry[],
  actor: { id: number; name: string; role: FunctionalRole }
): Promise<ApiResponse<{ notified_count: number }>> {
  await new Promise((r) => setTimeout(r, 100));

  if (overShifts.length === 0) {
    return { data: { notified_count: 0 } };
  }

  // Целевая аудитория — supervisor этого магазина и выше.
  // Mock: hardcoded user_id=4 (Романов, SUPERVISOR в demo-данных).
  const supervisorIds: number[] = [4];

  let count = 0;
  const bodyLines = overShifts
    .map(
      (os) =>
        `${os.userName}: смена ${(os.shiftMin / 60).toFixed(1)} ч → назначено ${(
          os.totalAfterMin / 60
        ).toFixed(1)} ч (+${((os.totalAfterMin - os.shiftMin) / 60).toFixed(1)} ч)`
    )
    .join("; ");

  for (const sup of supervisorIds) {
    MOCK_NOTIFICATIONS.unshift({
      id: `notif-overshift-${Date.now()}-${sup}`,
      user_id: sup,
      category: "GENERIC",
      title: `${actor.name} назначил сверх плана часов`,
      body: bodyLines,
      data: {
        store_id: storeId,
        actor_id: actor.id,
        actor_role: actor.role,
        over_shift_count: overShifts.length,
        over_shift_users: overShifts.map((o) => o.userId),
      },
      link: "/tasks/distribute",
      is_read: false,
      is_archived: false,
      created_at: new Date().toISOString(),
    });
    count++;
  }

  return { data: { notified_count: count } };
}

// ═══════════════════════════════════════════════════════════════════
// AUTO-DISTRIBUTE ALGORITHM (pure, sync — no server side-effects)
// ═══════════════════════════════════════════════════════════════════

/**
 * Iter#5 scoring weights — iter#4 baseline (zone+global wtype) + 2 новых
 * сигнала ADDITIVELY (stickiness + per-shop wtype), не replacement. Это
 * сохраняет силу global wtype для emp'ов с короткой shop-историей, и
 * толкает «вчерашнего» в топ при близком score.
 *
 * iter#3: zone 44 / wtype 40 / balance  5 / rank 11           → 46.0%
 * iter#4: + single-assignee                                   → 45.3% (честнее)
 * iter#5: zone 30 / wtype 30 / shopWT 15 / stick 15 / b+r 10  → цель 55-65%
 *
 * Замечание: stickiness — bonus only когда «вчера в этом shop эту (zone, wt)
 * делал кандидат X». Это не строгий predictor, но толкает X в топ при ties.
 */
const SCORE_WEIGHT_ZONE = 0.30;
const SCORE_WEIGHT_WTYPE = 0.25;
const SCORE_WEIGHT_SHIFT_ALIGN = 0.20; // iter#6: время задачи vs старт смены
const SCORE_WEIGHT_SHOP_WTYPE = 0.10;
const SCORE_WEIGHT_STICKINESS = 0.10;
const SCORE_WEIGHT_RANK = 0.03;
const SCORE_WEIGHT_BALANCE = 0.02;

/**
 * Iter#6: считает гэп между временем задачи и временем начала смены
 * сотрудника. score = 1 если совпадает, 0 если разница ≥4ч. Шкала
 * линейная — задача в 08:00 у emp с shift_start 07:00 → score 0.75.
 */
function parseHHMM(s?: string): number | null {
  if (!s) return null;
  const m = s.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return parseInt(m[1], 10) + parseInt(m[2], 10) / 60;
}
function shiftAlignScore(taskTimeStart: string, shiftTimeStart?: string): number {
  const tH = parseHHMM(taskTimeStart);
  const sH = parseHHMM(shiftTimeStart);
  if (tH === null || sH === null) return 0;
  const gap = Math.abs(tH - sH);
  return Math.max(0, 1 - gap / 4);
}

/**
 * Iter#10 — retail business priority (порядок выполнения задач).
 * Реальный ритейл-приоритет из практики розничных сетей:
 *
 * 1 = Касса (выручка под угрозой если открыта не будет)
 * 2 = Выкладка свежих категорий — Фреш, Молочка (скоропорт)
 * 3 = Выкладка остальных категорий, КСО
 * 4 = Менеджерские операции
 * 5 = Переоценка (можно подождать)
 * 6 = Инвентаризация (плановая, не срочно)
 * 7 = Прочее
 *
 * Возвращает число: меньше = выше приоритет (раздаём первым).
 */
function retailPriority(workType: string, zone: string): number {
  if (workType === "Касса") return 1;
  if (workType === "Выкладка") {
    const isFresh = zone === "Фреш 1" || zone === "Фреш 2"
      || zone === "Молочка" || zone === "Молочные продукты"
      || zone === "Кулинария" || zone === "Хлеб";
    return isFresh ? 2 : 3;
  }
  if (workType === "КСО") return 3;
  if (workType === "Менеджерские операции") return 4;
  if (workType === "Переоценка") return 5;
  if (workType === "Инвентаризация") return 6;
  return 7;
}

/**
 * Seniority score из position_name (LAMA `rank` поле = «N/A» для всех
 * Administrators, поэтому используем keyword match по должности).
 * Source: per-store-pattern-analysis.py — те же ключи.
 */
function rankSeniority(positionName?: string): number {
  if (!positionName) return 0;
  const p = positionName.toLowerCase();
  if (p.includes("управляющий магазином")) return 8;
  if (p.includes("заместитель управляющего")) return 7;
  if (p.includes("старший смены")) return 5;
  if (p.includes("старший")) return 4;
  if (p.includes("заместитель")) return 4;
  if (p.includes("администратор")) return 3;
  if (p.includes("универсал")) return 2;
  return 1;
}

/** Min-max нормализация значения в [0..1] относительно набора кандидатов. */
function minmax(value: number, min: number, max: number): number {
  if (max <= min) return value > 0 ? 1 : 0;
  return (value - min) / (max - min);
}

/**
 * Greedy distribution с weighted multi-factor scoring (iter#3).
 *
 * Сортируем задачи по priority asc (1 = critical), затем для каждой:
 *
 * 1. **Match cascade** — фильтр кандидатов по совместимости:
 *    a) Сотрудники с подходящей zone (e.user.zones ∩ task.zone_name).
 *    b) Если задача без зоны (Касса/КСО/Менеджерские) ИЛИ по zone никого
 *       не нашлось — fallback на work_types.
 *    c) Финальный fallback — все со свободным временем.
 *
 * 2. **Weighted score** — внутри кандидатов сортируем по убыванию score:
 *
 *    score = 0.44 * zone_affinity_norm
 *          + 0.40 * work_type_affinity_norm
 *          + 0.05 * (1 - load_norm)
 *          + 0.11 * rank_seniority_norm
 *
 *    Каждое слагаемое — minmax-norm среди eligible кандидатов task'а.
 *    Веса откалиброваны по 5765 реальным решениям директоров за 4 дня
 *    (PER-STORE-PATTERNS.md). Реальность концентрирует работу на профиле
 *    сотрудника (zone+wtype 84%), почти не балансирует (5%).
 *
 * 3. **Single-assignee (iter#4)** — задача отдаётся ОДНОМУ топ-кандидату
 *    целиком, без дробления. Директор так и делает: отдаёт Маше всю
 *    Бакалею, не расщепляет на Машу+Петю. Если у топа нет окна (free=0) —
 *    берём следующего по score. Overtime допустим.
 *
 * Не делает API-вызовов, не мутирует серверное состояние. Идемпотентна.
 */
export function autoDistribute(
  tasks: UnassignedTask[],
  employees: EmployeeUtilization[],
  currentDate?: string,
): Map<string, TaskDistributionAllocation[]> {
  const plan = new Map<string, TaskDistributionAllocation[]>();

  // Iter#7 experiment (rolled back): runtime brigade tracking создавал
  // cascade-trap — если первая task попала к неправильному emp, blok
  // тащил все остальные тоже. Returns to iter#6 как honest best baseline.
  // Brigade pattern (35% emps работают на 1 wt в день) проявится через
  // per-day stickiness как только cron накопит ≥7 дней shifts data.

  // Stickiness: берём данные за день ПЕРЕД currentDate (вчерашний).
  // Если currentDate не передан или нет данных за previous day — empty map.
  const sortedStickyDates = Object.keys(STICKINESS_BY_DATE).sort();
  const prevDate = currentDate
    ? sortedStickyDates.filter((d) => d < currentDate).pop()
    : sortedStickyDates[sortedStickyDates.length - 1]; // fallback: latest
  const currentDateStickiness = prevDate
    ? STICKINESS_BY_DATE[prevDate]
    : undefined;

  // Mutable per-employee free minutes — shrinks как аллоцируем.
  const freeByUser = new Map<number, number>();
  for (const emp of employees) {
    freeByUser.set(
      emp.user.id,
      Math.max(0, emp.shift_total_min - emp.assigned_min)
    );
  }

  // Iter#10 — sort tasks by retail business priority FIRST (Касса → Фреш
  // → Выкладка → ... → Переоценка), затем LAMA priority, затем длиннее
  // первой (большие задачи труднее впихнуть в конце).
  const sorted = [...tasks]
    .filter((t) => t.remaining_minutes > 0)
    .sort((a, b) => {
      const pra = retailPriority(a.work_type_name ?? "", a.zone_name ?? "");
      const prb = retailPriority(b.work_type_name ?? "", b.zone_name ?? "");
      if (pra !== prb) return pra - prb;
      const la = a.priority ?? 100;
      const lb = b.priority ?? 100;
      if (la !== lb) return la - lb;
      return (b.remaining_minutes ?? 0) - (a.remaining_minutes ?? 0);
    });

  for (const task of sorted) {
    let remaining = task.remaining_minutes;
    const allocations: TaskDistributionAllocation[] = [];

    // Match cascade (iter#5): hard constraint по work_type если есть.
    // «Без зоны» и «N/A» — оба означают «у task нет конкретной зоны»
    // (Касса/КСО/Менеджерские/Переоценка/Инвентаризация работают без zone).
    const hasZone = !!task.zone_name
      && task.zone_name !== "Без зоны"
      && task.zone_name !== "N/A";
    const hasWorkType = !!task.work_type_name;
    const taskWorkType = task.work_type_name ?? "";
    const taskZone = task.zone_name ?? "";
    const taskShopCode = STORES_BY_ID.get(task.store_id)?.external_code ?? "";

    let candidates: EmployeeUtilization[] = [];
    // 1. Strict: совпадение zone И work_type (если есть оба).
    if (hasZone && hasWorkType) {
      candidates = employees.filter(
        (e) =>
          e.user.zones?.includes(taskZone) &&
          e.user.work_types?.includes(taskWorkType) &&
          (freeByUser.get(e.user.id) ?? 0) > 0,
      );
    }
    // 2. Relax: только zone (если по сценарию выше пусто).
    if (candidates.length === 0 && hasZone) {
      candidates = employees.filter(
        (e) =>
          e.user.zones?.includes(taskZone) &&
          (freeByUser.get(e.user.id) ?? 0) > 0,
      );
    }
    // 3. Relax: только work_type (zone не задан или нет совпадений).
    if (candidates.length === 0 && hasWorkType) {
      candidates = employees.filter(
        (e) =>
          e.user.work_types?.includes(taskWorkType) &&
          (freeByUser.get(e.user.id) ?? 0) > 0,
      );
    }
    // 4. Final fallback: если все предыдущие cascade'ы пустые — берём всех
    // со свободным временем. Это «лучше что-то предложить чем ничего», даже
    // если у emp нет истории по этой зоне/wtype (новый сотрудник, или просто
    // не делал такое раньше). Hard constraint смягчён после iter#5 backtest'а
    // (43% задач оставались без кандидатов — что хуже false positive).
    //
    // ИСКЛЮЧЕНИЕ — «Касса» = материальная ответственность. На обычную кассу
    // (НЕ КСО) можно отдавать ТОЛЬКО тех у кого «Касса» уже была в истории
    // или в preferred_work_types. Если 0 кандидатов после строгих cascade'ов
    // → не подсовываем рандомного, оставляем пустой allocations и идём
    // дальше. UI покажет директору warning «нужно добавить зону Касса
    // кому-то из сотрудников».
    const isCashier = taskWorkType === "Касса";
    if (candidates.length === 0 && !isCashier) {
      candidates = employees.filter((e) => (freeByUser.get(e.user.id) ?? 0) > 0);
    }

    // Iter#5 scoring: zone 30 + global wtype 30 + shop wtype 15 + stickiness 15
    //                 + rank 5 + balance 5. Stickiness/shop-wtype — boosters,
    //                 не replacement.
    const stickinessEmpId = currentDateStickiness?.[
      `${taskShopCode}::${taskZone}::${taskWorkType}`
    ];

    const stickinessFor = (uid: number): number =>
      stickinessEmpId !== undefined && stickinessEmpId === uid ? 1 : 0;
    const shopWtFor = (uid: number): number => {
      if (!taskShopCode || !taskWorkType) return 0;
      return SHOP_EMPLOYEE_WT_COUNT[`${taskShopCode}::${uid}::${taskWorkType}`] ?? 0;
    };
    // Iter#6 — shift_start lookup для shift-alignment score.
    // currentDate уже резолвлен наверху как prevDate-source для stickiness;
    // для shift-align берём ТЕКУЩИЙ день (или latest snapshot если нет).
    const shiftStartDateKeys = Object.keys(EMPLOYEE_SHIFT_START_BY_DATE).sort();
    const shiftDate = currentDate && EMPLOYEE_SHIFT_START_BY_DATE[currentDate]
      ? currentDate
      : shiftStartDateKeys[shiftStartDateKeys.length - 1];
    const shiftStartMap = shiftDate ? EMPLOYEE_SHIFT_START_BY_DATE[shiftDate] : undefined;
    const shiftAlignFor = (uid: number): number => {
      const shiftStart = shiftStartMap?.[uid];
      const taskStart = task.time_start ?? "";
      if (!shiftStart || !taskStart) return 0;
      return shiftAlignScore(taskStart, shiftStart);
    };
    const zoneAffFor = (uid: number): number => {
      const stats = EMPLOYEE_STATS[uid];
      if (!stats || !taskZone) return 0;
      return stats.zone_affinity?.[taskZone] ?? 0;
    };
    const wtypeAffFor = (uid: number): number => {
      const stats = EMPLOYEE_STATS[uid];
      if (!stats || !taskWorkType) return 0;
      return stats.affinity?.[taskWorkType]?.count ?? 0;
    };
    const loadFor = (uid: number, total: number): number =>
      total > 0 ? 1 - (freeByUser.get(uid) ?? 0) / total : 1;
    const rankFor = (e: EmployeeUtilization): number =>
      rankSeniority(e.user.position_name);

    // Pre-compute ranges для minmax нормализации (7 факторов, iter#6).
    const stickVals = candidates.map((e) => stickinessFor(e.user.id));
    const swVals = candidates.map((e) => shopWtFor(e.user.id));
    const zoneVals = candidates.map((e) => zoneAffFor(e.user.id));
    const wtypeVals = candidates.map((e) => wtypeAffFor(e.user.id));
    const shiftVals = candidates.map((e) => shiftAlignFor(e.user.id));
    const loadVals = candidates.map((e) => loadFor(e.user.id, e.shift_total_min));
    const rankVals = candidates.map((e) => rankFor(e));
    const sMin = Math.min(...stickVals), sMax = Math.max(...stickVals);
    const swMin = Math.min(...swVals), swMax = Math.max(...swVals);
    const zMin = Math.min(...zoneVals), zMax = Math.max(...zoneVals);
    const wMin = Math.min(...wtypeVals), wMax = Math.max(...wtypeVals);
    const shMin = Math.min(...shiftVals), shMax = Math.max(...shiftVals);
    const lMin = Math.min(...loadVals), lMax = Math.max(...loadVals);
    const rMin = Math.min(...rankVals), rMax = Math.max(...rankVals);

    const scoreOf = (e: EmployeeUtilization): number => {
      const s = minmax(stickinessFor(e.user.id), sMin, sMax);
      const sw = minmax(shopWtFor(e.user.id), swMin, swMax);
      const z = minmax(zoneAffFor(e.user.id), zMin, zMax);
      const w = minmax(wtypeAffFor(e.user.id), wMin, wMax);
      const sh = minmax(shiftAlignFor(e.user.id), shMin, shMax);
      const l = minmax(loadFor(e.user.id, e.shift_total_min), lMin, lMax);
      const r = minmax(rankFor(e), rMin, rMax);
      return (
        SCORE_WEIGHT_ZONE * z +
        SCORE_WEIGHT_WTYPE * w +
        SCORE_WEIGHT_SHIFT_ALIGN * sh +
        SCORE_WEIGHT_SHOP_WTYPE * sw +
        SCORE_WEIGHT_STICKINESS * s +
        SCORE_WEIGHT_BALANCE * (1 - l) +
        SCORE_WEIGHT_RANK * r
      );
    };
    // Iter#8 — brigade pre-assign: если среди eligible кандидатов есть
    // emp с накопленной expertise по этой (shop, zone, wt) ≥ 3 раз →
    // он специалист, отдаём ему. Если несколько — берём максимум.
    // Это не cascade trap: смотрим в data history, не в runtime decisions.
    const EXPERTISE_THRESHOLD = 3;
    let bestExpert: EmployeeUtilization | null = null;
    let bestExpertCount = 0;
    for (const e of candidates) {
      const cnt = SHOP_EMPLOYEE_ZONE_WT_COUNT[
        `${taskShopCode}::${e.user.id}::${taskZone}::${taskWorkType}`
      ] ?? 0;
      if (cnt >= EXPERTISE_THRESHOLD && cnt > bestExpertCount) {
        bestExpert = e;
        bestExpertCount = cnt;
      }
    }

    const ranked = bestExpert
      ? [bestExpert, ...candidates.filter((e) => e !== bestExpert).sort((a, b) => scoreOf(b) - scoreOf(a))]
      : [...candidates].sort((a, b) => scoreOf(b) - scoreOf(a));

    // Iter#9 — single-assignee БЕЗ overtime: задача отдаётся одному топ-
    // кандидату только если у него хватает свободного времени на ВСЮ
    // задачу. Если у топа недостаточно — берём следующего по score.
    //
    // Iter#11 — частичное назначение для Кассы: смена 12ч, а Касса-задача
    // часто 14-15ч (открыта весь день). Тогда первый кассир берёт сколько
    // помещается, остаток идёт следующему кассиру. Это «эстафета смен».
    // Для НЕ-Кассы — single-assignee без дробления (директор так делает).
    const allowSplit = task.work_type_name === "Касса";

    for (const emp of ranked) {
      if (remaining <= 0) break;
      const free = freeByUser.get(emp.user.id) ?? 0;
      if (free < 1) continue;
      if (!allowSplit && free < remaining) continue; // обычная — целиком или ничего
      const give = Math.min(free, remaining);
      allocations.push({ userId: emp.user.id, minutes: give });
      freeByUser.set(emp.user.id, free - give);
      remaining -= give;
      if (!allowSplit) break; // single для обычных task — берём только одного
    }

    if (allocations.length > 0) {
      plan.set(task.id, allocations);
    }
  }

  return plan;
}
