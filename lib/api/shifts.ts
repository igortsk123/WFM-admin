/**
 * Shifts API — read-only schedule (all shifts come from LAMA planner).
 * Managers CANNOT create/update/delete shift plans through the admin panel.
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
