"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  FilterChipsRow,
  MobileFilterSheet,
  type FilterChipDescriptor,
} from "@/components/shared";

import type { AISuggestionType, AISuggestionPriority } from "@/lib/types";

import type { TFn, TCommonFn } from "./_shared";

export interface FilterUpdate {
  type?: AISuggestionType | null;
  priority?: AISuggestionPriority | null;
  store_id?: number | null;
}

export interface FiltersBarProps {
  typeFilter: AISuggestionType | null;
  priorityFilter: AISuggestionPriority | null;
  storeFilter: number | null;
  stores: { id: number; name: string }[];
  onUpdateFilters: (updates: Record<string, string | null>) => void;
  onClearFilters: () => void;
  t: TFn;
  tCommon: TCommonFn;
}

export function FiltersBar({
  typeFilter,
  priorityFilter,
  storeFilter,
  stores,
  onUpdateFilters,
  onClearFilters,
  t,
  tCommon,
}: FiltersBarProps) {
  // Build active chips
  const chips: FilterChipDescriptor[] = [];
  if (typeFilter) {
    chips.push({
      key: "type",
      label: t("filters.type"),
      value: t(`type.${typeFilter}` as Parameters<typeof t>[0]),
      onRemove: () => onUpdateFilters({ type: null }),
    });
  }
  if (priorityFilter) {
    chips.push({
      key: "priority",
      label: t("filters.priority"),
      value: t(`priority.${priorityFilter}` as Parameters<typeof t>[0]),
      onRemove: () => onUpdateFilters({ priority: null }),
    });
  }
  if (storeFilter) {
    const store = stores.find((s) => s.id === storeFilter);
    chips.push({
      key: "store",
      label: t("filters.store"),
      value: store?.name || `#${storeFilter}`,
      onRemove: () => onUpdateFilters({ store_id: null }),
    });
  }

  return (
    <>
      {/* Filter row (desktop) */}
      <div className="hidden md:flex items-center gap-3 flex-wrap">
        <Select
          value={typeFilter || ""}
          onValueChange={(v) => onUpdateFilters({ type: v || null })}
        >
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder={t("filters.type")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TASK_SUGGESTION">
              {t("type.TASK_SUGGESTION")}
            </SelectItem>
            <SelectItem value="GOAL_SUGGESTION">
              {t("type.GOAL_SUGGESTION")}
            </SelectItem>
            <SelectItem value="BONUS_TASK_SUGGESTION">
              {t("type.BONUS_TASK_SUGGESTION")}
            </SelectItem>
            <SelectItem value="INSIGHT">{t("type.INSIGHT")}</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={priorityFilter || ""}
          onValueChange={(v) => onUpdateFilters({ priority: v || null })}
        >
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder={t("filters.priority")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="high">{t("priority.high")}</SelectItem>
            <SelectItem value="medium">{t("priority.medium")}</SelectItem>
            <SelectItem value="low">{t("priority.low")}</SelectItem>
          </SelectContent>
        </Select>

        {stores.length > 0 && (
          <Select
            value={storeFilter?.toString() || ""}
            onValueChange={(v) => onUpdateFilters({ store_id: v || null })}
          >
            <SelectTrigger className="w-[200px] h-9">
              <SelectValue placeholder={t("filters.store")} />
            </SelectTrigger>
            <SelectContent>
              {stores.map((store) => (
                <SelectItem key={store.id} value={store.id.toString()}>
                  {store.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Mobile filter sheet */}
      <MobileFilterSheet
        activeCount={chips.length}
        onClearAll={onClearFilters}
        onApply={() => {}}
      >
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium mb-2 block">
              {t("filters.type")}
            </Label>
            <Select
              value={typeFilter || ""}
              onValueChange={(v) => onUpdateFilters({ type: v || null })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("filters.type")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TASK_SUGGESTION">
                  {t("type.TASK_SUGGESTION")}
                </SelectItem>
                <SelectItem value="GOAL_SUGGESTION">
                  {t("type.GOAL_SUGGESTION")}
                </SelectItem>
                <SelectItem value="BONUS_TASK_SUGGESTION">
                  {t("type.BONUS_TASK_SUGGESTION")}
                </SelectItem>
                <SelectItem value="INSIGHT">{t("type.INSIGHT")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">
              {t("filters.priority")}
            </Label>
            <Select
              value={priorityFilter || ""}
              onValueChange={(v) => onUpdateFilters({ priority: v || null })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("filters.priority")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">{t("priority.high")}</SelectItem>
                <SelectItem value="medium">{t("priority.medium")}</SelectItem>
                <SelectItem value="low">{t("priority.low")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {stores.length > 0 && (
            <div>
              <Label className="text-sm font-medium mb-2 block">
                {t("filters.store")}
              </Label>
              <Select
                value={storeFilter?.toString() || ""}
                onValueChange={(v) => onUpdateFilters({ store_id: v || null })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("filters.store")} />
                </SelectTrigger>
                <SelectContent>
                  {stores.map((store) => (
                    <SelectItem key={store.id} value={store.id.toString()}>
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </MobileFilterSheet>

      {/* Active filter chips */}
      <FilterChipsRow
        chips={chips}
        onClearAll={onClearFilters}
        clearAllLabel={tCommon("clear_all")}
      />
    </>
  );
}

export function getActiveFiltersCount(
  typeFilter: AISuggestionType | null,
  priorityFilter: AISuggestionPriority | null,
  storeFilter: number | null
): number {
  let count = 0;
  if (typeFilter) count++;
  if (priorityFilter) count++;
  if (storeFilter) count++;
  return count;
}
