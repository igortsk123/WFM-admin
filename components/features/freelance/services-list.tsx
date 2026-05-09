"use client";

import { useCallback } from "react";
import { useLocale, useTranslations } from "next-intl";
import { parseAsInteger, parseAsString, useQueryState } from "nuqs";
import { FileDown, RefreshCw } from "lucide-react";

import { useAuth } from "@/lib/contexts/auth-context";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";

import { PageHeader } from "@/components/shared/page-header";
import { ResponsiveDataTable } from "@/components/shared/responsive-data-table";

import { AdjustAmountDialog } from "./adjust-amount-dialog";
import { DisputeServiceDialog } from "./dispute-service-dialog";
import { ServiceDetailSheet } from "./service-detail-sheet";

import {
  getEmptyState,
  getServicesPermissions,
  getTabsForPaymentMode,
  type TabKey,
} from "./services-list/_shared";
import { ServiceMobileCard } from "./services-list/mobile-card";
import { SectionFilters } from "./services-list/section-filters";
import { SectionTabs } from "./services-list/section-tabs";
import { ServicesListSkeleton } from "./services-list/services-list-skeleton";
import { useServicesColumns } from "./services-list/use-services-columns";
import { useServicesData } from "./services-list/use-services-data";

export function ServicesList() {
  const t = useTranslations("screen.freelanceServicesList");
  const tc = useTranslations("common");
  const locale = useLocale();
  const { user } = useAuth();

  const paymentMode = user.organization.payment_mode;
  const isNominal = paymentMode === "NOMINAL_ACCOUNT";

  const { canAdjustAmount, canConfirm, canSendToLegal, canExport } =
    getServicesPermissions(user.role, paymentMode);

  // ── URL state ─────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useQueryState(
    "tab",
    parseAsString.withDefault("all"),
  );
  const [storeFilter, setStoreFilter] = useQueryState(
    "store",
    parseAsString.withDefault(""),
  );
  const [freelancerFilter, setFreelancerFilter] = useQueryState(
    "performer",
    parseAsString.withDefault(""),
  );
  const [agentFilter, setAgentFilter] = useQueryState(
    "agent",
    parseAsString.withDefault(""),
  );
  const [workTypeFilter, setWorkTypeFilter] = useQueryState(
    "work_type",
    parseAsString.withDefault(""),
  );
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));

  const tab = activeTab as TabKey;
  const tabs = getTabsForPaymentMode(paymentMode);
  const isNoShowTab = tab === "no_show";

  // ── Data layer ────────────────────────────────────────────────────────────
  const {
    services,
    total,
    data,
    isLoading,
    error,
    mutate,

    noShowMap,

    storeOptions,
    agentOptions,
    workTypeOptions,
    freelancerOptions,

    detailService,
    sheetOpen,
    setSheetOpen,
    adjustService,
    setAdjustService,
    adjustOpen,
    setAdjustOpen,
    disputeTargetService,
    setDisputeTargetService,
    disputeOpen,
    setDisputeOpen,
    isSubmitting,

    openDetail,
    handleConfirm,
    handleDisputeSubmit,
    handleAdjustSubmit,
    handleSendToLegal,
  } = useServicesData({
    tab,
    paymentMode,
    storeFilter,
    freelancerFilter,
    agentFilter,
    workTypeFilter,
    page,
  });

  // ── Filter helpers ────────────────────────────────────────────────────────
  const activeFilterCount = [
    storeFilter,
    freelancerFilter,
    agentFilter,
    workTypeFilter,
  ].filter(Boolean).length;

  const clearAllFilters = useCallback(() => {
    void setStoreFilter("");
    void setFreelancerFilter("");
    void setAgentFilter("");
    void setWorkTypeFilter("");
    void setPage(1);
  }, [
    setStoreFilter,
    setFreelancerFilter,
    setAgentFilter,
    setWorkTypeFilter,
    setPage,
  ]);

  const wrapFilterChange = useCallback(
    (setter: (v: string) => Promise<unknown>) => (v: string) => {
      void setter(v);
      void setPage(1);
    },
    [setPage],
  );

  // ── Columns ───────────────────────────────────────────────────────────────
  const columns = useServicesColumns({
    locale,
    isNominal,
    isNoShowTab,
    canConfirm,
    canAdjustAmount,
    canSendToLegal,
    noShowMap,
    onConfirm: handleConfirm,
    onDispute: (s) => {
      setDisputeTargetService(s);
      setDisputeOpen(true);
    },
    onAdjust: (s) => {
      setAdjustService(s);
      setAdjustOpen(true);
    },
    onSendToLegal: handleSendToLegal,
    onOpenDetail: openDetail,
  });

  const emptyState = getEmptyState(tab, t);

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (isLoading && !data) {
    return <ServicesListSkeleton />;
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <TooltipProvider>
      <div className="space-y-6">
        <PageHeader
          title={t("page_title")}
          subtitle={t("page_subtitle")}
          breadcrumbs={[
            { label: t("breadcrumbs.home"), href: "/dashboard" },
            { label: t("breadcrumbs.freelance"), href: "/freelance" },
            { label: t("breadcrumbs.services") },
          ]}
          actions={
            canExport ? (
              <Button variant="outline" size="sm" className="gap-2 h-9">
                <FileDown className="size-4" />
                {t("export")}
              </Button>
            ) : undefined
          }
        />

        {error && (
          <Alert variant="destructive">
            <AlertDescription className="flex items-center justify-between">
              <span>{t("toasts.load_error")}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void mutate()}
                className="gap-1.5"
              >
                <RefreshCw className="size-3.5" />
                {tc("retry")}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <Tabs
          value={tab}
          onValueChange={(v) => {
            void setActiveTab(v);
            void setPage(1);
          }}
        >
          <SectionTabs
            tabs={tabs}
            activeTab={tab}
            onTabChange={(next) => {
              void setActiveTab(next);
              void setPage(1);
            }}
          />

          <SectionFilters
            isNominal={isNominal}
            storeOptions={storeOptions}
            freelancerOptions={freelancerOptions}
            agentOptions={agentOptions}
            workTypeOptions={workTypeOptions}
            storeFilter={storeFilter}
            freelancerFilter={freelancerFilter}
            agentFilter={agentFilter}
            workTypeFilter={workTypeFilter}
            setStoreFilter={wrapFilterChange(setStoreFilter)}
            setFreelancerFilter={wrapFilterChange(setFreelancerFilter)}
            setAgentFilter={wrapFilterChange(setAgentFilter)}
            setWorkTypeFilter={wrapFilterChange(setWorkTypeFilter)}
            activeFilterCount={activeFilterCount}
            onClearAll={clearAllFilters}
          />

          <ResponsiveDataTable
            columns={columns}
            data={services}
            mobileCardRender={(s) => (
              <ServiceMobileCard
                service={s}
                isNominal={isNominal}
                locale={locale}
              />
            )}
            isLoading={isLoading}
            isError={!!error}
            isEmpty={!isLoading && services.length === 0}
            emptyMessage={{
              title: emptyState.title,
              description: emptyState.description,
            }}
            pagination={{
              page,
              pageSize: 20,
              total,
              onPageChange: (p) => void setPage(p),
            }}
            onRowClick={(row, e) => {
              if (e.metaKey || e.ctrlKey) {
                window.open(`/freelance/services?id=${row.id}`, "_blank");
                return;
              }
              openDetail(row);
            }}
          />
        </Tabs>

        <ServiceDetailSheet
          service={detailService}
          noShowReport={detailService ? noShowMap.get(detailService.id) : null}
          paymentMode={paymentMode}
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          canAdjustAmount={canAdjustAmount}
          canConfirm={canConfirm}
          canSendToLegal={canSendToLegal}
          onConfirm={handleConfirm}
          onDispute={(s) => {
            setDisputeTargetService(s);
            setDisputeOpen(true);
          }}
          onAdjustAmount={(s) => {
            setAdjustService(s);
            setAdjustOpen(true);
          }}
          onSendToLegal={handleSendToLegal}
        />

        <AdjustAmountDialog
          service={adjustService}
          open={adjustOpen}
          onOpenChange={setAdjustOpen}
          onSubmit={handleAdjustSubmit}
          isSubmitting={isSubmitting}
        />

        <DisputeServiceDialog
          service={disputeTargetService}
          open={disputeOpen}
          onOpenChange={setDisputeOpen}
          onSubmit={handleDisputeSubmit}
          isSubmitting={isSubmitting}
        />
      </div>
    </TooltipProvider>
  );
}
