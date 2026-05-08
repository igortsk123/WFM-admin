import { format, formatDistanceToNow, parseISO, isToday, isTomorrow, isPast } from "date-fns"
import { ru, enUS } from "date-fns/locale"

import type { ApplicationStatus } from "@/lib/types"
import { DEMO_TOP_STORES } from "@/lib/api/_demo-stores"

// ─────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────

export const STORE_OPTIONS = DEMO_TOP_STORES.map((s) => ({ id: String(s.id), name: s.name }))

export const WORK_TYPE_OPTIONS = [
  { id: "2", name: "Касса" },
  { id: "4", name: "Выкладка" },
  { id: "5", name: "Переоценка" },
  { id: "6", name: "Инвентаризация" },
  { id: "12", name: "Уборка" },
  { id: "13", name: "Складские работы" },
]

/** Tab → ApplicationStatus mapping; "archive" means CANCELLED + REPLACED_WITH_BONUS archive */
export const TAB_STATUS_MAP: Record<string, ApplicationStatus[]> = {
  pending: ["PENDING", "DRAFT"],
  approved: ["APPROVED_FULL", "APPROVED_PARTIAL"],
  rejected: ["REJECTED"],
  bonus: ["REPLACED_WITH_BONUS"],
  archive: ["CANCELLED", "MIXED"],
}

export const TAB_LABELS: Record<string, string> = {
  pending: "На согласовании",
  approved: "Согласованы",
  rejected: "Отклонены",
  bonus: "Заменены бонусом",
  archive: "Архив",
}

export const SOURCE_OPTIONS = [
  { value: "INTERNAL", label: "Внутренние" },
  { value: "EXTERNAL", label: "Внешние" },
]

// ─────────────────────────────────────────────────────────────────
// DATE HELPERS
// ─────────────────────────────────────────────────────────────────

export function formatPlannedDate(dateStr: string, locale: string): string {
  try {
    const d = parseISO(dateStr)
    if (isToday(d)) return locale === "ru" ? "Сегодня" : "Today"
    if (isTomorrow(d)) return locale === "ru" ? "Завтра" : "Tomorrow"
    return format(d, "d MMM", { locale: locale === "ru" ? ru : enUS })
  } catch {
    return dateStr
  }
}

export function isUrgentDate(dateStr: string): boolean {
  try {
    const d = parseISO(dateStr)
    return isToday(d) || (isPast(d) === false && d.getTime() - Date.now() < 48 * 60 * 60 * 1000)
  } catch {
    return false
  }
}

export function formatRelativeTime(isoStr: string, locale: string): string {
  try {
    return formatDistanceToNow(parseISO(isoStr), {
      addSuffix: true,
      locale: locale === "ru" ? ru : enUS,
    })
  } catch {
    return isoStr
  }
}

// ─────────────────────────────────────────────────────────────────
// DATE STRING ↔ DATE ADAPTER (URL state stores ISO date strings;
// shared DateRangePicker uses Date | undefined)
// ─────────────────────────────────────────────────────────────────

export function parseIsoDate(s: string | null | undefined): Date | undefined {
  if (!s) return undefined
  const d = new Date(s)
  return isNaN(d.getTime()) ? undefined : d
}

export function toIsoDate(d: Date | undefined): string {
  if (!d) return ""
  // YYYY-MM-DD slice (matches existing nuqs URL state format)
  return d.toISOString().slice(0, 10)
}
