import type { FunctionalRole } from "@/lib/types";

// ═══════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════

export const FUNCTIONAL_ROLES: FunctionalRole[] = [
  "STORE_DIRECTOR",
  "SUPERVISOR",
  "REGIONAL",
  "NETWORK_OPS",
  "HR_MANAGER",
  "OPERATOR",
  "WORKER",
];

// ═══════════════════════════════════════════════════════════════════
// FORM STATE
// ═══════════════════════════════════════════════════════════════════

export interface PositionFormState {
  code: string;
  name: string;
  description: string;
  role_id: "1" | "2";
  functional_role_default: string;
  default_rank: string;
  is_active: boolean;
}

export const DEFAULT_FORM: PositionFormState = {
  code: "",
  name: "",
  description: "",
  role_id: "1",
  functional_role_default: "",
  default_rank: "1",
  is_active: true,
};

// ═══════════════════════════════════════════════════════════════════
// TRANSLATION HELPER TYPE
// ═══════════════════════════════════════════════════════════════════

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TFn = (key: string, values?: Record<string, any>) => string;

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

export function functionalRoleTKey(role: FunctionalRole): string {
  switch (role) {
    case "STORE_DIRECTOR":
      return "store_director";
    case "SUPERVISOR":
      return "supervisor";
    case "REGIONAL":
      return "regional";
    case "NETWORK_OPS":
      return "network_ops";
    case "HR_MANAGER":
      return "hr_manager";
    case "OPERATOR":
      return "operator";
    case "WORKER":
    default:
      return "worker";
  }
}
