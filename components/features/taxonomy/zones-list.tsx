"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

import { ADMIN_ROUTES } from "@/lib/constants/routes";

import { type ZonesTab } from "./zones-list/_shared";
import { useZonesData } from "./zones-list/use-zones-data";
import { useZoneForm } from "./zones-list/use-zone-form";
import { TabGlobal } from "./zones-list/tab-global";
import { TabByStore } from "./zones-list/tab-by-store";
import { DialogZoneForm } from "./zones-list/dialog-zone-form";

export function ZonesList() {
  const t = useTranslations("screen.zones");

  const [activeTab, setActiveTab] = useState<ZonesTab>("global");
  const [selectedStoreId, setSelectedStoreId] = useState<string>("");
  const [searchGlobal, setSearchGlobal] = useState("");
  const [searchStore, setSearchStore] = useState("");

  // ── Data ──────────────────────────────────────────────────────────────
  const {
    activeStores,
    globalLoading,
    globalError,
    storeLoading,
    storeError,
    filteredGlobal,
    filteredStore,
    groupedByStore,
    mutateGlobal,
    mutateStore,
  } = useZonesData({ activeTab, selectedStoreId, searchGlobal, searchStore });

  // ── Form / CRUD handlers ──────────────────────────────────────────────
  const {
    form,
    dialogOpen,
    setDialogOpen,
    editingZone,
    deleteTarget,
    deleteAlertOpen,
    setDeleteAlertOpen,
    isPending,
    openCreate,
    openEdit,
    handleDeleteRequest,
    handleDelete,
    handleSubmit,
  } = useZoneForm({
    activeTab,
    selectedStoreId,
    mutateGlobal,
    mutateStore,
  });

  // ── Store options for combobox ────────────────────────────────────────
  const storeOptions = useMemo(
    () => [
      { value: "", label: t("filters.store_all") },
      ...activeStores.map((s) => ({
        value: String(s.id),
        label: `${s.name} (${s.external_code})`,
      })),
    ],
    [t, activeStores]
  );

  const formStoreOptions = useMemo(
    () =>
      activeStores.map((s) => ({
        value: String(s.id),
        label: `${s.name} (${s.external_code})`,
      })),
    [activeStores]
  );

  // ── Derived flags ─────────────────────────────────────────────────────
  const hasGlobalFilters = !!searchGlobal;
  const hasStoreFilters = !!searchStore || !!selectedStoreId;

  const formTitle = editingZone
    ? t("dialogs.edit_title", { name: editingZone.name })
    : t("dialogs.create_title");

  const deleteTargetId = deleteTarget?.id ?? null;
  const closeDeleteAlert = () => setDeleteAlertOpen(false);

  function clearStoreFilters() {
    setSearchStore("");
    setSelectedStoreId("");
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("page_title")}
        breadcrumbs={[
          { label: t("breadcrumbs.home"), href: ADMIN_ROUTES.dashboard },
          { label: t("breadcrumbs.taxonomy") },
          { label: t("breadcrumbs.zones") },
        ]}
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="size-4" />
            {t("actions.create")}
          </Button>
        }
      />

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as ZonesTab)}
        className="flex flex-col gap-4"
      >
        <div className="overflow-x-auto">
          <TabsList className="inline-flex">
            <TabsTrigger value="global">{t("tabs.global")}</TabsTrigger>
            <TabsTrigger value="by_store">{t("tabs.by_store")}</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="global">
          <TabGlobal
            isLoading={globalLoading}
            error={globalError}
            zones={filteredGlobal}
            search={searchGlobal}
            hasFilters={hasGlobalFilters}
            deleteAlertOpen={deleteAlertOpen}
            deleteTargetId={deleteTargetId}
            onSearchChange={setSearchGlobal}
            onClearFilters={() => setSearchGlobal("")}
            onRetry={() => mutateGlobal()}
            onEdit={openEdit}
            onDelete={handleDeleteRequest}
            onCloseDeleteAlert={closeDeleteAlert}
            onConfirmDelete={handleDelete}
            onAlertOpenChange={setDeleteAlertOpen}
            onCreate={openCreate}
          />
        </TabsContent>

        <TabsContent value="by_store">
          <TabByStore
            isLoading={storeLoading}
            error={storeError}
            zones={filteredStore}
            groupedByStore={groupedByStore}
            search={searchStore}
            selectedStoreId={selectedStoreId}
            storeOptions={storeOptions}
            hasFilters={hasStoreFilters}
            deleteAlertOpen={deleteAlertOpen}
            deleteTargetId={deleteTargetId}
            onSearchChange={setSearchStore}
            onSelectedStoreChange={setSelectedStoreId}
            onClearFilters={clearStoreFilters}
            onRetry={() => mutateStore()}
            onEdit={openEdit}
            onDelete={handleDeleteRequest}
            onCloseDeleteAlert={closeDeleteAlert}
            onConfirmDelete={handleDelete}
            onAlertOpenChange={setDeleteAlertOpen}
            onCreate={openCreate}
          />
        </TabsContent>
      </Tabs>

      <DialogZoneForm
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={formTitle}
        form={form}
        storeOptions={formStoreOptions}
        isPending={isPending}
        onSubmit={handleSubmit}
        t={t}
      />
    </div>
  );
}
