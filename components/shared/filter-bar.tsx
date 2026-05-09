"use client"

import * as React from "react"
import { X } from "lucide-react"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

import { DateRangePicker } from "./date-range-picker"
import { FilterChip } from "./filter-chip"
import { MultiSelectCombobox } from "./multi-select-combobox"
import { SingleSelectCombobox } from "./single-select-combobox"

/**
 * Shared filter-bar primitives. Three building blocks, composable:
 *
 * 1. `<FilterBar controls={...}>` — config-driven horizontal row of typed
 *    controls. Use when feature filter set is plain (search + comboboxes +
 *    date range + tabs). 80% of cases.
 *
 * 2. `<DesktopFilterRow>` — bare flex-wrap container (with optional sticky
 *    wrapper). Use as a layout when you need raw JSX inside (custom toggles,
 *    tooltip-wrapped buttons, etc).
 *
 * 3. `<FilterChipsRow>` — the "active chips + clear-all link" row that
 *    appears below most filter bars. Auto-hides when chips list is empty.
 *
 * Why three blocks rather than one monster `<FilterBar>`: feature filter
 * sets vary too much (sticky audit log, tab+filters split, custom toggles,
 * matrix-style permission row). One config-driven component would either
 * become a god-object with 30 props, or force duplicating layout JSX inside
 * `kind: "custom"` — neither helps.
 */

export interface FilterOption {
  value: string
  label: string
}

export type FilterControl =
  | {
      kind: "search"
      value: string
      onChange: (v: string) => void
      placeholder: string
      className?: string
      ariaLabel?: string
    }
  | {
      kind: "single-select"
      value: string
      onChange: (v: string) => void
      options: FilterOption[]
      placeholder: string
      searchPlaceholder?: string
      emptyLabel?: string
      className?: string
    }
  | {
      kind: "multi-select"
      value: string[]
      onChange: (v: string[]) => void
      options: FilterOption[]
      placeholder: string
      multiLabel?: (n: number) => string
      searchPlaceholder?: string
      emptyLabel?: string
      className?: string
    }
  | {
      kind: "date-range"
      from: Date | undefined
      to: Date | undefined
      onChange: (from: Date | undefined, to: Date | undefined) => void
      placeholder: string
      disableFuture?: boolean
      clearable?: boolean
      clearLabel?: string
      className?: string
    }
  | {
      kind: "tabs"
      value: string
      onChange: (v: string) => void
      options: FilterOption[]
      className?: string
    }
  | {
      kind: "custom"
      key: string
      render: () => React.ReactNode
    }

export interface FilterBarProps {
  /** Ordered list of controls to render in the flex-wrap row. */
  controls: FilterControl[]
  /** Show "Clear all" trailing button when count > 0. */
  activeFiltersCount?: number
  onClearAll?: () => void
  /** Override the clear-all label (defaults to common.clearAll). */
  clearAllLabel?: string
  /** Hide the entire bar on screens < md. Default: false (always visible). */
  desktopOnly?: boolean
  className?: string
}

/**
 * Config-driven horizontal filter row. Renders each control via the right
 * shared primitive. Trailing "Clear all" button appears when `activeFiltersCount > 0`.
 */
export function FilterBar({
  controls,
  activeFiltersCount,
  onClearAll,
  clearAllLabel,
  desktopOnly = false,
  className,
}: FilterBarProps) {
  const tCommon = useTranslations("common")
  const showClear =
    activeFiltersCount !== undefined && activeFiltersCount > 0 && !!onClearAll

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2",
        desktopOnly && "hidden md:flex",
        className,
      )}
      role="group"
      aria-label={tCommon("filters")}
    >
      {controls.map((c, i) => (
        <FilterControlRenderer key={getControlKey(c, i)} control={c} />
      ))}
      {showClear && (
        <Button
          variant="ghost"
          size="sm"
          className="h-9 text-sm text-muted-foreground hover:text-foreground gap-1"
          onClick={onClearAll}
        >
          <X className="size-3.5" aria-hidden="true" />
          {clearAllLabel ?? tCommon("clearAll")}
        </Button>
      )}
    </div>
  )
}

function getControlKey(c: FilterControl, i: number): string {
  if (c.kind === "custom") return `custom-${c.key}`
  return `${c.kind}-${i}`
}

/**
 * Search input с локальным state mirror.
 *
 * Зачем: на listing-экранах вызов `onChange` оборачивается в
 * `startTransition(...)` чтобы таблица перефильтровалась как non-urgent
 * update. При этом проп `control.value` приходит из transition-state и
 * между keystroke и приходом нового значения "отстаёт" → input лагает.
 *
 * Решение: локальное `inputValue` обновляется синхронно (urgent), а в
 * родителя пробрасываем `onChange` который тот, в свою очередь, может
 * обернуть в transition без потери responsiveness ввода.
 *
 * Если родитель меняет `control.value` извне (нпр. clearAll), мы это
 * подхватываем через useEffect-синхронизацию.
 */
