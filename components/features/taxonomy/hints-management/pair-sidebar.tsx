"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import type { LocalHint } from "./_shared";

interface FilterableItem {
  id: number;
  name: string;
}

interface WorkTypeListProps {
  workTypes: FilterableItem[];
  selectedWorkTypeId: number | null;
  onSelect: (id: number | null) => void;
  hints: LocalHint[];
  search: string;
  onSearchChange: (v: string) => void;
}

export function WorkTypeList({
  workTypes,
  selectedWorkTypeId,
  onSelect,
  hints,
  search,
  onSearchChange,
}: WorkTypeListProps) {
  const t = useTranslations("screen.hints");
  const tCommon = useTranslations("common");

  const filtered = workTypes.filter((wt) =>
    wt.name.toLowerCase().includes(search.toLowerCase())
  );

  function hintsCountForWorkType(wtId: number) {
    return hints.filter((h) => h.work_type_id === wtId).length;
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
        <Input
          placeholder={t("pair_view.search_placeholder")}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-8 h-8 text-sm"
        />
      </div>
      <div className="flex flex-col gap-0.5 max-h-56 overflow-y-auto pr-0.5">
        {filtered.map((wt) => {
          const count = hintsCountForWorkType(wt.id);
          const isSelected = selectedWorkTypeId === wt.id;
          return (
            <button
              key={wt.id}
              onClick={() => onSelect(isSelected ? null : wt.id)}
              className={cn(
                "flex items-center justify-between gap-2 rounded-md px-2.5 py-2 text-sm text-left transition-colors",
                "hover:bg-muted",
                isSelected && "bg-accent border-l-4 border-primary pl-1.5"
              )}
            >
              <span className="truncate font-medium">{wt.name}</span>
              <span className="text-xs text-muted-foreground shrink-0">{count}</span>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-xs text-muted-foreground px-2 py-1">{tCommon("noResults")}</p>
        )}
      </div>
    </div>
  );
}

interface ZoneListProps {
  zones: FilterableItem[];
  selectedZoneId: number | null;
  selectedWorkTypeId: number | null;
  onSelect: (id: number | null) => void;
  hints: LocalHint[];
  search: string;
  onSearchChange: (v: string) => void;
}

export function ZoneList({
  zones,
  selectedZoneId,
  selectedWorkTypeId,
  onSelect,
  hints,
  search,
  onSearchChange,
}: ZoneListProps) {
  const t = useTranslations("screen.hints");
  const tCommon = useTranslations("common");

  const filtered = zones.filter((z) =>
    z.name.toLowerCase().includes(search.toLowerCase())
  );

  function hintsCountForZone(zId: number) {
    return hints.filter(
      (h) => h.zone_id === zId && (selectedWorkTypeId ? h.work_type_id === selectedWorkTypeId : true)
    ).length;
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
        <Input
          placeholder={t("pair_view.search_placeholder")}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-8 h-8 text-sm"
        />
      </div>
      <div className="flex flex-col gap-0.5 max-h-56 overflow-y-auto pr-0.5">
        {filtered.map((z) => {
          const count = hintsCountForZone(z.id);
          const isSelected = selectedZoneId === z.id;
          return (
            <button
              key={z.id}
              onClick={() => onSelect(isSelected ? null : z.id)}
              className={cn(
                "flex items-center justify-between gap-2 rounded-md px-2.5 py-2 text-sm text-left transition-colors",
                "hover:bg-muted",
                isSelected && "bg-accent border-l-4 border-primary pl-1.5"
              )}
            >
              <span className="truncate font-medium">{z.name}</span>
              <span className="text-xs text-muted-foreground shrink-0">{count}</span>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-xs text-muted-foreground px-2 py-1">{tCommon("noResults")}</p>
        )}
      </div>
    </div>
  );
}
