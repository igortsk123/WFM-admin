/**
 * Shifts API — read-only schedule (all shifts come from LAMA planner).
 * Managers CANNOT create/update/delete shift plans through the admin panel.
 *
 * Schedule view (calendar grid: day/week/month) is exposed via getSchedule().
 * Manager actions limited to operational reopen / force-close — they do NOT
 * create or move shifts manually (LAMA owns the plan).
 */

import type {
  ApiResponse,
  ApiListResponse,
  ApiMutationResponse,
  ApiListParams,
  Shift,
  ShiftStatus,
  Task,
  AuditEntry,
} from "@/lib/types";
import { MOCK_SHIFTS } from "@/lib/mock-data/shifts";
import { MOCK_TASKS } from "@/lib/mock-data/tasks";
import { MOCK_AUDIT_ENTRIES } from "@/lib/mock-data/audit";

const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

export interface ShiftListParams extends ApiListParams {
  store_id?: number;
  user_id?: number;
  status?: ShiftStatus;
  date_from?: string;
  date_to?: string;
}

export interface ShiftDetail extends Shift {
  tasks: Array<
    Pick<Task, "id" | "title" | "state" | "review_state" | "work_type_name" | "zone_name">
  >;
  events: Array<{ type: string; text: string; occurred_at: string; actor_name: string }>;
  audit: AuditEntry[];
}

// ═══════════════════════════════════════════════════════════════════
// SCHEDULE VIEW TYPES
// ═══════════════════════════════════════════════════════════════════

/** Calendar render mode. */
export type ScheduleView = "day" | "week" | "month";

/**
 * Filters for schedule grid query.
 * date_from / date_to — inclusive ISO date range (YYYY-MM-DD).
 * store_ids / zone_ids / position_ids — optional multi-filters.
 * user_id — single-employee focus mode (mobile chip filter).
 * status — array of shift statuses to include (default: all).
 */
export interface ScheduleParams {
  view: ScheduleView;
  date_from: string;
  date_to: string;
  store_ids?: number[];
  zone_ids?: number[];
  position_ids?: number[];
  user_id?: number;
  status?: ShiftStatus[];
}

/**
 * Compact shift slot for calendar grid rendering.
 * Lighter than Shift — only fields the calendar needs (avoids hauling
 * audit/tasks/events for every cell).
 */
export interface ScheduleSlot {
  id: number;
  user_id: number;
  user_name: string;
  user_avatar_url?: string;
  store_id: number;
  store_name: string;
  zone_id?: number;
  zone_name?: string;
  position_id?: number;
  position_name?: string;
  shift_date: string;
  planned_start: string;
  planned_end: string;
  actual_start?: string;
  actual_end?: string;
  status: ShiftStatus;
  has_conflict?: boolean;
  late_minutes?: number;
  overtime_minutes?: number;
}

/**
 * Schedule grid response.
 * Aggregates: total planned/actual hours and coverage_pct (actual/planned ratio).
 */
export interface ScheduleResponse {
  slots: ScheduleSlot[];
  date_from: string;
  date_to: string;
  total_planned_hours: number;
  total_actual_hours: number;
  coverage_pct: number;
}

// ═══════════════════════════════════════════════════════════════════
// LIST & GET
// ═══════════════════════════════════════════════════════════════════

/**
 * Get paginated list of shifts (read-only, sourced from LAMA planner).
 * @endpoint GET /shifts/list
 */
