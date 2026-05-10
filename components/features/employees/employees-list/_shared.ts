import type {
  Permission,
  FunctionalRole,
  FreelancerStatus,
} from "@/lib/types"
import { DEMO_TOP_STORES } from "@/lib/api/_demo-stores"

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

export const ALL_PERMISSIONS: Permission[] = [
  "CASHIER",
  "SALES_FLOOR",
  "SELF_CHECKOUT",
  "WAREHOUSE",
  "PRODUCTION_LINE",
]

export const ALL_ROLES: FunctionalRole[] = [
  "WORKER",
  "STORE_DIRECTOR",
  "SUPERVISOR",
  "REGIONAL",
  "NETWORK_OPS",
  "HR_MANAGER",
  "OPERATOR",
]

export const STORE_OPTIONS = DEMO_TOP_STORES

export const POSITION_OPTIONS = [
  { id: 1, name: "Универсал" },
  { id: 2, name: "Кассир" },
  { id: 3, name: "Старший кассир" },
  { id: 4, name: "Продавец-консультант" },
  { id: 5, name: "Кладовщик" },
  { id: 6, name: "Мерчендайзер" },
  { id: 7, name: "Директор магазина" },
  { id: 8, name: "Супервайзер" },
]

export const ALL_FREELANCER_STATUSES: FreelancerStatus[] = [
  "NEW",
  "VERIFICATION",
  "ACTIVE",
  "BLOCKED",
  "ARCHIVED",
]

/** Statuses that block task assignment */
export const INACTIVE_FREELANCER_STATUSES: FreelancerStatus[] = [
  "NEW",
  "VERIFICATION",
  "BLOCKED",
]

// ─── HELPERS ─────────────────────────────────────────────────────────────────

export function formatHiredAt(
  isoDate: string | undefined,
  locale: string
): string {
  if (!isoDate) return "—"
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(isoDate))
}

export function formatShiftTime(timeStr: string | undefined): string {
  if (!timeStr) return ""
  // Extract HH:mm from ISO datetime "2026-05-01T09:00:00"
  return timeStr.substring(11, 16)
}
