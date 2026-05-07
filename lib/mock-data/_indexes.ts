/**
 * Pre-built indexes для горячих lookup'ов.
 *
 * Строятся один раз при первом импорте модуля (lazy init), потом каждый
 * `Map.get(key)` — O(1) вместо O(n) `arr.filter(predicate)`.
 *
 * Когда добавляются новые моки: индексы НЕ пересчитываются автоматически
 * (admin-only, hot-reload в dev пересоберёт). В рантайме — статичные.
 *
 * При изменении model-полей по которым индексируем (например добавляем
 * task.assignment_id) — обновлять и здесь, и в backend wrappers (см.
 * .claude/rules/backend-sync.md).
 */
import { MOCK_TASKS } from "./tasks";
import { MOCK_USERS } from "./users";
import { MOCK_SHIFTS } from "./shifts";
import { MOCK_HINTS } from "./hints";
import { MOCK_ASSIGNMENTS } from "./assignments";
import { MOCK_STORES } from "./stores";
import { MOCK_ZONES } from "./zones";
import { MOCK_WORK_TYPES } from "./work-types";
import { MOCK_PERMISSIONS } from "./permissions";
import type {
  Task,
  User,
  Shift,
  Hint,
  Assignment,
  Store,
  Zone,
  WorkType,
  WorkerPermission,
} from "@/lib/types";

/** Утилита: построить Map<K, T[]> из массива по ключу-функции. */
function groupBy<T, K>(arr: readonly T[], keyFn: (item: T) => K | null | undefined): Map<K, T[]> {
  const m = new Map<K, T[]>();
  for (const item of arr) {
    const k = keyFn(item);
    if (k == null) continue;
    let bucket = m.get(k);
    if (!bucket) {
      bucket = [];
      m.set(k, bucket);
    }
    bucket.push(item);
  }
  return m;
}

/** Утилита: построить Map<K, T> по уникальному ключу. */
function indexBy<T, K>(arr: readonly T[], keyFn: (item: T) => K): Map<K, T> {
  const m = new Map<K, T>();
  for (const item of arr) m.set(keyFn(item), item);
  return m;
}

// ── Tasks ───────────────────────────────────────────────────────────

/** Task lookup по UUID. */
export const TASKS_BY_ID: Map<string, Task> = indexBy(MOCK_TASKS, (t) => t.id);

/** Tasks per store_id (включая archived — фильтровать на уровне consumer'а). */
export const TASKS_BY_STORE: Map<number, Task[]> = groupBy(MOCK_TASKS, (t) => t.store_id);

/** Tasks per assignee_id (null assignee пропускается). */
export const TASKS_BY_ASSIGNEE: Map<number, Task[]> = groupBy(
  MOCK_TASKS,
  (t) => t.assignee_id ?? null,
);

// ── Users ───────────────────────────────────────────────────────────

export const USERS_BY_ID: Map<number, User> = indexBy(MOCK_USERS, (u) => u.id);

// ── Shifts ──────────────────────────────────────────────────────────

export const SHIFTS_BY_ID: Map<number, Shift> = indexBy(MOCK_SHIFTS, (s) => s.id);
export const SHIFTS_BY_STORE: Map<number, Shift[]> = groupBy(MOCK_SHIFTS, (s) => s.store_id);
export const SHIFTS_BY_USER: Map<number, Shift[]> = groupBy(MOCK_SHIFTS, (s) => s.user_id);
/** Shifts per (store_id, shift_date) — для агрегаций «сегодня». */
export const SHIFTS_BY_STORE_DATE: Map<string, Shift[]> = groupBy(
  MOCK_SHIFTS,
  (s) => `${s.store_id}:${s.shift_date}`,
);

// ── Assignments ─────────────────────────────────────────────────────

export const ASSIGNMENTS_BY_USER: Map<number, Assignment[]> = groupBy(
  MOCK_ASSIGNMENTS,
  (a) => a.user_id,
);
export const ASSIGNMENTS_BY_STORE: Map<number, Assignment[]> = groupBy(
  MOCK_ASSIGNMENTS,
  (a) => a.store_id,
);

// ── Hints (по (work_type_id, zone_id)) ──────────────────────────────

export const HINTS_BY_WT_ZONE: Map<string, Hint[]> = groupBy(
  MOCK_HINTS,
  (h) => `${h.work_type_id}:${h.zone_id}`,
);

// ── Permissions (активные, по user) ─────────────────────────────────

export const PERMISSIONS_BY_USER: Map<number, WorkerPermission[]> = groupBy(
  MOCK_PERMISSIONS,
  (p) => p.user_id,
);

// ── Reference dictionaries (id → entity) ────────────────────────────

export const STORES_BY_ID: Map<number, Store> = indexBy(MOCK_STORES, (s) => s.id);
export const ZONES_BY_ID: Map<number, Zone> = indexBy(MOCK_ZONES, (z) => z.id);
export const WORK_TYPES_BY_ID: Map<number, WorkType> = indexBy(MOCK_WORK_TYPES, (w) => w.id);
