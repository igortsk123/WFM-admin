/**
 * Auto-distribute algorithm — третья часть трилогии
 * (planning-pool / distribution-stats / auto-distribute).
 *
 * Берёт сегодняшние нераспределённые задачи магазина из LAMA_PLANNING_POOL
 * и для каждой жадно подбирает лучшего исполнителя, опираясь на исторические
 * статистики из EMPLOYEE_STATS / WORK_TYPE_STATS + permission/zone мапы.
 *
 * Используется на /tasks/distribute как «Авто-распределить (по истории)» —
 * предлагает план с детальным reasoning'ом для демо клиенту.
 *
 * Pure function — данные тянутся из mock'ов (LAMA snapshot обновляется cron'ом
 * tools/lama/build-planning-pool.py + analyze-distribution.py).
 */

import {
  EMPLOYEE_STATS,
  WORK_TYPE_STATS,
  type EmployeeStats,
  type WorkTypeStats,
} from "@/lib/mock-data/_lama-distribution-stats";
import {
  LAMA_PLANNING_POOL,
  type PlanningEmployee,
  type PlanningTask,
  type ShopPlanningPool,
} from "@/lib/mock-data/_lama-planning-pool";
import { LAMA_EMPLOYEE_WORK_TYPES } from "@/lib/mock-data/_lama-employee-work-types";
import { LAMA_EMPLOYEE_ZONES } from "@/lib/mock-data/_lama-employee-zones";

// ═══════════════════════════════════════════════════════════════════
// PUBLIC TYPES
// ═══════════════════════════════════════════════════════════════════

export interface DistributionAssignment {
  taskId: number;
  employeeId: number;
  /** Имя сотрудника — сохраняем чтобы UI не лез повторно в EMPLOYEE_STATS. */
  employeeName: string;
  /** Минуты задачи — для агрегации в employee_load и UI плашек. */
  durationMinutes: number;
  /** Человеко-читаемое объяснение выбора (для демо клиенту). */
  reasoning: string;
  /** Итоговый score (0–100), сумма взвешенных компонентов. */
  score: number;
  /** Разбор по компонентам — для UI tooltip'а / debug. */
  breakdown: {
    affinity: number;
    loadBalance: number;
    zoneMatch: number;
    permissionMatch: number;
  };
}

export interface UnassignedReason {
  taskId: number;
  reason: string;
}

export interface DistributionResult {
  assignments: DistributionAssignment[];
  unassigned: UnassignedReason[];
  stats: {
    total_tasks: number;
    distributed: number;
    avg_score: number;
    /** Часов назначено per employee (для bar-chart визуализации). */
    employee_load: Record<number, number>;
  };
}

// ═══════════════════════════════════════════════════════════════════
// CONSTANTS — work_type → permission mapping
// ═══════════════════════════════════════════════════════════════════

/**
 * Маппинг типа работы LAMA → permission code.
 * Используется для permission-match score (см. ниже).
 */
const WORK_TYPE_TO_PERMISSION: Record<string, string> = {
  Касса: "CASHIER",
  КСО: "SELF_CHECKOUT",
  Выкладка: "SALES_FLOOR",
  Инвентаризация: "WAREHOUSE",
  Переоценка: "SALES_FLOOR",
  "Менеджерские операции": "MANAGER",
  "Другие работы": "GENERAL",
};

/**
 * Обратная карта: какие work_type'ы покрывает каждое permission.
 * Используется чтобы понять «может ли этот сотрудник трогать эту задачу».
 */
const PERMISSION_COVERS_WORK_TYPES: Record<string, string[]> = {
  CASHIER: ["Касса", "КСО"],
  SELF_CHECKOUT: ["КСО", "Касса"],
  SALES_FLOOR: ["Выкладка", "Переоценка"],
  WAREHOUSE: ["Инвентаризация", "Выкладка"],
  MANAGER: [
    "Менеджерские операции",
    "Касса",
    "КСО",
    "Выкладка",
    "Инвентаризация",
    "Переоценка",
    "Другие работы",
  ],
  GENERAL: ["Другие работы"],
};

