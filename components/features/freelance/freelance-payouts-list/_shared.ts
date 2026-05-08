import type { Payout, Service } from "@/lib/types";

// ───────────────────────────────────────────────────────────────────
// TYPES
// ───────────────────────────────────────────────────────────────────

export type TabStatus = "PENDING" | "PROCESSING" | "PAID" | "FAILED";

export interface Filters {
  freelancerId: string;
  agentId: string;
  dateFrom: string;
  dateTo: string;
  store: string;
}

export interface DetailedPayout extends Payout {
  services_data?: Service[];
}

export type NominalAccountStatus = "CONNECTED" | "NOT_CONNECTED" | "ERROR";

export interface NominalAccountState {
  status: NominalAccountStatus;
  last_error?: string;
}

export const MOCK_NOMINAL_ACCOUNT: NominalAccountState = {
  status: "CONNECTED",
};

export const EMPTY_FILTERS: Filters = {
  freelancerId: "",
  agentId: "",
  dateFrom: "",
  dateTo: "",
  store: "",
};

// ───────────────────────────────────────────────────────────────────
// HELPERS
// ───────────────────────────────────────────────────────────────────

export const formatCurrency = (n: number) =>
  new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(n) + " ₽";

export const formatDate = (dateStr: string) =>
  new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(dateStr));

export const formatShortDate = (dateStr: string) =>
  new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" }).format(
    new Date(dateStr)
  );

// Derive freelancer pseudo-object for UserCell
export function freelancerToUser(name: string) {
  const parts = name.trim().split(" ");
  return {
    last_name: parts[0] ?? "",
    first_name: parts[1] ?? "",
    middle_name: parts[2],
  };
}
