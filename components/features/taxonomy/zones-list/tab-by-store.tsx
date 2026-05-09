"use client";

import { Store, SearchX, AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Combobox } from "@/components/ui/combobox";

import { EmptyState } from "@/components/shared/empty-state";

import type { ZoneWithCounts } from "@/lib/api/taxonomy";

import { ZonesGridSkeleton } from "./zones-grid-skeleton";
import { ZoneCardWithDelete } from "./zone-card-with-delete";
import type { StoreOption } from "./_shared";

interface GroupedByStore {
  storeName: string;
  zones: ZoneWithCounts[];
}

interface TabByStoreProps {
  isLoading: boolean;
  error: unknown;
  zones: ZoneWithCounts[];
  groupedByStore: Record<string, GroupedByStore> | null;
  search: string;
  selectedStoreId: string;
  storeOptions: StoreOption[];
  hasFilters: boolean;
  deleteAlertOpen: boolean;
  deleteTargetId: number | null;
  onSearchChange: (value: string) => void;
  onSelectedStoreChange: (value: string) => void;
  onClearFilters: () => void;
  onRetry: () => void;
  onEdit: (zone: ZoneWithCounts) => void;
  onDelete: (zone: ZoneWithCounts) => void;
  onCloseDeleteAlert: () => void;
  onConfirmDelete: () => void;
  onAlertOpenChange: (open: boolean) => void;
  onCreate: () => void;
}

export function TabByStore({
  isLoading,
  error,
  zones,
  groupedByStore,
  search,
  selectedStoreId,
  storeOptions,
  hasFilters,
  deleteAlertOpen,
  deleteTargetId,
  onSearchChange,
  onSelectedStoreChange,
  onClearFilters,
  onRetry,
  onEdit,
  onDelete,
  onCloseDeleteAlert,
  onConfirmDelete,
  onAlertOpenChange,
  onCreate,
}: TabByStoreProps) {
  const t = useTranslations("screen.zones");

  return (
    <div className="mt-0 flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        {t("tabs_subtitle.by_store")}
      </p>

      {/* Toolbar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          className="w-full sm:max-w-xs"
          placeholder={t("filters.search_placeholder")}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        <div className="w-full sm:w-64">
          <Combobox
            options={storeOptions}
            value={selectedStoreId}
            onValueChange={onSelectedStoreChange}
            placeholder={t("filters.store")}
            searchPlaceholder="Поиск магазина..."
          />
        </div>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="w-fit"
          >
            {t("filters.clear_all")}
          </Button>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <ZonesGridSkeleton />
      ) : error ? (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription className="flex items-center gap-2">
            Не удалось загрузить зоны.
            <Button
              variant="ghost"
              size="sm"
              onClick={onRetry}
              className="h-auto p-0 underline"
            >
              Повторить
            </Button>
          </AlertDescription>
        </Alert>
      ) : zones.length === 0 && hasFilters ? (
        <EmptyState
          icon={SearchX}
          title={t("empty.filtered_title")}
          description=""
          action={{
            label: t("empty.filtered_reset"),
            onClick: onClearFilters,
          }}
        />
      ) : zones.length === 0 && selectedStoreId ? (
        <EmptyState
          icon={Store}
          title={t("empty.no_zones_store_title")}
          description={t("empty.no_zones_store_subtitle")}
          action={{ label: t("actions.create"), onClick: onCreate }}
        />
      ) : zones.length === 0 ? (
        <EmptyState
          icon={Store}
          title={t("empty.no_store_selected_title")}
          description={t("empty.no_store_selected_subtitle")}
        />
      ) : selectedStoreId ? (
        /* Single store selected — flat grid */
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {zones.map((zone) => (
            <ZoneCardWithDelete
              key={zone.id}
              zone={zone}
              showStoreBadge={!!zone.store_id}
              deleteAlertOpen={deleteAlertOpen}
              deleteTargetId={deleteTargetId}
              onEdit={onEdit}
              onDelete={onDelete}
              onCloseDeleteAlert={onCloseDeleteAlert}
              onConfirmDelete={onConfirmDelete}
              onAlertOpenChange={onAlertOpenChange}
            />
          ))}
        </div>
      ) : (
        /* No store selected — grouped view for NETWORK_OPS */
        <div className="flex flex-col gap-8">
          {groupedByStore &&
            Object.entries(groupedByStore).map(
              ([storeKey, { storeName, zones: groupZones }]) => (
                <div key={storeKey} className="flex flex-col gap-3">
                  <div className="sticky top-0 bg-background/95 backdrop-blur-sm py-1 z-10">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Store className="size-4 text-muted-foreground" />
                      {storeName}
                      <Badge variant="secondary" className="text-xs">
                        {groupZones.length}
                      </Badge>
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {groupZones.map((zone) => (
                      <ZoneCardWithDelete
                        key={zone.id}
                        zone={zone}
                        showStoreBadge={!!zone.store_id}
                        deleteAlertOpen={deleteAlertOpen}
                        deleteTargetId={deleteTargetId}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onCloseDeleteAlert={onCloseDeleteAlert}
                        onConfirmDelete={onConfirmDelete}
                        onAlertOpenChange={onAlertOpenChange}
                      />
                    ))}
                  </div>
                </div>
              )
            )}
        </div>
      )}
    </div>
  );
}
