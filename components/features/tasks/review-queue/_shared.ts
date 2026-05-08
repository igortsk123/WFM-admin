import type { useTranslations } from "next-intl"

import type { TaskWithAvatar } from "@/lib/api/tasks"
import { formatRelative } from "@/lib/utils/format"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type SortOption = "oldest" | "newest" | "duration"

export const PAGE_SIZE = 20

export type TFn = ReturnType<typeof useTranslations>

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

export function getInitials(name: string): string {
  const parts = name.trim().split(" ")
  if (parts.length >= 2) return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase()
  return name.charAt(0).toUpperCase()
}

export function fmtWaitTime(iso: string, t: TFn): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 60) return t("waiting_time", { min: mins })
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return t("waiting_time_long", { h, min: m })
}

export function fmtRelative(iso: string, locale: string): string {
  return formatRelative(new Date(iso), locale === "en" ? "en" : "ru")
}

export function fmtMin(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h === 0) return `${m} мин`
  if (m === 0) return `${h} ч`
  return `${h} ч ${m} мин`
}

export function calcActualMin(task: TaskWithAvatar): number | null {
  if (!task.history_brief) return null
  return task.history_brief.work_intervals.reduce((acc, iv) => {
    return acc + Math.floor((new Date(iv.to).getTime() - new Date(iv.from).getTime()) / 60000)
  }, 0)
}

export function getDeviationClass(planned: number, actual: number): string {
  const pct = ((actual - planned) / planned) * 100
  if (pct <= 0) return "text-success"
  if (pct <= 20) return "text-warning"
  return "text-destructive"
}