// Веса компонентов score (сумма = 1.0).
const W_AFFINITY = 0.4;
const W_LOAD = 0.3;
const W_ZONE = 0.15;
const W_PERMISSION = 0.15;

// Минимальный score для назначения задачи. Если ни у кого score ≤ MIN_SCORE —
// задача попадает в `unassigned`. 25 = «совсем плохо подходит», лучше оставить
// директору ручному распределению.
const MIN_SCORE_THRESHOLD = 25;

// ═══════════════════════════════════════════════════════════════════
// HELPERS — derive permissions from LAMA work-types history
// ═══════════════════════════════════════════════════════════════════

/**
 * Из истории work_types сотрудника выводим набор permission'ов.
 * Если человек хоть раз делал Кассу — у него есть CASHIER. И т.д.
 *
 * Это approximation: реальные permissions хранятся в backend'е, но для демо
 * на LAMA-данных history = ground truth. Mobile app тоже использует
 * этот fallback для employees без явных permission'ов.
 */
function derivePermissions(employeeId: number): Set<string> {
  const workTypes = LAMA_EMPLOYEE_WORK_TYPES[employeeId] ?? [];
  const permissions = new Set<string>();
  for (const wt of workTypes) {
    const perm = WORK_TYPE_TO_PERMISSION[wt];
    if (perm) permissions.add(perm);
  }
  return permissions;
}

// ═══════════════════════════════════════════════════════════════════
// SCORING — каждый компонент 0–100
// ═══════════════════════════════════════════════════════════════════

/**
 * Affinity score — насколько сотрудник «быстр» в этом типе работы относительно
 * глобальной медианы по магазину. Если он на 30% быстрее среднего → ~80,
 * на 30% медленнее → ~30, нет истории → 50 (нейтрально, но без бонуса).
 */
function affinityScore(
  task: PlanningTask,
  empStats: EmployeeStats | undefined,
  workTypeStats: WorkTypeStats | undefined,
): { score: number; explanation: string | null } {
  if (!empStats) {
    return { score: 50, explanation: null };
  }
  const aff = empStats.affinity[task.operation_work];
  if (!aff || !workTypeStats) {
    return { score: 50, explanation: null };
  }
  const empMedian = aff.median_duration; // секунды
  const globalMedian = workTypeStats.median_duration;
  if (globalMedian <= 0) {
    return { score: 50, explanation: null };
  }
  // ratio < 1 = быстрее среднего, > 1 = медленнее
  const ratio = empMedian / globalMedian;
  // Клампим в [0.5, 1.5] и линейно мапим: 0.5 → 100, 1.0 → 50, 1.5 → 0
  const clamped = Math.max(0.5, Math.min(1.5, ratio));
  const score = Math.round(((1.5 - clamped) / 1.0) * 100);

  const empMin = Math.round(empMedian / 60);
  const globalMin = Math.round(globalMedian / 60);
  const pct = Math.round((1 - ratio) * 100);
  let explanation: string;
  if (Math.abs(pct) < 5) {
    explanation = `медиана ${empMin} мин (на уровне коллег)`;
  } else if (pct > 0) {
    explanation = `медиана ${empMin} мин (на ${pct}% быстрее коллег: ${globalMin} мин)`;
  } else {
    explanation = `медиана ${empMin} мин (на ${-pct}% медленнее коллег: ${globalMin} мин)`;
  }
  return { score, explanation };
}

/**
 * Load balance score — приоритет наименее загруженным.
 * threshold = средняя длительность задачи * 8 (типовая полная смена).
 * 0 загрузки → 100, на пороге → 0.
 */
