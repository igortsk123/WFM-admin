"use client"

import { useTranslations } from "next-intl"

import { FilterChip } from "@/components/shared/filter-chip"

export interface ActiveChip {
  label: string
  value: string
  onRemove: () => void
}

interface ActiveFilterChipsProps {
  chips: ActiveChip[]
  onClearAll: () => void
}

export function ActiveFilterChips({ chips, onClearAll }: ActiveFilterChipsProps) {
  const tCommon = useTranslations("common")

  if (chips.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip, i) => (
        <FilterChip
          key={`${chip.label}-${chip.value}-${i}`}
          label={chip.label}
          value={chip.value}
          onRemove={chip.onRemove}
        />
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className="text-xs text-primary hover:underline"
      >
        {tCommon("clear_all")}
      </button>
    </div>
  )
}
