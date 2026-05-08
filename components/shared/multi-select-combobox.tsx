"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

/**
 * Multi-select combobox с чекбоксами в дропдауне. Используется для
 * массовых фильтров и bulk-операций. Trigger показывает: placeholder
 * если ничего не выбрано / название single-варианта если 1 / "N выбрано".
 */
export interface MultiSelectComboboxProps {
  options: { value: string; label: string }[]
  selected: string[]
  onSelectionChange: (values: string[]) => void
  placeholder: string
  /** Подпись когда selected.length > 1 — по умолчанию "{n} выбрано". */
  multiLabel?: (n: number) => string
  /** Поле поиска placeholder — по умолчанию "Поиск...". */
  searchPlaceholder?: string
  /** Empty state — по умолчанию "Ничего не найдено". */
  emptyLabel?: string
  className?: string
}

export function MultiSelectCombobox({
  options,
  selected,
  onSelectionChange,
  placeholder,
  multiLabel,
  searchPlaceholder = "Поиск...",
  emptyLabel = "Ничего не найдено",
  className,
}: MultiSelectComboboxProps) {
  const [open, setOpen] = React.useState(false)

  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onSelectionChange(selected.filter((v) => v !== value))
    } else {
      onSelectionChange([...selected, value])
    }
  }

  const displayLabel =
    selected.length === 0
      ? placeholder
      : selected.length === 1
        ? options.find((o) => o.value === selected[0])?.label ?? placeholder
        : (multiLabel?.(selected.length) ?? `${selected.length} выбрано`)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "h-9 justify-between font-normal text-sm",
            selected.length > 0 ? "text-foreground" : "text-muted-foreground",
            className,
          )}
        >
          <span className="truncate">{displayLabel}</span>
          <ChevronsUpDown className="ml-2 size-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-60 p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} className="h-9" />
          <CommandList>
            <CommandEmpty>{emptyLabel}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={() => toggle(option.value)}
                  className="gap-2"
                >
                  <div
                    className={cn(
                      "flex size-4 items-center justify-center rounded border border-border",
                      selected.includes(option.value)
                        ? "bg-primary border-primary"
                        : "opacity-50",
                    )}
                  >
                    {selected.includes(option.value) && (
                      <Check className="size-3 text-primary-foreground" />
                    )}
                  </div>
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
