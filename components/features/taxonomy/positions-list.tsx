"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Briefcase, Download, Plus, SearchX } from "lucide-react";

import {
  getPositions,
  createPosition,
  type PositionWithCounts,
} from "@/lib/api/taxonomy";
import { ADMIN_ROUTES } from "@/lib/constants/routes";
import { useAuth } from "@/lib/contexts/auth-context";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ResponsiveDataTable } from "@/components/shared/responsive-data-table";

import { DeleteDialog } from "./positions-list/delete-dialog";
import { FiltersBar, type RoleFilter } from "./positions-list/filters-bar";
import { PositionDialog } from "./positions-list/position-dialog";
import { PositionMobileCard } from "./positions-list/position-mobile-card";
import { PositionSheet } from "./positions-list/position-sheet";
import { StatsRow } from "./positions-list/stats-row";
import { buildPositionColumns } from "./positions-list/position-columns";

export function PositionsList() {
  const t = useTranslations("screen.positions");
  const tRole = useTranslations("role.functional");
  const { user } = useAuth();

  // Permission: STORE_DIRECTOR gets 403 equivalent (read-only/hidden)
  const canEdit =
    user.role === "NETWORK_OPS" || user.role === "HR_MANAGER";

  // ── Filter state ─────────────────────────────────────────────────
  const [search, setSearch] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState<RoleFilter>("");

  // ── Data state ───────────────────────────────────────────────────
  const [data, setData] = React.useState<PositionWithCounts[]>([]);
  const [total, setTotal] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isError, setIsError] = React.useState(false);
  const [page, setPage] = React.useState(1);

  // ── Dialog state ─────────────────────────────────────────────────
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [editingPosition, setEditingPosition] =
    React.useState<PositionWithCounts | null>(null);
  const [deletingPosition, setDeletingPosition] =
    React.useState<PositionWithCounts | null>(null);

  // ── Fetch ────────────────────────────────────────────────────────
  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const result = await getPositions({
        search: search || undefined,
        role_id: roleFilter ? (Number(roleFilter) as 1 | 2) : undefined,
        page,
        page_size: 50,
      });
      setData(result.data);
      setTotal(result.total ?? 0);
    } catch {
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, [search, roleFilter, page]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Stats (unfiltered counts) ────────────────────────────────────
  const [statsTotal, setStatsTotal] = React.useState(0);
  const [statsWorker, setStatsWorker] = React.useState(0);
  const [statsManager, setStatsManager] = React.useState(0);
  const [statsLoading, setStatsLoading] = React.useState(true);

  React.useEffect(() => {
    setStatsLoading(true);
    Promise.all([
      getPositions({ page_size: 200 }),
      getPositions({ role_id: 1, page_size: 200 }),
      getPositions({ role_id: 2, page_size: 200 }),
    ]).then(([all, workers, managers]) => {
      setStatsTotal(all.total ?? 0);
      setStatsWorker(workers.total ?? 0);
      setStatsManager(managers.total ?? 0);
      setStatsLoading(false);
    });
  }, []);

  // ── Derived empty state ──────────────────────────────────────────
  const hasFilters = !!search || !!roleFilter;
  const isFiltered = hasFilters && !isLoading && data.length === 0;
  const isEmpty = !hasFilters && !isLoading && data.length === 0;

  // ── Open add/edit ────────────────────────────────────────────────
  function openCreate(isMobile: boolean) {
    setEditingPosition(null);
    if (isMobile) {
      setSheetOpen(true);
    } else {
      setDialogOpen(true);
    }
  }

  function openEdit(pos: PositionWithCounts, isMobile: boolean) {
    setEditingPosition(pos);
    if (isMobile) {
      setSheetOpen(true);
    } else {
      setDialogOpen(true);
    }
  }

  // ── Duplicate ────────────────────────────────────────────────────
  async function handleDuplicate(pos: PositionWithCounts) {
    const result = await createPosition({
      code: pos.code + "-COPY",
      name: pos.name + " (копия)",
      description: pos.description,
      role_id: pos.role_id,
      default_rank: pos.default_rank,
    });
    if (result.success) {
      toast.success(t("toasts.created"));
      fetchData();
    } else {
      toast.error(t("toasts.error"));
    }
  }

  // ── Filter helpers ────────────────────────────────────────────────
  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleRoleFilterChange = (value: RoleFilter) => {
    setRoleFilter(value);
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearch("");
    setRoleFilter("");
    setPage(1);
  };

  // ── Table columns ─────────────────────────────────────────────────
  const columns = React.useMemo(
    () =>
      buildPositionColumns({
        canEdit,
        onEdit: (pos) => openEdit(pos, false),
        onDuplicate: handleDuplicate,
        onDelete: setDeletingPosition,
        t,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canEdit, t]
  );

  // ── Error state ───────────────────────────────────────────────────
  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={t("breadcrumbs.positions")}
          breadcrumbs={[
            { label: t("breadcrumbs.taxonomy"), href: ADMIN_ROUTES.taxonomyWorkTypes },
            { label: t("breadcrumbs.positions") },
          ]}
        />
        <Alert variant="destructive">
          <AlertDescription>
            Не удалось загрузить данные. Попробуйте обновить страницу.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <PageHeader
        title={t("breadcrumbs.positions")}
        breadcrumbs={[
          { label: t("breadcrumbs.taxonomy"), href: ADMIN_ROUTES.taxonomyWorkTypes },
          { label: t("breadcrumbs.positions") },
        ]}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              className="hidden sm:flex items-center gap-1.5"
            >
              <Download className="size-3.5" />
              {t("actions.export")}
            </Button>
            {canEdit && (
              <>
                {/* Desktop create */}
                <Button
                  size="sm"
                  className="hidden md:flex items-center gap-1.5"
                  onClick={() => openCreate(false)}
                >
                  <Plus className="size-3.5" />
                  {t("actions.create")}
                </Button>
                {/* Mobile create */}
                <Button
                  size="sm"
                  className="flex md:hidden items-center gap-1.5"
                  onClick={() => openCreate(true)}
                >
                  <Plus className="size-3.5" />
                  {t("actions.create")}
                </Button>
              </>
            )}
          </>
        }
      />

      {/* Stats row */}
      <StatsRow
        total={statsTotal}
        worker={statsWorker}
        manager={statsManager}
        loading={statsLoading}
        t={t}
      />

      {/* Toolbar */}
      <FiltersBar
        search={search}
        onSearchChange={handleSearchChange}
        roleFilter={roleFilter}
        onRoleFilterChange={handleRoleFilterChange}
        onResetFilters={handleResetFilters}
        t={t}
      />

      {/* Empty: no positions at all */}
      {isEmpty && (
        <EmptyState
          icon={Briefcase}
          title={t("empty.no_positions_title")}
          description={t("empty.no_positions_subtitle")}
          action={
            canEdit
              ? {
                  label: t("empty.no_positions_cta"),
                  icon: Plus,
                  onClick: () => openCreate(false),
                }
              : undefined
          }
        />
      )}

      {/* Empty: filtered no results */}
      {isFiltered && (
        <EmptyState
          icon={SearchX}
          title={t("empty.filtered_title")}
          description={t("empty.filtered_reset")}
          action={{
            label: t("empty.filtered_reset"),
            onClick: handleResetFilters,
          }}
        />
      )}

      {/* Table */}
      {!isEmpty && !isFiltered && (
        <ResponsiveDataTable
          columns={columns}
          data={data}
          mobileCardRender={(pos) => (
            <PositionMobileCard
              position={pos}
              canEdit={canEdit}
              onEdit={(p) => openEdit(p, true)}
              onDuplicate={handleDuplicate}
              onDelete={setDeletingPosition}
              t={t}
            />
          )}
          isLoading={isLoading}
          isEmpty={data.length === 0}
          emptyMessage={{
            title: t("empty.no_positions_title"),
            description: t("empty.no_positions_subtitle"),
          }}
          pagination={{
            page,
            pageSize: 50,
            total,
            onPageChange: setPage,
          }}
        />
      )}

      {/* Dialogs */}
      {/* Desktop dialog */}
      <PositionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editingPosition}
        onSuccess={fetchData}
        t={t}
        tRole={tRole}
      />

      {/* Mobile sheet */}
      <PositionSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        editing={editingPosition}
        onSuccess={fetchData}
        t={t}
        tRole={tRole}
      />

      {/* Delete confirm */}
      <DeleteDialog
        position={deletingPosition}
        onOpenChange={(open) => !open && setDeletingPosition(null)}
        onSuccess={fetchData}
        t={t}
      />
    </div>
  );
}
