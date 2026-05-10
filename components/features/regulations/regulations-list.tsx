"use client";

import * as React from "react";
import { AlertTriangle, Download, FileText, SearchX, Upload } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";

import type { Locale } from "@/lib/types";
import { pickLocalized } from "@/lib/utils/locale-pick";

import {
  archiveRegulation,
  downloadRegulation,
} from "@/lib/api/regulations";
import { MOCK_WORK_TYPES } from "@/lib/mock-data/work-types";
import { MOCK_ZONES } from "@/lib/mock-data/zones";

import { PageHeader } from "@/components/shared/page-header";
import { FilterChip } from "@/components/shared/filter-chip";
import { EmptyState } from "@/components/shared/empty-state";
import { ResponsiveDataTable } from "@/components/shared/responsive-data-table";

import { RegulationUploadSheet } from "./regulation-upload-sheet";
import { RegulationDetailSheet } from "./regulation-detail-sheet";

import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";

import { useRegulationsColumns } from "./regulations-list/columns";
import { FiltersBar } from "./regulations-list/filters-bar";
import { RegulationsMobileCard } from "./regulations-list/mobile-card";
import { StatsCards } from "./regulations-list/stats-cards";
import { useRegulationsData } from "./regulations-list/use-regulations-data";

export function RegulationsList() {
  const t = useTranslations("screen.regulations");
  const tc = useTranslations("common");
  const locale = useLocale() as Locale;

  // useTransition — фильтры/поиск как non-urgent.
  const [, startTransition] = React.useTransition();

  // ── filter state ──────────────────────────────────────────────
  const [search, setSearch] = React.useState("");
  const [workTypeIds, setWorkTypeIds] = React.useState<number[]>([]);
  const [zoneIds, setZoneIds] = React.useState<number[]>([]);
  const [showArchived, setShowArchived] = React.useState(false);
  const [untaggedOnly, setUntaggedOnly] = React.useState(false);

  // ── data ──────────────────────────────────────────────────────
  const {
    regulations,
    stats,
    loading,
    statsLoading,
    error,
    liveUses,
    refetchData,
    refetchStats,
  } = useRegulationsData({
    search,
    workTypeIds,
    zoneIds,
    showArchived,
    untaggedOnly,
  });

  // ── sheets ────────────────────────────────────────────────────
  const [uploadOpen, setUploadOpen] = React.useState(false);
  const [detailId, setDetailId] = React.useState<string | null>(null);
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [replacePreselect, setReplacePreselect] = React.useState<string | null>(null);

  // ── active filter chips ───────────────────────────────────────
  const activeChips: Array<{ key: string; label: string; value: string; onRemove: () => void }> = [];
  if (search) {
    activeChips.push({
      key: "search",
      label: tc("search"),
      value: search,
      onRemove: () => setSearch(""),
    });
  }
  workTypeIds.forEach((id) => {
    const name = MOCK_WORK_TYPES.find((wt) => wt.id === id)?.name ?? `#${id}`;
    activeChips.push({
      key: `wt-${id}`,
      label: t("filters.work_type"),
      value: name,
      onRemove: () => setWorkTypeIds((prev) => prev.filter((x) => x !== id)),
    });
  });
  zoneIds.forEach((id) => {
    const name = MOCK_ZONES.find((z) => z.id === id)?.name ?? `#${id}`;
    activeChips.push({
      key: `z-${id}`,
      label: t("filters.zone"),
      value: name,
      onRemove: () => setZoneIds((prev) => prev.filter((x) => x !== id)),
    });
  });
  if (untaggedOnly) {
    activeChips.push({
      key: "untagged",
      label: tc("filter"),
      value: t("filters.untagged_only"),
      onRemove: () => setUntaggedOnly(false),
    });
  }

  function clearAllFilters() {
    setSearch("");
    setWorkTypeIds([]);
    setZoneIds([]);
    setShowArchived(false);
    setUntaggedOnly(false);
  }

  // ── handlers ──────────────────────────────────────────────────
  const openDetail = React.useCallback((id: string) => {
    setDetailId(id);
    setDetailOpen(true);
  }, []);

  const openReplace = React.useCallback((id: string) => {
    setReplacePreselect(id);
    setUploadOpen(true);
  }, []);

  const handleDownload = React.useCallback(
    async (id: string) => {
      const reg = regulations.find((r) => r.id === id);
      if (!reg) return;
      try {
        const blob = await downloadRegulation(id);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = pickLocalized(reg.name, reg.name_en, locale);
        a.click();
        URL.revokeObjectURL(url);
        toast.success(t("toasts.downloaded"));
      } catch {
        toast.error(t("toasts.error"));
      }
    },
    [regulations, t, locale],
  );

  const handleArchive = React.useCallback(
    async (id: string) => {
      try {
        const result = await archiveRegulation(id);
        if (result.success) {
          toast.success(t("toasts.archived"));
          void refetchData();
          void refetchStats();
        } else {
          toast.error(t("toasts.error"));
        }
      } catch {
        toast.error(t("toasts.error"));
      }
    },
    [t, refetchData, refetchStats],
  );

  // ── table columns ─────────────────────────────────────────────
  const columns = useRegulationsColumns({
    onView: openDetail,
    onEditTags: openDetail,
    onReplace: openReplace,
    onArchive: handleArchive,
    onDownload: handleDownload,
  });

  const hasFilters = activeChips.length > 0 || showArchived;
  const isFiltered = hasFilters;
  const isEmpty = !loading && regulations.length === 0;
  const isEmptyFiltered = isEmpty && isFiltered;
  const isEmptyClean = isEmpty && !isFiltered;

  // ── existing regulations for replace picker ────────────────────
  const activeRegulations = regulations
    .filter((r) => !r.is_archived)
    .map((r) => ({ id: r.id, name: r.name }));

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex flex-col gap-6 p-6">
        {/* Page Header */}
        <PageHeader
          title={`${t("page_title")} ${!statsLoading && stats ? `(${stats.total_count})` : ""}`}
          subtitle={t("page_subtitle")}
          breadcrumbs={[
            { label: t("breadcrumbs.home"), href: "/dashboard" },
            { label: t("breadcrumbs.taxonomy") },
            { label: t("breadcrumbs.regulations") },
          ]}
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="hidden sm:flex h-9 gap-1.5">
                <Download className="size-4" />
                {t("actions.export")}
              </Button>
              <Button
                size="sm"
                className="h-9 gap-1.5"
                onClick={() => {
                  setReplacePreselect(null);
                  setUploadOpen(true);
                }}
              >
                <Upload className="size-4" />
                <span className="hidden sm:inline">{t("actions.upload")}</span>
                <span className="sm:hidden">Загрузить</span>
              </Button>
            </div>
          }
        />

        {/* KPI Cards */}
        <StatsCards
          stats={stats}
          loading={statsLoading}
          liveUses={liveUses}
          untaggedOnly={untaggedOnly}
          onToggleUntagged={() => setUntaggedOnly((prev) => !prev)}
        />

        {/* Filters (desktop + mobile) */}
        <FiltersBar
          search={search}
          onSearchChange={(v) => startTransition(() => setSearch(v))}
          workTypeIds={workTypeIds}
          onWorkTypeIdsChange={(v) => startTransition(() => setWorkTypeIds(v))}
          zoneIds={zoneIds}
          onZoneIdsChange={(v) => startTransition(() => setZoneIds(v))}
          showArchived={showArchived}
          onShowArchivedChange={(v) =>
            startTransition(() => setShowArchived(v))
          }
          activeChipsCount={activeChips.length}
          onClearAll={clearAllFilters}
        />

        {/* Active filter chips */}
        {activeChips.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {activeChips.map((chip) => (
              <FilterChip
                key={chip.key}
                label={chip.label}
                value={chip.value}
                onRemove={chip.onRemove}
              />
            ))}
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 transition-colors"
              onClick={clearAllFilters}
            >
              {t("filters.clear_all")}
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
            <AlertTriangle className="size-4 text-destructive shrink-0" />
            <span className="text-sm text-destructive">
              Не удалось загрузить список документов.
            </span>
            <button
              type="button"
              className="ml-auto text-sm text-destructive underline"
              onClick={() => void refetchData()}
            >
              {tc("retry")}
            </button>
          </div>
        )}

        {/* Empty states */}
        {isEmptyClean && !error && (
          <EmptyState
            icon={FileText}
            title={t("empty.no_regulations_title")}
            description={t("empty.no_regulations_subtitle")}
            action={{
              label: t("empty.no_regulations_cta"),
              icon: Upload,
              onClick: () => setUploadOpen(true),
            }}
          />
        )}

        {isEmptyFiltered && !error && (
          <EmptyState
            icon={SearchX}
            title={t("empty.filtered_title")}
            description="Попробуйте изменить фильтры"
            action={{
              label: t("empty.filtered_reset"),
              onClick: clearAllFilters,
            }}
          />
        )}

        {/* Table */}
        {!isEmptyClean && !isEmptyFiltered && !error && (
          <ResponsiveDataTable
            columns={columns}
            data={regulations}
            mobileCardRender={(reg) => (
              <RegulationsMobileCard
                regulation={reg}
                onView={openDetail}
                onEditTags={openDetail}
                onReplace={openReplace}
                onArchive={handleArchive}
                onDownload={handleDownload}
              />
            )}
            isLoading={loading}
            onRowClick={(row) => openDetail(row.id)}
          />
        )}

        {/* Upload Sheet */}
        <RegulationUploadSheet
          open={uploadOpen}
          onOpenChange={(v) => {
            setUploadOpen(v);
            if (!v) setReplacePreselect(null);
          }}
          onSuccess={() => {
            void refetchData();
            void refetchStats();
          }}
          existingRegulations={activeRegulations}
        />

        {/* Detail Sheet */}
        <RegulationDetailSheet
          regulationId={detailId}
          open={detailOpen}
          onOpenChange={setDetailOpen}
          onArchived={() => {
            void refetchData();
            void refetchStats();
          }}
          onReplaceRequest={(id) => {
            setDetailOpen(false);
            setReplacePreselect(id);
            setUploadOpen(true);
          }}
        />
      </div>
    </TooltipProvider>
  );
}
