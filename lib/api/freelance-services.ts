/**
 * Freelance Services API — confirmation, dispute, no-show, and amount adjustment.
 * Life-cycle differs by payment_mode:
 *   NOMINAL_ACCOUNT: COMPLETED → CONFIRMED → READY_TO_PAY → PAID
 *   CLIENT_DIRECT:   COMPLETED → CONFIRMED (final management status, no payout)
 */

import type {
  ApiResponse,
  ApiListResponse,
  ApiMutationResponse,
  ApiListParams,
  Service,
  ServiceStatus,
} from "@/lib/types";
import { MOCK_FREELANCE_SERVICES } from "@/lib/mock-data/freelance-services";
import { MOCK_NO_SHOW_REPORTS } from "@/lib/mock-data/freelance-no-shows";

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));
const rand = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const maybeError = () => Math.random() < 0.05;

// Mutable in-memory copy
let _services = [...MOCK_FREELANCE_SERVICES];

export function _resetServicesMock() {
  _services = [...MOCK_FREELANCE_SERVICES];
}

// ═══════════════════════════════════════════════════════════════════
// LIST & GET
// ═══════════════════════════════════════════════════════════════════

/**
 * Get paginated list of services with optional filters.
 * @param params freelancer_id, store_id, agent_id, status, date_from, date_to
 * @returns Paginated Service list
 * @endpoint GET /freelance/services
 * @roles STORE_DIRECTOR (own store), SUPERVISOR, REGIONAL, NETWORK_OPS, HR_MANAGER
 */
export async function getServices(
  params: ApiListParams & {
    freelancer_id?: number;
    store_id?: number;
    agent_id?: string;
    status?: ServiceStatus;
    date_from?: string;
    date_to?: string;
  } = {}
): Promise<ApiListResponse<Service>> {
  await delay(rand(200, 400));

  const {
    freelancer_id,
    store_id,
    agent_id,
    status,
    date_from,
    date_to,
    search,
    page = 1,
    page_size = 20,
    sort_by = "service_date",
    sort_dir = "desc",
  } = params;

  let filtered = [..._services];

  if (freelancer_id) filtered = filtered.filter((s) => s.freelancer_id === freelancer_id);
  if (store_id) filtered = filtered.filter((s) => s.store_id === store_id);
  if (agent_id) filtered = filtered.filter((s) => s.agent_id === agent_id);
  if (status) filtered = filtered.filter((s) => s.status === status);
  if (date_from) filtered = filtered.filter((s) => s.service_date >= date_from);
  if (date_to) filtered = filtered.filter((s) => s.service_date <= date_to);
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (s) =>
        s.freelancer_name.toLowerCase().includes(q) ||
        s.store_name.toLowerCase().includes(q) ||
        s.work_type_name.toLowerCase().includes(q)
    );
  }

  filtered.sort((a, b) => {
    const aVal = String(a[sort_by as keyof Service] ?? "");
    const bVal = String(b[sort_by as keyof Service] ?? "");
    const cmp = aVal.localeCompare(bVal);
    return sort_dir === "asc" ? cmp : -cmp;
  });

  const total = filtered.length;
  const start = (page - 1) * page_size;

  return { data: filtered.slice(start, start + page_size), total, page, page_size };
}

/**
 * Get a single service by ID.
 * @param id Service ID
 * @returns Service detail
 * @endpoint GET /freelance/services/:id
 * @roles STORE_DIRECTOR (own store), SUPERVISOR, REGIONAL, NETWORK_OPS, HR_MANAGER
 */
export async function getServiceById(id: string): Promise<ApiResponse<Service>> {
  await delay(rand(200, 350));

  const service = _services.find((s) => s.id === id);
  if (!service) throw new Error(`Service ${id} not found`);

  return { data: service };
}

// ═══════════════════════════════════════════════════════════════════
// ACTIONS
// ═══════════════════════════════════════════════════════════════════

/**
 * Confirm a completed service (store director action).
 * NOMINAL_ACCOUNT: COMPLETED → CONFIRMED → system batches to READY_TO_PAY overnight.
 * CLIENT_DIRECT: COMPLETED → CONFIRMED (final; no payout in our system).
 * @param id Service ID
 * @returns Success or error
 * @endpoint POST /freelance/services/:id/confirm
 * @roles STORE_DIRECTOR (own store only)
 */
