"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { parseAsString, useQueryStates } from "nuqs";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  RefreshCw,
  Wallet,
} from "lucide-react";
import {
  getMyEarnings,
  getMyFreelancers,
} from "@/lib/api/agent-cabinet";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { AgentEarning, Locale } from "@/lib/types";

import {
  PAGE_SIZE,
  defaultDateFrom,
  defaultDateTo,
  downloadCsv,
  type FreelancerOption,
  EarningsSkeleton,
  SummaryCards,
  FiltersBar,
  EarningsTable,
  MobileEarningCard,
  PayoutDetailSheet,
  EarningDetailSheet,
} from "./agent-earnings/index";

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT (orchestrator)
// ═══════════════════════════════════════════════════════════════════

export function AgentEarnings() {
  const t = useTranslations("screen.agentEarnings");
  const locale = useLocale() as Locale;

  // ── URL state via nuqs ──────────────────────────────────────────
  const [params, setParams] = useQueryStates({
    dateFrom: parseAsString.withDefault(defaultDateFrom()),
    dateTo: parseAsString.withDefault(defaultDateTo()),
    freelancerId: parseAsString.withDefault(""),
    status: parseAsString.withDefault(""),
    page: parseAsString.withDefault("1"),
    sortDir: parseAsString.withDefault("desc"),
  });

  const { dateFrom, dateTo, freelancerId, status, page, sortDir } = params;
  const currentPage = parseInt(page, 10) || 1;
  const sortDirection: "asc" | "desc" = sortDir === "asc" ? "asc" : "desc";

  // ── Data state ───────────────────────────────────────────────────
  const [allEarnings, setAllEarnings] = useState<AgentEarning[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [freelancerOptions, setFreelancerOptions] = useState<FreelancerOption[]>([]);

  // ── Sheet state ──────────────────────────────────────────────────
  const [detailEarning, setDetailEarning] = useState<AgentEarning | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [payoutSheetId, setPayoutSheetId] = useState<string | null>(null);
  const [payoutSheetFreelancer, setPayoutSheetFreelancer] = useState("");
  const [payoutOpen, setPayoutOpen] = useState(false);

  // ── Load data ────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const [earningsRes, freelancersRes] = await Promise.all([
        getMyEarnings({ date_from: dateFrom, date_to: dateTo, page_size: 999 }),
        getMyFreelancers({ page_size: 100 }),
      ]);
      setAllEarnings(earningsRes.data);
      const opts = freelancersRes.data.map((f) => ({
        id: f.id,
        name: `${f.last_name} ${f.first_name}${f.middle_name ? " " + f.middle_name : ""}`,
      }));
      setFreelancerOptions(opts);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    load();
  }, [load]);

  // ── Client-side filtering + sorting ────────────────────────────
  const filtered = useMemo(() => {
    let rows = [...allEarnings];
    if (freelancerId) {
      rows = rows.filter((e) => String(e.freelancer_id) === freelancerId);
    }
    if (status) {
      rows = rows.filter((e) => e.status === status);
    }
    rows.sort((a, b) => {
      const cmp = a.period_date.localeCompare(b.period_date);
      return sortDirection === "asc" ? cmp : -cmp;
    });
    return rows;
  }, [allEarnings, freelancerId, status, sortDirection]);

  // ── KPI aggregates ───────────────────────────────────────────────
  const kpi = useMemo(() => {
    const accrued = filtered.reduce((s, e) => s + e.commission_amount, 0);
    const paid = filtered
      .filter((e) => e.status === "PAID")
      .reduce((s, e) => s + e.commission_amount, 0);
    const pending = filtered
      .filter((e) => e.status === "CALCULATED")
      .reduce((s, e) => s + e.commission_amount, 0);

    // Days in range
    const fromMs = new Date(dateFrom).getTime();
    const toMs = new Date(dateTo).getTime();
    const days = Math.max(1, Math.ceil((toMs - fromMs) / 86400000) + 1);
    const avgPerDay = accrued / days;

    return { accrued, paid, pending, avgPerDay };
  }, [filtered, dateFrom, dateTo]);

  // ── Pagination ───────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // ── Active filters count ─────────────────────────────────────────
  const activeFiltersCount = [
    dateFrom !== defaultDateFrom() || dateTo !== defaultDateTo(),
    !!freelancerId,
    !!status,
  ].filter(Boolean).length;

  function clearAllFilters() {
    setParams({
      dateFrom: defaultDateFrom(),
      dateTo: defaultDateTo(),
      freelancerId: "",
      status: "",
      page: "1",
    });
  }

  function openPayoutSheet(payoutId: string, name: string, e: React.MouseEvent) {
    e.stopPropagation();
    setPayoutSheetId(payoutId);
    setPayoutSheetFreelancer(name);
    setPayoutOpen(true);
  }

  function openDetailSheet(earning: AgentEarning) {
    setDetailEarning(earning);
    setDetailOpen(true);
  }

  // ── LOADING ──────────────────────────────────────────────────────
  if (loading) return <EarningsSkeleton />;

  // ── ERROR ────────────────────────────────────────────────────────
  if (fetchError) {
    return (
      <div className="flex flex-col gap-4 max-w-md">
        <Alert variant="destructive">
          <AlertCircle className="size-4" aria-hidden="true" />
          <AlertTitle>{t("error_title")}</AlertTitle>
          <AlertDescription>{t("error_description")}</AlertDescription>
        </Alert>
        <Button variant="outline" size="sm" onClick={load} className="w-fit gap-2">
          <RefreshCw className="size-4" aria-hidden="true" />
          {t("retry")}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <PageHeader
        title={t("page_title")}
        subtitle={t("page_subtitle")}
        actions={
          <Button
            variant="outline"
            size="sm"
            className="gap-2 h-9"
            onClick={() => downloadCsv(filtered, locale)}
            aria-label={t("actions.export_csv")}
          >
            <Download className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">{t("actions.export_csv")}</span>
          </Button>
        }
      />

      {/* KPI cards */}
      <SummaryCards
        accrued={kpi.accrued}
        paid={kpi.paid}
        pending={kpi.pending}
        avgPerDay={kpi.avgPerDay}
        locale={locale}
      />

      {/* Filter row */}
      <FiltersBar
        dateFrom={dateFrom}
        dateTo={dateTo}
        freelancerId={freelancerId}
        status={status}
        freelancers={freelancerOptions}
        activeFiltersCount={activeFiltersCount}
        onChangeRange={(from, to) =>
          setParams({ dateFrom: from, dateTo: to, page: "1" })
        }
        onChangeFreelancer={(v) => setParams({ freelancerId: v, page: "1" })}
        onChangeStatus={(v) => setParams({ status: v, page: "1" })}
        onClearAll={clearAllFilters}
      />

      {/* Table — desktop / cards — mobile */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title={t("empty.title")}
          description={t("empty.description")}
        />
      ) : (
        <>
          <EarningsTable
            rows={pageRows}
            sortDir={sortDirection}
            locale={locale}
            onToggleSort={() =>
              setParams({
                sortDir: sortDirection === "asc" ? "desc" : "asc",
                page: "1",
              })
            }
            onRowClick={openDetailSheet}
            onPayoutClick={openPayoutSheet}
          />

          {/* Mobile cards */}
          <div className="flex flex-col gap-2 md:hidden">
            {pageRows.map((earning) => (
              <MobileEarningCard
                key={earning.id}
                earning={earning}
                onClick={() => openDetailSheet(earning)}
                locale={locale}
                statusLabel={t(`status.${earning.status}`)}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div
              className="flex items-center justify-between gap-4"
              aria-label="Pagination"
            >
              <p className="text-xs text-muted-foreground">
                {(currentPage - 1) * PAGE_SIZE + 1}–
                {Math.min(currentPage * PAGE_SIZE, filtered.length)} из{" "}
                {filtered.length}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8"
                  onClick={() => setParams({ page: String(currentPage - 1) })}
                  disabled={currentPage <= 1}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="size-4" aria-hidden="true" />
                </Button>
                <span className="text-xs tabular-nums px-2">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8"
                  onClick={() => setParams({ page: String(currentPage + 1) })}
                  disabled={currentPage >= totalPages}
                  aria-label="Next page"
                >
                  <ChevronRight className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Payout detail Sheet */}
      {payoutSheetId && (
        <PayoutDetailSheet
          payoutId={payoutSheetId}
          freelancerName={payoutSheetFreelancer}
          open={payoutOpen}
          onOpenChange={setPayoutOpen}
          locale={locale}
        />
      )}

      {/* Earning detail Sheet */}
      <EarningDetailSheet
        earning={detailEarning}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        locale={locale}
      />
    </div>
  );
}
