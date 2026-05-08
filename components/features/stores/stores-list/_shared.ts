import type { ObjectFormat } from "@/lib/types"
import { formatDistanceToNow } from "date-fns"
import { ru } from "date-fns/locale"

// ─────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────

export const CITY_OPTIONS: { value: string; label: string }[] = [
  { value: "Томск", label: "Томск" },
  { value: "Новосибирск", label: "Новосибирск" },
  { value: "Кемерово", label: "Кемерово" },
]

export const FORMAT_OPTIONS: { value: ObjectFormat; label: string }[] = [
  { value: "SUPERMARKET", label: "Супермаркет" },
  { value: "HYPERMARKET", label: "Гипермаркет" },
  { value: "CONVENIENCE", label: "Магазин у дома" },
  { value: "SMALL_SHOP", label: "Малый формат" },
  { value: "SEWING_WORKSHOP", label: "Швейный цех" },
  { value: "PRODUCTION_LINE", label: "Производственная линия" },
  { value: "WAREHOUSE_HUB", label: "Склад/хаб" },
  { value: "OFFICE", label: "Офис" },
]

export const OBJECT_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "STORE", label: "Магазин" },
  { value: "WORKSHOP", label: "Цех" },
  { value: "DEPARTMENT", label: "Отдел" },
  { value: "OFFICE", label: "Офис" },
  { value: "WAREHOUSE_HUB", label: "Распред. центр" },
]

// Mock map pins for 6 locations (Tomsk region)
export interface MapPin {
  id: number
  label: string
  name: string
  top: string
  left: string
}

export const MAP_PINS: MapPin[] = [
  { id: 1, label: "SPAR-TOM-001", name: "СПАР Томск, пр. Ленина 80", top: "38%", left: "46%" },
  { id: 2, label: "SPAR-TOM-002", name: "СПАР Томск, ул. Красноармейская 99", top: "52%", left: "40%" },
  { id: 3, label: "SPAR-TOM-003", name: "СПАР Томск, пр. Фрунзе 92а", top: "60%", left: "55%" },
  { id: 4, label: "FC-TOM-001", name: "Food City Томск Global Market", top: "28%", left: "58%" },
  { id: 5, label: "FC-TOM-002", name: "Food City Томск, ул. Учебная 39", top: "68%", left: "34%" },
  { id: 6, label: "ALFA-TOM-001", name: "Магазин одежды Альфа", top: "43%", left: "30%" },
]

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────

export type LamaSyncLevel = "fresh" | "stale" | "critical" | "never"

export function formatLamaSync(isoDate: string | undefined): {
  label: string
  level: LamaSyncLevel
} {
  if (!isoDate) return { label: "Не синхронизировано", level: "never" }
  const synced = new Date(isoDate)
  const diffHours = (Date.now() - synced.getTime()) / (1000 * 60 * 60)
  const when = formatDistanceToNow(synced, { locale: ru, addSuffix: true })
  if (diffHours <= 6) return { label: when, level: "fresh" }
  if (diffHours <= 24) return { label: when, level: "stale" }
  return { label: when, level: "critical" }
}