export async function confirmService(id: string): Promise<ApiMutationResponse> {
  await delay(rand(250, 400));

  const service = _services.find((s) => s.id === id);
  if (!service) {
    return { success: false, error: { code: "NOT_FOUND", message: `Service ${id} not found` } };
  }
  if (service.status !== "COMPLETED") {
    return {
      success: false,
      error: {
        code: "INVALID_STATUS",
        message: `Service must be in COMPLETED status to confirm. Current: ${service.status}`,
      },
    };
  }

  _services = _services.map((s) =>
    s.id === id
      ? {
          ...s,
          status: "CONFIRMED" as ServiceStatus,
          confirmed_by: 5,
          confirmed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      : s
  );

  return { success: true };
}

/**
 * Dispute a completed service (store director action).
 * Sets status to DISPUTED for supervisor review.
 * @param id Service ID
 * @param reason Dispute reason
 * @returns Success or error
 * @endpoint POST /freelance/services/:id/dispute
 * @roles STORE_DIRECTOR (own store only)
 */
export async function disputeService(
  id: string,
  reason: string
): Promise<ApiMutationResponse> {
  await delay(rand(250, 400));

  if (!reason || reason.trim().length < 10) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Причина оспаривания должна быть не менее 10 символов" },
    };
  }

  const service = _services.find((s) => s.id === id);
  if (!service) {
    return { success: false, error: { code: "NOT_FOUND", message: `Service ${id} not found` } };
  }
  if (service.status !== "COMPLETED") {
    return {
      success: false,
      error: {
        code: "INVALID_STATUS",
        message: `Service must be in COMPLETED status to dispute. Current: ${service.status}`,
      },
    };
  }

  _services = _services.map((s) =>
    s.id === id
      ? {
          ...s,
          status: "DISPUTED" as ServiceStatus,
          dispute_reason: reason,
          updated_at: new Date().toISOString(),
        }
      : s
  );

  return { success: true };
}

/**
 * Mark a service as NO_SHOW and create a NoShowReport.
 * @param id Service ID
 * @param reason Optional reason for no-show
 * @returns Success with new NoShowReport ID
 * @endpoint POST /freelance/services/:id/no-show
 * @roles STORE_DIRECTOR (own store), SUPERVISOR
 */
export async function markNoShow(
  id: string,
  reason?: string
): Promise<ApiMutationResponse> {
  await delay(rand(250, 400));

  const service = _services.find((s) => s.id === id);
  if (!service) {
    return { success: false, error: { code: "NOT_FOUND", message: `Service ${id} not found` } };
  }
  if (service.status !== "PLANNED" && service.status !== "COMPLETED") {
    return {
      success: false,
      error: {
        code: "INVALID_STATUS",
        message: `Cannot mark no-show from status ${service.status}`,
      },
    };
  }

  const reportId = `nsr-${Date.now()}`;
  _services = _services.map((s) =>
    s.id === id
      ? {
          ...s,
          status: "NO_SHOW" as ServiceStatus,
          no_show_reason: reason ?? null,
          updated_at: new Date().toISOString(),
        }
      : s
  );

  // Side-effect: create NoShowReport in mock (runtime only)
  MOCK_NO_SHOW_REPORTS.push({
    id: reportId,
    service_id: id,
    freelancer_id: service.freelancer_id,
    freelancer_name: service.freelancer_name,
    agent_id: service.agent_id ?? null,
    store_id: service.store_id,
    store_name: service.store_name,
    scheduled_date: service.service_date,
    scheduled_hours: service.scheduled_hours,
    actual_hours: 0,
    reported_at: new Date().toISOString(),
    status: "OPEN",
  });

  return { success: true, id: reportId };
}

/**
 * Adjust the final payable amount for a service (override hourly formula).
 * Logged to audit as service.amount_adjust with manually_adjusted field.
 * @param id Service ID
 * @param newAmount New total amount in currency units
 * @param reason Adjustment reason (min 10 chars)
 * @returns Success or 403 / validation error
 * @endpoint POST /freelance/services/:id/adjust-amount
 * @roles REGIONAL, NETWORK_OPS only (STORE_DIRECTOR / SUPERVISOR → 403)
 */
export async function adjustServiceAmount(
  id: string,
  newAmount: number,
  reason: string
): Promise<ApiMutationResponse> {
  await delay(rand(300, 500));

  if (!reason || reason.trim().length < 10) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Причина корректировки должна быть не менее 10 символов" },
    };
  }
  if (newAmount <= 0) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: "newAmount must be greater than 0" },
    };
  }

  const service = _services.find((s) => s.id === id);
  if (!service) {
    return { success: false, error: { code: "NOT_FOUND", message: `Service ${id} not found` } };
  }

  const fromAmount = service.total_amount ?? 0;

  _services = _services.map((s) =>
    s.id === id
      ? {
          ...s,
          total_amount: newAmount,
          manually_adjusted: {
            adjusted_by: 3,
            adjusted_by_name: "Соколова А. В.",
            adjusted_at: new Date().toISOString(),
            from_amount: fromAmount,
            to_amount: newAmount,
            reason,
          },
          updated_at: new Date().toISOString(),
        }
      : s
  );

  console.log(`[v0] audit: service.amount_adjust service=${id} from=${fromAmount} to=${newAmount} reason="${reason}"`);

  return { success: true };
}
