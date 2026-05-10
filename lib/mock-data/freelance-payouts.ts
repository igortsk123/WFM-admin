import type { Payout } from "@/lib/types";
import { daysAgoFrom } from "./_today";

/**
 * @endpoint GET /api/freelance/payouts
 * 10 Payout records. One day × one freelancer = one record.
 * gross_amount = sum of related services.
 * nominal_account_fee = round(gross * 0.05).
 * net_amount = gross - fee.
 * agent_commission = round(gross * commission_pct/100) — начисление агенту, не вычитается из net.
 *
 * Payout IDs 1-6: PAID (last 2 weeks, various freelancers).
 * Payout IDs 7-8: PROCESSING (yesterday).
 * Payout ID 9: PENDING (tonight).
 * Payout ID 10: FAILED (wrong SNILS).
 *
 * Services references:
 *  payout-001 → svc-024 + svc-025 (Краснов + Смирнова, agent-001, gross=6080)
 *  payout-002 → svc-026 + svc-027 (Захаров + Громова, agent-002, gross=7600)
 *  payout-003 → svc-028 (Поляков, agent-001, gross=2160)
 *  payout-004 → svc-029 (Котова, agent-003, gross=4000)
 *  payout-005 → svc-030 + svc-031 (Федосеев + Соболева, agent-002, gross=5300)
 *  payout-006 → standalone PAID
 *  payout-007, 008 → PROCESSING
 *  payout-009 → svc-021 + svc-022 (READY_TO_PAY → PENDING)
 *  payout-010 → svc-023 (READY_TO_PAY → PENDING)
 */
