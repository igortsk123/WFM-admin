"use client";

import * as React from "react";
import {
  Upload,
  Download,
  FileText,
  File,
  Sparkles,
  AlertTriangle,
  MoreHorizontal,
  SearchX,
  Archive,
  RotateCcw,
  Tag,
  Eye,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import type { ColumnDef } from "@tanstack/react-table";

import {
  getRegulations,
  getRegulationsStats,
  archiveRegulation,
  downloadRegulation,
  type RegulationsStats,
} from "@/lib/api/regulations";
import { MOCK_WORK_TYPES } from "@/lib/mock-data/work-types";
import { MOCK_ZONES } from "@/lib/mock-data/zones";
import { MOCK_USERS } from "@/lib/mock-data/users";
import type { Regulation } from "@/lib/types";

import { PageHeader } from "@/components/shared/page-header";
import { KpiCard } from "@/components/shared/kpi-card";
import { FilterChip } from "@/components/shared/filter-chip";
import { EmptyState } from "@/components/shared/empty-state";
import { UserCell } from "@/components/shared/user-cell";
import { MobileFilterSheet } from "@/components/shared/mobile-filter-sheet";
import { ResponsiveDataTable } from "@/components/shared/responsive-data-table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { RegulationUploadSheet } from "./regulation-upload-sheet";
import { RegulationDetailSheet } from "./regulation-detail-sheet";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AlertDialog } from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// ─── helpers ────────────────────────────────────────────────────────────────

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
}

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

function FileIcon({ type }: { type: string }) {
  if (type === "PDF") return <File className="size-4 text-red-500 shrink-0" aria-hidden="true" />;
  if (type === "WORD") return <FileText className="size-4 text-blue-500 shrink-0" aria-hidden="true" />;
  return <FileText className="size-4 text-muted-foreground shrink-0" aria-hidden="true" />;
}

// ─── tag pills helper ────────────────────────────────────────────────────────

interface TagPillsProps {
  workTypeIds?: number[];
  zoneIds?: number[];
}

