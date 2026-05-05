import type { FunctionalRoleAssignment } from "@/lib/types";

/**
 * @endpoint GET /api/functional-role-assignments
 * Functional role assignments for all non-WORKER users.
 * scope_ids — числа для STORE/STORE_LIST (store.id), строки для ORGANIZATION.
 * PLATFORM_ADMIN → пустой scope_ids (cross-tenant).
 */
export const MOCK_FUNCTIONAL_ROLES: FunctionalRoleAssignment[] = [
  // id=1 — PLATFORM_ADMIN (Иванов С. К., cross-tenant)
  {
    id: 1,
    user_id: 1,
    functional_role: "PLATFORM_ADMIN",
    scope_type: "ORGANIZATION",
    scope_ids: [],
  },

  // id=2 — AGENT (Захарова М. С., org-spar для демо)
  {
    id: 2,
    user_id: 2,
    functional_role: "AGENT",
    scope_type: "ORGANIZATION",
    scope_ids: ["org-spar"],
  },

  // id=3 — NETWORK_OPS (Соколова А. В., org-spar)
  {
    id: 3,
    user_id: 3,
    functional_role: "NETWORK_OPS",
    scope_type: "ORGANIZATION",
    scope_ids: ["org-spar"],
  },

  // id=4 — SUPERVISOR (Романов И. А., 5 магазинов СПАР ТОМ + НСК + КЕМ)
  {
    id: 4,
    user_id: 4,
    functional_role: "SUPERVISOR",
    scope_type: "STORE_LIST",
    scope_ids: [1, 2, 3, 4, 5, 6],
  },

  // id=5 — STORE_DIRECTOR (Иванов А. С., SPAR-TOM-001)
  {
    id: 5,
    user_id: 5,
    functional_role: "STORE_DIRECTOR",
    scope_type: "STORE",
    scope_ids: [1],
  },

  // id=6 — STORE_DIRECTOR (Петрова Е. В., SPAR-TOM-002)
  {
    id: 6,
    user_id: 6,
    functional_role: "STORE_DIRECTOR",
    scope_type: "STORE",
    scope_ids: [2],
  },

  // id=7 — STORE_DIRECTOR (Сидоров К. М., SPAR-NSK-001)
  {
    id: 7,
    user_id: 7,
    functional_role: "STORE_DIRECTOR",
    scope_type: "STORE",
    scope_ids: [4],
  },

  // id=8 — STORE_DIRECTOR (Васильев Д. О., SPAR-NSK-002)
  {
    id: 8,
    user_id: 8,
    functional_role: "STORE_DIRECTOR",
    scope_type: "STORE",
    scope_ids: [5],
  },

  // id=9 — STORE_DIRECTOR (Никитин Б. С., SPAR-KEM-001)
  {
    id: 9,
    user_id: 9,
    functional_role: "STORE_DIRECTOR",
    scope_type: "STORE",
    scope_ids: [6],
  },

  // id=10 — STORE_DIRECTOR (Смирнова О. И., FC-TOM-001)
  {
    id: 10,
    user_id: 10,
    functional_role: "STORE_DIRECTOR",
    scope_type: "STORE",
    scope_ids: [7],
  },

  // id=11 — NETWORK_OPS (Никитина А. Н., org-fashion-alfa — владелец малого бизнеса)
  {
    id: 11,
    user_id: 11,
    functional_role: "NETWORK_OPS",
    scope_type: "ORGANIZATION",
    scope_ids: ["org-fashion-alfa"],
  },

  // id=12 — SUPERVISOR (Тарасова О. В., 3 магазина Food City)
  {
    id: 12,
    user_id: 12,
    functional_role: "SUPERVISOR",
    scope_type: "STORE_LIST",
    scope_ids: [7, 8, 9],
  },

  // id=13 — HR_MANAGER (Морозова Е. С., org-spar)
  {
    id: 13,
    user_id: 13,
    functional_role: "HR_MANAGER",
    scope_type: "ORGANIZATION",
    scope_ids: ["org-spar"],
  },

  // id=14 — OPERATOR (Кузнецов Н. П., org-spar)
  {
    id: 14,
    user_id: 14,
    functional_role: "OPERATOR",
    scope_type: "ORGANIZATION",
    scope_ids: ["org-spar"],
  },

  // ── Extras (id 35-104) ───────────────────────────────────────
  { id: 15, user_id: 35, functional_role: "WORKER", scope_type: "STORE", scope_ids: [8] },
  { id: 16, user_id: 36, functional_role: "WORKER", scope_type: "STORE", scope_ids: [18] },
  { id: 17, user_id: 37, functional_role: "WORKER", scope_type: "STORE", scope_ids: [15] },
  { id: 18, user_id: 38, functional_role: "WORKER", scope_type: "STORE", scope_ids: [2] },
  { id: 19, user_id: 39, functional_role: "WORKER", scope_type: "STORE", scope_ids: [7] },
  { id: 20, user_id: 40, functional_role: "WORKER", scope_type: "STORE", scope_ids: [14] },
  { id: 21, user_id: 41, functional_role: "WORKER", scope_type: "STORE", scope_ids: [6] },
  { id: 22, user_id: 42, functional_role: "WORKER", scope_type: "STORE", scope_ids: [12] },
  { id: 23, user_id: 43, functional_role: "WORKER", scope_type: "STORE", scope_ids: [7] },
  { id: 24, user_id: 44, functional_role: "WORKER", scope_type: "STORE", scope_ids: [15] },
  { id: 25, user_id: 45, functional_role: "WORKER", scope_type: "STORE", scope_ids: [6] },
  { id: 26, user_id: 46, functional_role: "WORKER", scope_type: "STORE", scope_ids: [4] },
  { id: 27, user_id: 47, functional_role: "WORKER", scope_type: "STORE", scope_ids: [18] },
  { id: 28, user_id: 48, functional_role: "WORKER", scope_type: "STORE", scope_ids: [6] },
  { id: 29, user_id: 49, functional_role: "WORKER", scope_type: "STORE", scope_ids: [2] },
  { id: 30, user_id: 50, functional_role: "WORKER", scope_type: "STORE", scope_ids: [17] },
  { id: 31, user_id: 51, functional_role: "WORKER", scope_type: "STORE", scope_ids: [14] },
  { id: 32, user_id: 52, functional_role: "WORKER", scope_type: "STORE", scope_ids: [8] },
  { id: 33, user_id: 53, functional_role: "WORKER", scope_type: "STORE", scope_ids: [18] },
  { id: 34, user_id: 54, functional_role: "WORKER", scope_type: "STORE", scope_ids: [8] },
  { id: 35, user_id: 55, functional_role: "WORKER", scope_type: "STORE", scope_ids: [4] },
  { id: 36, user_id: 56, functional_role: "WORKER", scope_type: "STORE", scope_ids: [6] },
  { id: 37, user_id: 57, functional_role: "WORKER", scope_type: "STORE", scope_ids: [1] },
  { id: 38, user_id: 58, functional_role: "WORKER", scope_type: "STORE", scope_ids: [15] },
  { id: 39, user_id: 59, functional_role: "WORKER", scope_type: "STORE", scope_ids: [5] },
  { id: 40, user_id: 60, functional_role: "WORKER", scope_type: "STORE", scope_ids: [2] },
  { id: 41, user_id: 61, functional_role: "WORKER", scope_type: "STORE", scope_ids: [2] },
  { id: 42, user_id: 62, functional_role: "WORKER", scope_type: "STORE", scope_ids: [7] },
  { id: 43, user_id: 63, functional_role: "WORKER", scope_type: "STORE", scope_ids: [11] },
  { id: 44, user_id: 64, functional_role: "WORKER", scope_type: "STORE", scope_ids: [8] },
  { id: 45, user_id: 65, functional_role: "WORKER", scope_type: "STORE", scope_ids: [15] },
  { id: 46, user_id: 66, functional_role: "WORKER", scope_type: "STORE", scope_ids: [7] },
  { id: 47, user_id: 67, functional_role: "WORKER", scope_type: "STORE", scope_ids: [7] },
  { id: 48, user_id: 68, functional_role: "WORKER", scope_type: "STORE", scope_ids: [17] },
  { id: 49, user_id: 69, functional_role: "WORKER", scope_type: "STORE", scope_ids: [10] },
  { id: 50, user_id: 70, functional_role: "WORKER", scope_type: "STORE", scope_ids: [5] },
  { id: 51, user_id: 71, functional_role: "WORKER", scope_type: "STORE", scope_ids: [5] },
  { id: 52, user_id: 72, functional_role: "WORKER", scope_type: "STORE", scope_ids: [7] },
  { id: 53, user_id: 73, functional_role: "WORKER", scope_type: "STORE", scope_ids: [10] },
  { id: 54, user_id: 74, functional_role: "WORKER", scope_type: "STORE", scope_ids: [17] },
  { id: 55, user_id: 75, functional_role: "WORKER", scope_type: "STORE", scope_ids: [1] },
  { id: 56, user_id: 76, functional_role: "WORKER", scope_type: "STORE", scope_ids: [10] },
  { id: 57, user_id: 77, functional_role: "WORKER", scope_type: "STORE", scope_ids: [17] },
  { id: 58, user_id: 78, functional_role: "WORKER", scope_type: "STORE", scope_ids: [5] },
  { id: 59, user_id: 79, functional_role: "WORKER", scope_type: "STORE", scope_ids: [11] },
  { id: 60, user_id: 80, functional_role: "WORKER", scope_type: "STORE", scope_ids: [4] },
  { id: 61, user_id: 81, functional_role: "WORKER", scope_type: "STORE", scope_ids: [10] },
  { id: 62, user_id: 82, functional_role: "WORKER", scope_type: "STORE", scope_ids: [14] },
  { id: 63, user_id: 83, functional_role: "WORKER", scope_type: "STORE", scope_ids: [11] },
  { id: 64, user_id: 84, functional_role: "WORKER", scope_type: "STORE", scope_ids: [16] },
  { id: 65, user_id: 85, functional_role: "WORKER", scope_type: "STORE", scope_ids: [11] },
  { id: 66, user_id: 86, functional_role: "WORKER", scope_type: "STORE", scope_ids: [14] },
  { id: 67, user_id: 87, functional_role: "WORKER", scope_type: "STORE", scope_ids: [12] },
  { id: 68, user_id: 88, functional_role: "WORKER", scope_type: "STORE", scope_ids: [18] },
  { id: 69, user_id: 89, functional_role: "WORKER", scope_type: "STORE", scope_ids: [12] },
  { id: 70, user_id: 90, functional_role: "WORKER", scope_type: "STORE", scope_ids: [12] },
  { id: 71, user_id: 91, functional_role: "WORKER", scope_type: "STORE", scope_ids: [1] },
  { id: 72, user_id: 92, functional_role: "WORKER", scope_type: "STORE", scope_ids: [4] },
  { id: 73, user_id: 93, functional_role: "WORKER", scope_type: "STORE", scope_ids: [1] },
  { id: 74, user_id: 94, functional_role: "WORKER", scope_type: "STORE", scope_ids: [16] },
  { id: 75, user_id: 95, functional_role: "WORKER", scope_type: "STORE", scope_ids: [13] },
  { id: 76, user_id: 96, functional_role: "WORKER", scope_type: "STORE", scope_ids: [13] },
  { id: 77, user_id: 97, functional_role: "WORKER", scope_type: "STORE", scope_ids: [1] },
  { id: 78, user_id: 98, functional_role: "WORKER", scope_type: "STORE", scope_ids: [3] },
  { id: 79, user_id: 99, functional_role: "WORKER", scope_type: "STORE", scope_ids: [3] },
  { id: 80, user_id: 100, functional_role: "WORKER", scope_type: "STORE", scope_ids: [13] },
  { id: 81, user_id: 101, functional_role: "WORKER", scope_type: "STORE", scope_ids: [3] },
  { id: 82, user_id: 102, functional_role: "WORKER", scope_type: "STORE", scope_ids: [1] },
  { id: 83, user_id: 103, functional_role: "WORKER", scope_type: "STORE", scope_ids: [13] },
  { id: 84, user_id: 104, functional_role: "WORKER", scope_type: "STORE", scope_ids: [3] },
];
