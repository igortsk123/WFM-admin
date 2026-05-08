import type { BudgetSummary, StoreBudgetRow, FormatBudgetRow } from "@/lib/types";

/**
 * Mock данные для вкладки "Бюджет" дашборда (SUPERVISOR+).
 * Расход бюджета внештата за период по магазинам, статус нехватки/превышения.
 *
 * Логика:
 * - spent_rub = подтверждённые услуги внештата (Service.amount) за период
 * - total_rub = бюджетный лимит из freelance_budget_limits для скоупа
 * - status: NORMAL если pace_diff_pct ≤ 0, RISK если > 0, EXCEEDED если spent > total
 */

const STORES_BUDGET: StoreBudgetRow[] = [
  {
    store_id: 270,
    store_name: "С-6 Мичурина 37 (П)",
    format: "SUPERMARKET",
    spent_rub: 27_500,
    total_rub: 50_000,
    status: "RISK",
    risk_amount_rub: 6_000,
    supervisor_id: 3,
    supervisor_name: "Иванов И. И.",
    supervisor_avatar_url: null,
  },
  {
    store_id: 2,
    store_name: "СПАР Томск, ул. Красноармейская 99",
    format: "CONVENIENCE",
    spent_rub: 80_000,
    total_rub: 150_000,
    status: "RISK",
    risk_amount_rub: 15_000,
    supervisor_id: 3,
    supervisor_name: "Иванов И. И.",
    supervisor_avatar_url: null,
  },
  {
    store_id: 3,
    store_name: "СПАР Томск, пр. Фрунзе 92а",
    format: "CONVENIENCE",
    spent_rub: 20_000,
    total_rub: 30_000,
    status: "NORMAL",
    supervisor_id: 3,
    supervisor_name: "Леонтьев Н. И.",
    supervisor_avatar_url: null,
  },
  {
    store_id: 1,
    store_name: "СПАР Томск, пр. Ленина 80",
    format: "SUPERMARKET",
    spent_rub: 95_000,
    total_rub: 200_000,
    status: "NORMAL",
    supervisor_id: 3,
    supervisor_name: "Иванов И. И.",
    supervisor_avatar_url: null,
  },
  {
    store_id: 200,
    store_name: "Г-1 Котовского 19/3 (ГМ)",
    format: "HYPERMARKET",
    spent_rub: 320_000,
    total_rub: 500_000,
    status: "NORMAL",
    supervisor_id: 3,
    supervisor_name: "Степанов С. И.",
    supervisor_avatar_url: null,
  },
  {
    store_id: 206,
    store_name: "У-21 Елизаровых 46/1 (ИР)",
    format: "CONVENIENCE",
    spent_rub: 56_000,
    total_rub: 60_000,
    status: "RISK",
    risk_amount_rub: 8_000,
    supervisor_id: 3,
    supervisor_name: "Степанов С. И.",
    supervisor_avatar_url: null,
  },
  {
    store_id: 4,
    store_name: "СПАР Новосибирск, ул. Ленина 55",
    format: "SUPERMARKET",
    spent_rub: 110_000,
    total_rub: 180_000,
    status: "NORMAL",
    supervisor_id: 4,
    supervisor_name: "Соколов А. В.",
    supervisor_avatar_url: null,
  },
  {
    store_id: 5,
    store_name: "СПАР Новосибирск, Красный пр. 200",
    format: "HYPERMARKET",
    spent_rub: 380_000,
    total_rub: 400_000,
    status: "EXCEEDED",
    risk_amount_rub: 22_000,
    supervisor_id: 4,
    supervisor_name: "Соколов А. В.",
    supervisor_avatar_url: null,
  },
  {
    store_id: 6,
    store_name: "СПАР Кемерово, пр. Советский 50",
    format: "SMALL_SHOP",
    spent_rub: 22_000,
    total_rub: 40_000,
    status: "NORMAL",
    supervisor_id: 4,
    supervisor_name: "Соколов А. В.",
    supervisor_avatar_url: null,
  },
];

const FORMAT_BUDGET: FormatBudgetRow[] = [
  { format: "CONVENIENCE", spent_rub: 6_000_000, total_rub: 12_000_000 },
  { format: "SUPERMARKET", spent_rub: 4_000_000, total_rub: 5_000_000 },
  { format: "HYPERMARKET", spent_rub: 1_000_000, total_rub: 3_300_000 },
  { format: "SMALL_SHOP", spent_rub: 2_000_000, total_rub: 3_000_000 },
];

export const MOCK_NETWORK_BUDGET: BudgetSummary = {
  spent_rub: 13_000_000,
  total_rub: 23_300_000,
  status: "RISK",
  pending_approvals_count: 5,
  pace_diff_pct: 5,
  risk_amount_rub: 700_000,
  by_format: FORMAT_BUDGET,
  stores: STORES_BUDGET,
  period: "current_month",
};
