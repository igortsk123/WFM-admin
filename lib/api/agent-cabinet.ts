/**
 * Agent Cabinet API — private endpoints for the AGENT functional role.
 * Backend derives agent_id from JWT; these endpoints do NOT accept agentId as a parameter.
 * Routes: /agent, /agent/freelancers, /agent/earnings, /agent/documents.
 *
 * Hidden in CLIENT_DIRECT mode (same as agents module).
 * Agent does NOT see freelancer ratings (rating field is omitted from responses).
 */

import type {
  ApiResponse,
  ApiListResponse,
  ApiListParams,
  Agent,
  AgentEarning,
  User,
  Service,
  Payout,
  FreelancerAssignment,
} from "@/lib/types";
import { MOCK_FREELANCE_AGENTS } from "@/lib/mock-data/freelance-agents";
import { MOCK_AGENT_EARNINGS } from "@/lib/mock-data/freelance-agent-earnings";
import { MOCK_FREELANCERS } from "@/lib/mock-data/freelance-freelancers";
import { MOCK_FREELANCE_SERVICES } from "@/lib/mock-data/freelance-services";
import { MOCK_FREELANCE_PAYOUTS } from "@/lib/mock-data/freelance-payouts";
import { MOCK_FREELANCE_ASSIGNMENTS } from "@/lib/mock-data/freelance-assignments";
import { MOCK_ORGANIZATIONS } from "@/lib/mock-data/organizations";

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));
const rand = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

/** Demo: the mock AGENT role always maps to agent-001 */
const MOCK_AGENT_ID = "agent-001";

function isClientDirect(): boolean {
  const org = MOCK_ORGANIZATIONS.find((o) => o.id === "org-spar");
  return org?.payment_mode === "CLIENT_DIRECT";
}

/** Strip rating from user objects — agents must not see freelancer ratings */
function stripRating(user: User): Omit<User, "rating"> {
  const { rating: _rating, ...rest } = user;
  void _rating;
  return rest;
}

// ═══════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════

/**
 * Get the agent's personal dashboard summary.
 * agent_id is derived from JWT (not passed as param).
 * @returns Agent profile + active freelancers count + 30/7-day earnings + recent payouts
 * @endpoint GET /agent/me/dashboard
 * @roles AGENT
 */
export async function getMyAgentDashboard(): Promise<
  ApiResponse<{
    agent: Agent;
    freelancers_count_active: number;
    earnings_30d: number;
    earnings_7d: number;
    recent_payouts: Payout[];
  }>
