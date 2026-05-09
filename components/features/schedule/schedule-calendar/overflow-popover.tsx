"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import type { ScheduleSlot } from "@/lib/api/shifts";

import { formatHM, getShortName, getSlotVariant, SLOT_STYLES } from "./_shared";

interface OverflowPopoverProps {
  hiddenSlots: ScheduleSlot[];
  onShiftClick: (slot: ScheduleSlot) => void;
}

export function OverflowPopover({
  hiddenSlots,
  onShiftClick,
}: OverflowPopoverProps) {
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
