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
import { MOCK_USERS } from "@/lib/mock-data/users";
import { MOCK_ASSIGNMENTS } from "@/lib/mock-data/assignments";

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
  user_avatar_url?: string;
  position_name?: string;
  /** Распределение фактически отработанного времени по зонам (mocked). */
  zone_breakdown?: Array<{ zone_id: number; zone_name: string; minutes: number }>;
  /** Задачи, которые работник делал в эту смену. */
  tasks: Array<
    Pick<Task, "id" | "title" | "state" | "review_state" | "work_type_name" | "zone_name"> & {
      planned_minutes?: number;
      actual_minutes?: number;
      completed_at?: string;
    }
  >;
  /** Перерывы во время смены (lunch / rest / custom). */
  breaks?: Array<{ from: string; to: string; type: "lunch" | "rest" | "custom" }>;
  /** Причина опоздания (если late_minutes > 0 и причина указана). */
  late_reason?: string;
  /** Причина переработки (если overtime_minutes > 0 и указана). */
  overtime_reason?: string;
  events: Array<{ type: string; text: string; occurred_at: string; actor_name: string }>;
  audit: AuditEntry[];
}

/** Аудит-события для tab «История» на shift-detail screen. */
export interface ShiftHistoryEvent {
  id: string;
  ts: string;
  type:
    | "OPENED"
    | "PAUSED"
    | "RESUMED"
    | "CLOSED"
    | "LATE_MARKED"
    | "OVERTIME_ADDED"
    | "FORCE_CLOSED"
    | "CANCELLED";
  title: string;
  by_user_name: string;
  details?: string;
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
  /** Тип конфликта (если has_conflict=true): пересечение смен / поздно закрыта / выход за плановое */
  conflict_reason?: "OVERLAP" | "LATE_CLOSE" | "OVERFLOW" | "OTHER";
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

  // User enrichment — avatar и position_name
  const user = MOCK_USERS.find((u) => u.id === shift.user_id);
  const user_avatar_url = user?.avatar_url;
  const assignment = MOCK_ASSIGNMENTS.find(
    (a) => a.user_id === shift.user_id && a.active,
  ) ?? MOCK_ASSIGNMENTS.find((a) => a.user_id === shift.user_id);
  const position_name = assignment?.position_name;

  // Tasks that overlap with this shift's time window
  const tasks: ShiftDetail["tasks"] = MOCK_TASKS.filter(
    (t) => t.store_id === shift.store_id && !t.archived,
  )
    .slice(0, 5)
    .map((t) => ({
      id: t.id,
      title: t.title,
      state: t.state,
      review_state: t.review_state,
      work_type_name: t.work_type_name,
      zone_name: t.zone_name,
      planned_minutes: t.planned_minutes,
      actual_minutes:
        t.history_brief?.opened_at && t.history_brief?.completed_at
          ? Math.max(
              1,
              Math.round(
                (new Date(t.history_brief.completed_at).getTime() -
                  new Date(t.history_brief.opened_at).getTime()) /
                  60000,
              ),
            )
          : undefined,
      completed_at: t.history_brief?.completed_at,
    }));

  // Mocked breakdown of actual time across zones (если зона смены известна).
  const zone_breakdown = shift.zone_id && shift.zone_name
    ? [{ zone_id: shift.zone_id, zone_name: shift.zone_name, minutes: 60 * 6 }]
    : undefined;

  // Mocked breaks — один lunch посередине смены.
  const startHour = parseInt(shift.planned_start.slice(0, 2), 10);
  const breaks: ShiftDetail["breaks"] = [
    {
      from: `${String(startHour + 4).padStart(2, "0")}:00`,
      to: `${String(startHour + 4).padStart(2, "0")}:30`,
      type: "lunch",
    },
  ];

  const late_reason = shift.late_minutes > 0 ? "Пробка на дороге" : undefined;
  const overtime_reason = shift.overtime_minutes > 0 ? "Дополнительная задача" : undefined;

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
            occurred_at: shift.actual_end ?? shift.planned_end,
            actor_name: shift.user_name,
          },
        ]
      : []),
  ];

  const audit = MOCK_AUDIT_ENTRIES.filter((e) => e.entity_type === "shift").slice(0, 3);

  return {
    data: {
      ...shift,
      user_avatar_url,
      position_name,
      zone_breakdown,
      tasks,
      breaks,
      late_reason,
      overtime_reason,
      events,
      audit,
    },
  };
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
  return { success: true, id: String(id) };
}

// ═══════════════════════════════════════════════════════════════════
// SHIFT-DETAIL ACTIONS (chat 29)
// ═══════════════════════════════════════════════════════════════════

/**
 * Get audit history for a shift (tab «История» на shift-detail screen).
 * @endpoint GET /shifts/:id/history
 */