function loadBalanceScore(
  currentLoadMinutes: number,
  maxLoadThresholdMinutes: number,
): { score: number; explanation: string } {
  if (maxLoadThresholdMinutes <= 0) {
    return { score: 50, explanation: "загрузка не оценивалась" };
  }
  const ratio = currentLoadMinutes / maxLoadThresholdMinutes;
  const score = Math.max(0, Math.round(100 - ratio * 100));
  const pct = Math.round(ratio * 100);
  const explanation =
    currentLoadMinutes === 0
      ? "пока без задач сегодня"
      : `сейчас загружен на ${pct}%`;
  return { score, explanation };
}

/**
 * Zone match — работал ли сотрудник в этой зоне исторически.
 * 100 = да, 50 = нейтрально (зона не важна или нет истории).
 */
function zoneMatchScore(
  task: PlanningTask,
  empStats: EmployeeStats | undefined,
  empZonesFallback: string[],
): { score: number; explanation: string | null } {
  // Задачи без зоны (Касса/КСО/Менеджерские) — zone-match не применим.
  if (!task.operation_zone || task.operation_zone === "N/A") {
    return { score: 50, explanation: null };
  }
  const zonesWorked = empStats?.zones_worked ?? empZonesFallback;
  if (zonesWorked.length === 0) {
    return { score: 50, explanation: null };
  }
  if (zonesWorked.includes(task.operation_zone)) {
    return {
      score: 100,
      explanation: `работал в зоне «${task.operation_zone}»`,
    };
  }
  return { score: 50, explanation: null };
}

/**
 * Permission match — может ли сотрудник в принципе брать задачи такого типа.
 *
 * 100 = есть прямое разрешение (CASHIER берёт «Касса» / «КСО»)
 *  70 = нейтрально (тип работ не требует специфичного permission)
 *   0 = hard mismatch (CASHIER не должен делать инвентаризацию склада)
 */
function permissionMatchScore(
  task: PlanningTask,
  empPermissions: Set<string>,
): { score: number; explanation: string | null } {
  const requiredPerm = WORK_TYPE_TO_PERMISSION[task.operation_work];
  if (!requiredPerm) {
    return { score: 70, explanation: null };
  }
  if (empPermissions.has(requiredPerm)) {
    return {
      score: 100,
      explanation: `доступ ${requiredPerm} (тип «${task.operation_work}»)`,
    };
  }
  // Может быть covered косвенно через MANAGER/cross-permission.
  for (const perm of empPermissions) {
    const covered = PERMISSION_COVERS_WORK_TYPES[perm] ?? [];
    if (covered.includes(task.operation_work)) {
      return {
        score: 100,
        explanation: `доступ ${perm} покрывает «${task.operation_work}»`,
      };
    }
  }
  // Если истории по этому сотруднику вообще нет — он новенький, даём ему шанс.
  if (empPermissions.size === 0) {
    return { score: 70, explanation: null };
  }
  return {
    score: 0,
    explanation: `нет прав на «${task.operation_work}»`,
  };
}

// ═══════════════════════════════════════════════════════════════════
// MAIN ALGORITHM
// ═══════════════════════════════════════════════════════════════════

interface CandidateScore {
  employee: PlanningEmployee;
  total: number;
  breakdown: DistributionAssignment["breakdown"];
  parts: Array<{ component: string; score: number; explanation: string }>;
}

/**
 * Подбор сотрудника для задачи + сборка reasoning.
 */
