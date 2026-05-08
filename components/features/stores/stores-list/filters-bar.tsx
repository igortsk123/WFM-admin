"use client"

import { useTranslations } from "next-intl"
import { Search, X } from "lucide-react"

import type { ObjectFormat } from "@/lib/types"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { FilterChip } from "@/components/shared/filter-chip"
import { MobileFilterSheet } from "@/components/shared/mobile-filter-sheet"
import { SingleSelectCombobox } from "@/components/shared/single-select-combobox"

import { CITY_OPTIONS, FORMAT_OPTIONS } from "./_shared"

interface FiltersBarProps {
  searchValue: string
  cityValue: string
  storeTypeValue: string
  selectedFormats: ObjectFormat[]
  hasActiveFilters: boolean
  activeFilterCount: number
  onSearchChange: (value: string) => void
  onCityChange: (value: string) => void
  onStoreTypeChange: (value: string) => void
  onRemoveFormat: (value: ObjectFormat) => void
  onClearAll: () => void
}

export function FiltersBar({
  searchValue,
  cityValue,
  storeTypeValue,
  selectedFormats,
  hasActiveFilters,
  activeFilterCount,
  onSearchChange,
  onCityChange,
  onStoreTypeChange,
  onRemoveFormat,
  onClearAll,
}: FiltersBarProps) {
  const t = useTranslations("screen.stores")

  const hasChips = !!cityValue || !!storeTypeValue || selectedFormats.length > 0

  return (
    <>
      {/* Filter row — desktop */}
      <div className="hidden md:flex items-center gap-2 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-0 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            className="h-9 pl-9"
            placeholder={t("filters.search_placeholder")}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {searchValue && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => onSearchChange("")}
              aria-label="Очистить поиск"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* City */}
        <SingleSelectCombobox
          options={CITY_OPTIONS}
          value={cityValue}
          onValueChange={onCityChange}
          placeholder={t("filters.city")}
          className="w-40"
        />

        {/* Format */}
        <Select
          value={storeTypeValue}
          onValueChange={onStoreTypeChange}
        >
          <SelectTrigger className="h-9 w-44">
            <SelectValue placeholder={t("filters.store_type")} />
          </SelectTrigger>
          <SelectContent>
            {FORMAT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Clear */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            className="gap-1 text-muted-foreground"
          >
            <X className="size-3.5" /> {t("filters.clear_all")}
          </Button>
        )}
      </div>

      {/* Filter row — mobile (sheet) */}
      <MobileFilterSheet
        activeCount={activeFilterCount}
        onClearAll={onClearAll}
        onApply={() => {}}
        className="md:hidden"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              {t("filters.search_placeholder")}
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <Input
                className="h-11 pl-9"
                placeholder={t("filters.search_placeholder")}
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">{t("filters.city")}</Label>
            <SingleSelectCombobox
              options={CITY_OPTIONS}
              value={cityValue}
              onValueChange={onCityChange}
              placeholder={t("filters.city")}
              className="w-full"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">{t("filters.store_type")}</Label>
            <Select value={storeTypeValue} onValueChange={onStoreTypeChange}>
              <SelectTrigger className="h-11 w-full">
                <SelectValue placeholder={t("filters.store_type")} />
              </SelectTrigger>
              <SelectContent>
                {FORMAT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </MobileFilterSheet>

      {/* Active filter chips */}
      {hasChips && (
        <div className="flex flex-wrap gap-2">
          {cityValue && (
            <FilterChip
              label={t("filters.city")}
              value={cityValue}
              onRemove={() => onCityChange("")}
            />
          )}
          {storeTypeValue && (
            <FilterChip
              label={t("filters.store_type")}
              value={
                FORMAT_OPTIONS.find((f) => f.value === storeTypeValue)?.label ?? storeTypeValue
              }
              onRemove={() => onStoreTypeChange("")}
            />
          )}
          {selectedFormats.map((fmt) => (
            <FilterChip
              key={fmt}
              label={t("filters.format")}
              value={FORMAT_OPTIONS.find((f) => f.value === fmt)?.label ?? fmt}
              onRemove={() => onRemoveFormat(fmt)}
            />
          ))}
        </div>
      )}
    </>
  )
}