> {
  await delay(rand(300, 500));

  if (isClientDirect()) {
    throw new Error("Кабинет агента недоступен в режиме CLIENT_DIRECT.");
  }

  const agent = MOCK_FREELANCE_AGENTS.find((a) => a.id === MOCK_AGENT_ID);
  if (!agent) throw new Error("Agent not found");

  const activeFreelancers = MOCK_FREELANCERS.filter(
    (f) => f.agent_id === MOCK_AGENT_ID && f.freelancer_status === "ACTIVE"
  );

  const now = new Date("2026-05-01");
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const myEarnings = MOCK_AGENT_EARNINGS.filter((e) => e.agent_id === MOCK_AGENT_ID);

  const earnings_30d = myEarnings
    .filter((e) => new Date(e.period_date) >= thirtyDaysAgo)
    .reduce((sum, e) => sum + e.commission_amount, 0);

  const earnings_7d = myEarnings
    .filter((e) => new Date(e.period_date) >= sevenDaysAgo)
    .reduce((sum, e) => sum + e.commission_amount, 0);

  const recent_payouts = MOCK_FREELANCE_PAYOUTS
    .filter((p) => p.agent_id === MOCK_AGENT_ID)
    .sort((a, b) => b.payout_date.localeCompare(a.payout_date))
    .slice(0, 5);

  return {
    data: {
      agent,
      freelancers_count_active: activeFreelancers.length,
      earnings_30d,
      earnings_7d,
      recent_payouts,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════
// TODAY'S ACTIVITY
// ═══════════════════════════════════════════════════════════════════

/**
 * Get the agent's today's freelancer assignments.
 * Returns assignments for today (SCHEDULED, CHECKED_IN, WORKING, DONE, NO_SHOW).
 * @returns List of FreelancerAssignment for today belonging to this agent
 * @endpoint GET /agent/me/today-activity
 * @roles AGENT
 */
export async function getMyTodayActivity(): Promise<
  ApiResponse<FreelancerAssignment[]>
> {
  await delay(rand(200, 400));

  if (isClientDirect()) {
    throw new Error("Кабинет агента недоступен в режиме CLIENT_DIRECT.");
  }

  const today = new Date("2026-05-01").toISOString().slice(0, 10);

  const todayAssignments = MOCK_FREELANCE_ASSIGNMENTS.filter((a) => {
    const aDate = a.scheduled_start.slice(0, 10);
    return a.agent_id === MOCK_AGENT_ID && aDate === today;
  });

  return { data: todayAssignments };
}

// ═══════════════════════════════════════════════════════════════════
// FREELANCERS
// ═══════════════════════════════════════════════════════════════════

/**
 * Get the agent's freelancer roster with 30-day activity stats.
 * Rating field is intentionally omitted — agents must not see ratings.
 * @param params status filter, pagination
 * @returns Paginated list of freelancers (without rating) + 30d service metrics
 * @endpoint GET /agent/me/freelancers
 * @roles AGENT
 */
export async function getMyFreelancers(
  params: ApiListParams & { status?: string } = {}
): Promise<
  ApiListResponse<
    Omit<User, "rating"> & { services_count_30d: number; total_earned_30d: number }
  >
> {
  await delay(rand(200, 400));

  if (isClientDirect()) {
    throw new Error("Кабинет агента недоступен в режиме CLIENT_DIRECT.");
  }

  const { status, search, page = 1, page_size = 20 } = params;

  const now = new Date("2026-05-01");
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  let filtered = MOCK_FREELANCERS.filter((f) => f.agent_id === MOCK_AGENT_ID);

  if (status) {
    filtered = filtered.filter((f) => f.freelancer_status === status);
  }
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (f) =>
        f.first_name.toLowerCase().includes(q) ||
        f.last_name.toLowerCase().includes(q) ||
        f.phone.includes(q)
    );
  }

  const total = filtered.length;
  const start = (page - 1) * page_size;

  const enriched = filtered.slice(start, start + page_size).map((f) => {
    const recentServices = MOCK_FREELANCE_SERVICES.filter(
      (s) =>
        s.freelancer_id === f.id &&
        new Date(s.service_date) >= thirtyDaysAgo &&
        s.status === "PAID"
    );
    return {
      ...stripRating(f),
      services_count_30d: recentServices.length,
      total_earned_30d: recentServices.reduce((sum, s) => sum + (s.total_amount ?? 0), 0),
    };
  });

  return { data: enriched, total, page, page_size };
}

/**
 * Get a single freelancer profile with their service history.
 * Rating field is omitted.
 * @param userId Freelancer user ID
 * @returns Freelancer (without rating) + services[]
 * @endpoint GET /agent/me/freelancers/:id
 * @roles AGENT
 */
export async function getMyFreelancerById(
  userId: number
): Promise<ApiResponse<Omit<User, "rating"> & { services: Service[] }>> {
  await delay(rand(250, 450));

  if (isClientDirect()) {
    throw new Error("Кабинет агента недоступен в режиме CLIENT_DIRECT.");
  }

  const freelancer = MOCK_FREELANCERS.find(
    (f) => f.id === userId && f.agent_id === MOCK_AGENT_ID
  );
  if (!freelancer) throw new Error(`Freelancer ${userId} not found in agent's roster`);

  const services = MOCK_FREELANCE_SERVICES.filter((s) => s.freelancer_id === userId);

  return { data: { ...stripRating(freelancer), services } };
}

/**
 * Get full detail for a single freelancer in the agent's roster.
 * Includes KPI (30-day stats, active shifts today) and full service + earning history.
 * Rating field is intentionally omitted.
 * @param userId Freelancer user ID
 * @returns Freelancer profile + KPI + services[] + earnings[]
 * @endpoint GET /agent/me/freelancers/:id/detail
 * @roles AGENT
 */
export async function getMyFreelancerDetailById(userId: number): Promise<
  ApiResponse<{
    freelancer: Omit<User, "rating">;
    services_count_30d: number;
    earned_30d: number;
    active_shifts_today: number;
    services: Service[];
    earnings: AgentEarning[];
  }>
> {
  await delay(rand(300, 500));

  if (isClientDirect()) {
    throw new Error("Кабинет агента недоступен в режиме CLIENT_DIRECT.");
  }

  const freelancer = MOCK_FREELANCERS.find(
    (f) => f.id === userId && f.agent_id === MOCK_AGENT_ID
  );
  if (!freelancer) throw new Error(`Freelancer ${userId} not found in agent's roster`);

  const now = new Date("2026-05-01");
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const today = now.toISOString().slice(0, 10);

  const services = MOCK_FREELANCE_SERVICES.filter(
    (s) => s.freelancer_id === userId
  );

  const recentPaid = services.filter(
    (s) =>
      s.status === "PAID" && new Date(s.service_date) >= thirtyDaysAgo
  );

  const earnings = MOCK_AGENT_EARNINGS.filter(
    (e) => e.agent_id === MOCK_AGENT_ID && e.freelancer_id === userId
  );

  const earned_30d = earnings
    .filter((e) => new Date(e.period_date) >= thirtyDaysAgo)
    .reduce((sum, e) => sum + e.commission_amount, 0);

  const active_shifts_today = MOCK_FREELANCE_ASSIGNMENTS.filter((a) => {
    const aDate = a.scheduled_start.slice(0, 10);
    return (
      a.freelancer_id === userId &&
      aDate === today &&
      (a.status === "CHECKED_IN" || a.status === "WORKING" || a.status === "SCHEDULED")
    );
  }).length;

  return {
    data: {
      freelancer: stripRating(freelancer),
      services_count_30d: recentPaid.length,
      earned_30d,
      active_shifts_today,
      services,
      earnings,
    },
  };
}

// ═════════════��═════════════════════════════════════════════════════
// EARNINGS
// ═══════════════════════════════════════════════════════════════════

/**
 * Get the agent's commission earnings history.
 * @param params date_from, date_to, pagination
 * @returns Paginated AgentEarning list
 * @endpoint GET /agent/me/earnings
 * @roles AGENT
 */
export async function getMyEarnings(
  params: ApiListParams & { date_from?: string; date_to?: string } = {}
): Promise<ApiListResponse<AgentEarning>> {
  await delay(rand(200, 400));

  if (isClientDirect()) {
    throw new Error("Кабинет агента недоступен в режиме CLIENT_DIRECT.");
  }

  const { date_from, date_to, page = 1, page_size = 20, sort_by = "period_date", sort_dir = "desc" } = params;

  let filtered = MOCK_AGENT_EARNINGS.filter((e) => e.agent_id === MOCK_AGENT_ID);

  if (date_from) filtered = filtered.filter((e) => e.period_date >= date_from);
  if (date_to) filtered = filtered.filter((e) => e.period_date <= date_to);

  filtered.sort((a, b) => {
    const aVal = String(a[sort_by as keyof AgentEarning] ?? "");
    const bVal = String(b[sort_by as keyof AgentEarning] ?? "");
    const cmp = aVal.localeCompare(bVal);
    return sort_dir === "asc" ? cmp : -cmp;
  });

  const total = filtered.length;
  const start = (page - 1) * page_size;

  return { data: filtered.slice(start, start + page_size), total, page, page_size };
}

/**
 * Get a single payout by ID, scoped to this agent's payouts.
 * Returns the payout with earnings linked to it for this agent.
 * @param payoutId Payout ID
 * @returns Payout details + agent_earning for this agent
 * @endpoint GET /agent/me/payouts/:id
 * @roles AGENT
 */
export async function getMyPayoutById(
  payoutId: string
): Promise<ApiResponse<Payout & { agent_earnings_in_payout: AgentEarning[] }>> {
  await delay(rand(200, 400));

  if (isClientDirect()) {
    throw new Error("Кабинет агента недоступен в режиме CLIENT_DIRECT.");
  }

  const payout = MOCK_FREELANCE_PAYOUTS.find(
    (p) => p.id === payoutId && p.agent_id === MOCK_AGENT_ID
  );
  if (!payout) throw new Error(`Payout ${payoutId} not found for this agent`);

  const agent_earnings_in_payout = MOCK_AGENT_EARNINGS.filter(
    (ae) => ae.payout_id === payoutId && ae.agent_id === MOCK_AGENT_ID
  );

  return { data: { ...payout, agent_earnings_in_payout } };
}

// ═══════════════════════════════════════════════════════════════════
// DOCUMENTS
// ═══════════════════════════════════════════════════════════════════

/** Agent document type */
export type AgentDocumentType = "CONTRACT" | "CLOSING_ACT" | "INVOICE";

export interface AgentDocument {
  id: string;
  type: AgentDocumentType;
  period: string;
  url: string;
  created_at: string;
}

/**
 * Get the agent's document archive (contracts, closing acts, invoices).
 * @param params Pagination
 * @returns Paginated document list
 * @endpoint GET /agent/me/documents
 * @roles AGENT
 */
export async function getMyDocuments(
  params: ApiListParams = {}
): Promise<ApiListResponse<AgentDocument>> {
  await delay(rand(250, 450));

  if (isClientDirect()) {
    throw new Error("Кабинет агента недоступен в режиме CLIENT_DIRECT.");
  }

  const { page = 1, page_size = 20 } = params;

  // Mock documents derived from agent-001 paid payouts
  const docs: AgentDocument[] = [
    {
      id: "doc-001",
      type: "CONTRACT",
      period: "2025-09",
      url: "/docs/agents/agent-001/contract-2025-09.pdf",
      created_at: "2025-09-15T09:00:00Z",
    },
    {
      id: "doc-002",
      type: "CLOSING_ACT",
      period: "2026-04",
      url: "/docs/agents/agent-001/closing-act-2026-04.pdf",
      created_at: "2026-04-30T23:00:00Z",
    },
    {
      id: "doc-003",
      type: "INVOICE",
      period: "2026-04",
      url: "/docs/agents/agent-001/invoice-2026-04.pdf",
      created_at: "2026-04-30T22:00:00Z",
    },
    {
      id: "doc-004",
      type: "CLOSING_ACT",
      period: "2026-03",
      url: "/docs/agents/agent-001/closing-act-2026-03.pdf",
      created_at: "2026-03-31T23:00:00Z",
    },
    {
      id: "doc-005",
      type: "INVOICE",
      period: "2026-03",
      url: "/docs/agents/agent-001/invoice-2026-03.pdf",
      created_at: "2026-03-31T22:00:00Z",
    },
  ];

  const total = docs.length;
  const start = (page - 1) * page_size;

  return { data: docs.slice(start, start + page_size), total, page, page_size };
}
