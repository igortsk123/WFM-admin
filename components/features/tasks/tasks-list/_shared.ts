import type { TaskState, TaskReviewState, ArchiveReason } from "@/lib/types"

// ──────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────

export type TabKey =
  | "all"
  | "active"
  | "on_review"
  | "completed"
  | "rejected"
  | "archive"

export const TAB_KEYS: TabKey[] = [
  "all",
  "active",
  "on_review",
  "completed",
  "rejected",
  "archive",
]

export const ARCHIVE_REASONS: ArchiveReason[] = [
  "CLOSED",
  "DUPLICATE",
  "WRONG_DATA",
  "OBSOLETE",
  "OTHER",
]

export const PAGE_SIZE = 25

// ──────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────

export function formatRelativeDate(dateStr: string, locale: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffH = Math.floor(diffMs / 3600000)
  const diffD = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return locale === "ru" ? "только что" : "just now"
  if (diffMin < 60) return locale === "ru" ? `${diffMin} мин назад` : `${diffMin}m ago`
  if (diffH < 24) return locale === "ru" ? `${diffH} ч назад` : `${diffH}h ago`
  if (diffD < 7) {
    const dateOpts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }
    return new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-GB", dateOpts).format(date)
  }
  return new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date)
}

export function tabToFilters(
  tab: TabKey,
): { state?: TaskState; review_state?: TaskReviewState; archived?: boolean } {
  switch (tab) {
    case "active":
      return { state: undefined, review_state: undefined, archived: false }
    case "on_review":
      return { review_state: "ON_REVIEW", archived: false }
    case "completed":
      return { state: "COMPLETED", archived: false }
    case "rejected":
      return { review_state: "REJECTED", archived: false }
    case "archive":
      return { archived: true }
    default:
      return { archived: false }
  }
}

export function stateToActiveFilter(tab: TabKey): { states: TaskState[] } {
  if (tab === "active") return { states: ["NEW", "IN_PROGRESS", "PAUSED"] }
  return { states: [] }
}
