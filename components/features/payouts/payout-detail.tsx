"use client";

import { useTranslations } from "next-intl";
import {
  Calculator,
  Download,
  RefreshCw,
} from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { PageHeader } from "@/components/shared/page-header";

import { ADMIN_ROUTES } from "@/lib/constants/routes";

import { formatDate } from "./payout-detail/_shared";
import { CalculateDialog } from "./payout-detail/dialog-calculate";
import { FinalizeDialog } from "./payout-detail/dialog-finalize";
import { CalculatingProgress } from "./payout-detail/section-calculating-progress";
import { FiltersBar } from "./payout-detail/section-filters";
import { RowsTable } from "./payout-detail/section-rows-table";
import { StageTimeline } from "./payout-detail/section-stage-timeline";
import { SummaryKpis } from "./payout-detail/section-summary-kpis";
import { EmployeeSheet } from "./payout-detail/sheet-employee";
import { PayoutDetailSkeleton } from "./payout-detail/skeleton";
import { PayoutStatusBadge } from "./payout-detail/status-badge";
import { usePayoutDetail } from "./payout-detail/use-payout-detail";

export function PayoutDetail({ id }: { id: string }) {
  const t = useTranslations("screen.payoutDetail");
  const tCommon = useTranslations("common");

  const {
    period,
    loading,
    error,
    filteredRows,
    anomalyCount,
    filterMode,
    setFilterMode,
    searchQuery,
    setSearchQuery,
    selectedRow,
    drawerOpen,
    setDrawerOpen,
    handleRowClick,
    calculateDialogOpen,
    setCalculateDialogOpen,
    finalizeDialogOpen,
    setFinalizeDialogOpen,
    calculating,
    finalizing,
    loadPeriod,
    handleCalculate,
    handleFinalize,
    handleExport,
  } = usePayoutDetail(id);

  // Action buttons based on status
  const renderActions = () => {
    if (!period) return null;

    switch (period.status) {
      case "OPEN":
        return (
          <Button onClick={() => setCalculateDialogOpen(true)}>
            <Calculator className="size-4" />
            {t("actions.start_calculation")}
          </Button>
        );
      case "CALCULATING":
        return <CalculatingProgress />;
      case "READY":
        return (
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setCalculateDialogOpen(true)}>
              <RefreshCw className="size-4" />
              {t("actions.recalculate")}
            </Button>
            <Button onClick={() => setFinalizeDialogOpen(true)}>
              {t("actions.finalize")}
            </Button>
          </div>
        );
      case "PAID":
        return (
          <Button variant="outline" onClick={handleExport}>
            <Download className="size-4" />
            {t("actions.export_xlsx")}
          </Button>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return <PayoutDetailSkeleton />;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription className="flex items-center justify-between">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={loadPeriod}>
            <RefreshCw className="size-4 mr-1" />
            {tCommon("retry")}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!period) {
    return null;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={period.period_label}
        subtitle={`${formatDate(period.period_start)} — ${formatDate(period.period_end)} · ${t("summary.employees")}: ${period.employees_count}`}
        breadcrumbs={[
          { label: t("breadcrumbs.payouts"), href: ADMIN_ROUTES.payouts },
          { label: period.period_label },
        ]}
        actions={
          <div className="flex items-center gap-3">
            <PayoutStatusBadge status={period.status} t={t} />
            {renderActions()}
          </div>
        }
      />

      {/* Stage Timeline */}
      <Card>
        <CardContent className="py-4">
          <StageTimeline currentStatus={period.status} />
        </CardContent>
      </Card>

      {/* Summary KPIs */}
      <SummaryKpis period={period} anomalyCount={anomalyCount} />

      {/* Filters */}
      <FiltersBar
        filterMode={filterMode}
        onFilterModeChange={setFilterMode}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        anomalyCount={anomalyCount}
      />

      {/* Table */}
      <RowsTable rows={filteredRows} onRowClick={handleRowClick} />

      {/* Dialogs */}
      <CalculateDialog
        open={calculateDialogOpen}
        onOpenChange={setCalculateDialogOpen}
        onConfirm={handleCalculate}
        loading={calculating}
      />

      <FinalizeDialog
        open={finalizeDialogOpen}
        onOpenChange={setFinalizeDialogOpen}
        onConfirm={handleFinalize}
        loading={finalizing}
      />

      <EmployeeSheet
        row={selectedRow}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </div>
  );
}