function scoreEmployee(
  task: PlanningTask,
  employee: PlanningEmployee,
  shop_code: string,
  currentLoadMinutes: number,
  maxLoadThresholdMinutes: number,
): CandidateScore {
  const empStats = EMPLOYEE_STATS[employee.employee_id];
  const wtKey = `${task.operation_work}::${shop_code}`;
  const wtStats = WORK_TYPE_STATS[wtKey];
  const empZonesFallback = LAMA_EMPLOYEE_ZONES[employee.employee_id] ?? [];
  const permissions = derivePermissions(employee.employee_id);

  const aff = affinityScore(task, empStats, wtStats);
  const load = loadBalanceScore(currentLoadMinutes, maxLoadThresholdMinutes);
  const zone = zoneMatchScore(task, empStats, empZonesFallback);
  const perm = permissionMatchScore(task, permissions);

  const total = Math.round(
    aff.score * W_AFFINITY +
      load.score * W_LOAD +
      zone.score * W_ZONE +
      perm.score * W_PERMISSION,
  );

  // Собираем top-3 explanations по убыванию score
  // (только те у которых есть человеко-читаемое объяснение).
  const parts: CandidateScore["parts"] = [];
  if (aff.explanation) parts.push({ component: "affinity", score: aff.score, explanation: aff.explanation });
  parts.push({ component: "load", score: load.score, explanation: load.explanation });
  if (zone.explanation) parts.push({ component: "zone", score: zone.score, explanation: zone.explanation });
  if (perm.explanation) parts.push({ component: "permission", score: perm.score, explanation: perm.explanation });
  parts.sort((a, b) => b.score - a.score);

  return {
    employee,
    total,
    breakdown: {
      affinity: aff.score,
      loadBalance: load.score,
      zoneMatch: zone.score,
      permissionMatch: perm.score,
    },
    parts,
  };
}

/**
 * Сборка человеко-читаемого reasoning для UI.
 * Формат: «Выбран {имя} потому что: {top 2-3 explanation через "; "}.»
 */
function buildReasoning(candidate: CandidateScore): string {
  const top = candidate.parts.slice(0, 3).map((p) => p.explanation);
  const firstName = candidate.employee.name.split(" ")[1] ?? candidate.employee.name;
  return `Выбран(а) ${firstName}: ${top.join("; ")}.`;
}

/**
 * Greedy auto-distribute по shop_code.
 *
 * 1. Берём задачи из планинг-пула, сортируем priority asc, time_start asc.
 * 2. Для каждой задачи скорим всех available_employees.
 * 3. Лучшего (>= MIN_SCORE_THRESHOLD) назначаем, обновляем currentLoad.
 * 4. Если все ниже threshold — задача → unassigned с причиной.
 *
 * @returns DistributionResult — план + статистика для UI.
 */
