import type { Permission, FunctionalRole } from "@/lib/types";
import type { UserWithAssignment } from "@/lib/api/users";

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

export const PERMISSIONS_4: Permission[] = [
  "CASHIER",
  "SALES_FLOOR",
  "SELF_CHECKOUT",
  "WAREHOUSE",
];

export const ALL_PERMISSIONS: Permission[] = [
  "CASHIER",
  "SALES_FLOOR",
  "SELF_CHECKOUT",
  "WAREHOUSE",
  "PRODUCTION_LINE",
];

export const MANAGER_ROLES: FunctionalRole[] = [
  "STORE_DIRECTOR",
  "SUPERVISOR",
  "REGIONAL",
  "NETWORK_OPS",
  "HR_MANAGER",
  "OPERATOR",
  "PLATFORM_ADMIN",
];

export const PAGE_SIZE = 15;

// ─── TYPES ───────────────────────────────────────────────────────────────────

export interface RowState {
  permissions: Permission[];
}

export interface RevokeTarget {
  userId: number;
  userName: string;
  permission: Permission;
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

export function isManagerUser(u: UserWithAssignment): boolean {
  return (
    u.functional_role !== undefined &&
    MANAGER_ROLES.includes(u.functional_role)
  );
}