export async function getShiftHistory(
  shiftId: number,
): Promise<ApiResponse<ShiftHistoryEvent[]>> {
  await delay(220);
  const shift = MOCK_SHIFTS.find((s) => s.id === shiftId);
  if (!shift) {
    throw new Error(`Shift ${shiftId} not found`);
  }

  const baseDate = `${shift.shift_date}T${shift.planned_start}:00+07:00`;
  const events: ShiftHistoryEvent[] = [];

  if (shift.actual_start) {
    events.push({
      id: `${shiftId}-opened`,
      ts: `${shift.shift_date}T${shift.actual_start}:00+07:00`,
      type: "OPENED",
      title: "Смена открыта",
      by_user_name: shift.user_name,
    });
  } else {
    events.push({
      id: `${shiftId}-planned`,
      ts: baseDate,
      type: "OPENED",
      title: "Смена запланирована",
      by_user_name: "LAMA Sync",
    });
  }

  if (shift.late_minutes > 0) {
    events.push({
      id: `${shiftId}-late`,
      ts: `${shift.shift_date}T${shift.actual_start ?? shift.planned_start}:00+07:00`,
      type: "LATE_MARKED",
      title: `Опоздание ${shift.late_minutes} мин`,
      by_user_name: "Система",
    });
  }

  if (shift.overtime_minutes > 0) {
    events.push({
      id: `${shiftId}-overtime`,
      ts: `${shift.shift_date}T${shift.actual_end ?? shift.planned_end}:00+07:00`,
      type: "OVERTIME_ADDED",
      title: `Переработка ${shift.overtime_minutes} мин`,
      by_user_name: "Система",
    });
  }

  if (shift.actual_end) {
    events.push({
      id: `${shiftId}-closed`,
      ts: `${shift.shift_date}T${shift.actual_end}:00+07:00`,
      type: shift.status === "CLOSED" ? "CLOSED" : "FORCE_CLOSED",
      title: shift.status === "CLOSED" ? "Смена закрыта" : "Смена принудительно закрыта",
      by_user_name: shift.user_name,
    });
  }

  return { data: events };
}

/**
 * Mark shift as late with reason (action в shift-detail screen).
 * @endpoint POST /shifts/:id/mark-late
 */
export async function markShiftLate(
  id: number,
  reason: string,
): Promise<ApiMutationResponse> {
  await delay(280);
  const shift = MOCK_SHIFTS.find((s) => s.id === id);
  if (!shift) return { success: false, error: { code: "NOT_FOUND", message: `Shift ${id} not found` } };
  if (!reason.trim()) return { success: false, error: { code: "REASON_REQUIRED", message: "Late reason is required" } };
  return { success: true, id: String(id) };
}

/**
 * Mark shift as overtime with reason (action в shift-detail screen).
 * @endpoint POST /shifts/:id/mark-overtime
 */
export async function markShiftOvertime(
  id: number,
  reason: string,
): Promise<ApiMutationResponse> {
  await delay(280);
  const shift = MOCK_SHIFTS.find((s) => s.id === id);
  if (!shift) return { success: false, error: { code: "NOT_FOUND", message: `Shift ${id} not found` } };
  if (!reason.trim()) return { success: false, error: { code: "REASON_REQUIRED", message: "Overtime reason is required" } };
  return { success: true, id: String(id) };
}

/**
 * Cancel a planned (NEW) shift before it starts.
 * @endpoint POST /shifts/:id/cancel
 */
export async function cancelShift(
  id: number,
  reason: string,
): Promise<ApiMutationResponse> {
  await delay(300);
  const shift = MOCK_SHIFTS.find((s) => s.id === id);
  if (!shift) return { success: false, error: { code: "NOT_FOUND", message: `Shift ${id} not found` } };
  if (shift.status !== "NEW") {
    return {
      success: false,
      error: { code: "INVALID_STATE", message: `Only NEW shifts can be cancelled (was ${shift.status})` },
    };
  }
  if (!reason.trim()) return { success: false, error: { code: "REASON_REQUIRED", message: "Cancel reason is required" } };
  return { success: true, id: String(id) };
}

// ═══════════════════════════════════════════════════════════════════
// REAL BACKEND wrappers — /shifts/* (svc_tasks port 8000)
// ═══════════════════════════════════════════════════════════════════

import { apiUrl as _shApiUrl } from "./_config";
import { backendGet as _shGet, backendPost as _shPost } from "./_client";
import type {
  BackendCurrentShift,
  BackendShiftOpenRequest,
  BackendShiftCloseRequest,
} from "./_backend-types";

/** POST /shifts/open — открыть смену (по plan_id из shifts_plan). */
export async function openShiftOnBackend(
  planId: number,
): Promise<BackendCurrentShift> {
  const body: BackendShiftOpenRequest = { plan_id: planId };
  return _shPost<BackendCurrentShift>(_shApiUrl("shifts", `/open`), body);
}

/** POST /shifts/close — закрыть смену; force=true игнорирует unfinished tasks. */
export async function closeShiftOnBackend(
  planId: number,
  force = false,
): Promise<BackendCurrentShift> {
  const body: BackendShiftCloseRequest = { plan_id: planId, force };
  return _shPost<BackendCurrentShift>(_shApiUrl("shifts", `/close`), body);
}

/**
 * GET /shifts/current?assignment_id=N — текущая смена (приоритет fact → plan).
 * Если у юзера сейчас нет смены — backend вернёт NOT_FOUND.
 */
export async function getCurrentShiftFromBackend(
  assignmentId: number,
): Promise<BackendCurrentShift> {
  return _shGet<BackendCurrentShift>(
    _shApiUrl("shifts", `/current?assignment_id=${assignmentId}`),
  );
}

/** GET /shifts/{id} — смена по ID. */
export async function getShiftByIdFromBackend(
  id: number,
): Promise<BackendCurrentShift> {
  return _shGet<BackendCurrentShift>(_shApiUrl("shifts", `/${id}`));
}
