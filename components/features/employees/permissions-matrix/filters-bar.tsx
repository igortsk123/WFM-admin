"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { FilterChip } from "@/components/shared/filter-chip";
import { MobileFilterSheet } from "@/components/shared/mobile-filter-sheet";

import type { Permission, Store } from "@/lib/types";

import { ALL_PERMISSIONS } from "./_shared";

interface FiltersBarProps {
  search: string;
  onSearchChange: (v: string) => void;
  isNetworkScope: boolean;
  stores: Store[];
  positions: Array<{ id: number; name: string }>;
  filterStoreId: number | null;
  onFilterStoreChange: (v: number | null) => void;
  filterPositionId: number | null;
  onFilterPositionChange: (v: number | null) => void;
  filterPermission: Permission | null;
  onFilterPermissionChange: (v: Permission | null) => void;
  permLabel: Record<Permission, string>;
}

export function FiltersBar({
  search,
  onSearchChange,
  isNetworkScope,
  stores,
  positions,
  filterStoreId,
  onFilterStoreChange,
  filterPositionId,
  onFilterPositionChange,
  filterPermission,
  onFilterPermissionChange,
  permLabel,
}: FiltersBarProps) {
  const t = useTranslations("screen.permissions");
  const tCommon = useTranslations("common");

  const activeFiltersCount =
    (filterStoreId ? 1 : 0) +
    (filterPositionId ? 1 : 0) +
    (filterPermission ? 1 : 0);

  const clearAllFilters = () => {
    onFilterStoreChange(null);
    onFilterPositionChange(null);
    onFilterPermissionChange(null);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <Input
          placeholder={t("toolbar.search_placeholder")}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-9 md:w-64"
        />

        {/* Desktop filters */}
        <div className="hidden md:flex items-center gap-2 flex-1">
          {isNetworkScope && (
            <Select
              value={filterStoreId ? String(filterStoreId) : "all"}
              onValueChange={(v) =>
                onFilterStoreChange(v === "all" ? null : Number(v))
              }
            >
              <SelectTrigger className="h-9 w-48">
                <SelectValue placeholder={t("toolbar.store")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tCommon("all")}</SelectItem>
                {stores
                  .filter((s) => !s.archived)
                  .map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          )}

          <Select
            value={filterPositionId ? String(filterPositionId) : "all"}
            onValueChange={(v) =>
              onFilterPositionChange(v === "all" ? null : Number(v))
            }
          >
            <SelectTrigger className="h-9 w-48">
              <SelectValue placeholder={t("toolbar.position")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tCommon("all")}</SelectItem>
              {positions.map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filterPermission ?? "all"}
            onValueChange={(v) =>
              onFilterPermissionChange(v === "all" ? null : (v as Permission))
            }
          >
            <SelectTrigger className="h-9 w-48">
              <SelectValue placeholder={t("toolbar.permission")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tCommon("all")}</SelectItem>
              {ALL_PERMISSIONS.map((p) => (
                <SelectItem key={p} value={p}>
                  {permLabel[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Mobile filter sheet */}
        <MobileFilterSheet
          activeCount={activeFiltersCount}
          onClearAll={clearAllFilters}
          onApply={() => {}}
          className="md:hidden"
        >
          {isNetworkScope && (
            <div className="flex flex-col gap-1.5">
              <Label>{t("toolbar.store")}</Label>
              <Select
                value={filterStoreId ? String(filterStoreId) : "all"}
                onValueChange={(v) =>
                  onFilterStoreChange(v === "all" ? null : Number(v))
                }
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder={t("toolbar.store")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{tCommon("all")}</SelectItem>
                  {stores
                    .filter((s) => !s.archived)
                    .map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <Label>{t("toolbar.position")}</Label>
            <Select
              value={filterPositionId ? String(filterPositionId) : "all"}
              onValueChange={(v) =>
                onFilterPositionChange(v === "all" ? null : Number(v))
              }
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder={t("toolbar.position")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tCommon("all")}</SelectItem>
                {positions.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("toolbar.permission")}</Label>
            <Select
              value={filterPermission ?? "all"}
              onValueChange={(v) =>
                onFilterPermissionChange(v === "all" ? null : (v as Permission))
              }
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder={t("toolbar.permission")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tCommon("all")}</SelectItem>
                {ALL_PERMISSIONS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {permLabel[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </MobileFilterSheet>
      </div>

      {/* Filter chips row */}
      {activeFiltersCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {filterStoreId && (
            <FilterChip
              label={t("toolbar.store")}
              value={stores.find((s) => s.id === filterStoreId)?.name ?? "—"}
              onRemove={() => onFilterStoreChange(null)}
            />
          )}
          {filterPositionId && (
            <FilterChip
              label={t("toolbar.position")}
              value={
                positions.find((p) => p.id === filterPositionId)?.name ?? "—"
              }
              onRemove={() => onFilterPositionChange(null)}
            />
          )}
          {filterPermission && (
            <FilterChip
              label={t("toolbar.permission")}
              value={permLabel[filterPermission]}
              onRemove={() => onFilterPermissionChange(null)}
            />
          )}
          <button
            type="button"
            onClick={clearAllFilters}
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
          >
            {t("toolbar.clear_all")}
          </button>
        </div>
      )}
    </div>
  );
}
