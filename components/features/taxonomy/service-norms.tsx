"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Archive, ClipboardList, Plus } from "lucide-react";
import { useQueryState } from "nuqs";

import type { ServiceNorm } from "@/lib/types";
import { useAuth } from "@/lib/contexts/auth-context";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { ResponsiveDataTable } from "@/components/shared/responsive-data-table";

import { Button } from "@/components/ui/button";

import { canWrite } from "./service-norms/_shared";
import { MobileNormCard } from "./service-norms/row-mobile-card";
import { ServiceNormsSkeleton } from "./service-norms/service-norms-skeleton";
import { ServiceNormsToolbar } from "./service-norms/section-toolbar";
import { NormSheet } from "./service-norms/sheet-norm";
import { useServiceNormsColumns } from "./service-norms/use-service-norms-columns";
import { useServiceNormsData } from "./service-norms/use-service-norms-data";

export function ServiceNorms() {
  const t = useTranslations("screen.serviceNorms");
  const tFreelance = useTranslations("freelance");
  const { user } = useAuth();

  const isWriter = canWrite(user.role);
  const defaultCurrency = user.organization.default_currency;

  // ── nuqs filter state ─────────────────────────────────────────
  const [tab, setTab] = useQueryState("tab", { defaultValue: "active" });
  const [filterFormat, setFilterFormat] = useQueryState("fmt", {
    defaultValue: "",
  });
  const [filterWorkType, setFilterWorkType] = useQueryState("wt", {
    defaultValue: "",
  });

  const isArchive = tab === "archive";

  // ── data ──────────────────────────────────────────────────────
  const { norms, loading, error, fetchData, handleArchive } =
    useServiceNormsData({
      isArchive,
      filterFormat: filterFormat ?? "",
      filterWorkType: filterWorkType ?? "",
      t,
    });

  // ── sheet state ───────────────────────────────────────────────
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ServiceNorm | null>(null);

  const openCreate = React.useCallback(() => {
    setEditing(null);
    setSheetOpen(true);
  }, []);

  const openEdit = React.useCallback((norm: ServiceNorm) => {
    setEditing(norm);
    setSheetOpen(true);
  }, []);

  // ── table columns ─────────────────────────────────────────────
  const columns = useServiceNormsColumns({
    isWriter,
    isArchive,
    onEdit: openEdit,
    onArchive: handleArchive,
    t,
    tFreelance,
  });

  // ── derived ───────────────────────────────────────────────────
  const isEmpty = !loading && !error && norms.length === 0;

  // ── loading ───────────────────────────────────────────────────
  if (loading && norms.length === 0) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <ServiceNormsSkeleton />
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <PageHeader
          title={t("page_title")}
          subtitle={t("page_subtitle")}
          breadcrumbs={[
            { label: t("breadcrumbs.home"), href: "/dashboard" },
            { label: t("breadcrumbs.taxonomy") },
            { label: t("breadcrumbs.norms") },
          ]}
          actions={
            isWriter ? (
              <Button
                size="sm"
                className="h-9 min-w-[44px] gap-1.5"
                onClick={openCreate}
              >
                <Plus className="size-4" aria-hidden="true" />
                <span className="hidden sm:inline">{t("actions.create")}</span>
              </Button>
            ) : null
          }
        />

        {/* Tabs + filters */}
        <ServiceNormsToolbar
          tab={tab}
          onTabChange={(v) => void setTab(v)}
          filterFormat={filterFormat}
          onFilterFormatChange={(v) => void setFilterFormat(v)}
          filterWorkType={filterWorkType}
          onFilterWorkTypeChange={(v) => void setFilterWorkType(v)}
          t={t}
          tFreelance={tFreelance}
        />

        {/* Content */}
        {error ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-sm text-muted-foreground">
              Ошибка загрузки. Попробуйте ещё раз.
            </p>
          </div>
        ) : isEmpty ? (
          isArchive ? (
            <EmptyState
              icon={Archive}
              title={t("empty.archive_title")}
              description={t("empty.archive_description")}
            />
          ) : (
            <EmptyState
              icon={ClipboardList}
              title={t("empty.active_title")}
              description={t("empty.active_description")}
              action={
                isWriter
                  ? {
                      label: t("empty.active_cta"),
                      onClick: openCreate,
                      icon: Plus,
                    }
                  : undefined
              }
            />
          )
        ) : (
          <ResponsiveDataTable
            columns={columns}
            data={norms}
            mobileCardRender={(norm) => (
              <MobileNormCard
                norm={norm}
                isWriter={isWriter}
                isArchive={isArchive}
                onEdit={openEdit}
                onArchive={handleArchive}
                t={t}
                tFreelance={tFreelance}
              />
            )}
            isLoading={loading}
          />
        )}
      </div>

      {/* Sheet */}
      <NormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        editing={editing}
        defaultCurrency={defaultCurrency}
        onSuccess={fetchData}
        t={t}
        tFreelance={tFreelance}
      />
    </>
  );
}
