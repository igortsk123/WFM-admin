"use client";

import { useTranslations } from "next-intl";
import { AlertTriangle, Calendar } from "lucide-react";
import { format } from "date-fns";

import { EmptyState } from "@/components/shared";

import type { ScheduleSlot } from "@/lib/api/shifts";

import {
  formatHM,
  getSlotVariant,
  HOURS_RANGE,
  parseTime,
  SLOT_STYLES,
} from "./_shared";

interface MobileDayViewProps {
  day: Date;
  slots: ScheduleSlot[];
  onShiftClick: (slot: ScheduleSlot) => void;
}

export function MobileDayView({
  day,
  slots,
  onShiftClick,
}: MobileDayViewProps) {
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
                        {formatHM(slot.planned_start)}–
                        {formatHM(slot.planned_end)}
                      </span>
                      <span className="text-xs opacity-80">
                        {slot.user_name}
                      </span>
                      {slot.zone_name && (
                        <span className="text-xs opacity-70">
                          {slot.zone_name}
                        </span>
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