export function autoDistribute(shop_code: string): DistributionResult {
  const pool: ShopPlanningPool | undefined = LAMA_PLANNING_POOL[shop_code];
  if (!pool) {
    return {
      assignments: [],
      unassigned: [],
      stats: { total_tasks: 0, distributed: 0, avg_score: 0, employee_load: {} },
    };
  }

  const tasks = [...pool.tasks_to_distribute].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.time_start.localeCompare(b.time_start);
  });

  // Threshold per-shop = средняя длительность задачи * 8 (полная смена).
  const avgDurationSec =
    tasks.length > 0
      ? tasks.reduce((sum, t) => sum + t.duration, 0) / tasks.length
      : 3600;
  const maxLoadThresholdMinutes = Math.round((avgDurationSec * 8) / 60);

  const currentLoadMinutes = new Map<number, number>(); // employee_id → loaded min
  const assignments: DistributionAssignment[] = [];
  const unassigned: UnassignedReason[] = [];

  for (const task of tasks) {
    if (pool.available_employees.length === 0) {
      unassigned.push({ taskId: task.id, reason: "Нет доступных сотрудников в магазине" });
      continue;
    }

    const candidates = pool.available_employees.map((emp) =>
      scoreEmployee(
        task,
        emp,
        shop_code,
        currentLoadMinutes.get(emp.employee_id) ?? 0,
        maxLoadThresholdMinutes,
      ),
    );
    candidates.sort((a, b) => b.total - a.total);
    const best = candidates[0];

    if (!best || best.total < MIN_SCORE_THRESHOLD) {
      unassigned.push({
        taskId: task.id,
        reason:
          best && best.total > 0
            ? `Лучший кандидат набрал ${best.total}/100 — ниже порога ${MIN_SCORE_THRESHOLD}`
            : "Никто не подходит по правам / зоне",
      });
      continue;
    }

    const durationMinutes = Math.round(task.duration / 60);
    currentLoadMinutes.set(
      best.employee.employee_id,
      (currentLoadMinutes.get(best.employee.employee_id) ?? 0) + durationMinutes,
    );

    assignments.push({
      taskId: task.id,
      employeeId: best.employee.employee_id,
      employeeName: best.employee.name,
      durationMinutes,
      score: best.total,
      breakdown: best.breakdown,
      reasoning: buildReasoning(best),
    });
  }

  // Stats aggregation
  const employeeLoadHours: Record<number, number> = {};
  for (const [empId, mins] of currentLoadMinutes) {
    employeeLoadHours[empId] = Math.round((mins / 60) * 10) / 10;
  }
  const avgScore =
    assignments.length > 0
      ? Math.round(
          assignments.reduce((sum, a) => sum + a.score, 0) / assignments.length,
        )
      : 0;

  return {
    assignments,
    unassigned,
    stats: {
      total_tasks: tasks.length,
      distributed: assignments.length,
      avg_score: avgScore,
      employee_load: employeeLoadHours,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════
// UI HELPERS — pool lookups (чтобы UI не лез напрямую в mock-data)
// ═══════════════════════════════════════════════════════════════════

/**
 * Проверяет есть ли LAMA-пул задач для указанного магазина.
 * Используется UI чтобы скрыть кнопку «Авто (по истории)» для магазинов
 * без LAMA snapshot'а (Abricos / SPAR / прочие base-моки).
 */
export function hasPlanningPool(shop_code: string | null): boolean {
  if (!shop_code) return false;
  return Boolean(LAMA_PLANNING_POOL[shop_code]);
}

/**
 * Подписи задач (operation + zone) по taskId — для UI карточек в reasoning Sheet.
 */
export interface TaskLabel {
  title: string;
  zone: string | null;
}

export function getTaskLabels(shop_code: string | null): Map<number, TaskLabel> {
  const map = new Map<number, TaskLabel>();
  if (!shop_code) return map;
  const pool = LAMA_PLANNING_POOL[shop_code];
  if (!pool) return map;
  for (const task of pool.tasks_to_distribute) {
    const zone =
      task.operation_zone && task.operation_zone !== "N/A"
        ? task.operation_zone
        : null;
    const title = zone
      ? `${task.operation_work} · ${zone}`
      : task.operation_work;
    map.set(task.id, { title, zone });
  }
  return map;
}

// ═══════════════════════════════════════════════════════════════════
// AGGREGATION HELPER (для UI группировки)
// ═══════════════════════════════════════════════════════════════════

export interface EmployeeAssignmentGroup {
  employeeId: number;
  employeeName: string;
  totalMinutes: number;
  totalHours: number;
  assignments: DistributionAssignment[];
}

/**
 * Группирует assignments по сотрудникам — удобный shape для UI Sheet'а
 * («Анна — 5 задач, 4.5h, ...»).
 */
export function groupByEmployee(
  assignments: DistributionAssignment[],
): EmployeeAssignmentGroup[] {
  const groups = new Map<number, EmployeeAssignmentGroup>();
  for (const a of assignments) {
    let g = groups.get(a.employeeId);
    if (!g) {
      g = {
        employeeId: a.employeeId,
        employeeName: a.employeeName,
        totalMinutes: 0,
        totalHours: 0,
        assignments: [],
      };
      groups.set(a.employeeId, g);
    }
    g.assignments.push(a);
    g.totalMinutes += a.durationMinutes;
  }
  for (const g of groups.values()) {
    g.totalHours = Math.round((g.totalMinutes / 60) * 10) / 10;
  }
  return Array.from(groups.values()).sort(
    (a, b) => b.totalMinutes - a.totalMinutes,
  );
}