export async function getShifts(
  params: ShiftListParams = {}
): Promise<ApiListResponse<Shift>> {
  await delay(350);

  const {
    store_id,
    user_id,
    status,
    date_from,
    date_to,
    search,
    page = 1,
    page_size = 20,
    sort_by = "shift_date",
    sort_dir = "desc",
  } = params;

  let filtered = [...MOCK_SHIFTS];

  if (store_id) filtered = filtered.filter((s) => s.store_id === store_id);
  if (user_id) filtered = filtered.filter((s) => s.user_id === user_id);
  if (status) filtered = filtered.filter((s) => s.status === status);
  if (date_from) filtered = filtered.filter((s) => s.shift_date >= date_from);
  if (date_to) filtered = filtered.filter((s) => s.shift_date <= date_to);

  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (s) =>
        s.user_name.toLowerCase().includes(q) ||
        s.store_name.toLowerCase().includes(q)
    );
  }

  filtered.sort((a, b) => {
    const aVal = String(a[sort_by as keyof Shift] ?? "");
    const bVal = String(b[sort_by as keyof Shift] ?? "");
    const cmp = aVal.localeCompare(bVal);
    return sort_dir === "asc" ? cmp : -cmp;
  });

  const total = filtered.length;
  const data = filtered.slice((page - 1) * page_size, page * page_size);

  return { data, total, page, page_size };
}

/**
 * Get single shift by ID with associated tasks, events, and audit trail.
 * @endpoint GET /shifts/:id
 */
export async function getShiftById(id: string): Promise<ApiResponse<ShiftDetail>> {
  await delay(400);

  const shift = MOCK_SHIFTS.find((s) => String(s.id) === id);
  if (!shift) throw new Error(`Shift with ID ${id} not found`);

  // Tasks that overlap with this shift's time window
  const tasks: ShiftDetail["tasks"] = MOCK_TASKS.filter(
    (t) => t.store_id === shift.store_id && !t.archived
  )
    .slice(0, 5)
    .map(({ id, title, state, review_state, work_type_name, zone_name }) => ({
      id,
      title,
      state,
      review_state,
      work_type_name,
      zone_name,
    }));

  const events: ShiftDetail["events"] = [
    {
      type: "OPENED",
      text: "Смена открыта",
      occurred_at: shift.actual_start ?? shift.planned_start,
      actor_name: shift.user_name,
    },
    ...(shift.status === "CLOSED"
      ? [
          {
            type: "CLOSED",
            text: "Смена закрыта",
            occurred_at:
              shift.actual_end ??
              shift.planned_end,
            actor_name: shift.user_name,
          },
        ]
      : []),
  ];

  const audit = MOCK_AUDIT_ENTRIES.filter(
    (e) => e.entity_type === "shift"
  ).slice(0, 3);

  return { data: { ...shift, tasks, events, audit } };
}

// ═══════════════════════════════════════════════════════════════════
// SYNC
// ═══════════════════════════════════════════════════════════════════

/**
 * Force-pull shifts from the LAMA planner for the organization.
 * @endpoint POST /shifts/sync-lama
 */
export async function syncLamaShifts(): Promise<ApiMutationResponse> {
  await delay(500);
  console.log("[v0] Triggered LAMA shifts sync");
  return { success: true };
}

// ═══════════════════════════════════════════════════════════════════
// SCHEDULE GRID (calendar view: day / week / month)
// ═══════════════════════════════════════════════════════════════════

function diffHours(start: string, end: string): number {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (Number.isNaN(ms) || ms <= 0) return 0;
  return ms / 3_600_000;
}

/**
 * Get schedule slots for the calendar grid.
 * Filters MOCK_SHIFTS by date range, store, zone, position, user, status
 * and returns aggregates (planned/actual hours, coverage_pct).
 *
 * Coverage = total_actual_hours / total_planned_hours × 100 (rounded).
 *
 * @endpoint GET /shifts/schedule
 */
