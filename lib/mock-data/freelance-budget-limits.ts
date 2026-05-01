import type { BudgetLimit } from "@/lib/types";

/**
 * @endpoint GET /api/freelance/budget-limits
 * 8 BudgetLimit records across 4 stores, DAY/WEEK/MONTH periods.
 * set_by = 3 (Соколова А.В., acting as regional director Романов И.А. — using id 4).
 * valid_from 2026-01-01, valid_to null (active indefinitely).
 */
export const MOCK_BUDGET_LIMITS: BudgetLimit[] = [
  // ── SPAR Томск, пр. Ленина 80 (store_id=1) ──────────────────────
  {
    id: "bl-001",
    store_id: 1,
    store_name: "СПАР Томск, пр. Ленина 80",
    period: "DAY",
    amount: 4500,
    currency: "RUB",
    valid_from: "2026-01-01",
    valid_to: null,
    set_by: 4,
    set_by_name: "Романов И. А.",
    set_at: "2025-12-01T09:00:00Z",
  },
  {
    id: "bl-002",
    store_id: 1,
    store_name: "СПАР Томск, пр. Ленина 80",
    period: "WEEK",
    amount: 27000,
    currency: "RUB",
    valid_from: "2026-01-01",
    valid_to: null,
    set_by: 4,
    set_by_name: "Романов И. А.",
    set_at: "2025-12-01T09:00:00Z",
  },
  {
    id: "bl-003",
    store_id: 1,
    store_name: "СПАР Томск, пр. Ленина 80",
    period: "MONTH",
    amount: 90000,
    currency: "RUB",
    valid_from: "2026-01-01",
    valid_to: null,
    set_by: 4,
    set_by_name: "Романов И. А.",
    set_at: "2025-12-01T09:00:00Z",
  },

  // ── Food City Томск Global Market (store_id=7) ───────────────────
  {
    id: "bl-004",
    store_id: 7,
    store_name: "Food City Томск Global Market, пр. Ленина 217",
    period: "DAY",
    amount: 3500,
    currency: "RUB",
    valid_from: "2026-01-01",
    valid_to: null,
    set_by: 4,
    set_by_name: "Романов И. А.",
    set_at: "2025-12-01T09:00:00Z",
  },
  {
    id: "bl-005",
    store_id: 7,
    store_name: "Food City Томск Global Market, пр. Ленина 217",
    period: "MONTH",
    amount: 70000,
    currency: "RUB",
    valid_from: "2026-01-01",
    valid_to: null,
    set_by: 4,
    set_by_name: "Романов И. А.",
    set_at: "2025-12-01T09:00:00Z",
  },

  // ── SPAR Новосибирск, ул. Ленина 55 (store_id=4) ─────────────────
  {
    id: "bl-006",
    store_id: 4,
    store_name: "СПАР Новосибирск, ул. Ленина 55",
    period: "DAY",
    amount: 5000,
    currency: "RUB",
    valid_from: "2026-01-01",
    valid_to: null,
    set_by: 4,
    set_by_name: "Романов И. А.",
    set_at: "2025-12-01T09:00:00Z",
  },
  {
    id: "bl-007",
    store_id: 4,
    store_name: "СПАР Новосибирск, ул. Ленина 55",
    period: "MONTH",
    amount: 100000,
    currency: "RUB",
    valid_from: "2026-01-01",
    valid_to: null,
    set_by: 4,
    set_by_name: "Романов И. А.",
    set_at: "2025-12-01T09:00:00Z",
  },

  // ── SPAR Кемерово (store_id=6) ───────────────────────────────────
  {
    id: "bl-008",
    store_id: 6,
    store_name: "СПАР Кемерово, пр. Советский 50",
    period: "MONTH",
    amount: 80000,
    currency: "RUB",
    valid_from: "2026-01-01",
    valid_to: null,
    set_by: 4,
    set_by_name: "Романов И. А.",
    set_at: "2025-12-01T09:00:00Z",
  },
];
