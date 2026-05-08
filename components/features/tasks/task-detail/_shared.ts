import { useState, useEffect } from "react"
import { formatRelative } from "@/lib/utils/format"

// ──────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────

export type TabKey = "description" | "report" | "subtasks" | "history"

// ──────────────────────────────────────────────────────────────────
// Formatters
// ──────────────────────────────────────────────────────────────────

export function fmtMin(min: number, _locale: string): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h === 0) return `${m} мин`
  if (m === 0) return `${h} ч`
  return `${h} ч ${m} мин`
}

export function fmtDate(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "ru-RU", {
    day: "numeric", month: "short", year: "numeric",
  }).format(new Date(iso))
}

export function fmtTime(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "ru-RU", {
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(iso))
}

export function fmtRelative(iso: string, locale: string): string {
  return formatRelative(new Date(iso), locale === "en" ? "en" : "ru")
}

export function getDeviationClass(planned: number, actual: number) {
  const pct = ((actual - planned) / planned) * 100
  if (pct <= 0) return "text-success"
  if (pct <= 20) return "text-warning"
  return "text-destructive"
}

// ──────────────────────────────────────────────────────────────────
// Map event_type to colour dot
// ──────────────────────────────────────────────────────────────────
export const EVENT_DOT: Record<string, string> = {
  START: "bg-info",
  COMPLETE: "bg-success",
  SEND_TO_REVIEW: "bg-info",
  AUTO_ACCEPT: "bg-success",
  ACCEPT: "bg-success",
  REJECT: "bg-destructive",
  PAUSE: "bg-warning",
  RESUME: "bg-info",
  TRANSFER: "bg-info",
  ARCHIVE: "bg-destructive",
  RESTORE: "bg-success",
}

// ──────────────────────────────────────────────────────────────────
// useElapsed — running counter for IN_PROGRESS tasks
// ──────────────────────────────────────────────────────────────────
export function useElapsed(openedAt?: string, state?: string) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (state !== "IN_PROGRESS" || !openedAt) return
    const tick = () => setElapsed(Math.floor((Date.now() - new Date(openedAt).getTime()) / 60000))
    tick()
    const id = setInterval(tick, 30000)
    return () => clearInterval(id)
  }, [openedAt, state])
  return elapsed
}