export async function getSchedule(
  params: ScheduleParams
): Promise<ApiResponse<ScheduleResponse>> {
  await delay(350);

  const {
    date_from,
    date_to,
    store_ids,
    zone_ids,
    user_id,
    status,
  } = params;

  let filtered = MOCK_SHIFTS.filter(
    (s) => s.shift_date >= date_from && s.shift_date <= date_to
  );

  if (store_ids && store_ids.length > 0) {
    filtered = filtered.filter((s) => store_ids.includes(s.store_id));
  }
  if (zone_ids && zone_ids.length > 0) {
    filtered = filtered.filter(
      (s) => s.zone_id !== undefined && zone_ids.includes(s.zone_id)
    );
  }
  if (user_id !== undefined) {
    filtered = filtered.filter((s) => s.user_id === user_id);
  }
  if (status && status.length > 0) {
    filtered = filtered.filter((s) => status.includes(s.status));
  }
  // position_ids — Position привязка через Assignment, в моках сейчас не хранится
  // на ScheduleSlot, оставлено как noop-фильтр (V0 покажет UI, backend добавит позже).

  const slots: ScheduleSlot[] = filtered.map((s) => ({
    id: s.id,
    user_id: s.user_id,
    user_name: s.user_name,
    store_id: s.store_id,
    store_name: s.store_name,
    zone_id: s.zone_id,
    zone_name: s.zone_name,
    shift_date: s.shift_date,
    planned_start: s.planned_start,
    planned_end: s.planned_end,
    actual_start: s.actual_start,
    actual_end: s.actual_end,
    status: s.status,
    has_conflict: s.has_conflict,
    late_minutes: s.late_minutes,
    overtime_minutes: s.overtime_minutes,
  }));

  const total_planned_hours = Number(
    filtered
      .reduce((sum, s) => sum + diffHours(s.planned_start, s.planned_end), 0)
      .toFixed(1)
  );
  const total_actual_hours = Number(
    filtered
      .reduce((sum, s) => {
        if (!s.actual_start) return sum;
        const end = s.actual_end ?? new Date().toISOString();
        return sum + diffHours(s.actual_start, end);
      }, 0)
      .toFixed(1)
  );
  const coverage_pct =
    total_planned_hours > 0
      ? Math.round((total_actual_hours / total_planned_hours) * 100)
      : 0;

  return {
    data: {
      slots,
      date_from,
      date_to,
      total_planned_hours,
      total_actual_hours,
      coverage_pct,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════
// SHIFT ACTIONS (operational only — no create / move)
// ═══════════════════════════════════════════════════════════════════

/**
 * Reopen a closed shift (CLOSED → OPENED).
 * Used when LAMA force-closed by mistake or worker forgot to clock out
 * and admin needs to reset state. Mock action — does not mutate MOCK_SHIFTS.
 *
 * @endpoint POST /shifts/:id/reopen
 */
export async function reopenShift(id: number): Promise<ApiMutationResponse> {
  await delay(300);
  const shift = MOCK_SHIFTS.find((s) => s.id === id);
  if (!shift) {
    return {
      success: false,
      error: { code: "NOT_FOUND", message: `Shift ${id} not found` },
    };
  }
  if (shift.status !== "CLOSED") {
    return {
      success: false,
      error: {
        code: "INVALID_STATE",
        message: `Shift must be CLOSED to reopen (was ${shift.status})`,
      },
    };
  }
  console.log(`[v0] Reopened shift ${id}`);
  return { success: true, id: String(id) };
}

/**
 * Force-close an opened shift (OPENED → CLOSED).
 * Used when worker did not clock out themselves. Mock action.
 *
 * @endpoint POST /shifts/:id/force-close
 */
export async function forceCloseShift(
  id: number
): Promise<ApiMutationResponse> {
  await delay(300);
  const shift = MOCK_SHIFTS.find((s) => s.id === id);
  if (!shift) {
    return {
      success: false,
      error: { code: "NOT_FOUND", message: `Shift ${id} not found` },
    };
  }
  if (shift.status !== "OPENED") {
    return {
      success: false,
      error: {
        code: "INVALID_STATE",
        message: `Shift must be OPENED to force-close (was ${shift.status})`,
      },
    };
  }
  console.log(`[v0] Force-closed shift ${id}`);
  return { success: true, id: String(id) };
}
