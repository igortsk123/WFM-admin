"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { ChevronsUpDown, Check } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"

import type { ComboOption } from "./_shared"

interface ComboboxFilterProps {
  placeholder: string
  options: ComboOption[]
  value: string
  onSelect: (v: string) => void
  className?: string
}

export function ComboboxFilter({ placeholder, options, value, onSelect, className }: ComboboxFilterProps) {
  const [open, setOpen] = React.useState(false)
  const tc = useTranslations("common")
  const selected = options.find((o) => o.value === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("justify-between min-w-[160px] h-9 font-normal", className)}
        >
          <span className="truncate">{selected?.label ?? placeholder}</span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-0" align="start">
        <Command>
          <CommandInput placeholder={tc("search")} className="h-9" />
          <CommandList>
            <CommandEmpty>{tc("noResults")}</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value=""
                onSelect={() => { onSelect(""); setOpen(false) }}
              >
                <Check className={cn("mr-2 size-4", value === "" ? "opacity-100" : "opacity-0")} />
                {tc("all")}
              </CommandItem>
              {options.map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={opt.value}
                  onSelect={(v) => { onSelect(v); setOpen(false) }}
                >
                  <Check className={cn("mr-2 size-4", value === opt.value ? "opacity-100" : "opacity-0")} />
                  {opt.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
