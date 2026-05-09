import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/shared/date-range-picker";
import { MobileFilterSheet } from "@/components/shared/mobile-filter-sheet";
import { TypeCombobox } from "./type-combobox";
import {
  DOCUMENT_TYPES,
  parseIsoDate,
  toIsoDate,
  type FilterState,
} from "./_shared";

interface FiltersBarProps {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  activeFilterCount: number;
  onClearAll: () => void;
  tType: (key: string) => string;
}

/**
 * Desktop filter row — visible at md+
 */
export function DesktopFilterBar({
  filters,
  setFilters,
  activeFilterCount,
  onClearAll,
  tType,
}: FiltersBarProps) {
  const t = useTranslations("screen.agentDocuments");
  const tCommon = useTranslations("common");

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <TypeCombobox
        value={filters.type}
        onChange={(v) => setFilters((f) => ({ ...f, type: v }))}
        tType={tType}
        tAll={t("filters.type_all")}
      />
      <DateRangePicker
        from={parseIsoDate(filters.dateFrom)}
        to={parseIsoDate(filters.dateTo)}
        onChange={(from, to) =>
          setFilters((f) => ({ ...f, dateFrom: toIsoDate(from), dateTo: toIsoDate(to) }))
        }
        placeholder={t("filters.date_range")}
        clearLabel={tCommon("clearAll")}
      />
      {activeFilterCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="h-9 text-sm text-muted-foreground hover:text-destructive"
          onClick={onClearAll}
        >
          <X className="size-3.5 mr-1" aria-hidden="true" />
          {tCommon("clearAll")}
        </Button>
      )}
    </div>
  );
}

/**
 * Mobile filter sheet — visible at <md
 */
export function MobileFiltersSheet({
  filters,
  setFilters,
  activeFilterCount,
  onClearAll,
  tType,
}: FiltersBarProps) {
  const t = useTranslations("screen.agentDocuments");

  return (
    <MobileFilterSheet
      activeCount={activeFilterCount}
      onClearAll={onClearAll}
      onApply={() => { /* filters are already reactive */ }}
    >
      <div className="flex flex-col gap-4">
        {/* Type */}
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-foreground">{t("filters.type")}</p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={!filters.type ? "default" : "outline"}
              className="h-9 text-sm min-h-[44px]"
              onClick={() => setFilters((f) => ({ ...f, type: "" }))}
            >
              {t("filters.type_all")}
            </Button>
            {DOCUMENT_TYPES.map((type) => (
              <Button
                key={type}
                size="sm"
                variant={filters.type === type ? "default" : "outline"}
                className="h-9 text-sm min-h-[44px]"
                onClick={() => setFilters((f) => ({ ...f, type }))}
              >
                {tType(type)}
              </Button>
            ))}
          </div>
        </div>
        {/* Date range */}
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-foreground">{t("filters.date_range")}</p>
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground" htmlFor="mob-doc-date-from">
                {t("filters.date_from")}
              </label>
              <input
                id="mob-doc-date-from"
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
                className="h-11 rounded-md border border-border bg-background px-3 text-sm text-foreground"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground" htmlFor="mob-doc-date-to">
                {t("filters.date_to")}
              </label>
              <input
                id="mob-doc-date-to"
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
                className="h-11 rounded-md border border-border bg-background px-3 text-sm text-foreground"
              />
            </div>
          </div>
        </div>
      </div>
    </MobileFilterSheet>
  );
}
