"use client";

import * as React from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  AlertTriangle,
  Sparkles,
  Calendar,
  Users,
  X,
} from "lucide-react";
import {
  format,
  addDays,
  addWeeks,
  addMonths,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
} from "date-fns";
import { ru, enUS } from "date-fns/locale";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AlertDialog } from "@/components/ui/alert-dialog";
import { Combobox } from "@/components/ui/combobox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import {
  PageHeader,
  FilterChip,
  EmptyState,
  MobileFilterSheet,
} from "@/components/shared";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

import {
  getSchedule,
  syncLamaShifts,
  reopenShift,
  forceCloseShift,
  type ScheduleView,
  type ScheduleSlot,
  type ScheduleResponse,
} from "@/lib/api/shifts";
import { getStores, getZones } from "@/lib/api";
import { ADMIN_ROUTES } from "@/lib/constants/routes";

// ═══════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════

const TODAY_STR = "2026-05-01"; // Mock TODAY
const TODAY = new Date(TODAY_STR);

interface ComboboxOption {
  value: string;
  label: string;
}

const ALL_STORES_OPTION: ComboboxOption = { value: "all", label: "Вся сеть" };

const HOURS_RANGE = Array.from({ length: 15 }, (_, i) => i + 7); // 07:00–21:00

const COL_MIN_WIDTH_PX = 80;  // minimum column width before overflow badge kicks in
const COL_OVERFLOW_MAX = 3;   // max columns rendered before showing +N badge

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

function parseTime(isoStr: string): { h: number; m: number } {
  const d = new Date(isoStr);
  return { h: d.getHours(), m: d.getMinutes() };
}

function timeToMinutes(h: number, m: number): number {
  return h * 60 + m;
}

function formatHM(isoStr: string): string {
  const d = new Date(isoStr);
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

function getInitials(name: string): string {
  const parts = name.trim().split(" ");
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function getShortName(name: string): string {
  const parts = name.trim().split(" ");
  if (parts.length >= 2) return `${parts[0]} ${parts[1][0]}.`;
  return name;
}

/** Sweep-line interval coloring: O(n log n).
 *  Assigns each slot a column index within its overlap group so no two
 *  overlapping slots share the same column. totalCols = max simultaneous
 *  overlap during the slot's lifetime. */
function computeColumns(
  slots: ScheduleSlot[]
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

type ShiftVariant = "new" | "opened" | "conflict" | "overtime" | "late" | "closed";

function getSlotVariant(slot: ScheduleSlot): ShiftVariant {
  if (slot.has_conflict) return "conflict";
  if (slot.status === "NEW") return "new";
  if (slot.status === "OPENED") return "opened";
  if (slot.overtime_minutes && slot.overtime_minutes > 0) return "overtime";
  if (slot.late_minutes && slot.late_minutes > 0) return "late";
  return "closed";
}

const SLOT_STYLES: Record<ShiftVariant, string> = {
  new: "bg-info/10 text-info border border-info/20",
  opened: "bg-success/10 text-success border border-success/20",
  conflict: "bg-destructive/10 text-destructive border border-destructive/20",
  overtime: "bg-warning/10 text-warning border border-warning/20",
  late: "bg-warning/10 text-warning border border-warning/20",
  closed: "bg-muted/60 text-muted-foreground border border-border",
};

// ═══════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════

interface ShiftBlockProps {
  slot: ScheduleSlot;
  onClick: (slot: ScheduleSlot) => void;
  onAction: (action: "reopen" | "force_close", slot: ScheduleSlot) => void;
  compact?: boolean;
}

function ShiftBlock({ slot, onClick, onAction, compact = false }: ShiftBlockProps) {
  const t = useTranslations("screen.schedule");
  const variant = getSlotVariant(slot);
  const styles = SLOT_STYLES[variant];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClick(slot);
          }}
          className={`w-full text-left rounded-md p-1.5 text-xs transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${styles}`}
          aria-label={`Shift ${slot.user_name} ${formatHM(slot.planned_start)}–${formatHM(slot.planned_end)}`}
        >
          <div className="flex items-center gap-1 font-medium truncate">
            {slot.status === "OPENED" && !slot.has_conflict && (
              <span
                aria-hidden="true"
                className="size-1.5 rounded-full bg-success shrink-0 animate-pulse"
              />
            )}
            {slot.has_conflict && (
              <AlertTriangle className="size-3 shrink-0" aria-hidden="true" />
            )}
            <span className="truncate">
              {formatHM(slot.planned_start)}–{formatHM(slot.planned_end)}
            </span>
          </div>
          {!compact && slot.zone_name && (
            <div className="truncate opacity-75 mt-0.5">{slot.zone_name}</div>
          )}
          {!compact && slot.late_minutes && slot.late_minutes > 0 ? (
            <div className="truncate opacity-75">
              {t("slot.late_hint", { minutes: slot.late_minutes })}
            </div>
          ) : null}
          {!compact && slot.overtime_minutes && slot.overtime_minutes > 30 ? (
            <div className="truncate opacity-75">
              {t("slot.overtime_hint", { minutes: slot.overtime_minutes })}
            </div>
          ) : null}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-56">
        {/* Header — info всегда */}
        <div className="px-2 py-1.5 text-xs">
          <div className="font-medium text-foreground">{slot.user_name}</div>
          <div className="text-muted-foreground">
            {formatHM(slot.planned_start)}–{formatHM(slot.planned_end)}
            {slot.zone_name ? ` · ${slot.zone_name}` : ""}
          </div>
          {slot.position_name && (
            <div className="text-muted-foreground">{slot.position_name}</div>
          )}
        </div>

        {/* Conflict explanation */}
        {slot.has_conflict && (
          <>
            <div className="my-1 h-px bg-border" />
            <div className="px-2 py-1.5 text-xs">
              <div className="flex items-center gap-1.5 font-medium text-destructive">
                <AlertTriangle className="size-3" />
                {t("slot.conflict_title")}
              </div>
              <div className="mt-0.5 text-muted-foreground">
                {t(`slot.conflict_reason.${slot.conflict_reason ?? "OTHER"}`)}
              </div>
            </div>
          </>
        )}

        {/* Status-specific actions */}
        {slot.status === "NEW" && (
          <>
            <div className="my-1 h-px bg-border" />
            <div className="px-2 py-1 text-xs text-muted-foreground italic">
              {t("slot.planned_hint")}
            </div>
          </>
        )}
        {slot.status === "CLOSED" && (
          <>
            <div className="my-1 h-px bg-border" />
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onAction("reopen", slot);
              }}
            >
              {t("slot.actions.reopen")}
            </DropdownMenuItem>
          </>
        )}
        {slot.status === "OPENED" && (
          <>
            <div className="my-1 h-px bg-border" />
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onAction("force_close", slot);
              }}
              className="text-destructive focus:text-destructive"
            >
              {t("slot.actions.force_close")}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ═══════════════════════════════════════════════════════════════════
