"use client"

import { type ColumnDef } from "@tanstack/react-table"

import type { StoreWithStats } from "@/lib/api/stores"

import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"

import { RowActions } from "./row-actions"

interface BuildColumnsParams {
  t: (key: string) => string
  selectedIds: Set<number>
  allSelected: boolean
  onToggleAll: () => void
  onToggleRow: (id: number) => void
  onOpen: (store: StoreWithStats) => void
  onEdit: (store: StoreWithStats) => void
  onChangeDirector: (store: StoreWithStats) => void
  onSync: (store: StoreWithStats) => void
  onArchive: (store: StoreWithStats) => void
}

/**
 * Собирает «Город, адрес» в одну строку без дубликатов.
 * - LAMA-магазины: address = «г. Томск» = тот же city → возвращаем только city.
 * - Base-моки: address = «пр. Ленина, 80», city = «Томск» → «Томск, пр. Ленина, 80».
 */
function buildFullAddress(store: StoreWithStats): string {
  const city = store.city?.trim() ?? ""
  const address = store.address?.trim() ?? ""
  if (!address) return city
  if (!city) return address
  // LAMA shape: «г. <city>» — содержит только city, без улицы
  const stripped = address.replace(/^г\.\s*/i, "").trim()
  if (stripped.toLowerCase() === city.toLowerCase()) return address
  if (address.toLowerCase().startsWith(city.toLowerCase())) return address
  return `${city}, ${address}`
}

export function buildStoreColumns({
  t,
  selectedIds,
  allSelected,
  onToggleAll,
  onToggleRow,
  onOpen,
  onEdit,
  onChangeDirector,
  onSync,
  onArchive,
}: BuildColumnsParams): ColumnDef<StoreWithStats>[] {
  return [
    {
      id: "select",
      header: () => (
        <Checkbox
          checked={allSelected}
          onCheckedChange={onToggleAll}
          aria-label="Выбрать всё"
          className="translate-y-[2px]"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={selectedIds.has(row.original.id)}
          onCheckedChange={() => onToggleRow(row.original.id)}
          aria-label={`Выбрать ${row.original.name}`}
          className="translate-y-[2px]"
          onClick={(e) => e.stopPropagation()}
        />
      ),
      enableSorting: false,
    },
    {
      id: "code",
      header: t("columns.code"),
      cell: ({ row }) => (
        <Badge
          variant="secondary"
          className="font-mono text-xs uppercase px-1.5 py-0 tabular-nums"
        >
          {row.original.external_code}
        </Badge>
      ),
    },
    {
      id: "name",
      header: t("columns.name"),
      cell: ({ row }) => (
        <span className="text-sm font-medium text-primary hover:underline cursor-pointer">
          {row.original.name}
        </span>
      ),
    },
    {
      id: "address",
      header: t("columns.address"),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground whitespace-normal break-words">
          {buildFullAddress(row.original)}
        </span>
      ),
    },
    {
      id: "staff",
      header: () => <span className="block text-right">{t("columns.staff")}</span>,
      cell: ({ row }) => (
        <span className="block text-right text-sm tabular-nums">
          {row.original.staff_count}
        </span>
      ),
    },
    {
      id: "tasks_today",
      header: t("columns.tasks_today"),
      cell: ({ row }) => (
        <span className="text-sm tabular-nums">{row.original.tasks_today_count}</span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <RowActions
          store={row.original}
          onOpen={() => onOpen(row.original)}
          onEdit={() => onEdit(row.original)}
          onChangeDirector={() => onChangeDirector(row.original)}
          onSync={() => onSync(row.original)}
          onArchive={() => onArchive(row.original)}
        />
      ),
      enableSorting: false,
    },
  ]
}
