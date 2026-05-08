"use client";

import * as React from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  AlertCircle,
  Download,
  RefreshCw,
  ScrollText,
  SearchX,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";

import {
  getAuditEntries,
  getAuditEntryById,
  type AuditListParams,
} from "@/lib/api/audit";
import type { AuditEntry } from "@/lib/types";

import {
  ACTION_OPTIONS,
  ENTITY_TYPE_OPTIONS,
  PAGE_SIZE,
  formatDayLabel,
  getDayKey,
  initialFilters,
  type FilterState,
} from "./audit-log/_shared";
import { AuditSkeleton } from "./audit-log/audit-skeleton";
import { EventDetailPanel } from "./audit-log/event-detail-panel";
import { EventRow } from "./audit-log/event-row";
import {
  FiltersBar,
  type ActiveFilterChip,
} from "./audit-log/filters-bar";

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

export function AuditLog() {
  const t = useTranslations("screen.audit");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();

  // State
  const [filters, setFilters] = React.useState<FilterState>(() => ({
    ...initialFilters,
    dateFrom: undefined,
    dateTo: undefined,
    platformActionOnly: false,
  }));
  const [searchInput, setSearchInput] = React.useState("");
  const [entries, setEntries] = React.useState<AuditEntry[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedId, setSelectedId] = React.useState<string | null>(
    () => searchParams.get("id")
  );
  const [selectedEntry, setSelectedEntry] = React.useState<AuditEntry | null>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = React.useState(false);
  const [page, setPage] = React.useState(1);

  // Keyboard navigation
  const listRef = React.useRef<HTMLDivElement>(null);

  // Debounced search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((prev) => ({ ...prev, search: searchInput }));
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Fetch entries
  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const params: AuditListParams = {
      search: filters.search || undefined,
      actor_id: filters.actorId,
      entity_types: filters.entityTypes.length > 0 ? filters.entityTypes : undefined,
      actions: filters.actions.length > 0 ? filters.actions : undefined,
      date_from: filters.dateFrom?.toISOString(),
      date_to: filters.dateTo?.toISOString(),
      platform_action_only: filters.platformActionOnly || undefined,
      page,
      page_size: PAGE_SIZE,
      sort_by: "occurred_at",
      sort_dir: "desc",
    };

    getAuditEntries(params)
      .then((res) => {
        if (!cancelled) {
          setEntries(res.data);
          setTotal(res.total);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Не удалось загрузить журнал аудита");
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [filters, page]);

  // Sync selected entry from URL param on mount
  React.useEffect(() => {
    const id = searchParams.get("id");
    if (id) {
      getAuditEntryById(id)
        .then((res) => setSelectedEntry(res.data))
        .catch(() => setSelectedEntry(null));
    }
  }, [searchParams]);

  // Fetch detail when selectedId changes
  React.useEffect(() => {
    if (!selectedId) {
      setSelectedEntry(null);
      return;
    }
    // Try to find in current entries first
    const found = entries.find((e) => e.id === selectedId);
    if (found) {
      setSelectedEntry(found);
      return;
    }
    getAuditEntryById(selectedId)
      .then((res) => setSelectedEntry(res.data))
      .catch(() => setSelectedEntry(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // Keyboard navigation
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!entries.length) return;
      const idx = entries.findIndex((en) => en.id === selectedId);

      if (e.key === "ArrowDown") {
        e.preventDefault();
        const next = entries[idx + 1];
        if (next) handleSelect(next.id);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const prev = entries[idx - 1];
        if (prev) handleSelect(prev.id);
      } else if (e.key === "Escape") {
        handleDeselect();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, selectedId]);

  function handleSelect(id: string) {
    setSelectedId(id);
    const url = new URL(window.location.href);
    url.searchParams.set("id", id);
    window.history.replaceState(null, "", url.toString());
  }

  function handleDeselect() {
    setSelectedId(null);
    setSelectedEntry(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("id");
    window.history.replaceState(null, "", url.toString());
  }

  function clearAllFilters() {
    setFilters({
      ...initialFilters,
      dateFrom: undefined,
      dateTo: undefined,
      platformActionOnly: false,
    });
    setSearchInput("");
    setPage(1);
  }

  function patchFilters(patch: Partial<FilterState>) {
    setFilters((p) => ({ ...p, ...patch }));
    setPage(1);
  }

  function handleCopyId() {
    if (!selectedEntry) return;
    navigator.clipboard.writeText(selectedEntry.id).then(() => {
      toast.success(t("toasts.id_copied"));
    });
  }

  function handleOpenEntity() {
    if (!selectedEntry?.entity_url) return;
    router.push(selectedEntry.entity_url as Parameters<typeof router.push>[0]);
  }

  function handleExport() {
    toast.success(t("toasts.exported"));
  }

  function entityTypeLabel(type: string): string {
    try {
      return t(`entity_type.${type}` as Parameters<typeof t>[0]);
    } catch {
      return type;
    }
  }

  // Group entries by day
  const grouped = React.useMemo(() => {
    const map = new Map<string, AuditEntry[]>();
    for (const e of entries) {
      const key = getDayKey(e.occurred_at);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return Array.from(map.entries());
  }, [entries]);

  // Active filter chips
  const activeFilters: ActiveFilterChip[] = [];

  if (filters.entityTypes.length > 0) {
    filters.entityTypes.forEach((et) => {
      activeFilters.push({
        key: `et-${et}`,
        label: t("filters.entity_type"),
        value: entityTypeLabel(et),
        onRemove: () =>
          setFilters((p) => ({
            ...p,
            entityTypes: p.entityTypes.filter((v) => v !== et),
          })),
      });
    });
  }

  if (filters.actions.length > 0) {
    filters.actions.forEach((a) => {
      activeFilters.push({
        key: `ac-${a}`,
        label: t("filters.action"),
        value: a,
        onRemove: () =>
          setFilters((p) => ({
            ...p,
            actions: p.actions.filter((v) => v !== a),
          })),
      });
    });
  }

  if (filters.dateFrom || filters.dateTo) {
    const fmtDate = (d: Date) =>
      new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(d);
    const val = [
      filters.dateFrom ? fmtDate(filters.dateFrom) : "…",
      filters.dateTo ? fmtDate(filters.dateTo) : "…",
    ].join(" – ");
    activeFilters.push({
      key: "date",
      label: tc("dateRange"),
      value: val,
      onRemove: () =>
        setFilters((p) => ({ ...p, dateFrom: undefined, dateTo: undefined })),
    });
  }

  if (filters.platformActionOnly) {
    activeFilters.push({
      key: "platform",
      label: t("platform_action.filter_toggle"),
      value: t("platform_action.badge"),
      onRemove: () => setFilters((p) => ({ ...p, platformActionOnly: false })),
    });
  }

  const entityTypeOptions = ENTITY_TYPE_OPTIONS.map((v) => ({
    value: v,
    label: entityTypeLabel(v),
  }));

  const actionOptions = ACTION_OPTIONS.map((v) => ({ value: v, label: v }));

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-4">
        {/* PAGE HEADER */}
        <PageHeader
          title={t("page_title")}
          subtitle={t("page_subtitle")}
          breadcrumbs={[
            { label: t("breadcrumbs.home"), href: "/" },
            { label: t("breadcrumbs.audit") },
          ]}
          actions={
            <Button variant="outline" size="sm" onClick={handleExport} className="h-9">
              <Download className="size-4" />
              <span className="hidden sm:inline">{t("actions.export")}</span>
            </Button>
          }
        />

        {/* TOOLBAR */}
        <FiltersBar
          filters={filters}
          searchInput={searchInput}
          onSearchInputChange={setSearchInput}
          onPatchFilters={patchFilters}
          onClearAll={clearAllFilters}
          entityTypeOptions={entityTypeOptions}
          actionOptions={actionOptions}
          activeFilters={activeFilters}
        />

        {/* >1000 results warning */}
        {total > 1000 && !loading && (
          <Alert>
            <AlertCircle className="size-4" />
            <AlertDescription>
              Найдено более 1000 записей. Уточните фильтры для получения более точных
              результатов.
            </AlertDescription>
          </Alert>
        )}

        {/* MAIN GRID */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* LEFT: Event list */}
          <div className="lg:col-span-2 flex flex-col gap-0 rounded-lg border bg-card overflow-hidden">
            {loading ? (
              <AuditSkeleton />
            ) : error ? (
              <div className="p-6 flex flex-col items-center gap-4">
                <Alert variant="destructive">
                  <AlertCircle className="size-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFilters((p) => ({ ...p }))}
                >
                  <RefreshCw className="size-4 mr-1" />
                  {tc("retry")}
                </Button>
              </div>
            ) : entries.length === 0 ? (
              filters.search ||
              filters.entityTypes.length > 0 ||
              filters.actions.length > 0 ||
              filters.dateFrom ||
              filters.dateTo ? (
                <EmptyState
                  icon={SearchX}
                  title={tc("noResults")}
                  description={t("empty.filtered_title")}
                  action={{
                    label: t("empty.filtered_reset"),
                    onClick: clearAllFilters,
                  }}
                />
              ) : (
                <EmptyState
                  icon={ScrollText}
                  title={t("empty.no_entries_title")}
                  description={t("empty.no_entries_subtitle")}
                />
              )
            ) : (
              <div ref={listRef} role="listbox" aria-label="Audit events">
                {grouped.map(([dayKey, dayEntries]) => (
                  <div key={dayKey}>
                    {/* Day sticky sub-header */}
                    <div className="sticky top-0 z-[1] bg-muted/80 backdrop-blur px-4 py-1.5">
                      <p className="text-xs uppercase tracking-widest font-semibold text-muted-foreground">
                        {formatDayLabel(dayEntries[0].occurred_at, locale, tc)}
                      </p>
                    </div>
                    {dayEntries.map((entry) => (
                      <EventRow
                        key={entry.id}
                        entry={entry}
                        selected={selectedId === entry.id}
                        onSelect={() => {
                          if (selectedId === entry.id) {
                            handleDeselect();
                          } else {
                            handleSelect(entry.id);
                          }
                        }}
                        locale={locale}
                        entityTypeLabel={entityTypeLabel}
                        onEyeClick={() => {
                          handleSelect(entry.id);
                          setMobileDrawerOpen(true);
                        }}
                      />
                    ))}
                    <Separator />
                  </div>
                ))}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/30">
                    <p className="text-xs text-muted-foreground">
                      {tc("page")} {page} {tc("of")} {totalPages}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => p - 1)}
                      >
                        {tc("previous")}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page >= totalPages}
                        onClick={() => setPage((p) => p + 1)}
                      >
                        {tc("next")}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RIGHT: Detail panel (desktop only) */}
          <div className="hidden lg:block">
            <div className="sticky top-32 self-start max-h-[calc(100vh-9rem)] overflow-auto rounded-lg border bg-card">
              {selectedEntry ? (
                <EventDetailPanel
                  entry={selectedEntry}
                  onCopyId={handleCopyId}
                  onOpenEntity={handleOpenEntity}
                  locale={locale}
                  entityTypeLabel={entityTypeLabel}
                />
              ) : (
                <EmptyState
                  icon={ScrollText}
                  title="Выберите событие"
                  description="Кликните на запись слева"
                  className="py-12"
                />
              )}
            </div>
          </div>
        </div>

        {/* MOBILE: Detail Drawer */}
        <Drawer
          open={mobileDrawerOpen}
          onOpenChange={setMobileDrawerOpen}
          direction="right"
        >
          <DrawerContent className="lg:hidden">
            <DrawerHeader className="border-b p-4">
              <DrawerTitle>{t("detail_sheet.title")}</DrawerTitle>
            </DrawerHeader>
            {selectedEntry ? (
              <EventDetailPanel
                entry={selectedEntry}
                onCopyId={handleCopyId}
                onOpenEntity={handleOpenEntity}
                locale={locale}
                entityTypeLabel={entityTypeLabel}
              />
            ) : (
              <EmptyState
                icon={ScrollText}
                title="Выберите событие"
                description="Запись не найдена или была удалена"
                className="py-12"
              />
            )}
          </DrawerContent>
        </Drawer>
      </div>
    </TooltipProvider>
  );
}