// WEEK VIEW
// ═══════════════════════════════════════════════════════════════════

interface WeekViewProps {
  days: Date[];
  slots: ScheduleSlot[];
  onShiftClick: (slot: ScheduleSlot) => void;
  onShiftAction: (action: "reopen" | "force_close", slot: ScheduleSlot) => void;
}

function WeekView({ days, slots, onShiftClick, onShiftAction }: WeekViewProps) {
  const t = useTranslations("screen.schedule");
  const locale = useLocale();
  const dateFnsLocale = locale === "ru" ? ru : enUS;

  // Get unique employees
  const employeeMap = new Map<number, { user_id: number; user_name: string }>();
  slots.forEach((s) => {
    if (!employeeMap.has(s.user_id)) {
      employeeMap.set(s.user_id, { user_id: s.user_id, user_name: s.user_name });
    }
  });
  const employees = Array.from(employeeMap.values());

  if (employees.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title={t("empty.no_shifts_title")}
        description={t("empty.no_shifts_subtitle")}
      />
    );
  }

  const slotsByEmployeeAndDay = new Map<string, ScheduleSlot[]>();
  slots.forEach((s) => {
    const key = `${s.user_id}_${s.shift_date}`;
    if (!slotsByEmployeeAndDay.has(key)) slotsByEmployeeAndDay.set(key, []);
    slotsByEmployeeAndDay.get(key)!.push(s);
  });

  return (
    <div className="w-full overflow-x-auto rounded-lg border border-border">
      {/* Header row */}
      <div
        className="grid bg-card sticky top-0 z-10 border-b border-border"
        style={{ gridTemplateColumns: "14rem repeat(7, minmax(0, 1fr))" }}
      >
        <div className="h-12 flex items-center px-4 text-xs font-medium text-muted-foreground border-r border-border">
          {t("grid.header_employee")}
        </div>
        {days.map((day) => {
          const isToday = isSameDay(day, TODAY);
          return (
            <div
              key={day.toISOString()}
              className={`h-12 flex flex-col items-center justify-center text-xs font-medium border-r border-border last:border-r-0 ${
                isToday
                  ? "bg-primary/5 text-primary"
                  : "text-muted-foreground"
              }`}
            >
              <span className="capitalize">
                {format(day, "EEE", { locale: dateFnsLocale })}
              </span>
              <span
                className={`text-sm font-semibold ${
                  isToday
                    ? "size-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center mt-0.5"
                    : ""
                }`}
              >
                {format(day, "d")}
              </span>
            </div>
          );
        })}
      </div>

      {/* Body */}
      {employees.map((emp) => (
        <div
          key={emp.user_id}
          className="grid border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors"
          style={{ gridTemplateColumns: "14rem repeat(7, minmax(0, 1fr))" }}
        >
          {/* Employee cell */}
          <div className="flex items-center gap-2.5 px-4 py-2 min-h-20 border-r border-border bg-card sticky left-0 z-10">
            <div className="size-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-xs font-semibold shrink-0">
              {getInitials(emp.user_name)}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-foreground truncate leading-tight">
                {getShortName(emp.user_name)}
              </div>
            </div>
          </div>

          {/* Day cells */}
          {days.map((day) => {
            const dateStr = format(day, "yyyy-MM-dd");
            const cellSlots = slotsByEmployeeAndDay.get(`${emp.user_id}_${dateStr}`) ?? [];
            const isToday = isSameDay(day, TODAY);

            return (
              <TooltipProvider key={day.toISOString()}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className={`min-h-20 p-1.5 border-r border-border last:border-r-0 flex flex-col gap-1 ${
                        isToday ? "bg-primary/5" : ""
                      }`}
                    >
                      {cellSlots.map((slot) => (
                        <ShiftBlock
                          key={slot.id}
                          slot={slot}
                          onClick={onShiftClick}
                          onAction={onShiftAction}
                        />
                      ))}
                    </div>
                  </TooltipTrigger>
                  {cellSlots.length === 0 && (
                    <TooltipContent side="top">
                      <p className="text-xs">{t("grid.tooltip_create_disabled")}</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// DAY VIEW
// ════════════════════════════════════════════���══════════════════════

interface DayViewProps {
  day: Date;
  slots: ScheduleSlot[];
  onShiftClick: (slot: ScheduleSlot) => void;
  onShiftAction: (action: "reopen" | "force_close", slot: ScheduleSlot) => void;
}

// OverflowPopover: shows hidden slots when a time group has > COL_OVERFLOW_MAX overlaps
interface OverflowPopoverProps {
  hiddenSlots: ScheduleSlot[];
  onShiftClick: (slot: ScheduleSlot) => void;
}

function OverflowPopover({ hiddenSlots, onShiftClick }: OverflowPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="absolute inset-0 flex items-center justify-center rounded-md bg-muted/80 text-muted-foreground text-xs font-medium border border-border hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`Show ${hiddenSlots.length} more shifts`}
        >
          +{hiddenSlots.length}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <p className="text-xs font-medium text-muted-foreground mb-2 px-1">
          {hiddenSlots.length} скрытых смен
        </p>
        <div className="space-y-1">
          {hiddenSlots.map((slot) => (
            <button
              key={slot.id}
              type="button"
              onClick={() => onShiftClick(slot)}
              className={`w-full text-left rounded-md px-2 py-1.5 text-xs transition-opacity hover:opacity-90 ${SLOT_STYLES[getSlotVariant(slot)]}`}
            >
              <span className="font-medium truncate block">
                {getShortName(slot.user_name)}
              </span>
              <span className="opacity-75">
                {formatHM(slot.planned_start)}–{formatHM(slot.planned_end)}
                {slot.zone_name ? ` · ${slot.zone_name}` : ""}
              </span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function DayView({ day, slots, onShiftClick }: DayViewProps) {
  const t = useTranslations("screen.schedule");
  const dayStr = format(day, "yyyy-MM-dd");
  const daySlots = slots.filter((s) => s.shift_date === dayStr);

  // Measure container width for pixel-accurate column geometry
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = React.useState(600);

  React.useLayoutEffect(() => {
    if (containerRef.current) {
      setContainerWidth(containerRef.current.offsetWidth);
    }
  }, [daySlots.length]);

  if (daySlots.length === 0) {
    return (
      <EmptyState
        icon={Calendar}
        title={t("empty.no_shifts_title")}
        description={t("empty.no_shifts_subtitle")}
      />
    );
  }

  const TIMELINE_START = 6;
  const TIMELINE_END = 23;
  const CELL_HEIGHT = 60; // px per hour
  const LABEL_WIDTH = 56; // left gutter (w-14)
  const RIGHT_MARGIN = 4;
  const CONTENT_WIDTH = containerWidth - LABEL_WIDTH - RIGHT_MARGIN;

  const columnMap = computeColumns(daySlots);

  // Track which slots have already been rendered as part of an overflow badge
  const renderedAsOverflow = new Set<number>();

  // Pre-sort so groups render predictably
  const sorted = [...daySlots].sort(
    (a, b) => new Date(a.planned_start).getTime() - new Date(b.planned_start).getTime()
  );

  const slotElements: React.ReactNode[] = [];

  for (const slot of sorted) {
    if (renderedAsOverflow.has(slot.id)) continue;

    const info = columnMap.get(slot.id) ?? { col: 0, totalCols: 1 };
    const { col, totalCols } = info;
    const colWidth = CONTENT_WIDTH / totalCols;

    // Calculate geometry
    const { h: startH, m: startM } = parseTime(slot.planned_start);
    const { h: endH, m: endM } = parseTime(slot.planned_end);
    const topPx =
      ((timeToMinutes(startH, startM) - timeToMinutes(TIMELINE_START, 0)) /
        60) *
      CELL_HEIGHT;
    const heightPx = Math.max(
      32,
      ((timeToMinutes(endH, endM) - timeToMinutes(startH, startM)) / 60) *
        CELL_HEIGHT -
        4
    );
    const isShort = heightPx <= 48; // ~45min — show compact content

    // Determine if we need to show an overflow badge for this group
    const needsOverflow =
      totalCols > COL_OVERFLOW_MAX ||
      colWidth < COL_MIN_WIDTH_PX;

    if (needsOverflow && col === COL_OVERFLOW_MAX) {
      // Collect all slots in this overflow group beyond the threshold
      const groupSlots = sorted.filter((s) => {
        const i = columnMap.get(s.id);
        return i && i.totalCols === totalCols;
      });
      const hiddenSlots = groupSlots.filter((s) => {
        const i = columnMap.get(s.id);
        return i && i.col >= COL_OVERFLOW_MAX;
      });
      hiddenSlots.forEach((s) => renderedAsOverflow.add(s.id));

      const badgeLeft = LABEL_WIDTH + COL_OVERFLOW_MAX * colWidth;
      const badgeWidth = CONTENT_WIDTH - COL_OVERFLOW_MAX * colWidth - RIGHT_MARGIN;

      slotElements.push(
        <div
          key={`overflow-${slot.id}`}
          className="absolute"
          style={{
            top: Math.max(0, topPx),
            height: heightPx,
            left: badgeLeft,
            width: Math.max(32, badgeWidth),
          }}
        >
          <OverflowPopover hiddenSlots={hiddenSlots} onShiftClick={onShiftClick} />
        </div>
      );
      continue;
    }

    if (needsOverflow && col >= COL_OVERFLOW_MAX) {
      // Will be covered by badge above — skip
      renderedAsOverflow.add(slot.id);
      continue;
    }

    // Normal column-split rendering
    const effectiveCols = needsOverflow ? COL_OVERFLOW_MAX : totalCols;
    const effectiveColWidth = CONTENT_WIDTH / effectiveCols;
    const leftPx = LABEL_WIDTH + col * effectiveColWidth;
    const blockWidth = effectiveColWidth - (col < effectiveCols - 1 ? 4 : RIGHT_MARGIN);

    slotElements.push(
      <TooltipProvider key={slot.id} delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className="absolute"
              style={{
                top: Math.max(0, topPx),
                height: heightPx,
                left: leftPx,
                width: Math.max(40, blockWidth),
              }}
            >
              <div
                className={`h-full rounded-md px-2 py-1 text-xs cursor-pointer transition-opacity hover:opacity-90 overflow-hidden ${SLOT_STYLES[getSlotVariant(slot)]}`}
                onClick={() => onShiftClick(slot)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && onShiftClick(slot)}
                aria-label={`${slot.user_name} ${formatHM(slot.planned_start)}–${formatHM(slot.planned_end)}`}
              >
                {isShort ? (
                  // Compact: initials + time only
                  <div className="flex items-center gap-1 h-full">
                    <span className="font-semibold shrink-0">
                      {getInitials(slot.user_name)}
                    </span>
                    <span className="opacity-75 truncate">
                      {formatHM(slot.planned_start)}
                    </span>
                    {slot.has_conflict && (
                      <AlertTriangle className="size-3 shrink-0 ml-auto" />
                    )}
                  </div>
                ) : (
                  // Full content
                  <div className="flex flex-col gap-0.5 h-full">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-medium truncate leading-tight">
                        {getShortName(slot.user_name)}
                      </span>
                      {slot.has_conflict && (
                        <AlertTriangle className="size-3 shrink-0" />
                      )}
                    </div>
                    <span className="opacity-75 truncate">
                      {formatHM(slot.planned_start)}–{formatHM(slot.planned_end)}
                    </span>
                    {slot.zone_name && (
                      <span className="opacity-75 truncate">{slot.zone_name}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-56">
            <div className="space-y-1">
              <p className="font-medium text-sm">{slot.user_name}</p>
              {slot.position_name && (
                <p className="text-xs text-muted-foreground">{slot.position_name}</p>
              )}
              <p className="text-xs">
                {formatHM(slot.planned_start)}–{formatHM(slot.planned_end)}
              </p>
              {slot.zone_name && (
                <p className="text-xs text-muted-foreground">{slot.zone_name}</p>
              )}
              {slot.has_conflict && (
                <p className="text-xs font-medium text-destructive flex items-center gap-1">
                  <AlertTriangle className="size-3" />
                  {t("slot.conflict_title")}
                </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="w-full overflow-x-auto rounded-lg border border-border">
      <div ref={containerRef} className="relative" style={{ minWidth: 600 }}>
        {/* Hour rows */}
        {Array.from(
          { length: TIMELINE_END - TIMELINE_START },
          (_, i) => i + TIMELINE_START
        ).map((hour) => (
          <div
            key={hour}
            className="flex border-b border-border last:border-b-0"
            style={{ height: CELL_HEIGHT }}
          >
            <div className="w-14 shrink-0 flex items-start pt-1 px-2 text-xs text-muted-foreground border-r border-border">
              {hour.toString().padStart(2, "0")}:00
            </div>
            <div className="flex-1 relative" />
          </div>
        ))}

        {/* Shift blocks absolutely positioned with overlap-aware columns */}
        {slotElements}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MOBILE DAY VIEW
// ═══════════════════════════════════════════════════════════════════

interface MobileDayViewProps {
  day: Date;
  slots: ScheduleSlot[];
  onShiftClick: (slot: ScheduleSlot) => void;
}

function MobileDayView({ day, slots, onShiftClick }: MobileDayViewProps) {
  const t = useTranslations("screen.schedule");
  const dayStr = format(day, "yyyy-MM-dd");
  const daySlots = slots.filter((s) => s.shift_date === dayStr);

  if (daySlots.length === 0) {
    return (
      <EmptyState
        icon={Calendar}
        title={t("empty.no_shifts_title")}
        description={t("empty.no_shifts_subtitle")}
      />
    );
  }

  return (
    <div className="space-y-2">
      {HOURS_RANGE.map((hour) => {
        const hourSlots = daySlots.filter((s) => {
          const { h } = parseTime(s.planned_start);
          return h === hour;
        });
        return (
          <div key={hour} className="flex gap-3">
            <div className="w-12 shrink-0 pt-2 text-xs text-muted-foreground text-right">
              {hour.toString().padStart(2, "0")}:00
            </div>
            <div className="flex-1 border-t border-border pt-2 min-h-16 space-y-2">
              {hourSlots.map((slot) => {
                const variant = getSlotVariant(slot);
                const styles = SLOT_STYLES[variant];
                return (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => onShiftClick(slot)}
                    className={`w-full text-left rounded-lg p-3 min-h-11 ${styles} flex items-start justify-between gap-2`}
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium">
                        {formatHM(slot.planned_start)}–{formatHM(slot.planned_end)}
                      </span>
                      <span className="text-xs opacity-80">{slot.user_name}</span>
                      {slot.zone_name && (
                        <span className="text-xs opacity-70">{slot.zone_name}</span>
                      )}
                    </div>
                    {slot.has_conflict && (
                      <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MOBILE WEEK VIEW
// ═══════════════════════════════════════════════════════════════════

interface MobileWeekViewProps {
  days: Date[];
  slots: ScheduleSlot[];
  onShiftClick: (slot: ScheduleSlot) => void;
  selectedDay: Date;
  onDaySelect: (day: Date) => void;
}

function MobileWeekView({
  days,
  slots,
  onShiftClick,
  selectedDay,
  onDaySelect,
}: MobileWeekViewProps) {
  const locale = useLocale();
  const dateFnsLocale = locale === "ru" ? ru : enUS;

  const daySlots = slots.filter(
    (s) => s.shift_date === format(selectedDay, "yyyy-MM-dd")
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Day picker strip */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {days.map((day) => {
          const isToday = isSameDay(day, TODAY);
          const isSelected = isSameDay(day, selectedDay);
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onDaySelect(day)}
              className={`flex flex-col items-center justify-center min-w-10 h-14 rounded-lg text-xs font-medium transition-colors shrink-0 ${
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : isToday
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              }`}
            >
              <span className="capitalize text-[10px]">
                {format(day, "EEE", { locale: dateFnsLocale })}
              </span>
              <span>{format(day, "d")}</span>
            </button>
          );
        })}
      </div>

      {/* Shifts for selected day */}
      <MobileDayView day={selectedDay} slots={daySlots} onShiftClick={onShiftClick} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MONTH VIEW
// ═══════════════════════════════════════════════════════════════════

interface MonthViewProps {
  currentDate: Date;
  slots: ScheduleSlot[];
  onDayClick: (day: Date) => void;
}

function MonthView({ currentDate, slots, onDayClick }: MonthViewProps) {
  const t = useTranslations("screen.schedule");
  const locale = useLocale();
  const dateFnsLocale = locale === "ru" ? ru : enUS;

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const gridStart = startOfWeek(monthStart, { locale: dateFnsLocale, weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { locale: dateFnsLocale, weekStartsOn: 1 });
  const gridDays = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const weekDayNames = Array.from({ length: 7 }, (_, i) =>
    format(addDays(gridStart, i), "EEE", { locale: dateFnsLocale })
  );

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      {/* Weekday header */}
      <div className="grid grid-cols-7 border-b border-border">
        {weekDayNames.map((name) => (
          <div
            key={name}
            className="h-9 flex items-center justify-center text-xs font-medium text-muted-foreground capitalize"
          >
            {name}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7">
        {gridDays.map((day) => {
          const dayStr = format(day, "yyyy-MM-dd");
          const daySlots = slots.filter((s) => s.shift_date === dayStr);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isToday = isSameDay(day, TODAY);
          const uniquePeople = new Set(daySlots.map((s) => s.user_id)).size;

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => daySlots.length > 0 && onDayClick(day)}
              className={`min-h-20 p-2 border-b border-r border-border text-left flex flex-col gap-1 transition-colors
                ${!isCurrentMonth ? "bg-muted/20 opacity-50" : "hover:bg-muted/30"}
                ${isToday ? "bg-primary/5" : ""}
              `}
            >
              <span
                className={`text-xs font-semibold self-end ${
                  isToday
                    ? "size-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center"
                    : "text-foreground"
                }`}
              >
                {format(day, "d")}
              </span>
              {daySlots.length > 0 && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground">
                    {t("month_cell.shifts_count", { count: daySlots.length })}
                  </span>
                  {uniquePeople > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {t("month_cell.people_count", { count: uniquePeople })}
                    </span>
                  )}
                  <div className="flex gap-0.5 mt-0.5 flex-wrap">
                    {daySlots.slice(0, 3).map((slot) => {
                      const variant = getSlotVariant(slot);
                      return (
                        <span
                          key={slot.id}
                          className={`h-1.5 w-4 rounded-full ${
                            variant === "opened"
                              ? "bg-success"
                              : variant === "conflict"
                              ? "bg-destructive"
                              : variant === "new"
                              ? "bg-info"
                              : variant === "overtime" || variant === "late"
                              ? "bg-warning"
                              : "bg-muted-foreground/40"
                          }`}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// LEGEND
// ═══════════════════════════════════════════════════════════════════

function LegendRow() {
  const t = useTranslations("screen.schedule");
  const items = [
    { key: "planned", color: "bg-info" },
    { key: "opened", color: "bg-success" },
    { key: "closed_normal", color: "bg-muted-foreground/40" },
    { key: "closed_late", color: "bg-warning" },
    { key: "closed_overtime", color: "bg-warning" },
    { key: "conflict", color: "bg-destructive" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      <span className="text-xs text-muted-foreground font-medium">
        {t("legend.label")}:
      </span>
      {items.map(({ key, color }) => (
        <div key={key} className="flex items-center gap-1.5">
          <span className={`size-2.5 rounded-full ${color}`} aria-hidden="true" />
          <span className="text-xs text-muted-foreground">
            {t(`legend.${key}` as Parameters<typeof t>[0])}
          </span>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// FUTURE FEATURE BANNER
// ═══════════════════════════════════════════════════════════════════

function FutureFeatureBanner() {
  const t = useTranslations("screen.schedule");
  const [dismissed, setDismissed] = React.useState(false);

  if (dismissed) return null;

  return (
    <Card className="border-dashed border-border/50 relative">
      <CardContent className="p-4 flex items-start gap-3">
        <Sparkles className="size-5 text-muted-foreground shrink-0 mt-0.5" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">
            {t("grid.future_feature_title")}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            {t("grid.future_feature_description")}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <Button variant="outline" size="sm" disabled className="h-8 text-xs gap-1.5">
              {t("grid.future_feature_cta")}
            </Button>
            <Badge variant="secondary" className="text-xs">
              {t("grid.future_feature_badge")}
            </Badge>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          className="absolute top-3 right-3 size-7 flex items-center justify-center rounded-md hover:bg-muted transition-colors"
        >
          <X className="size-4 text-muted-foreground" aria-hidden="true" />
        </button>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SKELETON
// ═══════════════════════════════════════════════════════════════════

function ScheduleSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-64" />
      <Card>
        <CardContent className="p-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex gap-2">
            <Skeleton className="h-9 w-9" />
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-9" />
          </div>
          <Skeleton className="h-9 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-9 w-32" />
          </div>
        </CardContent>
      </Card>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

export function ScheduleCalendar() {
  const t = useTranslations("screen.schedule");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const locale = useLocale();
  const dateFnsLocale = locale === "ru" ? ru : enUS;

  // State
  const [view, setView] = React.useState<ScheduleView>("week");
  const [currentDate, setCurrentDate] = React.useState<Date>(TODAY);
  const [selectedDay, setSelectedDay] = React.useState<Date>(TODAY); // mobile week sub-selection
  const [filterStore, setFilterStore] = React.useState<string>("all");
  const [filterZones, setFilterZones] = React.useState<string[]>([]);
  const [, setFilterStatus] = React.useState<string[]>([]);

  const [scheduleData, setScheduleData] = React.useState<ScheduleResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [syncing, setSyncing] = React.useState(false);

  const [confirmAction, setConfirmAction] = React.useState<{
    type: "reopen" | "force_close";
    slot: ScheduleSlot;
  } | null>(null);
  const [, setActionLoading] = React.useState(false);

  // ─── Dynamic store/zone options (filtered by current org via taxonomy API) ───
  const [storeOptions, setStoreOptions] = React.useState<ComboboxOption[]>([
    ALL_STORES_OPTION,
  ]);
  const [zoneOptions, setZoneOptions] = React.useState<ComboboxOption[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    Promise.all([
      getStores({ archived: false, page_size: 200 }),
      getZones({ page_size: 100 }),
    ]).then(([stores, zones]) => {
      if (cancelled) return;
      setStoreOptions([
        ALL_STORES_OPTION,
        ...stores.data.map((s) => ({ value: String(s.id), label: s.name })),
      ]);
      setZoneOptions(
        zones.data.map((z) => ({ value: String(z.id), label: z.name })),
      );
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // ─── Date range ────────────────────────────────────────────────
  const dateRange = React.useMemo(() => {
    if (view === "day") {
      return {
        from: format(currentDate, "yyyy-MM-dd"),
        to: format(currentDate, "yyyy-MM-dd"),
      };
    }
    if (view === "week") {
      const wStart = startOfWeek(currentDate, { locale: dateFnsLocale, weekStartsOn: 1 });
      const wEnd = endOfWeek(currentDate, { locale: dateFnsLocale, weekStartsOn: 1 });
      return {
        from: format(wStart, "yyyy-MM-dd"),
        to: format(wEnd, "yyyy-MM-dd"),
      };
    }
    // month
    const mStart = startOfMonth(currentDate);
    const mEnd = endOfMonth(currentDate);
    return {
      from: format(mStart, "yyyy-MM-dd"),
      to: format(mEnd, "yyyy-MM-dd"),
    };
  }, [view, currentDate, dateFnsLocale]);

  // ─── Week days (for week view header) ──────────────────────────
  const weekDays = React.useMemo(() => {
    if (view !== "week") return [];
    const wStart = startOfWeek(currentDate, { locale: dateFnsLocale, weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(wStart, i));
  }, [view, currentDate, dateFnsLocale]);

  // ─── Period label ───────────────────────────────────────────────
  const periodLabel = React.useMemo(() => {
    if (view === "day") {
      return format(currentDate, "d MMM yyyy", { locale: dateFnsLocale });
    }
    if (view === "week") {
      const wStart = startOfWeek(currentDate, { locale: dateFnsLocale, weekStartsOn: 1 });
      const wEnd = endOfWeek(currentDate, { locale: dateFnsLocale, weekStartsOn: 1 });
      return t("period.range_week", {
        from: format(wStart, "d MMM", { locale: dateFnsLocale }),
        to: format(wEnd, "d MMM yyyy", { locale: dateFnsLocale }),
      });
    }
    // month
    const monthName = format(currentDate, "LLLL", { locale: dateFnsLocale });
    return t("period.range_month", {
      month: monthName.charAt(0).toUpperCase() + monthName.slice(1),
      year: format(currentDate, "yyyy"),
    });
  }, [view, currentDate, dateFnsLocale, t]);

  // ─── Fetch data ─────────────────────────────────────────────────
  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const storeIds =
      filterStore !== "all" ? [parseInt(filterStore, 10)] : undefined;
    const zoneIds = filterZones.length > 0 ? filterZones.map(Number) : undefined;

    getSchedule({
      view,
      date_from: dateRange.from,
      date_to: dateRange.to,
      store_ids: storeIds,
      zone_ids: zoneIds,
    })
      .then((res) => {
        if (!cancelled) {
          setScheduleData(res.data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Failed to load schedule");
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [dateRange, filterStore, filterZones, view]);

  // ─── Navigation ─────────────────────────────────────────────────
  const handlePrev = () => {
    if (view === "day") setCurrentDate((d) => addDays(d, -1));
    else if (view === "week") setCurrentDate((d) => addWeeks(d, -1));
    else setCurrentDate((d) => addMonths(d, -1));
  };

  const handleNext = () => {
    if (view === "day") setCurrentDate((d) => addDays(d, 1));
    else if (view === "week") setCurrentDate((d) => addWeeks(d, 1));
    else setCurrentDate((d) => addMonths(d, 1));
  };

  const handleToday = () => {
    setCurrentDate(TODAY);
    setSelectedDay(TODAY);
  };

  // ─── Sync LAMA ──────────────────────────────────────���───────────
  const handleSync = async () => {
    setSyncing(true);
    try {
      await syncLamaShifts();
      toast.success(t("toasts.synced"));
    } catch {
      toast.error(t("toasts.error"));
    } finally {
      setSyncing(false);
    }
  };

  // ─── Shift actions ───────────────────────────────────────────────
  const handleShiftClick = (slot: ScheduleSlot) => {
    router.push(ADMIN_ROUTES.shiftDetail(String(slot.id)));
  };

  const handleShiftAction = (
    action: "reopen" | "force_close",
    slot: ScheduleSlot
  ) => {
    setConfirmAction({ type: action, slot });
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    setActionLoading(true);
    try {
      if (confirmAction.type === "reopen") {
        await reopenShift(confirmAction.slot.id);
        toast.success(t("toasts.reopened"));
      } else {
        await forceCloseShift(confirmAction.slot.id);
        toast.success(t("toasts.force_closed"));
      }
    } catch {
      toast.error(t("toasts.error"));
    } finally {
      setActionLoading(false);
      setConfirmAction(null);
    }
  };

  // ─── Month day click → switch to week ───────────────────────────
  const handleMonthDayClick = (day: Date) => {
    setCurrentDate(day);
    setView("week");
  };

  // ─── Active filter chips ─────────────────────────────────────────
  const activeFilters: Array<{ key: string; label: string; value: string; onRemove: () => void }> =
    [];

  if (filterStore !== "all") {
    const storeLabel =
      storeOptions.find((o) => o.value === filterStore)?.label ?? filterStore;
    activeFilters.push({
      key: "store",
      label: t("filters.store"),
      value: storeLabel,
      onRemove: () => setFilterStore("all"),
    });
  }
  filterZones.forEach((z) => {
    const zoneLabel = zoneOptions.find((o) => o.value === z)?.label ?? z;
    activeFilters.push({
      key: `zone_${z}`,
      label: t("filters.zone"),
      value: zoneLabel,
      onRemove: () => setFilterZones((prev) => prev.filter((v) => v !== z)),
    });
  });

  const clearAllFilters = () => {
    setFilterStore("all");
    setFilterZones([]);
    setFilterStatus([]);
  };

  // ─── Stats ───────────────────────────────────────────────────────
  const stats = React.useMemo(() => {
    if (!scheduleData) return null;
    const openShifts = scheduleData.slots.filter((s) => s.status === "OPENED").length;
    const conflicts = scheduleData.slots.filter((s) => s.has_conflict).length;
    const coveragePct = scheduleData.coverage_pct;
    return {
      coverage: coveragePct,
      openShifts,
      planned: scheduleData.total_planned_hours,
      conflicts,
    };
  }, [scheduleData]);

  const coverageColor =
    stats && stats.coverage >= 80
      ? "text-success"
      : stats && stats.coverage >= 60
      ? "text-warning"
      : "text-destructive";

  // ─── Lama sync alert (mock: always show if data is loaded) ───────
  const lamaOutOfSync = false; // In real app: check last sync time

  // ─── RENDER ──────────────────────────────────────────────────────

  if (loading) return <ScheduleSkeleton />;

  if (error) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button
          variant="outline"
          onClick={() => {
            setLoading(true);
            setError(null);
          }}
        >
          {tCommon("retry")}
        </Button>
      </div>
    );
  }

  const slots = scheduleData?.slots ?? [];

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      {/* Page header */}
      <PageHeader
        title={t("page_title")}
        subtitle={t("page_subtitle")}
        breadcrumbs={[
          { label: t("breadcrumbs.home"), href: ADMIN_ROUTES.dashboard },
          { label: t("breadcrumbs.schedule") },
        ]}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={syncing}
            className="gap-1.5"
          >
            <RefreshCw
              className={`size-4 ${syncing ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            <span className="hidden sm:inline">{t("actions.sync_lama")}</span>
          </Button>
        }
      />

      {/* LAMA out-of-sync alert */}
      {lamaOutOfSync && (
        <Alert>
          <AlertTriangle className="size-4" aria-hidden="true" />
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>{t("grid.lama_out_of_sync", { hours: "3" })}</span>
            <Button size="sm" variant="outline" onClick={handleSync} disabled={syncing}>
              {t("actions.sync_lama")}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Future feature banner */}
      <FutureFeatureBanner />

      {/* Toolbar */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-col gap-3">
            {/* Row 1: nav + view switcher + store filter */}
            <div className="flex flex-wrap items-center gap-2 justify-between">
              {/* Navigation */}
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePrev}
                  aria-label={t("period.prev")}
                  className="size-9"
                >
                  <ChevronLeft className="size-4" aria-hidden="true" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleToday}
                  className="h-9 px-3 text-sm"
                >
                  {t("period.today")}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleNext}
                  aria-label={t("period.next")}
                  className="size-9"
                >
                  <ChevronRight className="size-4" aria-hidden="true" />
                </Button>
                <span className="text-sm font-medium text-foreground ml-1">
                  {periodLabel}
                </span>
              </div>

              {/* View switcher */}
              <ToggleGroup
                type="single"
                value={view}
                onValueChange={(v) => v && setView(v as ScheduleView)}
                className="hidden md:flex"
                aria-label={t("view_switcher.label")}
              >
                <ToggleGroupItem value="day" className="text-sm">
                  {t("view_switcher.day")}
                </ToggleGroupItem>
                <ToggleGroupItem value="week" className="text-sm">
                  {t("view_switcher.week")}
                </ToggleGroupItem>
                <ToggleGroupItem value="month" className="text-sm">
                  {t("view_switcher.month")}
                </ToggleGroupItem>
              </ToggleGroup>

              {/* Mobile: day/week only */}
              <ToggleGroup
                type="single"
                value={view === "month" ? "week" : view}
                onValueChange={(v) => v && setView(v as ScheduleView)}
                className="flex md:hidden"
                aria-label={t("view_switcher.label")}
              >
                <ToggleGroupItem value="day" className="text-sm">
                  {t("view_switcher.day")}
                </ToggleGroupItem>
                <ToggleGroupItem value="week" className="text-sm">
                  {t("view_switcher.week")}
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            {/* Row 2: Desktop filters */}
            <div className="hidden md:flex flex-wrap items-center gap-2">
              <Combobox
                options={storeOptions}
                value={filterStore}
                onValueChange={setFilterStore}
                placeholder={t("filters.store")}
                className="w-56 h-9"
              />
              <Combobox
                options={zoneOptions}
                value={filterZones[0] ?? ""}
                onValueChange={(v) => {
                  setFilterZones(v ? [v] : []);
                }}
                placeholder={t("filters.zone")}
                className="w-40 h-9"
              />
            </div>

            {/* Row 2: Mobile filters button */}
            <MobileFilterSheet
              activeCount={activeFilters.length}
              onClearAll={clearAllFilters}
              onApply={() => {}}
              className="md:hidden"
            >
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">{t("filters.store")}</label>
                  <Combobox
                    options={storeOptions}
                    value={filterStore}
                    onValueChange={setFilterStore}
                    placeholder={t("filters.store")}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">{t("filters.zone")}</label>
                  <Combobox
                    options={zoneOptions}
                    value={filterZones[0] ?? ""}
                    onValueChange={(v) => {
                      setFilterZones(v ? [v] : []);
                    }}
                    placeholder={t("filters.zone")}
                  />
                </div>
              </div>
            </MobileFilterSheet>
          </div>
        </CardContent>
      </Card>

      {/* Active filter chips */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {activeFilters.map((f) => (
            <FilterChip
              key={f.key}
              label={f.label}
              value={f.value}
              onRemove={f.onRemove}
            />
          ))}
          <button
            type="button"
            onClick={clearAllFilters}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors underline-offset-2 hover:underline"
          >
            {t("filters.clear_all")}
          </button>
        </div>
      )}

      {/* Stat bar */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {/* Coverage */}
          <Card>
            <CardContent className="p-3 md:p-4 flex flex-col gap-1">
              <span className="text-xs text-muted-foreground font-medium">
                {t("aggregates.coverage")}
              </span>
              <span className={`text-2xl font-semibold ${coverageColor}`}>
                {stats.coverage}%
              </span>
            </CardContent>
          </Card>
          {/* Open shifts */}
          <Card>
            <CardContent className="p-3 md:p-4 flex flex-col gap-1">
              <span className="text-xs text-muted-foreground font-medium">
                {t("aggregates.open_shifts")}
              </span>
              <span className="text-2xl font-semibold text-foreground">
                {stats.openShifts}
              </span>
            </CardContent>
          </Card>
          {/* Planned hours */}
          <Card>
            <CardContent className="p-3 md:p-4 flex flex-col gap-1">
              <span className="text-xs text-muted-foreground font-medium">
                {t("aggregates.total_planned")}
              </span>
              <span className="text-2xl font-semibold text-foreground">
                {stats.planned}
              </span>
            </CardContent>
          </Card>
          {/* Conflicts */}
          <Card>
            <CardContent className="p-3 md:p-4 flex flex-col gap-1">
              <span className="text-xs text-muted-foreground font-medium">
                {t("aggregates.conflicts")}
              </span>
              <div className="flex items-center gap-1.5">
                <span
                  className={`text-2xl font-semibold ${
                    stats.conflicts > 0 ? "text-destructive" : "text-foreground"
                  }`}
                >
                  {stats.conflicts}
                </span>
                {stats.conflicts > 0 && (
                  <AlertTriangle className="size-4 text-destructive" aria-hidden="true" />
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Calendar grid */}
      <div className="flex flex-col gap-3">
        {/* Legend — desktop */}
        <div className="hidden md:block">
          <LegendRow />
        </div>

        {/* Desktop views */}
        <div className="hidden md:block">
          {view === "week" && (
            <WeekView
              days={weekDays}
              slots={slots}
              onShiftClick={handleShiftClick}
              onShiftAction={handleShiftAction}
            />
          )}
          {view === "day" && (
            <DayView
              day={currentDate}
              slots={slots}
              onShiftClick={handleShiftClick}
              onShiftAction={handleShiftAction}
            />
          )}
          {view === "month" && (
            <MonthView
              currentDate={currentDate}
              slots={slots}
              onDayClick={handleMonthDayClick}
            />
          )}
        </div>

        {/* Mobile views */}
        <div className="md:hidden">
          {view === "day" && (
            <MobileDayView
              day={currentDate}
              slots={slots}
              onShiftClick={handleShiftClick}
            />
          )}
          {(view === "week" || view === "month") && (
            <MobileWeekView
              days={weekDays.length > 0 ? weekDays : Array.from({ length: 7 }, (_, i) =>
                addDays(
                  startOfWeek(currentDate, { locale: dateFnsLocale, weekStartsOn: 1 }),
                  i
                )
              )}
              slots={slots}
              onShiftClick={handleShiftClick}
              selectedDay={selectedDay}
              onDaySelect={setSelectedDay}
            />
          )}
        </div>
      </div>

      {/* Confirm dialogs */}
      {confirmAction && (
        <AlertDialog
          open={!!confirmAction}
          onOpenChange={(open) => !open && setConfirmAction(null)}
        >
          <ConfirmDialog
            title={
              confirmAction.type === "reopen"
                ? t("dialogs.reopen_confirm_title")
                : t("dialogs.force_close_warning_title")
            }
            message={
              confirmAction.type === "reopen"
                ? t("dialogs.reopen_confirm_description", {
                    user: confirmAction.slot.user_name,
                  })
                : t("dialogs.force_close_warning_description", {
                    user: confirmAction.slot.user_name,
                  })
            }
            confirmLabel={
              confirmAction.type === "reopen"
                ? t("dialogs.reopen_confirm_action")
                : t("dialogs.force_close_warning_action")
            }
            onConfirm={handleConfirmAction}
            onOpenChange={(open) => !open && setConfirmAction(null)}
            variant={confirmAction.type === "force_close" ? "destructive" : "default"}
          />
        </AlertDialog>
      )}
    </div>
  );
}
