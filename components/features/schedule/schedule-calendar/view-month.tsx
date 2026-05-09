"use client";

import { useTranslations, useLocale } from "next-intl";
import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ru, enUS } from "date-fns/locale";

import type { ScheduleSlot } from "@/lib/api/shifts";

import { getSlotVariant, TODAY } from "./_shared";

interface MonthViewProps {
  currentDate: Date;
  slots: ScheduleSlot[];
  onDayClick: (day: Date) => void;
}

export function MonthView({ currentDate, slots, onDayClick }: MonthViewProps) {
  const t = useTranslations("screen.schedule");
  const locale = useLocale();
  const dateFnsLocale = locale === "ru" ? ru : enUS;

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const gridStart = startOfWeek(monthStart, {
    locale: dateFnsLocale,
    weekStartsOn: 1,
  });
  const gridEnd = endOfWeek(monthEnd, {
    locale: dateFnsLocale,
    weekStartsOn: 1,
  });
  const gridDays = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const weekDayNames = Array.from({ length: 7 }, (_, i) =>
    format(addDays(gridStart, i), "EEE", { locale: dateFnsLocale }),
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
