import { useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { DOCUMENT_TYPES } from "./_shared";

export function TypeCombobox({
  value,
  onChange,
  tType,
  tAll,
}: {
  value: string;
  onChange: (v: string) => void;
  tType: (key: string) => string;
  tAll: string;
}) {
  const [open, setOpen] = useState(false);
  const active = !!value;
  const label = active ? tType(value) : tAll;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={active ? "secondary" : "outline"}
          size="sm"
          className="h-9 gap-1.5 text-sm min-w-[120px] justify-between"
          aria-expanded={open}
          aria-label={label}
        >
          <span className="truncate">{label}</span>
          <div className="flex items-center gap-0.5">
            {active && (
              <span
                role="button"
                tabIndex={0}
                aria-label="Clear"
                className="rounded-full hover:text-destructive p-0.5"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.stopPropagation();
                    onChange("");
                  }
                }}
              >
                <X className="size-3" />
              </span>
            )}
            <ChevronDown className="size-3.5 text-muted-foreground" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-0" align="start">
        <Command>
          <CommandList>
            <CommandEmpty>—</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="__all__"
                onSelect={() => { onChange(""); setOpen(false); }}
                className={cn("text-sm", !active && "font-semibold text-primary")}
              >
                {tAll}
              </CommandItem>
              {DOCUMENT_TYPES.map((type) => (
                <CommandItem
                  key={type}
                  value={type}
                  onSelect={() => { onChange(type); setOpen(false); }}
                  className={cn("text-sm", value === type && "font-semibold text-primary")}
                >
                  {tType(type)}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
