"use client"

import * as React from "react"
import { useLocale } from "next-intl"
import { ChevronDown, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

/**
 * Date-range Popover с Calendar (mode=range). Используется в audit-log,
 * tasks-list, applications-list и т.п. для фильтрации по диапазону дат.
 *
 * Возвращает `{from, to}` обоих типов `Date | undefined`. Поддерживает
 * `clearable` (показывает кнопку «Очистить» внизу popover'а когда выбрано)
 * и `disableFuture` (блокирует даты после today, по умолчанию ON).
 */
export interface DateRangePickerProps {
  from: Date | undefined
  to: Date | undefined
  onChange: (from: Date | undefined, to: Date | undefined) => void
  placeholder: string
  /** По умолчанию true — нельзя выбрать будущие даты. */
  disableFuture?: boolean
  /** По умолчанию true — показывает «Очистить» когда есть выбор. */
  clearable?: boolean
  /** Кастомный label для clear-кнопки. По умолчанию «Очистить». */
  clearLabel?: string
  className?: string
}

export function DateRangePicker({
  from,
  to,
  onChange,
  placeholder,
  disableFuture = true,
  clearable = true,
  clearLabel = "Очистить",
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false)
  const locale = useLocale()

  const fmt = (d: Date) =>
    new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(d)

  const label =
    from && to
      ? `${fmt(from)} – ${fmt(to)}`
      : from
        ? `${fmt(from)} –`
        : placeholder

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-9 justify-between gap-1.5 min-w-[160px] text-sm font-normal",
            !from && !to && "text-muted-foreground",
            className,
          )}
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
            onChange(range?.from, range?.to)
          }}
          numberOfMonths={1}
          disabled={disableFuture ? { after: new Date() } : undefined}
        />
        {clearable && (from || to) && (
          <div className="p-3 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => {
                onChange(undefined, undefined)
                setOpen(false)
              }}
            >
              <X className="size-3.5 mr-1" />
              {clearLabel}
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