function SearchControl({
  control,
}: {
  control: Extract<FilterControl, { kind: "search" }>
}) {
  const [inputValue, setInputValue] = React.useState(control.value)

  // Внешние обновления (clearAll, URL-back, programmatic reset) → синкаем.
  // Не синкаем, если значение совпадает — иначе бы создали лишний rerender.
  React.useEffect(() => {
    setInputValue((prev) => (prev === control.value ? prev : control.value))
  }, [control.value])

  return (
    <Input
      value={inputValue}
      onChange={(e) => {
        const v = e.target.value
        setInputValue(v) // urgent — input стал responsive
        control.onChange(v) // родитель может обернуть в startTransition
      }}
      placeholder={control.placeholder}
      aria-label={control.ariaLabel ?? control.placeholder}
      className={cn("h-9 w-full sm:w-64", control.className)}
    />
  )
}

function FilterControlRenderer({ control }: { control: FilterControl }) {
  switch (control.kind) {
    case "search":
      return <SearchControl control={control} />


    case "single-select":
      return (
        <SingleSelectCombobox
          options={control.options}
          value={control.value}
          onValueChange={control.onChange}
          placeholder={control.placeholder}
          searchPlaceholder={control.searchPlaceholder}
          emptyLabel={control.emptyLabel}
          className={control.className}
        />
      )

    case "multi-select":
      return (
        <MultiSelectCombobox
          options={control.options}
          selected={control.value}
          onSelectionChange={control.onChange}
          placeholder={control.placeholder}
          multiLabel={control.multiLabel}
          searchPlaceholder={control.searchPlaceholder}
          emptyLabel={control.emptyLabel}
          className={control.className}
        />
      )

    case "date-range":
      return (
        <DateRangePicker
          from={control.from}
          to={control.to}
          onChange={control.onChange}
          placeholder={control.placeholder}
          disableFuture={control.disableFuture}
          clearable={control.clearable}
          clearLabel={control.clearLabel}
          className={control.className}
        />
      )

    case "tabs":
      return (
        <Tabs
          value={control.value}
          onValueChange={control.onChange}
          className={control.className}
        >
          <TabsList>
            {control.options.map((opt) => (
              <TabsTrigger key={opt.value} value={opt.value}>
                {opt.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )

    case "custom":
      return <>{control.render()}</>
  }
}

/* ─────────────────────────────────────────────────────────────────────────
 * DesktopFilterRow — bare flex-wrap container for raw JSX consumers.
 * ──────────────────────────────────────────────────────────────────────── */

export interface DesktopFilterRowProps {
  children: React.ReactNode
  /** Add `hidden md:flex` — hides on mobile so MobileFilterSheet can take over. */
  desktopOnly?: boolean
  /** Wrap with a sticky+blurred backdrop (used by audit log etc). */
  sticky?: boolean
  className?: string
}

export function DesktopFilterRow({
  children,
  desktopOnly = false,
  sticky = false,
  className,
}: DesktopFilterRowProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2",
        desktopOnly && "hidden md:flex",
        sticky &&
          "sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80",
        className,
      )}
    >
      {children}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
 * FilterChipsRow — chips list + "Clear all" trailing link.
 * ──────────────────────────────────────────────────────────────────────── */

export interface FilterChipDescriptor {
  key: string
  label: string
  value: string
  onRemove: () => void
}

export interface FilterChipsRowProps {
  chips: FilterChipDescriptor[]
  onClearAll?: () => void
  /** Override default common.clearAll label. */
  clearAllLabel?: string
  /** Show clear button as trailing link (default) or as ghost button. */
  variant?: "link" | "ghost"
  className?: string
}

export function FilterChipsRow({
  chips,
  onClearAll,
  clearAllLabel,
  variant = "link",
  className,
}: FilterChipsRowProps) {
  const tCommon = useTranslations("common")

  if (chips.length === 0) return null

  return (
    <div
      className={cn("flex flex-wrap items-center gap-2", className)}
      role="list"
      aria-label={tCommon("filters")}
    >
      {chips.map((chip) => (
        <FilterChip
          key={chip.key}
          label={chip.label}
          value={chip.value}
          onRemove={chip.onRemove}
        />
      ))}
      {onClearAll &&
        (variant === "link" ? (
          <button
            type="button"
            onClick={onClearAll}
            className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors px-1"
          >
            {clearAllLabel ?? tCommon("clearAll")}
          </button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1"
            onClick={onClearAll}
          >
            <X className="size-3" aria-hidden="true" />
            {clearAllLabel ?? tCommon("clearAll")}
          </Button>
        ))}
    </div>
  )
}