export const MOCK_FREELANCE_PAYOUTS: Payout[] = [
  // ── 6 PAID ────────────────────────────────────────────────────────
  {
    id: "payout-001",
    payout_date: daysAgoFrom(12).slice(0, 10),
    freelancer_id: 100,
    freelancer_name: "Краснов Артём Дмитриевич",
    agent_id: "agent-001",
    services: ["svc-024", "svc-025"],
    gross_amount: 6080,
    nominal_account_fee: 304,
    net_amount: 5776,
    agent_commission: 608,
    status: "PAID",
    nominal_account_ref: "NA-2026-04-19-0231",
    closing_doc_url: "/docs/closing/NA-2026-04-19-0231.pdf",
    paid_at: daysAgoFrom(12),
    created_at: daysAgoFrom(14),
  },
  {
    id: "payout-002",
    payout_date: daysAgoFrom(12).slice(0, 10),
    freelancer_id: 106,
    freelancer_name: "Захаров Максим Игоревич",
    agent_id: "agent-002",
    services: ["svc-026", "svc-027"],
    gross_amount: 7600,
    nominal_account_fee: 380,
    net_amount: 7220,
    agent_commission: 608,
    status: "PAID",
    nominal_account_ref: "NA-2026-04-19-0232",
    closing_doc_url: "/docs/closing/NA-2026-04-19-0232.pdf",
    paid_at: daysAgoFrom(12),
    created_at: daysAgoFrom(14),
  },
  {
    id: "payout-003",
    payout_date: daysAgoFrom(11).slice(0, 10),
    freelancer_id: 102,
    freelancer_name: "Поляков Денис Сергеевич",
    agent_id: "agent-001",
    services: ["svc-028"],
    gross_amount: 2160,
    nominal_account_fee: 108,
    net_amount: 2052,
    agent_commission: 216,
    status: "PAID",
    nominal_account_ref: "NA-2026-04-20-0087",
    closing_doc_url: "/docs/closing/NA-2026-04-20-0087.pdf",
    paid_at: daysAgoFrom(11),
    created_at: daysAgoFrom(13),
  },
  {
    id: "payout-004",
    payout_date: daysAgoFrom(11).slice(0, 10),
    freelancer_id: 113,
    freelancer_name: "Котова Дарья Михайловна",
    agent_id: "agent-003",
    services: ["svc-029"],
    gross_amount: 4000,
    nominal_account_fee: 200,
    net_amount: 3800,
    agent_commission: 480,
    status: "PAID",
    nominal_account_ref: "NA-2026-04-20-0088",
    closing_doc_url: "/docs/closing/NA-2026-04-20-0088.pdf",
    paid_at: daysAgoFrom(11),
    created_at: daysAgoFrom(13),
  },
  {
    id: "payout-005",
    payout_date: daysAgoFrom(11).slice(0, 10),
    freelancer_id: 108,
    freelancer_name: "Федосеев Игорь Николаевич",
    agent_id: "agent-002",
    services: ["svc-030", "svc-031"],
    gross_amount: 5300,
    nominal_account_fee: 265,
    net_amount: 5035,
    agent_commission: 424,
    status: "PAID",
    nominal_account_ref: "NA-2026-04-20-0089",
    closing_doc_url: "/docs/closing/NA-2026-04-20-0089.pdf",
    paid_at: daysAgoFrom(11),
    created_at: daysAgoFrom(13),
  },
  {
    /** Standalone PAID from earlier period */
    id: "payout-006",
    payout_date: daysAgoFrom(18).slice(0, 10),
    freelancer_id: 114,
    freelancer_name: "Крылов Василий Петрович",
    agent_id: "agent-003",
    services: [],
    gross_amount: 3600,
    nominal_account_fee: 180,
    net_amount: 3420,
    agent_commission: 432,
    status: "PAID",
    nominal_account_ref: "NA-2026-04-13-0122",
    closing_doc_url: "/docs/closing/NA-2026-04-13-0122.pdf",
    paid_at: daysAgoFrom(18),
    created_at: daysAgoFrom(20),
  },

  // ── 2 PROCESSING (yesterday) ──────────────────────────────────────
  {
    id: "payout-007",
    payout_date: daysAgoFrom(1).slice(0, 10),
    freelancer_id: 105,
    freelancer_name: "Миронова Ольга Петровна",
    agent_id: "agent-001",
    services: ["svc-016"],
    gross_amount: 3040,
    nominal_account_fee: 152,
    net_amount: 2888,
    agent_commission: 304,
    status: "PROCESSING",
    nominal_account_ref: "NA-2026-04-30-0301",
    created_at: daysAgoFrom(2),
  },
  {
    id: "payout-008",
    payout_date: daysAgoFrom(1).slice(0, 10),
    freelancer_id: 106,
    freelancer_name: "Захаров Максим Игоревич",
    agent_id: "agent-002",
    services: ["svc-017"],
    gross_amount: 4400,
    nominal_account_fee: 220,
    net_amount: 4180,
    agent_commission: 352,
    status: "PROCESSING",
    nominal_account_ref: "NA-2026-04-30-0302",
    created_at: daysAgoFrom(2),
  },

  // ── 1 PENDING (tonight) ───────────────────────────────────────────
  {
    id: "payout-009",
    payout_date: "2026-05-01",
    freelancer_id: 104,
    freelancer_name: "Жуков Руслан Анатольевич",
    agent_id: "agent-001",
    services: ["svc-021", "svc-022"],
    gross_amount: 7440,
    nominal_account_fee: 372,
    net_amount: 7068,
    agent_commission: 744,
    status: "PENDING",
    created_at: daysAgoFrom(1),
  },

  // ── 1 FAILED (wrong SNILS) ────────────────────────────────────────
  {
    id: "payout-010",
    payout_date: daysAgoFrom(2).slice(0, 10),
    freelancer_id: 116,
    freelancer_name: "Тихомиров Сергей Васильевич",
    agent_id: null,
    services: ["svc-023"],
    gross_amount: 1680,
    nominal_account_fee: 84,
    net_amount: 1596,
    agent_commission: null,
    status: "FAILED",
    failure_reason: "Неверный СНИЛС",
    failure_reason_en: "Invalid SNILS (Russian social insurance number)",
    created_at: daysAgoFrom(3),
  },
];
