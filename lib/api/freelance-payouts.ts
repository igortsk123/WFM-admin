/**
 * Freelance Payouts API — relevant only for payment_mode='NOMINAL_ACCOUNT'.
 * In CLIENT_DIRECT mode all endpoints return 403 MODULE_DISABLED.
 * Only the payouts section is disabled in CLIENT_DIRECT;
 * other freelance sections (applications, services, budget, norms) remain active.
 */

import type {
  ApiResponse,
  ApiListResponse,
  ApiMutationResponse,
  ApiListParams,
  Payout,
  Service,
  AgentEarning,
  PayoutStatus,
} from "@/lib/types";
import { MOCK_FREELANCE_PAYOUTS } from "@/lib/mock-data/freelance-payouts";
import { MOCK_FREELANCE_SERVICES } from "@/lib/mock-data/freelance-services";
import { MOCK_AGENT_EARNINGS } from "@/lib/mock-data/freelance-agent-earnings";
import { MOCK_ORGANIZATIONS } from "@/lib/mock-data/organizations";

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));
const rand = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const maybeError = () => Math.random() < 0.05;

/** Demo: current org is SPAR which uses NOMINAL_ACCOUNT */
function isClientDirect(): boolean {
  const org = MOCK_ORGANIZATIONS.find((o) => o.id === "org-spar");
  return org?.payment_mode === "CLIENT_DIRECT";
}

const MODULE_DISABLED: ApiMutationResponse = {
  success: false,
  error: {
    code: "MODULE_DISABLED",
    message: "Раздел выплат недоступен в режиме CLIENT_DIRECT. Клиент производит выплаты в собственном периметре.",
  },
};

// Mutable copy for retry demo
let _payouts = [...MOCK_FREELANCE_PAYOUTS];

export function _resetPayoutsMock() {
  _payouts = [...MOCK_FREELANCE_PAYOUTS];
}

// ═══════════════════════════════════════════════════════════════════
// LIST & GET
// ═══════════════════════════════════════════════════════════════════

/**
 * Get paginated list of payout records.
 * Returns 403 MODULE_DISABLED if payment_mode='CLIENT_DIRECT'.
 * @param params freelancer_id, agent_id, status, date_from, date_to
 * @returns Paginated Payout list
 * @endpoint GET /freelance/payouts
 * @roles SUPERVISOR, REGIONAL, NETWORK_OPS, HR_MANAGER
 */
export async function getPayouts(
  params: ApiListParams & {
    freelancer_id?: number;
    agent_id?: string;
    status?: PayoutStatus;
    date_from?: string;
    date_to?: string;
  } = {}
): Promise<ApiListResponse<Payout>> {
  await delay(rand(200, 400));

  if (isClientDirect()) {
    throw new Error(MODULE_DISABLED.error!.message);
  }

  const {
    freelancer_id,
    agent_id,
    status,
    date_from,
    date_to,
    search,
    page = 1,
    page_size = 20,
    sort_by = "payout_date",
    sort_dir = "desc",
  } = params;

  let filtered = [..._payouts];

  if (freelancer_id) filtered = filtered.filter((p) => p.freelancer_id === freelancer_id);
  if (agent_id) filtered = filtered.filter((p) => p.agent_id === agent_id);
  if (status) filtered = filtered.filter((p) => p.status === status);
  if (date_from) filtered = filtered.filter((p) => p.payout_date >= date_from);
  if (date_to) filtered = filtered.filter((p) => p.payout_date <= date_to);
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter((p) => p.freelancer_name.toLowerCase().includes(q));
  }

  filtered.sort((a, b) => {
    const aVal = String(a[sort_by as keyof Payout] ?? "");
    const bVal = String(b[sort_by as keyof Payout] ?? "");
    const cmp = aVal.localeCompare(bVal);
    return sort_dir === "asc" ? cmp : -cmp;
  });

  const total = filtered.length;
  const start = (page - 1) * page_size;

  return { data: filtered.slice(start, start + page_size), total, page, page_size };
}

