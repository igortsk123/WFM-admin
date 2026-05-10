import type { ScheduleSlot } from "@/lib/api/shifts";

// ═══════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════

/**
 * Mock TODAY anchor. Aligned с LAMA snapshot date (2026-05-07) — это «сегодня»
 * для real LAMA-смен из `_lama-shifts.ts` (Пн 2026-05-04 — Вс 2026-05-10).
 * При swap на real backend эта константа уйдёт, view возьмёт `new Date()`.
 *
 * Используем local-noon чтобы избежать TZ-сдвига на день при разборе ISO.
 */
export const TODAY_STR = "2026-05-07";
export const TODAY = new Date(2026, 4 /* May */, 7, 12, 0, 0);

export const HOURS_RANGE = Array.from({ length: 15 }, (_, i) => i + 7); // 07:00–21:00

export const COL_MIN_WIDTH_PX = 80; // minimum column width before overflow badge kicks in
export const COL_OVERFLOW_MAX = 3; // max columns rendered before showing +N badge

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

export interface ComboboxOption {
  value: string;
  label: string;
}

export type ShiftVariant =
  | "new"
  | "opened"
  | "conflict"
  | "overtime"
  | "late"
  | "closed";

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

export function parseTime(isoStr: string): { h: number; m: number } {
  const d = new Date(isoStr);
  return { h: d.getHours(), m: d.getMinutes() };
}

export function timeToMinutes(h: number, m: number): number {
  return h * 60 + m;
}

export function formatHM(isoStr: string): string {
  const d = new Date(isoStr);
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

export function getInitials(name: string): string {
  const parts = name.trim().split(" ");
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function getShortName(name: string): string {
  const parts = name.trim().split(" ");
  if (parts.length >= 2) return `${parts[0]} ${parts[1][0]}.`;
  return name;
}

/** Sweep-line interval coloring: O(n log n).
 *  Assigns each slot a column index within its overlap group so no two
 *  overlapping slots share the same column. totalCols = max simultaneous
 *  overlap during the slot's lifetime. */
export function computeColumns(
  slots: ScheduleSlot[],
): Map<number, { col: number; totalCols: number }> {
  const result = new Map<number, { col: number; totalCols: number }>();
  if (slots.length === 0) return result;

  const getMinutes = (iso: string) => {
    const d = new Date(iso);
    return d.getHours() * 60 + d.getMinutes();
  };

  // Sort intervals by start time (stable)
  const intervals = slots
    .map((s) => ({
      id: s.id,
      start: getMinutes(s.planned_start),
      end: getMinutes(s.planned_end),
    }))
    .sort((a, b) => a.start - b.start || a.end - b.end);

  // Pass 1: assign cols via sweep with shrinking `active` list
  const colById = new Map<number, number>();
  type Active = { id: number; end: number; col: number };
  let active: Active[] = [];

  for (const curr of intervals) {
    // Remove intervals that ended before curr.start
    active = active.filter((a) => a.end > curr.start);
    // Smallest unused col among active
    const used = new Set(active.map((a) => a.col));
    let col = 0;
    while (used.has(col)) col++;
    colById.set(curr.id, col);
    active.push({ id: curr.id, end: curr.end, col });
  }

  // Pass 2: totalCols = max simultaneous overlap during each interval's
  // lifetime, computed via event-sweep (O(n log n) sort + O(n*k) updates).
  type Event = { time: number; type: 0 | 1; id: number }; // 0=end, 1=start
  const events: Event[] = [];
  for (const i of intervals) {
    events.push({ time: i.start, type: 1, id: i.id });
    events.push({ time: i.end, type: 0, id: i.id });
  }
  // Process ends BEFORE starts at same time (touching intervals don't overlap)
  events.sort((a, b) => a.time - b.time || a.type - b.type);

  const activeIds = new Set<number>();
  const maxOverlap = new Map<number, number>();

  for (const ev of events) {
    if (ev.type === 1) {
      activeIds.add(ev.id);
      const size = activeIds.size;
      // Bump max for all currently active intervals
      for (const aid of activeIds) {
        const prev = maxOverlap.get(aid) ?? 0;
        if (size > prev) maxOverlap.set(aid, size);
      }
    } else {
      activeIds.delete(ev.id);
    }
  }

  for (const i of intervals) {
    result.set(i.id, {
      col: colById.get(i.id) ?? 0,
      totalCols: maxOverlap.get(i.id) ?? 1,
    });
  }
  return result;
}

export function getSlotVariant(slot: ScheduleSlot): ShiftVariant {
  if (slot.has_conflict) return "conflict";
  if (slot.status === "NEW") return "new";
  if (slot.status === "OPENED") return "opened";
  if (slot.overtime_minutes && slot.overtime_minutes > 0) return "overtime";
  if (slot.late_minutes && slot.late_minutes > 0) return "late";
  return "closed";
}

export const SLOT_STYLES: Record<ShiftVariant, string> = {
  new: "bg-info/10 text-info border border-info/20",
  opened: "bg-success/10 text-success border border-success/20",
  conflict: "bg-destructive/10 text-destructive border border-destructive/20",
  overtime: "bg-warning/10 text-warning border border-warning/20",
  late: "bg-warning/10 text-warning border border-warning/20",
  closed: "bg-muted/60 text-muted-foreground border border-border",
};
