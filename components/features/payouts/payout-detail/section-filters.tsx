"use client";

import { useTranslations } from "next-intl";
import { Search, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import type { FilterMode } from "./_shared";

interface FiltersBarProps {
  filterMode: FilterMode;
  onFilterModeChange: (mode: FilterMode) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  anomalyCount: number;
}

export function FiltersBar({
  filterMode,
  onFilterModeChange,
  searchQuery,
  onSearchQueryChange,
  anomalyCount,
}: FiltersBarProps) {
  const t = useTranslations("screen.payoutDetail.filters");

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={filterMode === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => onFilterModeChange("all")}
        >
          {t("all")}
        </Button>
        <Button
          variant={filterMode === "anomalies" ? "default" : "outline"}
          size="sm"
          onClick={() => onFilterModeChange("anomalies")}
          className={anomalyCount > 0 ? "gap-1.5" : ""}
        >
          {t("anomalies")}
          {anomalyCount > 0 && (
            <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5">
              {anomalyCount}
            </Badge>
          )}
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder={t("search")}
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          className="pl-9 w-full md:w-64"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 size-6"
            onClick={() => onSearchQueryChange("")}
          >
            <X className="size-3" />
          </Button>
        )}
      </div>
    </div>
  );
}
