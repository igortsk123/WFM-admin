/**
 * Dashboard API — aggregated metrics for the resource balance block.
 * Computes on-the-fly from mock data to mirror future backend endpoints.
 */

import type {
  ApiResponse,
  BudgetSummary,
  DashboardPeriod,
  NetworkHealthSummary,
} from "@/lib/types";
import { MOCK_TASKS } from "@/lib/mock-data/tasks";
import { MOCK_STORES } from "@/lib/mock-data/stores";
import { MOCK_FREELANCE_SERVICES } from "@/lib/mock-data/freelance-services";
import { MOCK_FREELANCE_APPLICATIONS } from "@/lib/mock-data/freelance-applications";
import { MOCK_NETWORK_HEALTH } from "@/lib/mock-data/network-health";
import { MOCK_NETWORK_BUDGET } from "@/lib/mock-data/network-budget";
import { getCurrentOrgId } from "./_org-context";

const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

export interface ResourceBalanceData {
  /** Hours completed today by STAFF employees */
  staff_completed_hours: number;
  /** Total planned hours for today */
  planned_hours: number;
  /** Staff coverage ratio 0-100 */
  staff_coverage_pct: number;
  /** Hours closed by bonus tasks today */
  bonus_hours_completed: number;
  /** Freelance hours needed today (scheduled/in-progress freelance services) */
  freelance_hours_needed: number;
  /** Active freelance assignments today (distinct freelancers) */
  active_freelance_assignments_today: number;
  /** Amount saved by replacing freelance with bonus tasks */
  saved_amount_from_bonus_replacement: number;
  /** Pending freelance applications awaiting approval */
  pending_applications_count: number;
  /** Applications with overspend flag */
  overspend_count: number;
  /** External applications with no freelancer assignment yet */
  external_unassigned_count: number;
}

// ═══════════════════════════════════════════════════════════════════
// RESOURCE BALANCE
// ═══════════════════════════════════════════════════════════════════

/**
 * Compute resource balance metrics for today.
 * Derived from tasks (completed by STAFF/BONUS) + freelance services scheduled today.
 * @endpoint GET /dashboard/resource-balance
 */
export async function getDashboardResourceBalance(): Promise<
  ApiResponse<ResourceBalanceData>
