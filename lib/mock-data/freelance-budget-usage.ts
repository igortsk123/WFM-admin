import type { BudgetUsage } from "@/lib/types";

/**
 * @endpoint GET /api/freelance/budget-usage
 * 4 BudgetUsage records for the MONTH period, one per store.
 * MOCK_TODAY = 2026-05-01 (day 1 of May 2026).
 * April entry for SPAR Tomsk demonstrates overspend (17%) — key demo case.
 * Other 3 stores: May month reference (day 1 of 31, so planned=1/31 of limit).
 *
 * The April entry is kept for demo purposes as overspend from previous month
 * (approval blocked). Current May entries show healthy/normal budgets.
 */
export const MOCK_BUDGET_USAGES: BudgetUsage[] = [
  /**
   * SPAR Томск — April overspend demo.
   * Approval is BLOCKED. Key case for approval screen.
   * 30/30 days elapsed in April, overspend 15200₽ (17%).
   */
  {
    store_id: 1,
    store_name: "СПАР Томск, пр. Ленина 80",
    period: "MONTH",
    period_start: "2026-04-01",
    period_end: "2026-04-30",
    limit_amount: 90000,
    planned_amount: 90000,
    actual_amount: 105200,
    overspend: 15200,
    overspend_pct: 17,
    currency: "RUB",
  },

  /**
   * Food City Томск — May, day 1 of 31.
   * Healthy budget: actual 0 on day 1 (month just started).
   * planned_amount = round(70000 * 1/31) = 2258.
   */
  {
    store_id: 7,
    store_name: "Food City Томск Global Market, пр. Ленина 217",
    period: "MONTH",
    period_start: "2026-05-01",
    period_end: "2026-05-31",
    limit_amount: 70000,
    planned_amount: 2258,
    actual_amount: 0,
    overspend: 0,
    overspend_pct: 0,
    currency: "RUB",
  },

  /**
   * SPAR Новосибирск — May, day 1.
   * On the edge: actual closely tracks planned.
   * planned = round(100000 * 1/31) = 3226. actual = 3200.
   */
  {
    store_id: 4,
    store_name: "СПАР Новосибирск, ул. Ленина 55",
    period: "MONTH",
    period_start: "2026-05-01",
    period_end: "2026-05-31",
    limit_amount: 100000,
    planned_amount: 3226,
    actual_amount: 3200,
    overspend: 0,
    overspend_pct: 0,
    currency: "RUB",
  },

  /**
   * SPAR Кемерово — May, day 1.
   * Normal: external HR sync, actual within planned range.
   * planned = round(80000 * 1/31) = 2581. actual = 2400.
   */
  {
    store_id: 6,
    store_name: "СПАР Кемерово, пр. Советский 50",
    period: "MONTH",
    period_start: "2026-05-01",
    period_end: "2026-05-31",
    limit_amount: 80000,
    planned_amount: 2581,
    actual_amount: 2400,
    overspend: 0,
    overspend_pct: 0,
    currency: "RUB",
  },
];
