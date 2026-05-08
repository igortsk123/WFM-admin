"use client";

import { useTranslations } from "next-intl";
import { Plus, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { HINT_WORK_TYPE_IDS, type HintFilter } from "./_shared";

// ═══════════════════════════════════════════════════════════════════
// EDITOR SKELETON (loading state)
// ═══════════════════════════════════════════════════════════════════

export function EditorSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// LEFT PANEL — work types list with search & filters
// ═══════════════════════════════════════════════════════════════════

interface WorkTypeItem {
  id: number;
  name: string;
}

interface LeftPanelContentProps {
  workTypes: WorkTypeItem[];
  search: string;
  onSearchChange: (v: string) => void;
  filter: HintFilter;
  onFilterChange: (f: HintFilter) => void;
  selectedWorkTypeId: number | null;
  onSelect: (id: number) => void;
}

export function LeftPanelContent({
  workTypes,
  search,
  onSearchChange,
  filter,
  onFilterChange,
  selectedWorkTypeId,
  onSelect,
}: LeftPanelContentProps) {
  const t = useTranslations("screen.aiCoach");

  const filteredWorkTypes = workTypes.filter((wt) => {
    const matchesSearch = wt.name.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (filter === "with_hint") return HINT_WORK_TYPE_IDS.has(wt.id);
    if (filter === "without_hint") return !HINT_WORK_TYPE_IDS.has(wt.id);
    return true;
  });

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border space-y-2 shrink-0">
        <p className="text-sm font-medium text-foreground">{t("left_panel.title")}</p>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            placeholder={t("left_panel.search_placeholder")}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {(["all", "with_hint", "without_hint"] as HintFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => onFilterChange(f)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                filter === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {f === "all"
                ? t("left_panel.filter_all")
                : f === "with_hint"
                ? t("left_panel.filter_with_hint")
                : t("left_panel.filter_without")}
            </button>
          ))}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-0.5">
          {filteredWorkTypes.map((wt) => {
            const hasHint = HINT_WORK_TYPE_IDS.has(wt.id);
            const isSelected = wt.id === selectedWorkTypeId;
            const topVersion = wt.id === 4 ? 3 : null;
            return (
              <button
                key={wt.id}
                onClick={() => onSelect(wt.id)}
                className={cn(
                  "w-full flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left transition-colors",
                  isSelected
                    ? "bg-accent border-l-4 border-primary"
                    : "hover:bg-muted/50 border-l-4 border-transparent"
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={cn(
                      "size-2 rounded-full shrink-0",
                      hasHint ? "bg-success" : "bg-muted-foreground/30"
                    )}
                  />
                  <span className="text-sm font-medium truncate">{wt.name}</span>
                </div>
                <Badge variant="outline" className="font-mono text-xs shrink-0">
                  {topVersion != null ? `v${topVersion}` : t("left_panel.no_version")}
                </Badge>
              </button>
            );
          })}
        </div>
      </ScrollArea>

      <div className="p-3 border-t border-border shrink-0">
        <Button variant="outline" size="sm" className="w-full">
          <Plus className="size-4 mr-1.5" />
          <span className="text-xs">{t("left_panel.add_for_missing")}</span>
        </Button>
      </div>
    </div>
  );
}
