"use client";

import { useTranslations, useLocale } from "next-intl";
import { Users } from "lucide-react";
import { format, isSameDay } from "date-fns";
import { ru, enUS } from "date-fns/locale";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { EmptyState } from "@/components/shared";

import type { ScheduleSlot } from "@/lib/api/shifts";

import { getInitials, getShortName, TODAY } from "./_shared";
import { ShiftBlock } from "./shift-block";

interface WeekViewProps {
  days: Date[];
  slots: ScheduleSlot[];
  onShiftClick: (slot: ScheduleSlot) => void;
  onShiftAction: (action: "reopen" | "force_close", slot: ScheduleSlot) => void;
}

export function WeekView({
  days,
  slots,
  onShiftClick,
  onShiftAction,
}: WeekViewProps) {
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
            const cellSlots =
              slotsByEmployeeAndDay.get(`${emp.user_id}_${dateStr}`) ?? [];
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
                      <p className="text-xs">
                        {t("grid.tooltip_create_disabled")}
                      </p>
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