> {
  await delay(350);

  const TODAY = "2026-05-07"; // LAMA snapshot date

  // Org scope: filter tasks by stores belonging to current org.
  const orgId = getCurrentOrgId();
  const orgStoreIds = new Set(
    MOCK_STORES.filter((s) => s.organization_id === orgId).map((s) => s.id)
  );

  // ── Staff tasks ──────────────────────────────────────────────────
  const todayTasks = MOCK_TASKS.filter(
    (t) => !t.archived && t.type !== "BONUS" && orgStoreIds.has(t.store_id)
  );
  const completedStaffTasks = todayTasks.filter(
    (t) => t.state === "COMPLETED" && t.source !== "AI"
  );
  // Estimate hours from planned_minutes (default 30 min per task if missing)
  const staffCompletedHours = Math.round(
    completedStaffTasks.reduce(
      (acc, t) => acc + (t.planned_minutes ?? 30) / 60,
      0
    ) * 10
  ) / 10;

  const plannedHours = Math.round(
    todayTasks.reduce(
      (acc, t) => acc + (t.planned_minutes ?? 30) / 60,
      0
    ) * 10
  ) / 10;

  const staffCoveragePct =
    plannedHours > 0
      ? Math.round((staffCompletedHours / plannedHours) * 100)
      : 0;

  // ── Bonus tasks ──────────────────────────────────────────────────
  const completedBonusTasks = MOCK_TASKS.filter(
    (t) =>
      t.type === "BONUS" &&
      !t.archived &&
      t.state === "COMPLETED" &&
      orgStoreIds.has(t.store_id)
  );
  const bonusHoursCompleted = Math.round(
    completedBonusTasks.reduce(
      (acc, t) => acc + (t.planned_minutes ?? 20) / 60,
      0
    ) * 10
  ) / 10;

  // ── Freelance services today ─────────────────────────────────────
  const todayServices = MOCK_FREELANCE_SERVICES.filter(
    (s) => s.service_date === TODAY || s.status === "IN_PROGRESS"
  );
  const freelanceHoursNeeded = todayServices.reduce(
    (acc, s) => acc + s.scheduled_hours,
    0
  );
  const activeFreelanecAssignments = new Set(
    todayServices.map((s) => s.freelancer_id)
  ).size;

  // ── Savings from REPLACED_WITH_BONUS ────────────────────────────
  // Each bonus task hour saved ≈ freelance rate (380 ₽/h) minus bonus cost (≈ 0 budget line)
  const FREELANCE_HOURLY_RATE = 380;
  const savedAmount = Math.round(bonusHoursCompleted * FREELANCE_HOURLY_RATE);

  // ── Secondary row counts ─────────────────────────────────────────
  const pendingApplicationsCount = MOCK_FREELANCE_APPLICATIONS.filter(
    (a) => a.status === "PENDING"
  ).length;

  // No overspend field on application directly — derive from urgent retroactive
  const overspendCount = MOCK_FREELANCE_APPLICATIONS.filter(
    (a) => a.retroactive === true
  ).length;

  // External unassigned = EXTERNAL source + APPROVED but no assignments yet
  const externalUnassigned = MOCK_FREELANCE_APPLICATIONS.filter(
    (a) => a.source === "EXTERNAL" && a.status === "PENDING"
  ).length;

  return {
    data: {
      staff_completed_hours: staffCompletedHours,
      planned_hours: plannedHours,
      staff_coverage_pct: staffCoveragePct,
      bonus_hours_completed: bonusHoursCompleted,
      freelance_hours_needed: freelanceHoursNeeded,
      active_freelance_assignments_today: activeFreelanecAssignments,
      saved_amount_from_bonus_replacement: savedAmount,
      pending_applications_count: pendingApplicationsCount,
      overspend_count: overspendCount,
      external_unassigned_count: externalUnassigned,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════
// NETWORK HEALTH (SUPERVISOR / REGIONAL / NETWORK_OPS)
// ═══════════════════════════════════════════════════════════════════

/**
 * Aggregated network health summary for SUPERVISOR+ roles.
 * Прогноз vs назначено по магазинам сети + аномалии.
 *
 * Scope (определяется ролью):
 * - SUPERVISOR — только свои магазины (filtered by user.id == store.supervisor_id)
 * - REGIONAL — магазины своего региона
 * - NETWORK_OPS — вся сеть текущей организации
 *
 * @param period период агрегации (default: current_month)
 * @endpoint GET /dashboard/network-health
 * @roles SUPERVISOR, REGIONAL, NETWORK_OPS
 */
export async function getNetworkHealth(
  period: DashboardPeriod = "current_month"
): Promise<ApiResponse<NetworkHealthSummary>> {
  await delay(400);
  return {
    data: { ...MOCK_NETWORK_HEALTH, period },
  };
}

// ═══════════════════════════════════════════════════════════════════
// BUDGET SUMMARY (SUPERVISOR / REGIONAL / NETWORK_OPS)
// ═══════════════════════════════════════════════════════════════════

/**
 * Aggregated freelance budget summary for SUPERVISOR+ roles.
 * Расход бюджета внештата vs лимит, риск нехватки, заявки на одобрение.
 *
 * Scope аналогичен network-health (по роли пользователя).
 *
 * @param period период агрегации (default: current_month)
 * @endpoint GET /dashboard/budget
 * @roles SUPERVISOR, REGIONAL, NETWORK_OPS
 */
export async function getBudgetSummary(
  period: DashboardPeriod = "current_month"
): Promise<ApiResponse<BudgetSummary>> {
  await delay(400);
  return {
    data: { ...MOCK_NETWORK_BUDGET, period },
  };
}
