// ═══════════════════════════════════════════════════════════════════
// Shared types & helpers for subtasks-moderation split
// ═══════════════════════════════════════════════════════════════════

export interface ComboOption {
  value: string
  label: string
}

export function relativeTime(isoDate: string, locale: string): string {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" })
  const diff = new Date(isoDate).getTime() - Date.now()
  const absDiff = Math.abs(diff)
  if (absDiff < 60 * 1000) return rtf.format(Math.round(diff / 1000), "second")
  if (absDiff < 60 * 60 * 1000) return rtf.format(Math.round(diff / 60000), "minute")
  if (absDiff < 24 * 60 * 60 * 1000) return rtf.format(Math.round(diff / 3600000), "hour")
  return rtf.format(Math.round(diff / 86400000), "day")
}

export function getInitials(firstName?: string, lastName?: string): string {
  const f = firstName?.[0] ?? ""
  const l = lastName?.[0] ?? ""
  return `${f}${l}`.toUpperCase() || "?"
}
