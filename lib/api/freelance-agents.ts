/**
 * Freelance Agents API — agent management, earnings, and freelancer roster.
 * Entire module is hidden in CLIENT_DIRECT mode; endpoints return 403 MODULE_DISABLED.
 */

import type {
  ApiResponse,
  ApiListResponse,
  ApiMutationResponse,
  ApiListParams,
  Agent,
  AgentEarning,
  AgentStatus,
  User,
} from "@/lib/types";
import { MOCK_FREELANCE_AGENTS } from "@/lib/mock-data/freelance-agents";
import { MOCK_AGENT_EARNINGS } from "@/lib/mock-data/freelance-agent-earnings";
import { MOCK_FREELANCERS } from "@/lib/mock-data/freelance-freelancers";
import { MOCK_FREELANCE_SERVICES } from "@/lib/mock-data/freelance-services";
import { MOCK_ORGANIZATIONS } from "@/lib/mock-data/organizations";

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));
const rand = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

function isClientDirect(): boolean {
  const org = MOCK_ORGANIZATIONS.find((o) => o.id === "org-spar");
  return org?.payment_mode === "CLIENT_DIRECT";
}

const MODULE_DISABLED: ApiMutationResponse = {
  success: false,
  error: {
    code: "MODULE_DISABLED",
    message: "Раздел агентов недоступен в режиме CLIENT_DIRECT.",
  },
};

// Mutable copies
let _agents = [...MOCK_FREELANCE_AGENTS];

export function _resetAgentsMock() {
  _agents = [...MOCK_FREELANCE_AGENTS];
}

// ═══════════════════════════════════════════════════════════════════
// LIST & GET
// ═══════════════════════════════════════════════════════════════════

/**
 * Get paginated list of agents.
 * Hidden / 403 in CLIENT_DIRECT mode.
 * @param params status filter
 * @returns Paginated Agent list
 * @endpoint GET /freelance/agents
 * @roles NETWORK_OPS, HR_MANAGER, REGIONAL (read-only)
 */
export async function getAgents(
  params: ApiListParams & { status?: AgentStatus } = {}
): Promise<ApiListResponse<Agent>> {
  await delay(rand(200, 400));

  if (isClientDirect()) {
    throw new Error(MODULE_DISABLED.error!.message);
  }

  const {
    status,
    search,
    page = 1,
    page_size = 20,
    sort_by = "name",
    sort_dir = "asc",
  } = params;

  let filtered = [..._agents];

  if (status) filtered = filtered.filter((a) => a.status === status);
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        (a.contact_person_name?.toLowerCase().includes(q) ?? false)
    );
  }

  filtered.sort((a, b) => {
    const aVal = String(a[sort_by as keyof Agent] ?? "");
    const bVal = String(b[sort_by as keyof Agent] ?? "");
    const cmp = aVal.localeCompare(bVal);
    return sort_dir === "asc" ? cmp : -cmp;
  });

  const total = filtered.length;
  const start = (page - 1) * page_size;

  return { data: filtered.slice(start, start + page_size), total, page, page_size };
}

/**
 * Get single agent with their freelancers and earnings.
 * @param id Agent ID
 * @returns Agent + freelancers[] + earnings[]
 * @endpoint GET /freelance/agents/:id
 * @roles NETWORK_OPS, HR_MANAGER, REGIONAL
 */
export async function getAgentById(
  id: string
): Promise<ApiResponse<Agent & { freelancers: User[]; earnings: AgentEarning[] }>> {
  await delay(rand(250, 450));

  if (isClientDirect()) {
    throw new Error(MODULE_DISABLED.error!.message);
  }

  const agent = _agents.find((a) => a.id === id);
  if (!agent) throw new Error(`Agent ${id} not found`);

  const freelancers = MOCK_FREELANCERS.filter((f) => f.agent_id === id);
  const earnings = MOCK_AGENT_EARNINGS.filter((e) => e.agent_id === id);

  return { data: { ...agent, freelancers, earnings } };
}

// ═══════════════════════════════════════════════════════════════════
// CREATE / UPDATE
// ═══════════════════════════════════════════════════════════════════

/**
 * Create a new agent (ИП or ООО).
 * @param data Partial Agent data (name, type, commission_pct required)
 * @returns New agent ID
 * @endpoint POST /freelance/agents
 * @roles NETWORK_OPS, HR_MANAGER
 */
export async function createAgent(data: Partial<Agent>): Promise<ApiMutationResponse> {
  await delay(rand(300, 500));

  if (isClientDirect()) {
    return MODULE_DISABLED;
  }

  const { name, type, commission_pct } = data;

  if (!name || !type || commission_pct === undefined) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: "name, type and commission_pct are required" },
    };
  }

  if (commission_pct < 0 || commission_pct > 100) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: "commission_pct must be between 0 and 100" },
    };
  }

  const newId = `agent-${Date.now()}`;
  _agents = [
    ..._agents,
    {
      id: newId,
      name,
      type,
      inn: data.inn,
      kpp: data.kpp,
      ogrn: data.ogrn,
      contact_person_name: data.contact_person_name,
      contact_phone: data.contact_phone,
      contact_email: data.contact_email,
      contract_url: data.contract_url ?? null,
      contract_signed_at: data.contract_signed_at ?? null,
      commission_pct,
      status: "ACTIVE",
      freelancers_count: 0,
      total_earned_30d: 0,
      total_earned_all_time: 0,
      created_at: new Date().toISOString(),
    },
  ];

  return { success: true, id: newId };
}

