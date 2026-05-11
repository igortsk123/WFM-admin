import type {
  Permission,
  FunctionalRole,
  FreelancerStatus,
  ObjectFormat,
} from "@/lib/types"
import { DEMO_TOP_STORES } from "@/lib/api/_demo-stores"
import { LAMA_EMPLOYEE_ZONES } from "@/lib/mock-data/_lama-employee-zones"
import { ALL_LAMA_WORK_TYPES } from "@/lib/api/users"

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

/**
 * Форматы объектов для фильтра «Формат» в employees-list. Включаем только
 * STORE-форматы (для опер.директора / супервайзера актуальны магазины);
 * SEWING_WORKSHOP / WAREHOUSE_HUB / OFFICE / PRODUCTION_LINE редко
 * используются в этом срезе и засоряют список.
 */
export const EMPLOYEE_OBJECT_FORMATS: ObjectFormat[] = [
  "HYPERMARKET",
  "SUPERMARKET",
  "CONVENIENCE",
  "SMALL_SHOP",
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

/**
 * Все уникальные zone names, встретившиеся в LAMA-истории сотрудников.
 * Используется в filter «Зона» — точно зеркалит реальные значения колонки zones,
 * без фейковых вариантов.
 */
export const ALL_LAMA_ZONES: string[] = Array.from(
  new Set(Object.values(LAMA_EMPLOYEE_ZONES).flat()),
).sort((a, b) => a.localeCompare(b, "ru"))

/**
 * 7 типов работ для фильтра «Типы работ» — те же что и в LAMA work-types словаре.
 */
export const ALL_WORK_TYPES: readonly string[] = ALL_LAMA_WORK_TYPES

/**
 * Сокращения для отображения work-type'ов в узкой таблице.
 * Используется и в desktop columns, и в mobile card.
 */
export const WORK_TYPE_SHORT_LABELS: Record<string, string> = {
  "Менеджерские операции": "Менедж.",
  "Касса самообслуживания": "КСО",
  "Инвентаризация": "Инвент.",
  "Переоценка": "Переоц.",
  "Выкладка": "Выкл.",
  "Другие работы": "Другие",
}

export function shortenWorkType(wt: string): string {
  return WORK_TYPE_SHORT_LABELS[wt] ?? wt
}

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
