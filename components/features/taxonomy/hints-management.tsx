"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Plus,
  Download,
  Lightbulb,
  ChevronUp,
  ChevronDown,
  LayoutList,
  Table2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog } from "@/components/ui/alert-dialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

import { MOCK_WORK_TYPES } from "@/lib/mock-data/work-types";
import { MOCK_ZONES } from "@/lib/mock-data/zones";
import { MOCK_HINTS } from "@/lib/mock-data/hints";
import {
  getHintsCoverage,
  createHint,
  updateHint,
  deleteHint,
  type HintWithLabels,
  type HintsCoverage,
} from "@/lib/api/hints";

import { PairHintsList } from "./hints-management/hint-list";
import { TableView } from "./hints-management/table-view";
import { HintDialog } from "./hints-management/hint-dialog";
import { WorkTypeList, ZoneList } from "./hints-management/pair-sidebar";
import { StatsRow } from "./hints-management/stats-row";
import type { LocalHint, ViewMode } from "./hints-management/_shared";

export function HintsManagement() {
  const t = useTranslations("screen.hints");
  const router = useRouter();
  const searchParams = useSearchParams();

  const viewParam = searchParams.get("view");
  const [view, setView] = React.useState<ViewMode>(
    viewParam === "table" ? "table" : "pair"
  );

  // Mobile detection
  const [isMobile, setIsMobile] = React.useState(false);
  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Coverage stats
  const [coverage, setCoverage] = React.useState<HintsCoverage | null>(null);
  const [statsLoading, setStatsLoading] = React.useState(true);

  React.useEffect(() => {
    getHintsCoverage().then((r: { data: HintsCoverage }) => {
      setCoverage(r.data);
      setStatsLoading(false);
    });
  }, []);

  // Pair selection
  const [selectedWorkTypeId, setSelectedWorkTypeId] = React.useState<number | null>(null);
  const [selectedZoneId, setSelectedZoneId] = React.useState<number | null>(null);

  // Filters inside pair view
  const [workTypeSearch, setWorkTypeSearch] = React.useState("");
  const [zoneSearch, setZoneSearch] = React.useState("");

  // Mobile collapse
  const [workTypeListOpen, setWorkTypeListOpen] = React.useState(true);
  const [zoneListOpen, setZoneListOpen] = React.useState(true);

  // Create/edit dialog
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<HintWithLabels | null>(null);

  // Delete dialog (table view)
  const [deleteTarget, setDeleteTarget] = React.useState<HintWithLabels | null>(null);
  const [deleteAlertOpen, setDeleteAlertOpen] = React.useState(false);

  // Global hint list (for re-renders after mutation)
  const [localHints, setLocalHints] = React.useState<LocalHint[]>([...MOCK_HINTS]);

  const globalZones = MOCK_ZONES.filter((z) => z.approved && !z.store_id);
  const globalWorkTypes = MOCK_WORK_TYPES.filter((wt) => wt.id <= 13);

  // URL sync for view
  function handleViewChange(v: ViewMode) {
    setView(v);
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", v);
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  async function handleCreate(data: { work_type_id: number; zone_id: number; text: string }) {
    const res = await createHint(data);
    if (res.success) {
      const newHint: LocalHint = {
        id: Number(res.id),
        work_type_id: data.work_type_id,
        zone_id: data.zone_id,
        text: data.text,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setLocalHints((prev) => [...prev, newHint]);
    }
  }

  async function handleEditSave(data: { work_type_id: number; zone_id: number; text: string }) {
    if (!editTarget) return;
    await updateHint(String(editTarget.id), { text: data.text });
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    await deleteHint(String(deleteTarget.id));
    setLocalHints((prev) => prev.filter((h) => h.id !== deleteTarget.id));
    setDeleteTarget(null);
    setDeleteAlertOpen(false);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <PageHeader
        breadcrumbs={[
          { label: t("breadcrumbs.taxonomy"), href: "/taxonomy/work-types" },
          { label: t("breadcrumbs.hints") },
        ]}
        title={t("page_title")}
        subtitle={t("page_subtitle")}
        actions={
          <>
            <Button variant="outline" size="sm">
              <Download className="size-4 mr-1.5" />
              {t("actions.export")}
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setEditTarget(null);
                setCreateDialogOpen(true);
              }}
            >
              <Plus className="size-4 mr-1.5" />
              {t("actions.create")}
            </Button>
          </>
        }
      />

      {/* Stats row */}
      <StatsRow coverage={coverage} statsLoading={statsLoading} />

      {/* View toggle — hidden on mobile (only pair view) */}
      <div className="hidden md:flex items-center gap-2">
        <ToggleGroup
          type="single"
          value={view}
          onValueChange={(v) => v && handleViewChange(v as ViewMode)}
          className="border border-border rounded-lg p-0.5 gap-0.5"
        >
          <ToggleGroupItem value="pair" className="h-8 px-3 text-sm gap-1.5 data-[state=on]:bg-background data-[state=on]:shadow-sm rounded-md">
            <LayoutList className="size-4" />
            {t("view.pair")}
          </ToggleGroupItem>
          <ToggleGroupItem value="table" className="h-8 px-3 text-sm gap-1.5 data-[state=on]:bg-background data-[state=on]:shadow-sm rounded-md">
            <Table2 className="size-4" />
            {t("view.table")}
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* ── PAIR VIEW ── */}
      {(view === "pair" || isMobile) && (
        <>
          {/* Desktop: 3-col grid */}
          <div className="hidden lg:grid lg:grid-cols-3 gap-4 items-start">
            {/* Left: work types + zones */}
            <div className="sticky top-20 flex flex-col gap-4">
              <Card>
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm font-medium">
                    {t("pair_view.work_types_card")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <WorkTypeList
                    workTypes={globalWorkTypes}
                    selectedWorkTypeId={selectedWorkTypeId}
                    onSelect={(id) => {
                      setSelectedWorkTypeId(id);
                      setSelectedZoneId(null);
                    }}
                    hints={localHints}
                    search={workTypeSearch}
                    onSearchChange={setWorkTypeSearch}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm font-medium">
                    {t("pair_view.zones_card")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <ZoneList
                    zones={globalZones}
                    selectedZoneId={selectedZoneId}
                    selectedWorkTypeId={selectedWorkTypeId}
                    onSelect={setSelectedZoneId}
                    hints={localHints}
                    search={zoneSearch}
                    onSearchChange={setZoneSearch}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Right: hints */}
            <div className="col-span-2">
              {!selectedWorkTypeId || !selectedZoneId ? (
                <EmptyState
                  icon={Lightbulb}
                  title={t("pair_view.select_pair_title")}
                  description={t("pair_view.select_pair_subtitle")}
                />
              ) : (
                <PairHintsList
                  key={`${selectedWorkTypeId}-${selectedZoneId}`}
                  workTypeId={selectedWorkTypeId}
                  zoneId={selectedZoneId}
                  isMobile={false}
                  onAddClick={() => setCreateDialogOpen(true)}
                />
              )}
            </div>
          </div>

          {/* Tablet md–lg: stack */}
          <div className="hidden md:flex lg:hidden flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm font-medium">{t("pair_view.work_types_card")}</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <WorkTypeList
                    workTypes={globalWorkTypes}
                    selectedWorkTypeId={selectedWorkTypeId}
                    onSelect={(id) => {
                      setSelectedWorkTypeId(id);
                      setSelectedZoneId(null);
                    }}
                    hints={localHints}
                    search={workTypeSearch}
                    onSearchChange={setWorkTypeSearch}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm font-medium">{t("pair_view.zones_card")}</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <ZoneList
                    zones={globalZones}
                    selectedZoneId={selectedZoneId}
                    selectedWorkTypeId={selectedWorkTypeId}
                    onSelect={setSelectedZoneId}
                    hints={localHints}
                    search={zoneSearch}
                    onSearchChange={setZoneSearch}
                  />
                </CardContent>
              </Card>
            </div>
            {!selectedWorkTypeId || !selectedZoneId ? (
              <EmptyState
                icon={Lightbulb}
                title={t("pair_view.select_pair_title")}
                description={t("pair_view.select_pair_subtitle")}
              />
            ) : (
              <PairHintsList
                key={`${selectedWorkTypeId}-${selectedZoneId}`}
                workTypeId={selectedWorkTypeId}
                zoneId={selectedZoneId}
                isMobile={false}
                onAddClick={() => setCreateDialogOpen(true)}
              />
            )}
          </div>

          {/* Mobile: single column stack */}
          <div className="flex flex-col gap-3 md:hidden">
            {/* Work types collapsible */}
            <Card>
              <button
                className="flex w-full items-center justify-between px-4 py-3"
                onClick={() => setWorkTypeListOpen((p) => !p)}
              >
                <span className="text-sm font-medium">{t("pair_view.work_types_card")}</span>
                {workTypeListOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
              </button>
              {workTypeListOpen && (
                <CardContent className="px-4 pb-4 pt-0">
                  <WorkTypeList
                    workTypes={globalWorkTypes}
                    selectedWorkTypeId={selectedWorkTypeId}
                    onSelect={(id) => {
                      setSelectedWorkTypeId(id);
                      setSelectedZoneId(null);
                    }}
                    hints={localHints}
                    search={workTypeSearch}
                    onSearchChange={setWorkTypeSearch}
                  />
                </CardContent>
              )}
            </Card>

            {/* Zones collapsible */}
            <Card>
              <button
                className="flex w-full items-center justify-between px-4 py-3"
                onClick={() => setZoneListOpen((p) => !p)}
              >
                <span className="text-sm font-medium">{t("pair_view.zones_card")}</span>
                {zoneListOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
              </button>
              {zoneListOpen && (
                <CardContent className="px-4 pb-4 pt-0">
                  <ZoneList
                    zones={globalZones}
                    selectedZoneId={selectedZoneId}
                    selectedWorkTypeId={selectedWorkTypeId}
                    onSelect={setSelectedZoneId}
                    hints={localHints}
                    search={zoneSearch}
                    onSearchChange={setZoneSearch}
                  />
                </CardContent>
              )}
            </Card>

            {/* Hints for selected pair */}
            {selectedWorkTypeId && selectedZoneId && (
              <PairHintsList
                key={`${selectedWorkTypeId}-${selectedZoneId}`}
                workTypeId={selectedWorkTypeId}
                zoneId={selectedZoneId}
                isMobile={true}
                onAddClick={() => setCreateDialogOpen(true)}
              />
            )}

            {(!selectedWorkTypeId || !selectedZoneId) && (
              <EmptyState
                icon={Lightbulb}
                title={t("pair_view.select_pair_title")}
                description={t("pair_view.select_pair_subtitle")}
                className="py-10"
              />
            )}
          </div>
        </>
      )}

      {/* ── TABLE VIEW ── */}
      {view === "table" && !isMobile && (
        <TableView
          onEdit={(h) => {
            setEditTarget(h);
            setCreateDialogOpen(true);
          }}
          onDelete={(h) => {
            setDeleteTarget(h);
            setDeleteAlertOpen(true);
          }}
        />
      )}

      {/* ── Create/Edit Dialog ── */}
      <HintDialog
        open={createDialogOpen}
        onOpenChange={(o) => {
          setCreateDialogOpen(o);
          if (!o) setEditTarget(null);
        }}
        editHint={editTarget}
        defaultWorkTypeId={selectedWorkTypeId ?? undefined}
        defaultZoneId={selectedZoneId ?? undefined}
        onSave={editTarget ? handleEditSave : handleCreate}
      />

      {/* ── Delete AlertDialog (table view) ── */}
      <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <ConfirmDialog
          title={t("dialogs.delete_confirm_title")}
          message={t("dialogs.delete_confirm_warning")}
          confirmLabel={t("dialogs.delete_action")}
          variant="destructive"
          onConfirm={handleDeleteConfirm}
          onOpenChange={setDeleteAlertOpen}
        />
      </AlertDialog>
    </div>
  );
}
