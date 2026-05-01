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
];
