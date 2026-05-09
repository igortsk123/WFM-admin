import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { FilterChip } from "@/components/shared/filter-chip";
import { MobileFilterSheet } from "@/components/shared/mobile-filter-sheet";

import {
  CATEGORY_OPTIONS,
  type PeriodOption,
} from "./_shared";

interface FilterChipDescriptor {
  label: string;
  value: string;
  onRemove: () => void;
}

interface SectionToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  category: string;
  onCategoryChange: (value: string) => void;
  period: PeriodOption;
  onPeriodChange: (value: PeriodOption) => void;
  filterChips: FilterChipDescriptor[];
  activeFilterCount: number;
  onClearFilters: () => void;
  onApplyFilters: () => void;
}

export function SectionToolbar({
  search,
  onSearchChange,
  category,
  onCategoryChange,
  period,
  onPeriodChange,
  filterChips,
  activeFilterCount,
  onClearFilters,
  onApplyFilters,
}: SectionToolbarProps) {
  const t = useTranslations("screen.notifications");

  return (
    <div className="space-y-3">
      {/* Search — full width on mobile */}
      <Input
        placeholder={t("filters.search_placeholder")}
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="w-full h-9"
        aria-label={t("filters.search_placeholder")}
      />

      {/* Selects + mobile filter sheet */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Category select — hidden on mobile (in filter sheet) */}
        <Select value={category} onValueChange={onCategoryChange}>
          <SelectTrigger className="hidden md:flex w-52 h-9 text-sm">
            <SelectValue placeholder={t("filters.category_all")} />
          </SelectTrigger>
          <SelectContent>
            {CATEGORY_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {t(opt.labelKey as Parameters<typeof t>[0])}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Period select — hidden on mobile */}
        <Select
          value={period}
          onValueChange={(v) => onPeriodChange(v as PeriodOption)}
        >
          <SelectTrigger className="hidden md:flex w-40 h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Сегодня</SelectItem>
            <SelectItem value="7d">7 дней</SelectItem>
            <SelectItem value="30d">30 дней</SelectItem>
            <SelectItem value="all">Всё время</SelectItem>
          </SelectContent>
        </Select>

        {/* Mobile filter sheet */}
        <MobileFilterSheet
          activeCount={activeFilterCount}
          onClearAll={onClearFilters}
          onApply={onApplyFilters}
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">{t("filters.category")}</p>
              <Select value={category} onValueChange={onCategoryChange}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {t(opt.labelKey as Parameters<typeof t>[0])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">{t("filters.date_range")}</p>
              <Select
                value={period}
                onValueChange={(v) => onPeriodChange(v as PeriodOption)}
              >
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Сегодня</SelectItem>
                  <SelectItem value="7d">7 дней</SelectItem>
                  <SelectItem value="30d">30 дней</SelectItem>
                  <SelectItem value="all">Всё время</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </MobileFilterSheet>

        {/* Clear all */}
        {filterChips.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 text-sm text-muted-foreground"
            onClick={onClearFilters}
          >
            {t("filters.clear_all")}
          </Button>
        )}
      </div>

      {/* Active filter chips */}
      {filterChips.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {filterChips.map((chip) => (
            <FilterChip
              key={chip.label}
              label={chip.label}
              value={chip.value}
              onRemove={chip.onRemove}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export type { FilterChipDescriptor };