/**
 * Get a single payout by ID with related services and agent earning.
 * Returns 403 MODULE_DISABLED if payment_mode='CLIENT_DIRECT'.
 * @param id Payout ID
 * @returns Payout + services[] + agent_earning?
 * @endpoint GET /freelance/payouts/:id
 * @roles SUPERVISOR, REGIONAL, NETWORK_OPS, HR_MANAGER
 */
export async function getPayoutById(
  id: string
): Promise<ApiResponse<Omit<Payout, "services"> & { services: Service[]; agent_earning?: AgentEarning | null }>> {
  await delay(rand(250, 450));

  if (isClientDirect()) {
    throw new Error(MODULE_DISABLED.error!.message);
  }

  const payout = _payouts.find((p) => p.id === id);
  if (!payout) throw new Error(`Payout ${id} not found`);

  const services = MOCK_FREELANCE_SERVICES.filter((s) =>
    payout.services.includes(s.id)
  );
  const agent_earning = MOCK_AGENT_EARNINGS.find(
    (ae) => ae.payout_id === id && ae.agent_id === payout.agent_id
  ) ?? null;

  const { services: _services, ...payoutRest } = payout;
  void _services;
  return { data: { ...payoutRest, services, agent_earning } };
}

/**
 * Get a signed URL to the closing document for a payout (valid 5 minutes).
 * Returns 403 MODULE_DISABLED if payment_mode='CLIENT_DIRECT'.
 * @param payoutId Payout ID
 * @returns Signed URL + expiry timestamp
 * @endpoint GET /freelance/payouts/:id/closing-doc
 * @roles SUPERVISOR, REGIONAL, NETWORK_OPS, HR_MANAGER
 */
export async function getClosingDocumentUrl(
  payoutId: string
): Promise<ApiResponse<{ url: string; expires_at: string }>> {
  await delay(rand(300, 500));

  if (isClientDirect()) {
    throw new Error(MODULE_DISABLED.error!.message);
  }

  const payout = _payouts.find((p) => p.id === payoutId);
  if (!payout) throw new Error(`Payout ${payoutId} not found`);

  if (!payout.closing_doc_url) {
    throw new Error("Закрывающий документ ещё не сформирован для этой выплаты");
  }

  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  return {
    data: {
      url: `${payout.closing_doc_url}?token=mock-signed-token-${Date.now()}&expires=${expiresAt}`,
      expires_at: expiresAt,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════
// ACTIONS
// ═══════════════════════════════════════════════════════════════════

/**
 * Retry a failed payout (only status='FAILED').
 * 5% chance of simulated 500 error for demo retry flow.
 * Returns 403 MODULE_DISABLED if payment_mode='CLIENT_DIRECT'.
 * @param id Payout ID
 * @returns Success or error
 * @endpoint POST /freelance/payouts/:id/retry
 * @roles SUPERVISOR, REGIONAL, NETWORK_OPS
 */
export async function retryPayout(id: string): Promise<ApiMutationResponse> {
  await delay(rand(600, 800)); // heavier — nominal account call

  if (isClientDirect()) {
    return MODULE_DISABLED;
  }

  if (maybeError()) {
    return {
      success: false,
      error: {
        code: "PAYMENT_GATEWAY_ERROR",
        message: "Временная ошибка шлюза Номинального счёта. Повторите попытку.",
      },
    };
  }

  const payout = _payouts.find((p) => p.id === id);
  if (!payout) {
    return { success: false, error: { code: "NOT_FOUND", message: `Payout ${id} not found` } };
  }
  if (payout.status !== "FAILED") {
    return {
      success: false,
      error: {
        code: "INVALID_STATUS",
        message: `Only FAILED payouts can be retried. Current status: ${payout.status}`,
      },
    };
  }

  _payouts = _payouts.map((p) =>
    p.id === id
      ? {
          ...p,
          status: "PROCESSING" as PayoutStatus,
          failure_reason: null,
        }
      : p
  );

  return { success: true };
}
