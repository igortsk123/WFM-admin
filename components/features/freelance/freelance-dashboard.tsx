"use client";

import { useTranslations } from "next-intl";
import { AlertTriangle, Inbox, Plus, RefreshCw } from "lucide-react";

import { useAuth } from "@/lib/contexts/auth-context";
import { ADMIN_ROUTES } from "@/lib/constants/routes";

import { Button } from "@/components/ui/button";
import type { ComboboxOption } from "@/components/ui/combobox";

import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";

import { ActivitySection } from "./freelance-dashboard/section-activity";
import { BudgetTable } from "./freelance-dashboard/section-budget-table";
import { DashboardBanners } from "./freelance-dashboard/section-banners";
import { DashboardFilters } from "./freelance-dashboard/section-filters";
import { DashboardLoadingShell } from "./freelance-dashboard/skeleton";
import { KpiCards } from "./freelance-dashboard/section-kpi-cards";
import { useDashboardData } from "./freelance-dashboard/use-dashboard-data";

export function FreelanceDashboard() {
  const t = useTranslations("screen.freelanceDashboard");
  const tCommon = useTranslations("common");
  const { user } = useAuth();

  const isSupervisor = user.role === "SUPERVISOR";
  const isStoreDirector = user.role === "STORE_DIRECTOR";
  const isClientDirect = user.organization.payment_mode === "CLIENT_DIRECT";
  const externalHrEnabled = user.organization.external_hr_enabled;

  const {
    status,
    data,
    period,
    setPeriod,
    sourceFilter,
    setSourceFilter,
    storeFilter,
    setStoreFilter,
    kpiTotals,
    overspentStores,
    reload,
    handleBudgetRowClick,
  } = useDashboardData();

  // ── Filter option lists ───────────────────────────────────────────────────
  const storeOptions: ComboboxOption[] = [
    { value: "all", label: "Все объекты" },
    ...(user.stores ?? []).map((s) => ({
      value: String(s.id),
      label: s.name,
    })),
  ];

  const sourceOptions: ComboboxOption[] = [
    { value: "all", label: t("filters.source_all") },
    { value: "INTERNAL", label: t("filters.source_internal") },
    { value: "EXTERNAL", label: t("filters.source_external") },
  ];

  // ── Loading state ─────────────────────────────────────────────────────────
  if (status === "loading") {
    return <DashboardLoadingShell />;
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (status === "error") {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <AlertTriangle className="size-10 text-destructive" aria-hidden="true" />
        <p className="text-lg font-medium">{tCommon("error")}</p>
        <p className="text-sm text-muted-foreground">{tCommon("retry")}</p>
        <Button onClick={reload} variant="outline" className="gap-2">
          <RefreshCw className="size-4" aria-hidden="true" />
          {tCommon("retry")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DashboardBanners
        isClientDirect={isClientDirect}
        overspentCount={overspentStores.length}
      />

      <PageHeader
        title={t("page_title")}
        actions={
          !isStoreDirector && (
            <Button asChild size="sm" className="gap-2 min-h-[44px]">
              <Link href={ADMIN_ROUTES.freelanceApplicationNew}>
                <Plus className="size-4" aria-hidden="true" />
                <span>{t("actions.new_application")}</span>
              </Link>
            </Button>
          )
        }
      />

      <DashboardFilters
        period={period}
        onPeriodChange={setPeriod}
        externalHrEnabled={externalHrEnabled}
        sourceFilter={sourceFilter}
        onSourceChange={setSourceFilter}
        sourceOptions={sourceOptions}
        storeFilter={storeFilter}
        onStoreChange={setStoreFilter}
        storeOptions={storeOptions}
      />

      {status === "empty" && (
        <EmptyState
          icon={Inbox}
          title="Внештат пока не используется"
          description="Создайте первую заявку, чтобы начать работу с модулем внештата."
          action={
            !isStoreDirector
              ? {
                  label: t("actions.new_application"),
                  href: ADMIN_ROUTES.freelanceApplicationNew,
                  icon: Plus,
                }
              : undefined
          }
        />
      )}

      {status === "success" && data && (
        <>
          {kpiTotals && (
            <KpiCards totals={kpiTotals} isClientDirect={isClientDirect} />
          )}

          <BudgetTable
            usages={data.usages}
            isSupervisor={isSupervisor}
            isStoreDirector={isStoreDirector}
            onRowClick={handleBudgetRowClick}
          />

          <ActivitySection
            pendingApps={data.pendingApps}
            pendingTotal={data.pendingTotal}
            todayAssignments={data.todayAssignments}
          />
        </>
      )}
    </div>
  );
}
