"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FilterMultiSelectProps {
  options: { id: number; name: string }[];
  selected: number[];
  onChange: (ids: number[]) => void;
  placeholder: string;
}

export function FilterMultiSelect({
  options,
  selected,
  onChange,
  placeholder,
}: FilterMultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  const selectedNames = options
    .filter((o) => selected.includes(o.id))
    .map((o) => o.name)
    .slice(0, 2)
    .join(", ");

  const label =
    selected.length === 0
      ? placeholder
      : selectedNames + (selected.length > 2 ? ` +${selected.length - 2}` : "");

  React.useEffect(() => {
    if (!open) return;
    function handler(e: PointerEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [open]);

  function toggle(id: number) {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  }

  return (
    <div ref={ref} className="relative min-w-[140px]">
      <Button
        variant="outline"
        size="sm"
        className="h-9 w-full justify-between text-sm font-normal truncate"
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="truncate text-left">{label}</span>
        <span className="ml-1 text-muted-foreground">▾</span>
      </Button>

      {open && (
        <div className="absolute top-full mt-1 left-0 z-50 min-w-full w-56 rounded-md border border-border bg-popover shadow-md overflow-hidden">
          <ul className="max-h-48 overflow-y-auto py-1" role="listbox" aria-multiselectable>
            {options.map((opt) => {
              const checked = selected.includes(opt.id);
              return (
                <li
                  key={opt.id}
                  role="option"
                  aria-selected={checked}
                  className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-accent"
                  onClick={() => toggle(opt.id)}
                >
                  <span
                    className={cn(
                      "size-4 rounded border border-border flex items-center justify-center shrink-0",
                      checked && "bg-primary border-primary",
                    )}
                  >
                    {checked && (
                      <span className="text-primary-foreground text-[10px] leading-none">✓</span>
                    )}
                  </span>
                  {opt.name}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
