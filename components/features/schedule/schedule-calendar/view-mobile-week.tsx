"use client";

import { useLocale } from "next-intl";
import { format, isSameDay } from "date-fns";
import { ru, enUS } from "date-fns/locale";

import type { ScheduleSlot } from "@/lib/api/shifts";

import { TODAY } from "./_shared";
import { MobileDayView } from "./view-mobile-day";

interface MobileWeekViewProps {
  days: Date[];
  slots: ScheduleSlot[];
  onShiftClick: (slot: ScheduleSlot) => void;
  selectedDay: Date;
  onDaySelect: (day: Date) => void;
}

export function MobileWeekView({
  days,
  slots,
  onShiftClick,
  selectedDay,
  onDaySelect,
}: MobileWeekViewProps) {
  const locale = useLocale();
  const dateFnsLocale = locale === "ru" ? ru : enUS;

  const daySlots = slots.filter(
    (s) => s.shift_date === format(selectedDay, "yyyy-MM-dd"),
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
      <MobileDayView
        day={selectedDay}
        slots={daySlots}
        onShiftClick={onShiftClick}
      />
    </div>
  );
}
