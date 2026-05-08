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
 * Single-select combobox с поиском. Toggle-поведение: выбор уже-выбранного
 * значения снимает выбор (передаёт пустую строку).
 */
export interface SingleSelectComboboxProps {
  options: { value: string; label: string }[]
  value: string
  onValueChange: (value: string) => void
  placeholder: string
  searchPlaceholder?: string
  emptyLabel?: string
  className?: string
}

export function SingleSelectCombobox({
  options,
  value,
  onValueChange,
  placeholder,
  searchPlaceholder = "Поиск...",
  emptyLabel = "Ничего не найдено",
  className,
}: SingleSelectComboboxProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "h-9 justify-between font-normal text-sm",
            value ? "text-foreground" : "text-muted-foreground",
            className,
          )}
        >
          <span className="truncate">
            {value
              ? (options.find((o) => o.value === value)?.label ?? placeholder)
              : placeholder}
          </span>
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
                  onSelect={(current) => {
                    onValueChange(current === value ? "" : current)
                    setOpen(false)
                  }}
                  className="gap-2"
                >
                  <Check
                    className={cn(
                      "size-4",
                      value === option.value ? "opacity-100" : "opacity-0",
                    )}
                  />
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
