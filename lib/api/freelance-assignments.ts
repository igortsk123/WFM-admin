/**
 * Freelance Assignments API — linking freelancers to approved applications.
 * Handles create, remove, and listing assignments by application.
 */

import type {
  ApiListResponse,
  ApiMutationResponse,
  FreelancerAssignment,
} from "@/lib/types";
import { MOCK_FREELANCE_ASSIGNMENTS } from "@/lib/mock-data/freelance-assignments";
import { MOCK_FREELANCERS } from "@/lib/mock-data/freelance-freelancers";

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));
const rand = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

// Mutable in-memory copy for demo mutations
let _assignments = [...MOCK_FREELANCE_ASSIGNMENTS];

export function _resetAssignmentsMock() {
  _assignments = [...MOCK_FREELANCE_ASSIGNMENTS];
}

// ═══════════════════════════════════════════════════════════════════
// LIST
// ═══════════════════════════════════════════════════════════════════

/**
 * Get all assignments for a specific freelance application.
 * @param applicationId Freelance application ID
 * @returns List of FreelancerAssignment records
 * @endpoint GET /freelance/applications/:id/assignments
 * @roles STORE_DIRECTOR (own store), SUPERVISOR, REGIONAL, NETWORK_OPS, HR_MANAGER
 */
export async function getAssignmentsByApplication(
  applicationId: string
): Promise<ApiListResponse<FreelancerAssignment>> {
  await delay(rand(200, 400));

  const data = _assignments.filter((a) => a.application_id === applicationId);

  return { data, total: data.length, page: 1, page_size: data.length };
}

// ═══════════════════════════════════════════════════════════════════
// CREATE
// ═══════════════════════════════════════════════════════════════════

/**
 * Create a freelancer assignment for an approved application.
 *
 * Mock logic:
 * - If phone matches an existing FREELANCE user → links to that user.
 * - If no match → creates a new user stub with status NEW and sends
 *   oferta link via the organization's preferred auth channel
 *   (Telegram / Max / Phone call / SMS-fallback / Email magic link —
 *   NOT hardcoded to SMS).
 *
 * @param applicationId Freelance application ID
 * @param data freelancer_phone, agent_id, scheduled_start, scheduled_end
 * @returns New assignment ID
 * @endpoint POST /freelance/applications/:id/assignments
 * @roles SUPERVISOR, REGIONAL, NETWORK_OPS, HR_MANAGER
 */
export async function createAssignment(
  applicationId: string,
  data: {
    freelancer_phone: string;
    agent_id?: string | null;
    scheduled_start: string;
    scheduled_end: string;
  }
): Promise<ApiMutationResponse> {
  await delay(rand(350, 550));

  const { freelancer_phone, agent_id, scheduled_start, scheduled_end } = data;

  if (!freelancer_phone || !scheduled_start || !scheduled_end) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "freelancer_phone, scheduled_start and scheduled_end are required",
      },
    };
  }

  if (scheduled_end <= scheduled_start) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "scheduled_end must be after scheduled_start",
      },
    };
  }

  // Look up existing freelancer by phone
  const existing = MOCK_FREELANCERS.find((u) => u.phone === freelancer_phone);

  let freelancerId: number;
  let freelancerName: string;
  let isNew = false;

  if (existing) {
    freelancerId = existing.id;
    freelancerName = `${existing.last_name} ${existing.first_name} ${existing.middle_name ?? ""}`.trim();
  } else {
    // New freelancer — create stub with status NEW
    freelancerId = 200 + Math.floor(Math.random() * 900);
    freelancerName = "Новый исполнитель";
    isNew = true;
    console.log(
      `[v0] New freelancer created (status=NEW) for phone ${freelancer_phone}. ` +
        "Oferta link sent via organization preferred channel (Telegram / Max / Call / SMS / Email magic link)."
    );
  }

  const newId = `asgn-${Date.now()}`;
  _assignments = [
    ..._assignments,
    {
      id: newId,
      application_id: applicationId,
      freelancer_id: freelancerId,
      freelancer_name: freelancerName,
      freelancer_phone,
      agent_id: agent_id ?? null,
      agent_name: null,
      scheduled_start,
      scheduled_end,
      actual_start: null,
      actual_end: null,
      geo_check_in: null,
      geo_check_in_match: null,
      oferta_accepted_at: isNew ? null : existing?.oferta_accepted_at ?? null,
      status: "SCHEDULED",
    },
  ];

  return {
    success: true,
    id: newId,
    ...(isNew
      ? { warning: "Новый исполнитель добавлен со статусом NEW. Ссылка на оферту отправлена по предпочтительному каналу организации." }
      : {}),
  };
}

// ═══════════════════════════════════════════════════════════════════
// REMOVE
// ═══════════════════════════════════════════════════════════════════

/**
 * Remove a scheduled assignment (only allowed before CHECKED_IN).
 * @param assignmentId Assignment ID
 * @returns Success or 409 if already checked in
 * @endpoint DELETE /freelance/assignments/:id
 * @roles SUPERVISOR, REGIONAL, NETWORK_OPS, HR_MANAGER
 */
export async function removeAssignment(
  assignmentId: string
): Promise<ApiMutationResponse> {
  await delay(rand(200, 350));

  const assignment = _assignments.find((a) => a.id === assignmentId);
  if (!assignment) {
    return {
      success: false,
      error: { code: "NOT_FOUND", message: `Assignment ${assignmentId} not found` },
    };
  }

  if (assignment.status !== "SCHEDULED") {
    return {
      success: false,
      error: {
        code: "INVALID_STATUS",
        message: `Cannot remove assignment with status ${assignment.status}. Only SCHEDULED assignments can be removed.`,
      },
    };
  }

  _assignments = _assignments.filter((a) => a.id !== assignmentId);

  return { success: true };
}
