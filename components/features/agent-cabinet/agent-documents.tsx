"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { AlertCircle, FileText, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { getMyDocuments, type AgentDocument } from "@/lib/api/agent-cabinet";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Locale } from "@/lib/types";

import {
  DocumentsSkeleton,
  DocumentCard,
  DocumentsTable,
  DocumentDetailSheet,
  DesktopFilterBar,
  MobileFiltersSheet,
  generateSignedUrl,
  type FetchState,
  type FilterState,
} from "./agent-documents/index";

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT (orchestrator)
// ═══════════════════════════════════════════════════════════════════

export function AgentDocuments() {
  const t = useTranslations("screen.agentDocuments");
  const tCommon = useTranslations("common");
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
  const tType = (key: string) =>
    t(`type.${key}` as Parameters<typeof t>[0]);

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
      <div className="hidden md:flex">
        <DesktopFilterBar
          filters={filters}
          setFilters={setFilters}
          activeFilterCount={activeFilterCount}
          onClearAll={clearAllFilters}
          tType={tType}
        />
      </div>

      {/* Mobile filter sheet */}
      <div className="md:hidden">
        <MobileFiltersSheet
          filters={filters}
          setFilters={setFilters}
          activeFilterCount={activeFilterCount}
          onClearAll={clearAllFilters}
          tType={tType}
        />
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
