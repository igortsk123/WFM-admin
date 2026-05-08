"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface MultiComboboxProps {
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
}

export function MultiCombobox({
  options,
  selected,
  onChange,
  placeholder,
}: MultiComboboxProps) {
  const [open, setOpen] = React.useState(false);

  function toggle(value: string) {
    onChange(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value]
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-9 justify-between gap-1.5 min-w-[140px] text-sm"
        >
          <span className="truncate">
            {selected.length === 0
              ? placeholder
              : selected.length === 1
              ? options.find((o) => o.value === selected[0])?.label ?? selected[0]
              : `${placeholder} (${selected.length})`}
          </span>
          <ChevronDown className="size-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="start">
        <Command>
          <CommandInput placeholder="Поиск..." />
          <CommandList>
            <CommandEmpty>Нет вариантов</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={opt.value}
                  onSelect={() => toggle(opt.value)}
                  className="cursor-pointer"
                >
                  <div
                    className={cn(
                      "mr-2 flex size-4 items-center justify-center rounded border border-muted-foreground/40",
                      selected.includes(opt.value) &&
                        "border-primary bg-primary text-primary-foreground"
                    )}
                  >
                    {selected.includes(opt.value) && (
                      <svg
                        viewBox="0 0 12 12"
                        className="size-3"
                        fill="currentColor"
                      >
                        <path
                          d="M10.5 2.5L4.5 9.5L1.5 6.5"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                  {opt.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
