"use client";

import { Globe, SearchX, AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { EmptyState } from "@/components/shared/empty-state";

import type { ZoneWithCounts } from "@/lib/api/taxonomy";

import { ZonesGridSkeleton } from "./zones-grid-skeleton";
import { ZoneCardWithDelete } from "./zone-card-with-delete";

interface TabGlobalProps {
  isLoading: boolean;
  error: unknown;
  zones: ZoneWithCounts[];
  search: string;
  hasFilters: boolean;
  deleteAlertOpen: boolean;
  deleteTargetId: number | null;
  onSearchChange: (value: string) => void;
  onClearFilters: () => void;
  onRetry: () => void;
  onEdit: (zone: ZoneWithCounts) => void;
  onDelete: (zone: ZoneWithCounts) => void;
  onCloseDeleteAlert: () => void;
  onConfirmDelete: () => void;
  onAlertOpenChange: (open: boolean) => void;
  onCreate: () => void;
}

export function TabGlobal({
  isLoading,
  error,
  zones,
  search,
  hasFilters,
  deleteAlertOpen,
  deleteTargetId,
  onSearchChange,
  onClearFilters,
  onRetry,
  onEdit,
  onDelete,
  onCloseDeleteAlert,
  onConfirmDelete,
  onAlertOpenChange,
  onCreate,
}: TabGlobalProps) {
  const t = useTranslations("screen.zones");

  return (
    <div className="mt-0 flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        {t("tabs_subtitle.global")}
      </p>

      {/* Toolbar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          className="w-full sm:max-w-xs"
          placeholder={t("filters.search_placeholder")}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
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
      ) : zones.length === 0 ? (
        <EmptyState
          icon={Globe}
          title={t("empty.no_zones_global_title")}
          description={t("empty.no_zones_global_subtitle")}
          action={{ label: t("actions.create"), onClick: onCreate }}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {zones.map((zone) => (
            <ZoneCardWithDelete
              key={zone.id}
              zone={zone}
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
      )}
    </div>
  );
}
