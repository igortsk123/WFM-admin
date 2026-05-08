import type { useTranslations } from "next-intl"

export function getInitials(firstName: string, lastName: string): string {
  return `${lastName.charAt(0)}${firstName.charAt(0)}`.toUpperCase()
}

export function getFullName(firstName: string, lastName: string, middleName?: string): string {
  const parts = [lastName, firstName]
  if (middleName) parts.push(middleName)
  return parts.join(" ")
}

/**
 * Форматирует минуты в человеко-читаемое «1 ч 15 мин».
 * Никаких дробей — точность до минуты.
 * Через i18n keys hm.zero / h_only / m_only / h_m чтобы локаль управлялась
 * центрально (ru: «ч/мин», en: «h/min»).
 */
export function formatHM(min: number, t: ReturnType<typeof useTranslations>): string {
  const safeMin = Math.max(0, Math.round(min))
  const h = Math.floor(safeMin / 60)
  const m = safeMin % 60
  if (h === 0 && m === 0) return t("hm.zero")
  if (m === 0) return t("hm.h_only", { h })
  if (h === 0) return t("hm.m_only", { m })
  return t("hm.h_m", { h, m })
}

export function getUtilizationColor(pct: number): string {
  if (pct < 80) return "bg-success"
  if (pct < 95) return "bg-warning"
  return "bg-destructive"
}

export function getUtilizationTextColor(pct: number): string {
  if (pct < 80) return "text-success"
  if (pct < 95) return "text-warning"
  return "text-destructive"
}

export function formatShiftTime(isoStart: string, isoEnd: string): string {
  const start = new Date(isoStart)
  const end = new Date(isoEnd)
  const fmt = (d: Date) => d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
  return `${fmt(start)}–${fmt(end)}`
}
