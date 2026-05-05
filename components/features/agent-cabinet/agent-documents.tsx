"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  AlertCircle,
  CalendarRange,
  ChevronDown,
  Download,
  FileText,
  RefreshCw,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { getMyDocuments, type AgentDocument, type AgentDocumentType } from "@/lib/api/agent-cabinet";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { MobileFilterSheet } from "@/components/shared/mobile-filter-sheet";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { formatDate, formatRelative } from "@/lib/utils/format";
import type { Locale } from "@/lib/types";

// ═══════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════

const DOCUMENT_TYPES: AgentDocumentType[] = ["CONTRACT", "CLOSING_ACT", "INVOICE"];

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

/**
 * Format period string e.g. "2026-04" → "Апрель 2026" / "April 2026"
 */
function formatPeriod(period: string, locale: Locale): string {
  const parts = period.split("-");
  if (parts.length < 2) return period;
  const [year, month] = parts;
  const date = new Date(Number(year), Number(month) - 1, 1);
  return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(date);
}

/**
 * Generate a mock signed URL valid for 5 minutes.
 * In production this would call the backend to get a presigned URL.
 */
function generateSignedUrl(doc: AgentDocument): string {
  const expires = Date.now() + 5 * 60 * 1000;
  return `${doc.url}?token=mock-signed-token&expires=${expires}`;
}

// ═══════════════════════════════════════════════════════════════════
// DOCUMENT TYPE BADGE
// ═══════════════════════════════════════════════════════════════════

type BadgeDocumentType = AgentDocumentType;

const TYPE_VARIANT: Record<BadgeDocumentType, string> = {
  CONTRACT: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  CLOSING_ACT: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  INVOICE: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
};

function DocumentTypeBadge({ type, label }: { type: BadgeDocumentType; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        TYPE_VARIANT[type] ?? "bg-muted text-muted-foreground"
      )}
    >
      {label}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════
// DOCUMENT DETAIL SHEET
// ═══════════════════════════════════════════════════════════════════

