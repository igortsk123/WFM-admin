"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, Calendar } from "lucide-react";
import { format } from "date-fns";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { EmptyState } from "@/components/shared";

import type { ScheduleSlot } from "@/lib/api/shifts";

import {
  COL_MIN_WIDTH_PX,
  COL_OVERFLOW_MAX,
  computeColumns,
  formatHM,
  getInitials,
  getShortName,
  getSlotVariant,
  parseTime,
  SLOT_STYLES,
  timeToMinutes,
} from "./_shared";
import { OverflowPopover } from "./overflow-popover";

interface DayViewProps {
  day: Date;
  slots: ScheduleSlot[];
  onShiftClick: (slot: ScheduleSlot) => void;
  onShiftAction: (action: "reopen" | "force_close", slot: ScheduleSlot) => void;
}

export function DayView({ day, slots, onShiftClick }: DayViewProps) {
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
    (a, b) =>
      new Date(a.planned_start).getTime() -
      new Date(b.planned_start).getTime(),
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
        4,
    );
    const isShort = heightPx <= 48; // ~45min — show compact content

    // Determine if we need to show an overflow badge for this group
    const needsOverflow =
      totalCols > COL_OVERFLOW_MAX || colWidth < COL_MIN_WIDTH_PX;

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
      const badgeWidth =
        CONTENT_WIDTH - COL_OVERFLOW_MAX * colWidth - RIGHT_MARGIN;

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
          <OverflowPopover
            hiddenSlots={hiddenSlots}
            onShiftClick={onShiftClick}
          />
        </div>,
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
    const blockWidth =
      effectiveColWidth - (col < effectiveCols - 1 ? 4 : RIGHT_MARGIN);

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
                      <span className="opacity-75 truncate">
                        {slot.zone_name}
                      </span>
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
                <p className="text-xs text-muted-foreground">
                  {slot.position_name}
                </p>
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
      </TooltipProvider>,
    );
  }

  return (
    <div className="w-full overflow-x-auto rounded-lg border border-border">
      <div ref={containerRef} className="relative" style={{ minWidth: 600 }}>
        {/* Hour rows */}
        {Array.from(
          { length: TIMELINE_END - TIMELINE_START },
          (_, i) => i + TIMELINE_START,
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
