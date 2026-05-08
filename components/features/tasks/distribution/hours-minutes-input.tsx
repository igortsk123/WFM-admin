"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { ChevronUp, ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Композитный «X ч Y мин» picker:
 * - Одна обводка вокруг двух inline input'ов (часы и минуты) + ChevronUp/Down
 *   справа для шага по 15 мин.
 * - Юниты «ч» и «мин» — статика (mask), в тексте не редактируются.
 * - Курсор кликом ставится в нужное поле (часы или минуты), цифры заменяются
 *   inline. Точность до минуты (0-59).
 * - Стрелки клавиатуры ↑/↓ внутри любого поля = ±15 мин (snap к multiple).
 * - Кнопки ▲▼ справа делают то же самое мышью.
 *
 * value/onChange работают в минутах (целое).
 */
export interface HoursMinutesInputProps {
  value: number
  onChange: (totalMin: number) => void
  disabled?: boolean
  invalid?: boolean
  className?: string
  t: ReturnType<typeof useTranslations>
}

export function HoursMinutesInput({
  value, onChange, disabled, invalid, className, t,
}: HoursMinutesInputProps) {
  const safeVal = Math.max(0, Math.round(value))
  const h = Math.floor(safeVal / 60)
  const m = safeVal % 60

  // Локальный edit-state для inline ввода (sync from external через effect)
  const [hStr, setHStr] = React.useState(() => String(h))
  const [mStr, setMStr] = React.useState(() => String(m).padStart(2, "0"))

  React.useEffect(() => {
    setHStr(String(h))
    setMStr(String(m).padStart(2, "0"))
  }, [h, m])

  const commitHours = (raw: string) => {
    const num = Math.max(0, parseInt(raw, 10) || 0)
    onChange(num * 60 + m)
  }
  const commitMinutes = (raw: string) => {
    let num = parseInt(raw, 10) || 0
    num = Math.max(0, Math.min(59, num))
    onChange(h * 60 + num)
  }

  const stepBy15 = (delta: 1 | -1) => {
    const next =
      delta > 0
        ? Math.floor(safeVal / 15) * 15 + 15
        : Math.max(0, Math.ceil(safeVal / 15) * 15 - 15)
    onChange(next)
  }

  const handleKeyDown =
    (commit: (raw: string) => void) =>
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "ArrowUp") {
        e.preventDefault()
        stepBy15(1)
      } else if (e.key === "ArrowDown") {
        e.preventDefault()
        stepBy15(-1)
      } else if (e.key === "Enter") {
        e.preventDefault()
        commit((e.target as HTMLInputElement).value)
        ;(e.target as HTMLInputElement).blur()
      }
    }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 px-2 h-9 rounded-md border bg-background text-sm transition-colors",
        "focus-within:ring-2 focus-within:ring-ring focus-within:border-ring",
        invalid && "border-destructive focus-within:ring-destructive focus-within:border-destructive",
        disabled && "opacity-50 pointer-events-none",
        className
      )}
      title={t("hm.step_hint")}
    >
      <input
        type="text"
        inputMode="numeric"
        className="w-7 bg-transparent text-center outline-none p-0 tabular-nums"
        value={hStr}
        onChange={(e) =>
          setHStr(e.target.value.replace(/\D/g, "").slice(0, 2))
        }
        onFocus={(e) => e.target.select()}
        onBlur={(e) => commitHours(e.target.value)}
        onKeyDown={handleKeyDown(commitHours)}
        disabled={disabled}
        aria-label={t("hm.h_aria")}
      />
      <span className="text-muted-foreground select-none text-xs">ч</span>
      <input
        type="text"
        inputMode="numeric"
        className="w-7 bg-transparent text-center outline-none p-0 tabular-nums"
        value={mStr}
        onChange={(e) =>
          setMStr(e.target.value.replace(/\D/g, "").slice(0, 2))
        }
        onFocus={(e) => e.target.select()}
        onBlur={(e) => commitMinutes(e.target.value)}
        onKeyDown={handleKeyDown(commitMinutes)}
        disabled={disabled}
        aria-label={t("hm.m_aria")}
      />
      <span className="text-muted-foreground select-none text-xs">мин</span>
      <div className="flex flex-col ml-1 -my-px">
        <button
          type="button"
          onClick={() => stepBy15(1)}
          disabled={disabled}
          className="flex items-center justify-center h-3.5 w-5 rounded-sm hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label={t("hm.step_up_aria")}
          tabIndex={-1}
        >
          <ChevronUp className="size-3" />
        </button>
        <button
          type="button"
          onClick={() => stepBy15(-1)}
          disabled={disabled || safeVal === 0}
          className="flex items-center justify-center h-3.5 w-5 rounded-sm hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label={t("hm.step_down_aria")}
          tabIndex={-1}
        >
          <ChevronDown className="size-3" />
        </button>
      </div>
    </div>
  )
}
