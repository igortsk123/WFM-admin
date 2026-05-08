import type { ArchiveReason } from "@/lib/types"
import type { StoreHistoryEvent } from "@/lib/api"
import type { ActivityItem } from "@/components/shared/activity-feed"

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

export const WEEK_LABELS_RU = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]

export const HISTORY_TYPE_LABELS: Record<StoreHistoryEvent["type"], string> = {
  CREATED: "Создан",
  UPDATED: "Обновлён",
  MANAGER_CHANGED: "Смена управляющего",
  SUPERVISOR_CHANGED: "Смена супервайзера",
  ZONE_ADDED: "Зона добавлена",
  ZONE_REMOVED: "Зона удалена",
  LAMA_SYNC: "LAMA-синхронизация",
  ARCHIVED: "Архивирован",
  RESTORED: "Восстановлен",
}

export const ARCHIVE_REASONS: { value: ArchiveReason; labelKey: string }[] = [
  { value: "CLOSED", labelKey: "archive_reason_closed" },
  { value: "DUPLICATE", labelKey: "archive_reason_duplicate" },
  { value: "WRONG_DATA", labelKey: "archive_reason_wrong_data" },
  { value: "OBSOLETE", labelKey: "archive_reason_obsolete" },
  { value: "OTHER", labelKey: "archive_reason_other" },
]

export interface DemoTeamMember {
  id: number
  first_name: string
  last_name: string
  position: string
  phone: string
  active: boolean
}

// Demo team members (scoped to store 1)
export const DEMO_TEAM_MEMBERS: DemoTeamMember[] = [
  { id: 5, first_name: "Александр", last_name: "Иванов", position: "Директор магазина", phone: "+7 (913) 501-11-01", active: true },
  { id: 12, first_name: "Дмитрий", last_name: "Кузнецов", position: "Работник", phone: "+7 (913) 512-22-02", active: true },
  { id: 13, first_name: "Ольга", last_name: "Лебедева", position: "Работник", phone: "+7 (913) 513-33-03", active: false },
  { id: 14, first_name: "Евгений", last_name: "Морозов", position: "Оператор", phone: "+7 (913) 514-44-04", active: true },
  { id: 15, first_name: "Наталья", last_name: "Новикова", position: "Работник", phone: "+7 (913) 515-55-05", active: false },
]

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

export function formatRelative(dateStr: string | undefined, locale: string): string {
  if (!dateStr) return "—"
  const d = new Date(dateStr)
  const diffMs = Date.now() - d.getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  const diffH = Math.floor(diffMin / 60)
  const diffD = Math.floor(diffH / 24)
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" })
  if (diffMin < 1) return rtf.format(0, "minute")
  if (diffMin < 60) return rtf.format(-diffMin, "minute")
  if (diffH < 24) return rtf.format(-diffH, "hour")
  if (diffD < 7) return rtf.format(-diffD, "day")
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(d)
}

export function getInitials(first: string, last: string): string {
  return `${last.charAt(0)}${first.charAt(0)}`.toUpperCase()
}

export function buildWeekActivity(storeId: number) {
  const seed = storeId * 7
  return WEEK_LABELS_RU.map((label, i) => ({
    label,
    plan: 25 + ((seed + i * 3) % 20),
    fact: 15 + ((seed + i * 5) % 22),
  }))
}

export function buildActivityFeedItems(): ActivityItem[] {
  const now = Date.now()
  const ago = (h: number) => new Date(now - h * 3600_000).toISOString()
  return [
    { id: "af1", timestamp: ago(0.5), actor: "Иванов А. С.", action: "завершил задачу «Выкладка молочки»", type: "TASK_COMPLETED" },
    { id: "af2", timestamp: ago(1.2), actor: "Система", action: "синхронизировала расписание LAMA", type: "SYSTEM" },
    { id: "af3", timestamp: ago(2), actor: "Соколова А. В.", action: "добавила зону «Кофейная»", type: "EMPLOYEE" },
    { id: "af4", timestamp: ago(4), actor: "Иванов А. С.", action: "создал задачу «Инвентаризация склада»", type: "TASK_CREATED" },
    { id: "af5", timestamp: ago(6), actor: "Петров И. Н.", action: "заблокировал задачу «Приёмка товара»", type: "TASK_BLOCKED" },
    { id: "af6", timestamp: ago(22), actor: "Соколова А. В.", action: "обновила контакты магазина", type: "EMPLOYEE" },
    { id: "af7", timestamp: ago(25), actor: "ИИ", action: "предложил оптимизацию зон кассы", type: "AI" },
    { id: "af8", timestamp: ago(48), actor: "Иванов А. С.", action: "архивировал задачу «Декор витрины»", type: "TASK_ARCHIVED" },
  ]
}

export function getLamaColor(lastSyncedAt: string | undefined): string {
  const hoursAgo = lastSyncedAt
    ? Math.floor((Date.now() - new Date(lastSyncedAt).getTime()) / 3_600_000)
    : null
  return hoursAgo === null
    ? "text-muted-foreground"
    : hoursAgo < 2
      ? "text-success"
      : hoursAgo < 24
        ? "text-warning"
        : "text-destructive"
}