function DocumentDetailSheet({
  doc,
  open,
  onOpenChange,
  locale,
  onDownload,
}: {
  doc: AgentDocument | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  locale: Locale;
  onDownload: (doc: AgentDocument) => void;
}) {
  const t = useTranslations("screen.agentDocuments");

  if (!doc) return null;

  const isPdf = doc.url.toLowerCase().endsWith(".pdf");
  const typeLabel = t(`type.${doc.type}`);
  const signedUrl = generateSignedUrl(doc);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full max-w-sm sm:max-w-md flex flex-col overflow-hidden"
        aria-describedby={undefined}
      >
        <SheetHeader className="mb-4 shrink-0">
          <SheetTitle>{t("detail_sheet.title")}</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-5 flex-1 overflow-y-auto min-h-0">
          {/* PDF Preview */}
          {isPdf ? (
            <div className="rounded-lg border bg-muted overflow-hidden w-full aspect-[3/4]">
              <iframe
                src={signedUrl}
                className="w-full h-full"
                title={typeLabel}
                aria-label={typeLabel}
              />
            </div>
          ) : (
            <div
              className="flex flex-col items-center justify-center gap-3 rounded-lg border bg-muted aspect-[3/4]"
              aria-hidden="true"
            >
              <FileText className="size-16 text-muted-foreground" strokeWidth={1} />
              <span className="text-sm text-muted-foreground">{typeLabel}</span>
            </div>
          )}

          <Separator />

          {/* Metadata */}
          <section aria-label="Metadata" className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{t("detail_sheet.meta_type")}</span>
              <DocumentTypeBadge type={doc.type as BadgeDocumentType} label={typeLabel} />
            </div>
            {doc.type !== "CONTRACT" && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{t("detail_sheet.meta_period")}</span>
                <span className="text-sm text-foreground">{formatPeriod(doc.period, locale)}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{t("detail_sheet.meta_created_at")}</span>
              <span className="text-sm text-foreground">{formatDate(new Date(doc.created_at), locale)}</span>
            </div>
          </section>
        </div>

        {/* Download action */}
        <div className="shrink-0 pt-4 border-t mt-4">
          <Button
            className="w-full min-h-[44px]"
            onClick={() => onDownload(doc)}
          >
            <Download className="size-4 mr-2" aria-hidden="true" />
            {t("detail_sheet.download")}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ═══════════════════════════════════════════════════════════════════
// FILTER — TYPE COMBOBOX
// ═══════════════════════════════════════════════════════════════════

function TypeCombobox({
  value,
  onChange,
  tType,
  tAll,
}: {
  value: string;
  onChange: (v: string) => void;
  tType: (key: string) => string;
  tAll: string;
}) {
  const [open, setOpen] = useState(false);
  const active = !!value;
  const label = active ? tType(value) : tAll;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={active ? "secondary" : "outline"}
          size="sm"
          className="h-9 gap-1.5 text-sm min-w-[120px] justify-between"
          aria-expanded={open}
          aria-label={label}
        >
          <span className="truncate">{label}</span>
          <div className="flex items-center gap-0.5">
            {active && (
              <span
                role="button"
                tabIndex={0}
                aria-label="Clear"
                className="rounded-full hover:text-destructive p-0.5"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.stopPropagation();
                    onChange("");
                  }
                }}
              >
                <X className="size-3" />
              </span>
            )}
            <ChevronDown className="size-3.5 text-muted-foreground" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-0" align="start">
        <Command>
          <CommandList>
            <CommandEmpty>—</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="__all__"
                onSelect={() => { onChange(""); setOpen(false); }}
                className={cn("text-sm", !active && "font-semibold text-primary")}
              >
                {tAll}
              </CommandItem>
              {DOCUMENT_TYPES.map((type) => (
                <CommandItem
                  key={type}
                  value={type}
                  onSelect={() => { onChange(type); setOpen(false); }}
                  className={cn("text-sm", value === type && "font-semibold text-primary")}
                >
                  {tType(type)}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ═══════════════════════════════════════════════════════════════════
// FILTER — DATE RANGE PICKER
// ═══════════════════════════════════════════════════════════════════

function DateRangePicker({
  from,
  to,
  onChange,
  tLabel,
  tFrom,
  tTo,
  tApply,
}: {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
  tLabel: string;
  tFrom: string;
  tTo: string;
  tApply: string;
}) {
  const [open, setOpen] = useState(false);
  const [localFrom, setLocalFrom] = useState(from);
  const [localTo, setLocalTo] = useState(to);

  const active = !!(from || to);

  function apply() {
    onChange(localFrom, localTo);
    setOpen(false);
  }

  function clear() {
    setLocalFrom("");
    setLocalTo("");
    onChange("", "");
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={active ? "secondary" : "outline"}
          size="sm"
          className="h-9 gap-1.5 text-sm"
          aria-expanded={open}
        >
          <CalendarRange className="size-3.5" aria-hidden="true" />
          <span>{tLabel}</span>
          {active && (
            <span
              role="button"
              tabIndex={0}
              aria-label="Clear"
              className="ml-0.5 rounded-full hover:text-destructive p-0.5"
              onClick={(e) => {
                e.stopPropagation();
                clear();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.stopPropagation();
                  clear();
                }
              }}
            >
              <X className="size-3" />
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4" align="start">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground" htmlFor="doc-date-from">
              {tFrom}
            </label>
            <input
              id="doc-date-from"
              type="date"
              value={localFrom}
              onChange={(e) => setLocalFrom(e.target.value)}
              className="h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground" htmlFor="doc-date-to">
              {tTo}
            </label>
            <input
              id="doc-date-to"
              type="date"
              value={localTo}
              onChange={(e) => setLocalTo(e.target.value)}
              className="h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground"
            />
          </div>
          <Button size="sm" className="w-full h-9 text-sm" onClick={apply}>
            {tApply}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SKELETON
// ═══════════════════════════════════════════════════════════════════

function DocumentsSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="rounded-lg border bg-card p-4 flex gap-4 items-start">
          <Skeleton className="size-10 rounded-md shrink-0" />
          <div className="flex-1 flex flex-col gap-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-9 w-20 shrink-0" />
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// DOCUMENT CARD (Mobile)
// ═══════════════════════════════════════════════════════════════════

function DocumentCard({
  doc,
  locale,
  onSelect,
  onDownload,
  tType,
  tDownload,
  tCreated,
}: {
  doc: AgentDocument;
  locale: Locale;
  onSelect: () => void;
  onDownload: () => void;
  tType: (key: string) => string;
  tDownload: string;
  tCreated: string;
}) {
  return (
    <article
      className="rounded-lg border bg-card p-4 flex gap-3 items-start cursor-pointer hover:bg-accent/30 transition-colors"
      onClick={onSelect}
      role="button"
      tabIndex={0}
      aria-label={tType(doc.type)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onSelect();
      }}
    >
      {/* Icon */}
      <span
        className="flex size-10 items-center justify-center rounded-md bg-muted shrink-0 mt-0.5"
        aria-hidden="true"
      >
        <FileText className="size-5 text-muted-foreground" />
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <DocumentTypeBadge type={doc.type as BadgeDocumentType} label={tType(doc.type)} />
        {doc.type !== "CONTRACT" && (
          <p className="text-sm text-foreground font-medium truncate">
            {formatPeriod(doc.period, locale)}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          {tCreated}: {formatRelative(new Date(doc.created_at), locale)}
        </p>
      </div>

      {/* Download */}
      <Button
        size="sm"
        variant="outline"
        className="shrink-0 min-h-[44px] min-w-[44px]"
        aria-label={tDownload}
        onClick={(e) => {
          e.stopPropagation();
          onDownload();
        }}
      >
        <Download className="size-4" aria-hidden="true" />
        <span className="sr-only">{tDownload}</span>
      </Button>
    </article>
  );
}

// ═══════════════════════════════════════════════════════════════════
// DOCUMENT TABLE ROW (Desktop)
// ═══════════════════════════════════════════════════════════════════

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function DocumentsTable({
  docs,
  locale,
  onSelect,
  onDownload,
  tType,
  tDownload,
  t,
}: {
  docs: AgentDocument[];
  locale: Locale;
  onSelect: (doc: AgentDocument) => void;
  onDownload: (doc: AgentDocument) => void;
  tType: (key: string) => string;
  tDownload: string;
  t: ReturnType<typeof useTranslations<"screen.agentDocuments">>;
}) {
  return (
    <div className="rounded-md border overflow-hidden hidden md:block">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="w-[160px]">{t("columns.type")}</TableHead>
            <TableHead>{t("columns.period")}</TableHead>
            <TableHead className="w-[160px]">{t("columns.date")}</TableHead>
            <TableHead className="w-[100px] text-right">{t("actions.download")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {docs.map((doc) => (
            <TableRow
              key={doc.id}
              className="cursor-pointer hover:bg-accent/30"
              onClick={() => onSelect(doc)}
              tabIndex={0}
              aria-label={tType(doc.type)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") onSelect(doc);
              }}
            >
              <TableCell>
                <DocumentTypeBadge type={doc.type as BadgeDocumentType} label={tType(doc.type)} />
              </TableCell>
              <TableCell className="text-sm text-foreground">
                {doc.type !== "CONTRACT" ? formatPeriod(doc.period, locale) : "—"}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatRelative(new Date(doc.created_at), locale)}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  size="sm"
                  variant="outline"
                  className="min-h-[44px]"
                  aria-label={tDownload}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDownload(doc);
                  }}
                >
                  <Download className="size-4 mr-1.5" aria-hidden="true" />
                  {tDownload}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

type FetchState = "idle" | "loading" | "error" | "success";

interface FilterState {
  type: string;
  dateFrom: string;
  dateTo: string;
}

export function AgentDocuments() {
  const t = useTranslations("screen.agentDocuments");
  const locale = useLocale() as Locale;

  // ── State ─────────────────────────────────────────────────────────
  const [fetchState, setFetchState] = useState<FetchState>("loading");
  const [documents, setDocuments] = useState<AgentDocument[]>([]);
  const [filters, setFilters] = useState<FilterState>({ type: "", dateFrom: "", dateTo: "" });
  const [selectedDoc, setSelectedDoc] = useState<AgentDocument | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // ── Fetch ─────────────────────────────────────────────────────────
  const loadDocuments = useCallback(async () => {
    setFetchState("loading");
    try {
      const res = await getMyDocuments({ page: 1, page_size: 100 });
      setDocuments(res.data);
      setFetchState("success");
    } catch {
      setFetchState("error");
    }
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // ── Derived / filtered list ────────────────────────────────────────
  const filteredDocs = useMemo(() => {
    let list = documents;
    if (filters.type) {
      list = list.filter((d) => d.type === filters.type);
    }
    if (filters.dateFrom) {
      list = list.filter((d) => d.created_at.slice(0, 10) >= filters.dateFrom);
    }
    if (filters.dateTo) {
      list = list.filter((d) => d.created_at.slice(0, 10) <= filters.dateTo);
    }
    return list;
  }, [documents, filters]);

  const activeFilterCount = [filters.type, filters.dateFrom || filters.dateTo].filter(Boolean).length;

  // ── Handlers ──────────────────────────────────────────────────────
  function handleSelect(doc: AgentDocument) {
    setSelectedDoc(doc);
    setSheetOpen(true);
  }

  function handleDownload(doc: AgentDocument) {
    const url = generateSignedUrl(doc);
    const a = document.createElement("a");
    a.href = url;
    a.download = doc.url.split("/").pop() ?? "document";
    a.click();
    toast.info(t("toasts.download_link"));
  }

  function clearAllFilters() {
    setFilters({ type: "", dateFrom: "", dateTo: "" });
  }

  // ── Render helpers ─────────────────────────────────────────────────
  const tCommon = useTranslations("common");

  const tType = (key: string) =>
    t(`type.${key}` as Parameters<typeof t>[0]);

  const filterBar = (
    <div className="flex flex-wrap gap-2 items-center">
      <TypeCombobox
        value={filters.type}
        onChange={(v) => setFilters((f) => ({ ...f, type: v }))}
        tType={tType}
        tAll={t("filters.type_all")}
      />
      <DateRangePicker
        from={filters.dateFrom}
        to={filters.dateTo}
        onChange={(from, to) => setFilters((f) => ({ ...f, dateFrom: from, dateTo: to }))}
        tLabel={t("filters.date_range")}
        tFrom={t("filters.date_from")}
        tTo={t("filters.date_to")}
        tApply={t("filters.apply")}
      />
      {activeFilterCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="h-9 text-sm text-muted-foreground hover:text-destructive"
          onClick={clearAllFilters}
        >
          <X className="size-3.5 mr-1" aria-hidden="true" />
          {tCommon("clearAll")}
        </Button>
      )}
    </div>
  );

  // ── Loading state ──────────────────────────────────────────────────
  if (fetchState === "loading") {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={t("page_title")} subtitle={t("page_subtitle")} />
        <Skeleton className="h-9 w-64" />
        <DocumentsSkeleton />
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────
  if (fetchState === "error") {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={t("page_title")} subtitle={t("page_subtitle")} />
        <Alert variant="destructive">
          <AlertCircle className="size-4" aria-hidden="true" />
          <AlertTitle>{t("error.title")}</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-4 flex-wrap">
            <span>{t("error.description")}</span>
            <Button variant="outline" size="sm" onClick={loadDocuments} className="min-h-[44px]">
              <RefreshCw className="size-4 mr-2" aria-hidden="true" />
              {t("error.retry")}
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // ── Empty all docs ──────────────────────────────────────────────────
  if (fetchState === "success" && documents.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={t("page_title")} subtitle={t("page_subtitle")} />
        <EmptyState
          icon={FileText}
          title={t("empty.no_documents")}
          description={t("empty.no_documents_description")}
        />
      </div>
    );
  }

  // ── Success state ──────────────────────────────────────────────────
  const hasResults = filteredDocs.length > 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <PageHeader title={t("page_title")} subtitle={t("page_subtitle")} />

      {/* Desktop filter row */}
      <div className="hidden md:flex">{filterBar}</div>

      {/* Mobile filter sheet */}
      <div className="md:hidden">
        <MobileFilterSheet
          activeCount={activeFilterCount}
          onClearAll={clearAllFilters}
          onApply={() => { /* filters are already reactive */ }}
        >
          <div className="flex flex-col gap-4">
            {/* Type */}
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-foreground">{t("filters.type")}</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={!filters.type ? "default" : "outline"}
                  className="h-9 text-sm min-h-[44px]"
                  onClick={() => setFilters((f) => ({ ...f, type: "" }))}
                >
                  {t("filters.type_all")}
                </Button>
                {DOCUMENT_TYPES.map((type) => (
                  <Button
                    key={type}
                    size="sm"
                    variant={filters.type === type ? "default" : "outline"}
                    className="h-9 text-sm min-h-[44px]"
                    onClick={() => setFilters((f) => ({ ...f, type }))}
                  >
                    {tType(type)}
                  </Button>
                ))}
              </div>
            </div>
            {/* Date range */}
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-foreground">{t("filters.date_range")}</p>
              <div className="flex flex-col gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted-foreground" htmlFor="mob-doc-date-from">
                    {t("filters.date_from")}
                  </label>
                  <input
                    id="mob-doc-date-from"
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
                    className="h-11 rounded-md border border-border bg-background px-3 text-sm text-foreground"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted-foreground" htmlFor="mob-doc-date-to">
                    {t("filters.date_to")}
                  </label>
                  <input
                    id="mob-doc-date-to"
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
                    className="h-11 rounded-md border border-border bg-background px-3 text-sm text-foreground"
                  />
                </div>
              </div>
            </div>
          </div>
        </MobileFilterSheet>
      </div>

      {/* No-results after filter */}
      {!hasResults ? (
        <EmptyState
          icon={FileText}
          title={t("empty.no_results")}
          description={t("empty.no_results_description")}
          action={{ label: tCommon("clearAll"), onClick: clearAllFilters }}
        />
      ) : (
        <>
          {/* Desktop table */}
          <DocumentsTable
            docs={filteredDocs}
            locale={locale}
            onSelect={handleSelect}
            onDownload={handleDownload}
            tType={tType}
            tDownload={t("actions.download")}
            t={t}
          />

          {/* Mobile card list */}
          <ul className="flex flex-col gap-3 md:hidden" role="list">
            {filteredDocs.map((doc) => (
              <li key={doc.id}>
                <DocumentCard
                  doc={doc}
                  locale={locale}
                  onSelect={() => handleSelect(doc)}
                  onDownload={() => handleDownload(doc)}
                  tType={tType}
                  tDownload={t("actions.download")}
                  tCreated={t("columns.date")}
                />
              </li>
            ))}
          </ul>
        </>
      )}

      {/* Detail sheet */}
      <DocumentDetailSheet
        doc={selectedDoc}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        locale={locale}
        onDownload={handleDownload}
      />
    </div>
  );
}
