import type { Permission } from "@/lib/types"
import type { UserDetail } from "@/lib/api/users"

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

export const ALL_PERMISSIONS: Permission[] = [
  "CASHIER",
  "SALES_FLOOR",
  "SELF_CHECKOUT",
  "WAREHOUSE",
  "PRODUCTION_LINE",
]

export const PERM_DESCS: Record<Permission, string> = {
  CASHIER: "Работа на кассе и обслуживание покупателей",
  SALES_FLOOR: "Работа в торговом зале, выкладка товаров",
  SELF_CHECKOUT: "Обслуживание зоны самообслуживания",
  WAREHOUSE: "Работа на складе, приёмка и выдача товаров",
  PRODUCTION_LINE: "Работа на производственной линии",
}

export const PERM_KEY_MAP: Record<Permission, string> = {
  CASHIER: "cashier",
  SALES_FLOOR: "sales_floor",
  SELF_CHECKOUT: "self_checkout",
  WAREHOUSE: "warehouse",
  PRODUCTION_LINE: "production_line",
}

export const SERVICE_STATUS_CLASS: Record<string, string> = {
  PLANNED: "bg-muted text-muted-foreground",
  IN_PROGRESS: "bg-info/10 text-info",
  COMPLETED: "bg-warning/10 text-warning",
  CONFIRMED: "bg-success/10 text-success",
  READY_TO_PAY: "bg-success/10 text-success",
  PAID: "bg-success/10 text-success",
  NO_SHOW: "bg-destructive/10 text-destructive",
  DISPUTED: "bg-destructive/10 text-destructive",
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

export function formatFullName(user: UserDetail) {
  return [user.last_name, user.first_name, user.middle_name].filter(Boolean).join(" ")
}

export function formatShortName(user: UserDetail) {
  const i = user.first_name[0] ? `${user.first_name[0]}.` : ""
  const m = user.middle_name?.[0] ? `${user.middle_name[0]}.` : ""
  return `${user.last_name} ${i}${m}`.trim()
}

export function getInitials(user: UserDetail) {
  return `${user.last_name[0] ?? ""}${user.first_name[0] ?? ""}`.toUpperCase()
}

export function formatDate(iso: string | undefined | null, locale: string): string {
  if (!iso) return "—"
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso))
}

export function formatTime(iso: string | undefined | null, locale: string): string {
  if (!iso) return "—"
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso))
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type LoadState = "loading" | "loaded" | "not_found" | "forbidden" | "error"

export type FormatDate = (iso: string | undefined | null, locale: string) => string
export type FormatTime = (iso: string | undefined | null, locale: string) => string
