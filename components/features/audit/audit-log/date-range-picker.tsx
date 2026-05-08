"use client";

import * as React from "react";
import { useLocale } from "next-intl";
import { ChevronDown, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DateRangePickerProps {
  from: Date | undefined;
  to: Date | undefined;
  onChange: (from: Date | undefined, to: Date | undefined) => void;
  placeholder: string;
}

export function DateRangePicker({
  from,
  to,
  onChange,
  placeholder,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);
  const locale = useLocale();

  const fmt = (d: Date) =>
    new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(d);

  const label =
    from && to ? `${fmt(from)} – ${fmt(to)}` : from ? `${fmt(from)} –` : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="h-9 justify-between gap-1.5 min-w-[160px] text-sm"
        >
          <span className="truncate">{label}</span>
          <ChevronDown className="size-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={{ from, to }}
          onSelect={(range) => {
            onChange(range?.from, range?.to);
          }}
          numberOfMonths={1}
          disabled={{ after: new Date() }}
        />
        {(from || to) && (
          <div className="p-3 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => {
                onChange(undefined, undefined);
                setOpen(false);
              }}
            >
              <X className="size-3.5 mr-1" />
              Очистить
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
