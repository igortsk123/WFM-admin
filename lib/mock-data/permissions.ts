import type { WorkerPermission } from "@/lib/types";

/**
 * @endpoint GET /api/permissions
 * Worker permissions per user:
 * - Кассиры (15, 17, 21, 25, 28) → CASHIER + SALES_FLOOR
 * - Универсалы (16, 22, 29) → CASHIER + SALES_FLOOR + SELF_CHECKOUT
 * - Продавцы-консультанты (18, 23, 27, 30) → SALES_FLOOR
 * - Кладовщики (19, 24) → WAREHOUSE
 * - Мерчендайзеры (20, 26) → SALES_FLOOR
 * - Фрилансеры (29-31) → зависит от work_type
 */
export const MOCK_PERMISSIONS: WorkerPermission[] = [
  // ── id=15 Козлова — КАССИР ─────────────────────────────────────
  { id: 1, user_id: 15, permission: "CASHIER", granted_at: "2024-06-01", granted_by_name: "Романов И. А." },
  { id: 2, user_id: 15, permission: "SALES_FLOOR", granted_at: "2024-06-01", granted_by_name: "Романов И. А." },

  // ── id=16 Новиков — УНИВЕРСАЛ ───────────────────────────────────
  { id: 3, user_id: 16, permission: "CASHIER", granted_at: "2024-07-15", granted_by_name: "Иванов А. С." },
  { id: 4, user_id: 16, permission: "SALES_FLOOR", granted_at: "2024-07-15", granted_by_name: "Иванов А. С." },
  { id: 5, user_id: 16, permission: "SELF_CHECKOUT", granted_at: "2024-07-15", granted_by_name: "Иванов А. С." },

  // ── id=17 Медведева — СТАРШИЙ КАССИР ───────────────────────────
  { id: 6, user_id: 17, permission: "CASHIER", granted_at: "2024-08-01", granted_by_name: "Петрова Е. В." },
  { id: 7, user_id: 17, permission: "SALES_FLOOR", granted_at: "2024-08-01", granted_by_name: "Петрова Е. В." },

  // ── id=18 Федоров — ПРОДАВЕЦ-КОНСУЛЬТАНТ ──────────────────────
  { id: 8, user_id: 18, permission: "SALES_FLOOR", granted_at: "2024-09-10", granted_by_name: "Петрова Е. В." },

  // ── id=19 Захарова — КЛАДОВЩИК ─────────────────────────────────
  { id: 9, user_id: 19, permission: "WAREHOUSE", granted_at: "2024-10-01", granted_by_name: "Иванов А. С." },

  // ── id=20 Попов — МЕРЧЕНДАЙЗЕР ─────────────────────────────────
  { id: 10, user_id: 20, permission: "SALES_FLOOR", granted_at: "2024-11-15", granted_by_name: "Сидоров К. М." },

  // ── id=21 Кириллова — КАССИР ────────────────────────────────────
  { id: 11, user_id: 21, permission: "CASHIER", granted_at: "2024-12-01", granted_by_name: "Сидоров К. М." },
  { id: 12, user_id: 21, permission: "SALES_FLOOR", granted_at: "2024-12-01", granted_by_name: "Сидоров К. М." },

  // ── id=22 Степанов — УНИВЕРСАЛ ─────────────────────────────────
  { id: 13, user_id: 22, permission: "CASHIER", granted_at: "2025-01-10", granted_by_name: "Васильев Д. О." },
  { id: 14, user_id: 22, permission: "SALES_FLOOR", granted_at: "2025-01-10", granted_by_name: "Васильев Д. О." },
  { id: 15, user_id: 22, permission: "SELF_CHECKOUT", granted_at: "2025-01-10", granted_by_name: "Васильев Д. О." },

  // ── id=23 Волкова — ПРОДАВЕЦ-КОНСУЛЬТАНТ ──────────────────────
  { id: 16, user_id: 23, permission: "SALES_FLOOR", granted_at: "2025-02-01", granted_by_name: "Смирнова О. И." },

  // ── id=24 Лебедев — КЛАДОВЩИК ──────────────────────────────────
  { id: 17, user_id: 24, permission: "WAREHOUSE", granted_at: "2025-03-01", granted_by_name: "Смирнова О. И." },

  // ── id=25 Соловьева — КАССИР ────────────────────────────────────
  { id: 18, user_id: 25, permission: "CASHIER", granted_at: "2025-04-01", granted_by_name: "Тарасова О. В." },
  { id: 19, user_id: 25, permission: "SALES_FLOOR", granted_at: "2025-04-01", granted_by_name: "Тарасова О. В." },

  // ── id=26 Гусев — МЕРЧЕНДАЙЗЕР ─────────────────────────────────
  { id: 20, user_id: 26, permission: "SALES_FLOOR", granted_at: "2025-05-01", granted_by_name: "Тарасова О. В." },

  // ── id=27 Белова — ПРОДАВЕЦ-КОНСУЛЬТАНТ ────────────────────────
  { id: 21, user_id: 27, permission: "SALES_FLOOR", granted_at: "2025-06-01", granted_by_name: "Никитина А. Н." },

  // ── id=28 Тихонов — КАССИР (архивирован, разрешение отозвано) ──
  {
    id: 22,
    user_id: 28,
    permission: "CASHIER",
    granted_at: "2024-05-01",
    granted_by_name: "Иванов А. С.",
    revoked_at: "2025-04-01",
    revoked_by_name: "Иванов А. С.",
  },
  {
    id: 23,
    user_id: 28,
    permission: "SALES_FLOOR",
    granted_at: "2024-05-01",
    granted_by_name: "Иванов А. С.",
    revoked_at: "2025-04-01",
    revoked_by_name: "Иванов А. С.",
  },

  // ── id=29 Орлов (FREELANCE) — УНИВЕРСАЛ ────────────────────────
  { id: 24, user_id: 29, permission: "CASHIER", granted_at: "2025-01-15", granted_by_name: "Романов И. А." },
  { id: 25, user_id: 29, permission: "SALES_FLOOR", granted_at: "2025-01-15", granted_by_name: "Романов И. А." },
  { id: 26, user_id: 29, permission: "SELF_CHECKOUT", granted_at: "2025-01-15", granted_by_name: "Романов И. А." },

  // ── id=30 Фролова (FREELANCE, VERIFICATION) — пока без прав ─────
  // (нет разрешений — VERIFICATION не завершена)

  // ── id=31 Мельников (FREELANCE, EXTERNAL_SYNC) — SALES_FLOOR ───
  { id: 27, user_id: 31, permission: "SALES_FLOOR", granted_at: "2025-04-10", granted_by_name: "Никитин Б. С." },
];
