import type { FunctionalRole, Task, Shift, UnassignedTaskBlock } from "@/lib/types";
import { MOCK_TASKS } from "@/lib/mock-data/tasks";
import { MOCK_USERS } from "@/lib/mock-data/users";
import { MOCK_NOTIFICATIONS } from "@/lib/mock-data/notifications";
import { MOCK_UNASSIGNED_BLOCKS } from "@/lib/mock-data/_lama-unassigned-blocks";
import { LAMA_EMPLOYEE_ZONES } from "@/lib/mock-data/_lama-employee-zones";
import { LAMA_EMPLOYEE_WORK_TYPES } from "@/lib/mock-data/_lama-employee-work-types";
import {
  USERS_BY_ID,
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
  // Median minutes из реальной выборки LAMA — 2 snapshot'а (40 shop-day обс.,
  // 17 магазинов). Источник: tools/lama/merge-stats.py → _merged-stats.json.
  const TEMPLATE: Array<{
    wt_id: number; wt_name: string;
    zone_id: number; zone_name: string;
    minutes: number; priority: number;
  }> = [
    // Касса — медиана 990 (16.5 ч на смену по нескольким кассирам)
    { wt_id: 2, wt_name: "Касса", zone_id: 117, zone_name: "Кассовая зона", minutes: 990, priority: 1 },
    // Менеджерские операции — медиана 420
    { wt_id: 1, wt_name: "Менеджерские операции", zone_id: 127, zone_name: "Торговый зал (общая)", minutes: 420, priority: 2 },
    // КСО — медиана 515 (~8.5 ч)
    { wt_id: 3, wt_name: "КСО", zone_id: 114, zone_name: "Зона КСО", minutes: 515, priority: 2 },
    // Выкладка по зонам — медианы из 2-snapshot выборки
    { wt_id: 4, wt_name: "Выкладка", zone_id: 111, zone_name: "ФРОВ", minutes: 540, priority: 3 },
    { wt_id: 4, wt_name: "Выкладка", zone_id: 100, zone_name: "Фреш 1", minutes: 215, priority: 3 },
    { wt_id: 4, wt_name: "Выкладка", zone_id: 101, zone_name: "Фреш 2", minutes: 220, priority: 4 },
    { wt_id: 4, wt_name: "Выкладка", zone_id: 102, zone_name: "Бакалея", minutes: 150, priority: 5 },
    { wt_id: 4, wt_name: "Выкладка", zone_id: 108, zone_name: "Кондитерка, чай, кофе", minutes: 150, priority: 5 },
    { wt_id: 4, wt_name: "Выкладка", zone_id: 109, zone_name: "Пиво, чипсы", minutes: 150, priority: 6 },
    { wt_id: 4, wt_name: "Выкладка", zone_id: 110, zone_name: "Напитки б/а", minutes: 120, priority: 6 },
    { wt_id: 4, wt_name: "Выкладка", zone_id: 106, zone_name: "Алкоголь", minutes: 90, priority: 6 },
    { wt_id: 4, wt_name: "Выкладка", zone_id: 104, zone_name: "Бытовая химия", minutes: 60, priority: 7 },
    { wt_id: 4, wt_name: "Выкладка", zone_id: 103, zone_name: "Заморозка", minutes: 60, priority: 7 },
    // Прикассовая зона — новая после 2-snapshot мерджа (12 магазинов, 20 обс.)
    { wt_id: 4, wt_name: "Выкладка", zone_id: 118, zone_name: "Прикассовая зона", minutes: 60, priority: 7 },
    { wt_id: 4, wt_name: "Выкладка", zone_id: 105, zone_name: "Non-Food", minutes: 30, priority: 8 },
    { wt_id: 4, wt_name: "Выкладка", zone_id: 107, zone_name: "ЗОЖ", minutes: 30, priority: 8 },
    // Инвентаризация — медиана 150
    { wt_id: 6, wt_name: "Инвентаризация", zone_id: 102, zone_name: "Бакалея", minutes: 150, priority: 7 },
    // Переоценка — медиана 87, округлено до 90
    { wt_id: 5, wt_name: "Переоценка", zone_id: 100, zone_name: "Фреш 1", minutes: 90, priority: 4 },
    // Другие работы — медиана 90
    { wt_id: 7, wt_name: "Другие работы", zone_id: 112, zone_name: "Без зоны", minutes: 90, priority: 7 },
  ];

  return TEMPLATE.map((t, idx) => ({
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
    priority: t.priority,
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

/**
 * Get employee utilization for a store on a specific date.
 * Combines shift data with assigned tasks to calculate workload.
 */
export async function getStoreEmployeesUtilization(
  storeId: number,
  date: string
): Promise<ApiResponse<EmployeeUtilization[]>> {
  await new Promise((r) => setTimeout(r, 350));

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
    // задачи нет зоны. Источник 1: LAMA snapshot history. Источник 2:
    // история admin-tasks (work_type_name из MOCK_TASKS).
    const workTypesFromHistory = new Set<string>();
    const lamaWorkTypes = LAMA_EMPLOYEE_WORK_TYPES[shift.user_id];
    if (lamaWorkTypes) {
      for (const w of lamaWorkTypes) workTypesFromHistory.add(w);
    }
    for (const t of userTasks) {
      if (t.work_type_name) workTypesFromHistory.add(t.work_type_name);
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
 * Greedy plan: sort tasks by priority asc (1 = critical), для каждой —
 * сначала кандидаты с совпадением зоны (employee.zones ∩ task.zone_name);
 * если совпадений нет — fallback на всех со свободным временем.
 * Внутри кандидатов сортировка по убыванию свободных минут (наименее
 * загруженный первым). Аллоцируем greedy пока задача не закрыта или
 * кандидаты не закончились.
 *
 * Возвращает план — Map<taskId, allocations>. Caller показывает план в UI
 * для подтверждения, затем коммитит через assignTaskToUser per task.
 *
 * Не делает API-вызовов, не мутирует серверное состояние. Идемпотентна.
 */
export function autoDistribute(
  tasks: UnassignedTask[],
  employees: EmployeeUtilization[]
): Map<string, TaskDistributionAllocation[]> {
  const plan = new Map<string, TaskDistributionAllocation[]>();

  // Mutable per-employee free minutes — shrinks as мы аллоцируем
  const freeByUser = new Map<number, number>();
  for (const emp of employees) {
    freeByUser.set(
      emp.user.id,
      Math.max(0, emp.shift_total_min - emp.assigned_min)
    );
  }

  // Sort: priority asc (1 = high, 100 = low), затем zone alpha для группировки
  const sorted = [...tasks]
    .filter((t) => t.remaining_minutes > 0)
    .sort((a, b) => {
      const pa = a.priority ?? 100;
      const pb = b.priority ?? 100;
      if (pa !== pb) return pa - pb;
      return (a.zone_name ?? "").localeCompare(b.zone_name ?? "");
    });

  for (const task of sorted) {
    let remaining = task.remaining_minutes;
    const allocations: TaskDistributionAllocation[] = [];

    // Step 1: zone match (по shift zone сотрудника)
    const zoneMatch = task.zone_name
      ? employees.filter(
          (e) =>
            e.user.zones?.includes(task.zone_name!) &&
            (freeByUser.get(e.user.id) ?? 0) > 0
        )
      : [];

    // Step 2: fallback all available если zone match пуст
    const candidates =
      zoneMatch.length > 0
        ? zoneMatch
        : employees.filter((e) => (freeByUser.get(e.user.id) ?? 0) > 0);

    // Most-free first
    const ranked = [...candidates].sort(
      (a, b) =>
        (freeByUser.get(b.user.id) ?? 0) - (freeByUser.get(a.user.id) ?? 0)
    );

    for (const emp of ranked) {
      if (remaining <= 0) break;
      const free = freeByUser.get(emp.user.id) ?? 0;
      if (free <= 0) continue;
      const allocate = Math.min(remaining, free);
      allocations.push({ userId: emp.user.id, minutes: allocate });
      freeByUser.set(emp.user.id, free - allocate);
      remaining -= allocate;
    }

    if (allocations.length > 0) {
      plan.set(task.id, allocations);
    }
  }

  return plan;
}
