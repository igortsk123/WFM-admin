/**
 * Payouts API — bonus payout period lifecycle management.
 * Payout periods: OPEN → CALCULATING → READY → PAID.
 */

import type {
  ApiResponse,
  ApiListResponse,
  ApiMutationResponse,
  ApiListParams,
} from "@/lib/types";
import {
  MOCK_PAYOUT_PERIODS,
  MOCK_PAYOUT_ROWS,
  type BonusPayoutPeriod,
  type BonusPayoutRow,
  type PayoutPeriodStatus,
} from "@/lib/mock-data/future-placeholders";

const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));

// ═══════════════════════════════════════════════════════════════════
// TYPES (re-export for consumers)
// ═══════════════════════════════════════════════════════════════════

export type { BonusPayoutPeriod as PayoutPeriod, BonusPayoutRow as PayoutRow, PayoutPeriodStatus };

// ═══════════════════════════════════════════════════════════════════
// LIST & GET
// ═══════════════════════════════════════════════════════════════════

/**
 * Get paginated list of payout periods.
 * @endpoint GET /payouts/list
 */
export async function getPayoutPeriods(
  params: ApiListParams & { status?: PayoutPeriodStatus } = {}
): Promise<ApiListResponse<BonusPayoutPeriod>> {
  await delay(350);

  const { status, page = 1, page_size = 20 } = params;

  let filtered = [...MOCK_PAYOUT_PERIODS];
  if (status) filtered = filtered.filter((p) => p.status === status);

  // Newest first
  filtered.sort((a, b) => b.period_start.localeCompare(a.period_start));

  const total = filtered.length;
  const data = filtered.slice((page - 1) * page_size, page * page_size);

  return { data, total, page, page_size };
}

/**
 * Get a single payout period with its employee rows.
 * @endpoint GET /payouts/:id
 */
export async function getPayoutById(
  id: string
): Promise<ApiResponse<BonusPayoutPeriod & { rows: BonusPayoutRow[] }>> {
  await delay(400);

  const period = MOCK_PAYOUT_PERIODS.find((p) => p.id === id);
  if (!period) throw new Error(`Payout period ${id} not found`);

  const rows = MOCK_PAYOUT_ROWS.filter((r) => r.period_id === id);

  return { data: { ...period, rows } };
}

// ═══════════════════════════════════════════════════════════════════
// LIFECYCLE
// ═══════════════════════════════════════════════════════════════════

/**
 * Create a new payout period. Default rate = 1 ₽/point (MVP).
 * @endpoint POST /payouts
 */
export async function createPayoutPeriod(data: {
  name: string;
  period_start: string;
  period_end: string;
  store_ids?: number[];
  rate_per_point: number;
}): Promise<ApiMutationResponse> {
  await delay(450);
  if (!data.name || !data.period_start || !data.period_end) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Name, period_start, and period_end are required" } };
  }
  if (data.rate_per_point <= 0) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Rate must be positive" } };
  }
  const newId = `payout-period-${Date.now()}`;
  console.log("[v0] Created payout period:", newId, data);
  return { success: true, id: newId };
}

/**
 * Trigger calculation for a payout period (status: OPEN → CALCULATING → READY).
 * @endpoint POST /payouts/:id/calculate
 */
export async function calculatePayout(id: string): Promise<ApiMutationResponse> {
  await delay(800);
  const period = MOCK_PAYOUT_PERIODS.find((p) => p.id === id);
  if (!period) return { success: false, error: { code: "NOT_FOUND", message: `Payout period ${id} not found` } };
  console.log("[v0] Triggered calculation for payout period:", id);
  return { success: true };
}

/**
 * Finalize a payout period — marks as PAID. Requires confirmation text.
 * @endpoint POST /payouts/:id/finalize
 */
export async function finalizePayout(
  id: string,
  confirmText: string
): Promise<ApiMutationResponse> {
  await delay(500);
  if (confirmText.toLowerCase() !== "подтвердить") {
    return {
      success: false,
      error: { code: "CONFIRMATION_REQUIRED", message: "Type «подтвердить» to finalize" },
    };
  }
  const period = MOCK_PAYOUT_PERIODS.find((p) => p.id === id);
  if (!period) return { success: false, error: { code: "NOT_FOUND", message: `Payout period ${id} not found` } };
  if (period.status !== "READY") {
    return { success: false, error: { code: "NOT_READY", message: "Period must be in READY status before finalization" } };
  }
  console.log("[v0] Finalized payout period:", id);
  return { success: true };
}

// ═══════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════

/**
 * Export a payout period as XLSX or CSV.
 * @endpoint GET /payouts/:id/export
 */
export async function exportPayout(id: string, format: "xlsx" | "csv"): Promise<Blob> {
  await delay(600);
  const mimeType =
    format === "xlsx"
      ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      : "text/csv";
  console.log("[v0] Exporting payout:", id, format);
  return new Blob(
    [`Mock payout export: ${id} - ${format} - ${new Date().toISOString()}`],
    { type: mimeType }
  );
}