function TagPills({ workTypeIds, zoneIds }: TagPillsProps) {
  const allTags: string[] = [
    ...(workTypeIds ?? []).map((id) => MOCK_WORK_TYPES.find((wt) => wt.id === id)?.name ?? `#${id}`),
    ...(zoneIds ?? []).map((id) => MOCK_ZONES.find((z) => z.id === id)?.name ?? `#${id}`),
  ];

  if (allTags.length === 0) {
    return (
      <Badge
        variant="outline"
        className="border-warning text-warning bg-warning/10 text-xs gap-1"
      >
        <AlertTriangle className="size-3" />
        Без тегов
      </Badge>
    );
  }

  const visible = allTags.slice(0, 3);
  const extra = allTags.length - visible.length;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex flex-wrap gap-1">
        {visible.map((tag, i) => (
          <Badge key={i} variant="secondary" className="text-xs">
            {tag}
          </Badge>
        ))}
        {extra > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="text-xs cursor-default">
                +{extra}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs max-w-xs">
                {allTags.slice(3).join(", ")}
              </p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}

// ─── mini sparkline ──────────────────────────────────────────────────────────

function MiniSparkline({ value }: { value: number }) {
  // deterministic mini trend from the weekly count
  const data = Array.from({ length: 7 }, (_, i) => ({
    i,
    v: Math.max(0, value + Math.round(Math.sin(i + value) * (value * 0.2))),
  }));
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-sm tabular-nums">{value}</span>
      <div className="w-12 h-5 shrink-0" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <Line
              type="monotone"
              dataKey="v"
              stroke="var(--color-primary)"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── multi-select combobox (filter) ─────────────────────────────────────────

interface FilterMultiSelectProps {
  options: { id: number; name: string }[];
  selected: number[];
  onChange: (ids: number[]) => void;
  placeholder: string;
}

function FilterMultiSelect({ options, selected, onChange, placeholder }: FilterMultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  const selectedNames = options
    .filter((o) => selected.includes(o.id))
    .map((o) => o.name)
    .slice(0, 2)
    .join(", ");

  const label = selected.length === 0
    ? placeholder
    : selectedNames + (selected.length > 2 ? ` +${selected.length - 2}` : "");

  React.useEffect(() => {
    if (!open) return;
    function handler(e: PointerEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [open]);

  function toggle(id: number) {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  }

  return (
    <div ref={ref} className="relative min-w-[140px]">
      <Button
        variant="outline"
        size="sm"
        className="h-9 w-full justify-between text-sm font-normal truncate"
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="truncate text-left">{label}</span>
        <span className="ml-1 text-muted-foreground">▾</span>
      </Button>

      {open && (
        <div className="absolute top-full mt-1 left-0 z-50 min-w-full w-56 rounded-md border border-border bg-popover shadow-md overflow-hidden">
          <ul className="max-h-48 overflow-y-auto py-1" role="listbox" aria-multiselectable>
            {options.map((opt) => {
              const checked = selected.includes(opt.id);
              return (
                <li
                  key={opt.id}
                  role="option"
                  aria-selected={checked}
                  className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-accent"
                  onClick={() => toggle(opt.id)}
                >
                  <span
                    className={cn(
                      "size-4 rounded border border-border flex items-center justify-center shrink-0",
                      checked && "bg-primary border-primary",
                    )}
                  >
                    {checked && <span className="text-primary-foreground text-[10px] leading-none">✓</span>}
                  </span>
                  {opt.name}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── row actions menu ────────────────────────────────────────────────────────

interface RowActionsMenuProps {
  regulation: Regulation;
  onView: (id: string) => void;
  onEditTags: (id: string) => void;
  onReplace: (id: string) => void;
  onArchive: (id: string) => void;
  onDownload: (id: string) => void;
}

function RowActionsMenu({
  regulation,
  onView,
  onEditTags,
  onReplace,
  onArchive,
  onDownload,
}: RowActionsMenuProps) {
  const t = useTranslations("screen.regulations");
  const [archiveOpen, setArchiveOpen] = React.useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 data-[state=open]:bg-accent"
            aria-label={t("actions.more")}
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onClick={() => onView(regulation.id)}>
            <Eye className="size-4 mr-2 text-muted-foreground" />
            {t("row_actions.view")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onDownload(regulation.id)}>
            <Download className="size-4 mr-2 text-muted-foreground" />
            {t("row_actions.download")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onEditTags(regulation.id)}>
            <Tag className="size-4 mr-2 text-muted-foreground" />
            {t("row_actions.edit_tags")}
          </DropdownMenuItem>
          {!regulation.is_archived && (
            <DropdownMenuItem onClick={() => onReplace(regulation.id)}>
              <Upload className="size-4 mr-2 text-muted-foreground" />
              {t("row_actions.replace")}
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          {!regulation.is_archived ? (
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => setArchiveOpen(true)}
            >
              <Archive className="size-4 mr-2" />
              {t("row_actions.archive")}
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => toast.info("Восстановление: coming soon")}>
              <RotateCcw className="size-4 mr-2 text-muted-foreground" />
              {t("row_actions.restore")}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <ConfirmDialog
          title="Архивировать документ?"
          message="ИИ перестанет использовать этот документ в контексте для ответов работникам."
          confirmLabel="Архивировать"
          variant="destructive"
          onConfirm={() => onArchive(regulation.id)}
          onOpenChange={setArchiveOpen}
        />
      </AlertDialog>
    </>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export function RegulationsList() {
  const t = useTranslations("screen.regulations");
  const tc = useTranslations("common");

  // ── filter state ──────────────────────────────────────────────
  const [search, setSearch] = React.useState("");
  const [workTypeIds, setWorkTypeIds] = React.useState<number[]>([]);
  const [zoneIds, setZoneIds] = React.useState<number[]>([]);
  const [showArchived, setShowArchived] = React.useState(false);
  const [untaggedOnly, setUntaggedOnly] = React.useState(false);

  // ── data ──────────────────────────────────────────────────────
  const [regulations, setRegulations] = React.useState<Regulation[]>([]);
  const [total, setTotal] = React.useState(0);
  const [stats, setStats] = React.useState<RegulationsStats | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [statsLoading, setStatsLoading] = React.useState(true);
  const [error, setError] = React.useState(false);

  // ── sheets ────────────────────────────────────────────────────
  const [uploadOpen, setUploadOpen] = React.useState(false);
  const [detailId, setDetailId] = React.useState<string | null>(null);
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [replacePreselect, setReplacePreselect] = React.useState<string | null>(null);

  // ── ws simulation: live AI usage counter ──────────────────────
  const [liveUses, setLiveUses] = React.useState<number | null>(null);
  React.useEffect(() => {
    const interval = setInterval(() => {
      setLiveUses((prev) => {
        if (prev === null && stats) return stats.ai_uses_7d;
        if (prev !== null && Math.random() < 0.15) return prev + 1;
        return prev;
      });
    }, 4000);
    return () => clearInterval(interval);
  }, [stats]);

  // ── fetch data ────────────────────────────────────────────────
  const fetchData = React.useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await getRegulations({
        search: search || undefined,
        work_type_ids: workTypeIds.length > 0 ? workTypeIds : undefined,
        zone_ids: zoneIds.length > 0 ? zoneIds : undefined,
        is_archived: showArchived ? undefined : false,
        untagged_only: untaggedOnly ? true : undefined,
      });
      setRegulations(res.data);
      setTotal(res.total);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [search, workTypeIds, zoneIds, showArchived, untaggedOnly]);

  const fetchStats = React.useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await getRegulationsStats();
      setStats(res.data);
      setLiveUses(res.data.ai_uses_7d);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void fetchData();
  }, [fetchData]);

  React.useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  // ── active filter chips ───────────────────────────────────────
  const activeChips: Array<{ key: string; label: string; value: string; onRemove: () => void }> = [];
  if (search) {
    activeChips.push({ key: "search", label: tc("search"), value: search, onRemove: () => setSearch("") });
  }
  workTypeIds.forEach((id) => {
    const name = MOCK_WORK_TYPES.find((wt) => wt.id === id)?.name ?? `#${id}`;
    activeChips.push({ key: `wt-${id}`, label: t("filters.work_type"), value: name, onRemove: () => setWorkTypeIds((prev) => prev.filter((x) => x !== id)) });
  });
  zoneIds.forEach((id) => {
    const name = MOCK_ZONES.find((z) => z.id === id)?.name ?? `#${id}`;
    activeChips.push({ key: `z-${id}`, label: t("filters.zone"), value: name, onRemove: () => setZoneIds((prev) => prev.filter((x) => x !== id)) });
  });
  if (untaggedOnly) {
    activeChips.push({ key: "untagged", label: tc("filter"), value: t("filters.untagged_only"), onRemove: () => setUntaggedOnly(false) });
  }

  function clearAllFilters() {
    setSearch("");
    setWorkTypeIds([]);
    setZoneIds([]);
    setShowArchived(false);
    setUntaggedOnly(false);
  }

  // ── handlers ──────────────────────────────────────────────────
  function openDetail(id: string) {
    setDetailId(id);
    setDetailOpen(true);
  }

  function openReplace(id: string) {
    setReplacePreselect(id);
    setUploadOpen(true);
  }

  async function handleDownload(id: string) {
    const reg = regulations.find((r) => r.id === id);
    if (!reg) return;
    try {
      const blob = await downloadRegulation(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = reg.name;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t("toasts.downloaded"));
    } catch {
      toast.error(t("toasts.error"));
    }
  }

  async function handleArchive(id: string) {
    try {
      const result = await archiveRegulation(id);
      if (result.success) {
        toast.success(t("toasts.archived"));
        void fetchData();
        void fetchStats();
      } else {
        toast.error(t("toasts.error"));
      }
    } catch {
      toast.error(t("toasts.error"));
    }
  }

  // ── table columns ─────────────────────────────────────────────
  const columns = React.useMemo<ColumnDef<Regulation>[]>(
    () => [
      {
        id: "file_type",
        header: "",
        size: 36,
        cell: ({ row }) => (
          <div className="flex items-center justify-center w-8">
            <FileIcon type={row.original.file_type} />
          </div>
        ),
      },
      {
        id: "name",
        header: t("columns.name"),
        cell: ({ row }) => (
          <button
            type="button"
            className="text-sm font-medium text-foreground hover:text-primary text-left line-clamp-2 max-w-xs transition-colors"
            onClick={() => openDetail(row.original.id)}
          >
            {row.original.name}
          </button>
        ),
      },
      {
        id: "tags",
        header: t("columns.tags"),
        cell: ({ row }) => (
          <TagPills workTypeIds={row.original.work_type_ids} zoneIds={row.original.zone_ids} />
        ),
      },
      {
        id: "size",
        header: t("columns.size"),
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground tabular-nums whitespace-nowrap">
            {formatFileSize(row.original.file_size_bytes)}
          </span>
        ),
      },
      {
        id: "ai_uses",
        header: t("columns.ai_uses"),
        cell: ({ row }) => <MiniSparkline value={row.original.ai_usage_count_30d} />,
      },
      {
        id: "version",
        header: "Версия",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            v{row.original.version}
            <span className="ml-1 text-muted-foreground/60">·</span>
            <span className="ml-1">{formatDateShort(row.original.uploaded_at)}</span>
          </span>
        ),
      },
      {
        id: "uploaded_by",
        header: t("columns.uploaded_by"),
        cell: ({ row }) => {
          const user = MOCK_USERS.find((u) => u.id === row.original.uploaded_by);
          if (!user) return <span className="text-xs text-muted-foreground">—</span>;
          return (
            <UserCell
              user={{ ...user, position_name: undefined }}
              className="max-w-[140px]"
            />
          );
        },
      },
      {
        id: "status",
        header: t("columns.status"),
        cell: ({ row }) => (
          <Badge
            variant={row.original.is_archived ? "secondary" : "outline"}
            className={cn(
              "text-xs whitespace-nowrap",
              !row.original.is_archived && "border-success text-success bg-success/10",
            )}
          >
            {row.original.is_archived ? t("status.archived") : t("status.active")}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: "",
        size: 44,
        cell: ({ row }) => (
          <RowActionsMenu
            regulation={row.original}
            onView={openDetail}
            onEditTags={(id) => openDetail(id)}
            onReplace={openReplace}
            onArchive={handleArchive}
            onDownload={handleDownload}
          />
        ),
      },
    ],
    [regulations, t],
  );

  // ── mobile card render ────────────────────────────────────────
  function mobileCard(reg: Regulation) {
    return (
      <div className="flex items-start gap-3">
        <div className="flex size-9 items-center justify-center rounded-lg bg-muted shrink-0">
          <FileIcon type={reg.file_type} />
        </div>
        <div className="flex-1 min-w-0">
          <button
            type="button"
            className="text-sm font-medium text-foreground hover:text-primary text-left line-clamp-2 block w-full"
            onClick={() => openDetail(reg.id)}
          >
            {reg.name}
          </button>
          <div className="mt-1.5 flex flex-wrap gap-1">
            <TagPills workTypeIds={reg.work_type_ids} zoneIds={reg.zone_ids} />
          </div>
          <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Sparkles className="size-3 text-muted-foreground" />
              {reg.ai_usage_count_30d}
            </span>
            <span className="font-mono">{formatFileSize(reg.file_size_bytes)}</span>
            <span>v{reg.version}</span>
            <Badge
              variant={reg.is_archived ? "secondary" : "outline"}
              className={cn(
                "text-[10px] h-4 px-1",
                !reg.is_archived && "border-success text-success bg-success/10",
              )}
            >
              {reg.is_archived ? t("status.archived") : t("status.active")}
            </Badge>
          </div>
        </div>
        <RowActionsMenu
          regulation={reg}
          onView={openDetail}
          onEditTags={(id) => openDetail(id)}
          onReplace={openReplace}
          onArchive={handleArchive}
          onDownload={handleDownload}
        />
      </div>
    );
  }

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
                onClick={() => { setReplacePreselect(null); setUploadOpen(true); }}
              >
                <Upload className="size-4" />
                <span className="hidden sm:inline">{t("actions.upload")}</span>
                <span className="sm:hidden">Загрузить</span>
              </Button>
            </div>
          }
        />

        {/* KPI Cards */}
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
          {statsLoading ? (
            <>
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </>
          ) : stats ? (
            <>
              <KpiCard
                label={t("stats.total")}
                value={stats.total_count}
                icon={FileText}
              />
              <KpiCard
                label={t("stats.ai_uses_week")}
                value={liveUses ?? stats.ai_uses_7d}
                icon={Sparkles}
                trend={stats.ai_uses_chart_30d}
              />
              <button
                type="button"
                className={cn(
                  "text-left rounded-xl transition-all",
                  stats.untagged_count > 5 && "ring-2 ring-warning ring-offset-1",
                  untaggedOnly && "ring-2 ring-primary ring-offset-1",
                )}
                onClick={() => setUntaggedOnly((prev) => !prev)}
                aria-pressed={untaggedOnly}
                title={untaggedOnly ? "Снять фильтр «Без тегов»" : "Фильтровать: Без тегов"}
              >
                <KpiCard
                  label={t("stats.untagged")}
                  value={stats.untagged_count}
                  icon={AlertTriangle}
                />
              </button>
            </>
          ) : null}
        </div>

        {/* Filter row — desktop */}
        <div className="hidden md:flex flex-wrap items-center gap-2">
          <Input
            placeholder={t("filters.search_placeholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-72 max-w-full"
            aria-label={t("filters.search_placeholder")}
          />
          <FilterMultiSelect
            options={MOCK_WORK_TYPES.slice(0, 13).map((wt) => ({ id: wt.id, name: wt.name }))}
            selected={workTypeIds}
            onChange={setWorkTypeIds}
            placeholder={t("filters.work_type")}
          />
          <FilterMultiSelect
            options={MOCK_ZONES.map((z) => ({ id: z.id, name: z.name }))}
            selected={zoneIds}
            onChange={setZoneIds}
            placeholder={t("filters.zone")}
          />
          <div className="flex items-center gap-2 px-3 h-9 rounded-md border border-border bg-background">
            <Switch
              id="show-archived"
              checked={showArchived}
              onCheckedChange={setShowArchived}
              className="scale-90"
            />
            <Label htmlFor="show-archived" className="text-sm font-normal cursor-pointer whitespace-nowrap">
              {t("filters.show_archived")}
            </Label>
          </div>
        </div>

        {/* Filter row — mobile */}
        <MobileFilterSheet
          activeCount={activeChips.length + (showArchived ? 1 : 0)}
          onClearAll={clearAllFilters}
          onApply={() => {}}
        >
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {tc("search")}
              </Label>
              <Input
                placeholder={t("filters.search_placeholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {t("filters.work_type")}
              </Label>
              <FilterMultiSelect
                options={MOCK_WORK_TYPES.slice(0, 13).map((wt) => ({ id: wt.id, name: wt.name }))}
                selected={workTypeIds}
                onChange={setWorkTypeIds}
                placeholder={t("filters.work_type")}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {t("filters.zone")}
              </Label>
              <FilterMultiSelect
                options={MOCK_ZONES.map((z) => ({ id: z.id, name: z.name }))}
                selected={zoneIds}
                onChange={setZoneIds}
                placeholder={t("filters.zone")}
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="mob-show-archived" className="text-sm font-normal cursor-pointer">
                {t("filters.show_archived")}
              </Label>
              <Switch
                id="mob-show-archived"
                checked={showArchived}
                onCheckedChange={setShowArchived}
              />
            </div>
          </div>
        </MobileFilterSheet>

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
            <span className="text-sm text-destructive">Не удалось загрузить список документов.</span>
            <button
              type="button"
              className="ml-auto text-sm text-destructive underline"
              onClick={() => void fetchData()}
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
            mobileCardRender={mobileCard}
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
            void fetchData();
            void fetchStats();
          }}
          existingRegulations={activeRegulations}
        />

        {/* Detail Sheet */}
        <RegulationDetailSheet
          regulationId={detailId}
          open={detailOpen}
          onOpenChange={setDetailOpen}
          onArchived={() => {
            void fetchData();
            void fetchStats();
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
