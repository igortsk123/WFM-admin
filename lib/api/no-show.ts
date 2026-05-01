/**
 * No-Show Reports API — preset filter over services with status=NO_SHOW.
 * Provides an aggregated view for legal team workflows.
 */

import type {
  ApiListResponse,
  ApiMutationResponse,
  ApiListParams,
  NoShowReport,
} from "@/lib/types";
import { MOCK_NO_SHOW_REPORTS } from "@/lib/mock-data/freelance-no-shows";

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));
const rand = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

// MOCK_NO_SHOW_REPORTS is mutated at runtime by markNoShow in freelance-services.ts
// so we read it directly (no local copy needed)

// ═══════════════════════════════════════════════════════════════════
// LIST
// ═══════════════════════════════════════════════════════════════════

/**
 * Get paginated no-show reports with optional status and date filters.
 * This is a preset filter over services (status=NO_SHOW) with legal metadata aggregation.
 * @param params status, date_from, date_to, pagination
 * @returns Paginated NoShowReport list
 * @endpoint GET /freelance/no-shows
 * @roles SUPERVISOR, REGIONAL, NETWORK_OPS, HR_MANAGER
 */
export async function getNoShows(
  params: ApiListParams & {
    status?: "OPEN" | "IN_LEGAL" | "RESOLVED" | "WRITTEN_OFF";
    date_from?: string;
    date_to?: string;
  } = {}
): Promise<ApiListResponse<NoShowReport>> {
  await delay(rand(200, 400));

  const {
    status,
    date_from,
    date_to,
    search,
    page = 1,
    page_size = 20,
    sort_by = "scheduled_date",
    sort_dir = "desc",
  } = params;

  let filtered = [...MOCK_NO_SHOW_REPORTS];

  if (status) filtered = filtered.filter((r) => r.status === status);
  if (date_from) filtered = filtered.filter((r) => r.scheduled_date >= date_from);
  if (date_to) filtered = filtered.filter((r) => r.scheduled_date <= date_to);
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (r) =>
        r.freelancer_name.toLowerCase().includes(q) ||
        r.store_name.toLowerCase().includes(q)
    );
  }

  filtered.sort((a, b) => {
    const aVal = String(a[sort_by as keyof NoShowReport] ?? "");
    const bVal = String(b[sort_by as keyof NoShowReport] ?? "");
    const cmp = aVal.localeCompare(bVal);
    return sort_dir === "asc" ? cmp : -cmp;
  });

  const total = filtered.length;
  const start = (page - 1) * page_size;

  return { data: filtered.slice(start, start + page_size), total, page, page_size };
}

// ═══════════════════════════════════════════════════════════════════
// UPDATE STATUS
// ═══════════════════════════════════════════════════════════════════

/**
 * Update the legal status of a no-show report.
 * @param id NoShowReport ID
 * @param status New status: OPEN | IN_LEGAL | RESOLVED | WRITTEN_OFF
 * @param comment Optional legal note
 * @returns Success or not found
 * @endpoint PATCH /freelance/no-shows/:id
 * @roles SUPERVISOR, REGIONAL, NETWORK_OPS, HR_MANAGER
 */
export async function updateNoShowStatus(
  id: string,
  status: "OPEN" | "IN_LEGAL" | "RESOLVED" | "WRITTEN_OFF",
  comment?: string
): Promise<ApiMutationResponse> {
  await delay(rand(250, 400));

  const report = MOCK_NO_SHOW_REPORTS.find((r) => r.id === id);
  if (!report) {
    return {
      success: false,
      error: { code: "NOT_FOUND", message: `NoShowReport ${id} not found` },
    };
  }

  const allowed: Array<"OPEN" | "IN_LEGAL" | "RESOLVED" | "WRITTEN_OFF"> = [
    "OPEN",
    "IN_LEGAL",
    "RESOLVED",
    "WRITTEN_OFF",
  ];
  if (!allowed.includes(status)) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: `Invalid status: ${status}. Allowed: ${allowed.join(", ")}`,
      },
    };
  }

  // Mutate the exported array directly (same array referenced by services.ts markNoShow)
  const idx = MOCK_NO_SHOW_REPORTS.findIndex((r) => r.id === id);
  if (idx !== -1) {
    MOCK_NO_SHOW_REPORTS[idx] = {
      ...MOCK_NO_SHOW_REPORTS[idx],
      status,
      legal_comment: comment ?? MOCK_NO_SHOW_REPORTS[idx].legal_comment,
    };
  }

  return { success: true };
}