/**
 * Update agent details.
 * @param id Agent ID
 * @param data Fields to update
 * @returns Success or not found
 * @endpoint PATCH /freelance/agents/:id
 * @roles NETWORK_OPS, HR_MANAGER
 */
export async function updateAgent(
  id: string,
  data: Partial<Agent>
): Promise<ApiMutationResponse> {
  await delay(rand(250, 450));

  if (isClientDirect()) {
    return MODULE_DISABLED;
  }

  const agent = _agents.find((a) => a.id === id);
  if (!agent) {
    return { success: false, error: { code: "NOT_FOUND", message: `Agent ${id} not found` } };
  }
  if (agent.status === "ARCHIVED") {
    return {
      success: false,
      error: { code: "INVALID_STATUS", message: "Cannot update archived agent" },
    };
  }

  _agents = _agents.map((a) => (a.id === id ? { ...a, ...data, id } : a));

  return { success: true };
}

// ═══════════════════════════════════════════════════════════════════
// BLOCK / ARCHIVE
// ════════════════════════════════════════════════════════════════��══

/**
 * Block an agent (prevents new assignments from being created for their freelancers).
 * @param id Agent ID
 * @param reason Block reason
 * @returns Success or error
 * @endpoint POST /freelance/agents/:id/block
 * @roles NETWORK_OPS, HR_MANAGER
 */
export async function blockAgent(
  id: string,
  reason: string
): Promise<ApiMutationResponse> {
  await delay(rand(250, 400));

  if (isClientDirect()) {
    return MODULE_DISABLED;
  }

  if (!reason || reason.trim().length < 5) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Причина блокировки обязательна" },
    };
  }

  const agent = _agents.find((a) => a.id === id);
  if (!agent) {
    return { success: false, error: { code: "NOT_FOUND", message: `Agent ${id} not found` } };
  }
  if (agent.status === "BLOCKED") {
    return {
      success: false,
      error: { code: "INVALID_STATUS", message: "Agent is already blocked" },
    };
  }
  if (agent.status === "ARCHIVED") {
    return {
      success: false,
      error: { code: "INVALID_STATUS", message: "Cannot block archived agent" },
    };
  }

  _agents = _agents.map((a) =>
    a.id === id ? { ...a, status: "BLOCKED" as AgentStatus } : a
  );

  return { success: true };
}

/**
 * Archive an agent (soft delete — cannot be undone from UI).
 * @param id Agent ID
 * @returns Success or error
 * @endpoint POST /freelance/agents/:id/archive
 * @roles NETWORK_OPS
 */
export async function archiveAgent(id: string): Promise<ApiMutationResponse> {
  await delay(rand(250, 400));

  if (isClientDirect()) {
    return MODULE_DISABLED;
  }

  const agent = _agents.find((a) => a.id === id);
  if (!agent) {
    return { success: false, error: { code: "NOT_FOUND", message: `Agent ${id} not found` } };
  }
  if (agent.status === "ARCHIVED") {
    return {
      success: false,
      error: { code: "ALREADY_ARCHIVED", message: "Agent is already archived" },
    };
  }

  // Check no active freelancers
  const activeFreelancers = MOCK_FREELANCERS.filter(
    (f) => f.agent_id === id && f.freelancer_status === "ACTIVE"
  );
  if (activeFreelancers.length > 0) {
    return {
      success: false,
      error: {
        code: "HAS_ACTIVE_FREELANCERS",
        message: `Нельзя архивировать агента с ${activeFreelancers.length} активными исполнителями`,
      },
    };
  }

  _agents = _agents.map((a) =>
    a.id === id ? { ...a, status: "ARCHIVED" as AgentStatus } : a
  );

  return { success: true };
}

// ═══════════════════════════════════════════════════════════════════
// EARNINGS
// ═══════════════════════════════════════════════════════════════════

/**
 * Get paginated earnings history for an agent.
 * @param agentId Agent ID
 * @param params Pagination and filter params
 * @returns Paginated AgentEarning list
 * @endpoint GET /freelance/agents/:id/earnings
 * @roles NETWORK_OPS, HR_MANAGER
 */
export async function getAgentEarnings(
  agentId: string,
  params: ApiListParams = {}
): Promise<ApiListResponse<AgentEarning>> {
  await delay(rand(200, 400));

  if (isClientDirect()) {
    throw new Error(MODULE_DISABLED.error!.message);
  }

  const { page = 1, page_size = 20, sort_by = "period_date", sort_dir = "desc" } = params;

  const filtered = MOCK_AGENT_EARNINGS.filter((e) => e.agent_id === agentId);

  filtered.sort((a, b) => {
    const aVal = String(a[sort_by as keyof AgentEarning] ?? "");
    const bVal = String(b[sort_by as keyof AgentEarning] ?? "");
    const cmp = aVal.localeCompare(bVal);
    return sort_dir === "asc" ? cmp : -cmp;
  });

  const total = filtered.length;
  const start = (page - 1) * page_size;

  // Enrich with service store name for UI display (mock join)
  const enriched = filtered.slice(start, start + page_size).map((e) => {
    const service = MOCK_FREELANCE_SERVICES.find((s) => s.id === e.service_id);
    return {
      ...e,
      store_name: service?.store_name,
    };
  });

  return { data: enriched, total, page, page_size };
}
