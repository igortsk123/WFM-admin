import type { ShiftDetail as ShiftDetailData, ShiftHistoryEvent } from "@/lib/api/shifts";

// ─────────────────────────────────────────────────────────────────────────────
// Re-exports for convenience inside split
// ─────────────────────────────────────────────────────────────────────────────

export type { ShiftDetailData, ShiftHistoryEvent };

// ─────────────────────────────────────────────────────────────────────────────
// FORMATTERS
// ─────────────────────────────────────────────────────────────────────────────

export function formatTime(isoOrTime: string): string {
  if (!isoOrTime) return "—";
  // Handles full ISO strings like "2026-04-29T08:00:00+07:00"
  if (isoOrTime.includes("T")) {
    const d = new Date(isoOrTime);
    if (isNaN(d.getTime())) return "—";
    // Format in local (Tomsk) time — extract hours/minutes from ISO offset
    const match = isoOrTime.match(/T(\d{2}:\d{2})/);
    if (match) return match[1];
    return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", hour12: false });
  }
  // Plain "HH:MM" or "HH:MM:SS"
  return isoOrTime.slice(0, 5);
}

export function formatDate(isoDate: string, locale: string): string {
  if (!isoDate) return "—";
  const d = new Date(isoDate);
  return d.toLocaleDateString(locale === "en" ? "en-GB" : "ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function calcDurationMin(start: string, end: string): number {
  try {
    const ms = new Date(end).getTime() - new Date(start).getTime();
    return Math.max(0, Math.round(ms / 60000));
  } catch {
    return 0;
  }
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} мин`;
  if (m === 0) return `${h} ч`;
  return `${h} ч ${m} мин`;
}

export function shiftProgressPct(shift: ShiftDetailData): number {
  if (shift.status !== "OPENED" || !shift.actual_start) return 0;
  const start = new Date(shift.actual_start).getTime();
  const end = new Date(shift.planned_end).getTime();
  const now = Date.now();
  if (now >= end) return 100;
  const total = end - start;
  if (total <= 0) return 0;
  return Math.round(((now - start) / total) * 100);
}

export function getInitials(name: string): string {
  const parts = name.split(" ");
  return parts
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}
