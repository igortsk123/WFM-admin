"use client";

import { useTranslations } from "next-intl";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { NotificationCategory } from "@/lib/types";
import { CATEGORY_CONFIG } from "./notification-category-badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

export interface NotificationFiltersState {
  search: string;
  categories: NotificationCategory[];
}

interface NotificationFiltersProps {
  value: NotificationFiltersState;
  onChange: (value: NotificationFiltersState) => void;
}

// ═══════════════════════════════════════════════════════════════════
// CATEGORY GROUPS
// ═══════════════════════════════════════════════════════════════════

type CategoryGroup = "tasks" | "freelance" | "ai" | "other";

const ALL_CATEGORIES = Object.keys(CATEGORY_CONFIG) as NotificationCategory[];

function groupCategories(): Record<CategoryGroup, NotificationCategory[]> {
  const groups: Record<CategoryGroup, NotificationCategory[]> = {
    tasks: [],
    freelance: [],
    ai: [],
    other: [],
  };
  for (const cat of ALL_CATEGORIES) {
    const group = CATEGORY_CONFIG[cat].group;
    groups[group].push(cat);
  }
  return groups;
}

// ═══════════════════════════════════════════════════════════════════
// CATEGORY COMBOBOX
// ═══════════════════════════════════════════════════════════════════

interface CategoryComboboxProps {
  selected: NotificationCategory[];
  onToggle: (cat: NotificationCategory) => void;
  onClearCategories: () => void;
}

function CategoryCombobox({
  selected,
  onToggle,
  onClearCategories,
}: CategoryComboboxProps) {
  const t = useTranslations("screen.notifications");
  const [open, setOpen] = useState(false);
  const groups = groupCategories();

  const groupLabels: Record<CategoryGroup, string> = {
    tasks: t("filters.category_group_tasks"),
    freelance: t("filters.category_group_freelance"),
    ai: t("filters.category_group_ai"),
    other: t("filters.category_group_other"),
  };

  const triggerLabel =
    selected.length === 0
      ? t("filters.category_all")
      : selected.length === 1
      ? t(`category.${selected[0]}`)
      : `${t("filters.category")} (${selected.length})`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "h-9 justify-between gap-2 min-w-[160px]",
            selected.length > 0 && "border-primary text-primary"
          )}
        >
          <span className="truncate text-sm">{triggerLabel}</span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[260px] p-0" align="start">
        <Command>
          <CommandInput placeholder={t("filters.search_placeholder")} className="h-9" />
          <CommandList>
            <CommandEmpty>{t("filters.category_all")}</CommandEmpty>
            {(["tasks", "freelance", "ai", "other"] as CategoryGroup[]).map(
              (groupKey, idx) => (
                <div key={groupKey}>
                  {idx > 0 && <CommandSeparator />}
                  <CommandGroup heading={groupLabels[groupKey]}>
                    {groups[groupKey].map((cat) => {
                      const Icon = CATEGORY_CONFIG[cat].icon;
                      const isChecked = selected.includes(cat);
                      return (
                        <CommandItem
                          key={cat}
                          value={cat}
                          onSelect={() => onToggle(cat)}
                          className="gap-2"
                        >
                          <Icon className="size-4 shrink-0 text-muted-foreground" />
                          <span className="flex-1 truncate text-sm">
                            {t(`category.${cat}`)}
                          </span>
                          <Check
                            className={cn(
                              "size-4 shrink-0",
                              isChecked ? "opacity-100 text-primary" : "opacity-0"
                            )}
                          />
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </div>
              )
            )}
          </CommandList>
          {selected.length > 0 && (
            <>
              <div className="border-t p-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs h-8"
                  onClick={() => {
                    onClearCategories();
                    setOpen(false);
                  }}
                >
                  {t("filters.clear_all")}
                </Button>
              </div>
            </>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ═══════════════════════════════════════════════════════════════════
// FILTER TOOLBAR
// ═══════════════════════════════════════════════════════════════════

export function NotificationFilters({ value, onChange }: NotificationFiltersProps) {
  const t = useTranslations("screen.notifications");

  const hasActiveFilters = value.search.length > 0 || value.categories.length > 0;

  const handleToggleCategory = (cat: NotificationCategory) => {
    const next = value.categories.includes(cat)
      ? value.categories.filter((c) => c !== cat)
      : [...value.categories, cat];
    onChange({ ...value, categories: next });
  };

  const handleClearCategories = () => {
    onChange({ ...value, categories: [] });
  };

  const handleClearAll = () => {
    onChange({ search: "", categories: [] });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Search */}
      <div className="relative flex-1 min-w-[180px] max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input
          value={value.search}
          onChange={(e) => onChange({ ...value, search: e.target.value })}
          placeholder={t("filters.search_placeholder")}
          className="pl-8 h-9 text-sm"
        />
        {value.search && (
          <button
            onClick={() => onChange({ ...value, search: "" })}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {/* Category combobox */}
      <CategoryCombobox
        selected={value.categories}
        onToggle={handleToggleCategory}
        onClearCategories={handleClearCategories}
      />

      {/* Clear all */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="h-9 text-xs text-muted-foreground"
          onClick={handleClearAll}
        >
          <X className="mr-1 size-3.5" />
          {t("filters.clear_all")}
        </Button>
      )}
    </div>
  );
}
