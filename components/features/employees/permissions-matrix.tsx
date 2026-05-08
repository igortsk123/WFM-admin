"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Download,
  MoreHorizontal,
  SearchX,
  UserPlus,
  Users,
} from "lucide-react";

import { useAuth } from "@/lib/contexts/auth-context";
import {
  bulkAssignPermission,
  getPermissionsCoverage,
  getUsers,
  updateUserPermissions,
  type PermissionCoverageRow,
  type UserWithAssignment,
} from "@/lib/api/users";
import { getStores } from "@/lib/api/stores";
import { getPositions } from "@/lib/api/taxonomy";
import { ADMIN_ROUTES } from "@/lib/constants/routes";
import type { Permission, Store } from "@/lib/types";

import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipProvider } from "@/components/ui/tooltip";

import {
  PAGE_SIZE,
  PERMISSIONS_4,
  type RevokeTarget,
  type RowState,
} from "./permissions-matrix/_shared";
import {
  BulkActionBar,
  BulkAssignDialog,
  BulkRevokeDialog,
} from "./permissions-matrix/bulk-actions";
import { FiltersBar } from "./permissions-matrix/filters-bar";
import { MatrixTable } from "./permissions-matrix/matrix-table";
import { StatCard } from "./permissions-matrix/stat-card";

export function PermissionsMatrix() {
  const t = useTranslations("screen.permissions");
  const tCommon = useTranslations("common");
  const tPerm = useTranslations("permission");
  const { user: authUser } = useAuth();

  const isNetworkScope =
    authUser.role === "NETWORK_OPS" ||
    authUser.role === "REGIONAL" ||
    authUser.role === "SUPERVISOR";

  // ── DATA STATE ────────────────────────────────────────────────────
  const [users, setUsers] = React.useState<UserWithAssignment[]>([]);
  const [totalUsers, setTotalUsers] = React.useState(0);
  const [coverage, setCoverage] = React.useState<PermissionCoverageRow[]>([]);
  const [stores, setStores] = React.useState<Store[]>([]);
  const [positions, setPositions] = React.useState<
    Array<{ id: number; name: string }>
  >([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [page, setPage] = React.useState(1);

  // ── FILTERS ───────────────────────────────────────────────────────
  const [search, setSearch] = React.useState("");
  const [filterStoreId, setFilterStoreId] = React.useState<number | null>(null);
  const [filterPositionId, setFilterPositionId] = React.useState<number | null>(
    null
  );
  const [filterPermission, setFilterPermission] =
    React.useState<Permission | null>(null);

  // ── LOCAL ROW STATE (optimistic) ──────────────────────────────────
  const [rowStates, setRowStates] = React.useState<Record<number, RowState>>(
    {}
  );

  // ── SELECTION ─────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = React.useState<Set<number>>(new Set());

  // ── DIALOGS ───────────────────────────────────────────────────────
  const [bulkAssignOpen, setBulkAssignOpen] = React.useState(false);
  const [bulkRevokeOpen, setBulkRevokeOpen] = React.useState(false);
  const [revokeTarget, setRevokeTarget] = React.useState<RevokeTarget | null>(
    null
  );

  // ── LOAD ──────────────────────────────────────────────────────────
  const loadData = React.useCallback(
    async (resetPage = false) => {
      setLoading(true);
      setError(null);
      try {
        const p = resetPage ? 1 : page;
        const [usersRes, coverageRes, storesRes, positionsRes] =
          await Promise.all([
            getUsers({
              search: search || undefined,
              store_ids: filterStoreId ? [filterStoreId] : undefined,
              position_id: filterPositionId ?? undefined,
              permissions: filterPermission ? [filterPermission] : undefined,
              page: p,
              page_size: PAGE_SIZE,
            }),
            getPermissionsCoverage(filterStoreId ?? undefined),
            getStores({}),
            getPositions({}),
          ]);

        setUsers(usersRes.data);
        setTotalUsers(usersRes.total ?? 0);
        setCoverage(coverageRes.data);
        setStores(storesRes.data);
        setPositions(
          positionsRes.data.map((pos) => ({ id: pos.id, name: pos.name }))
        );

        // Seed rowStates without overwriting already-modified rows
        setRowStates((prev) => {
          const initial: Record<number, RowState> = {};
          usersRes.data.forEach((u) => {
            if (!prev[u.id]) {
              initial[u.id] = { permissions: [...u.permissions] };
            }
          });
          return { ...initial, ...prev };
        });

        if (resetPage) setPage(1);
      } catch {
        setError(tCommon("error"));
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [search, filterStoreId, filterPositionId, filterPermission, page]
  );

  // Initial load + page change
  React.useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // Filters change → reset to page 1
  React.useEffect(() => {
    loadData(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, filterStoreId, filterPositionId, filterPermission]);

  // ── GRANT SINGLE ─────────────────────────────────────────────────
  const handleGrant = React.useCallback(
    async (
      userId: number,
      permission: Permission,
      currentPerms: Permission[]
    ) => {
      const newPerms = [...currentPerms, permission];
      setRowStates((prev) => ({ ...prev, [userId]: { permissions: newPerms } }));
      const res = await updateUserPermissions(userId, newPerms);
      if (!res.success) {
        setRowStates((prev) => ({
          ...prev,
          [userId]: { permissions: currentPerms },
        }));
        toast.error(t("toast.error"));
      } else {
        toast.success(t("toast.granted"));
      }
    },
    [t]
  );

  // ── REVOKE SINGLE ────────────────────────────────────────────────
  const handleRevoke = React.useCallback(
    async (
      userId: number,
      permission: Permission,
      currentPerms: Permission[]
    ) => {
      const newPerms = currentPerms.filter((p) => p !== permission);
      setRowStates((prev) => ({ ...prev, [userId]: { permissions: newPerms } }));
      const res = await updateUserPermissions(userId, newPerms);
      if (!res.success) {
        setRowStates((prev) => ({
          ...prev,
          [userId]: { permissions: currentPerms },
        }));
        toast.error(t("toast.error"));
      } else {
        toast.success(t("toast.revoked"));
      }
      setRevokeTarget(null);
    },
    [t]
  );

  // ── GRANT ALL 4 ──────────────────────────────────────────────────
  const handleGrantAll = React.useCallback(
    async (userId: number, currentPerms: Permission[]) => {
      const newPerms = Array.from(new Set([...currentPerms, ...PERMISSIONS_4]));
      setRowStates((prev) => ({ ...prev, [userId]: { permissions: newPerms } }));
      const res = await updateUserPermissions(userId, newPerms);
      if (!res.success) {
        setRowStates((prev) => ({
          ...prev,
          [userId]: { permissions: currentPerms },
        }));
        toast.error(t("toast.error"));
      } else {
        toast.success(t("toast.granted"));
      }
    },
    [t]
  );

  // ── REVOKE ALL ───────────────────────────────────────────────────
  const handleRevokeAll = React.useCallback(
    async (userId: number, currentPerms: Permission[]) => {
      setRowStates((prev) => ({ ...prev, [userId]: { permissions: [] } }));
      const res = await updateUserPermissions(userId, []);
      if (!res.success) {
        setRowStates((prev) => ({
          ...prev,
          [userId]: { permissions: currentPerms },
        }));
        toast.error(t("toast.error"));
      } else {
        toast.success(t("toast.revoked"));
      }
    },
    [t]
  );

  // ── BULK ASSIGN ──────────────────────────────────────────────────
  const handleBulkAssign = React.useCallback(
    async (permission: Permission) => {
      const ids = Array.from(selectedIds);
      const res = await bulkAssignPermission(ids, permission);
      if (!res.success) {
        toast.error(t("toast.error"));
      } else {
        toast.success(t("toast.bulk_granted", { count: ids.length }));
        setRowStates((prev) => {
          const updated = { ...prev };
          ids.forEach((uid) => {
            const cur = updated[uid]?.permissions ?? [];
            if (!cur.includes(permission)) {
              updated[uid] = { permissions: [...cur, permission] };
            }
          });
          return updated;
        });
        setSelectedIds(new Set());
      }
    },
    [selectedIds, t]
  );

  // ── BULK REVOKE ──────────────────────────────────────────────────
  const handleBulkRevoke = React.useCallback(async () => {
    const ids = Array.from(selectedIds);
    // Revoke all permissions per selected user
    await Promise.all(ids.map((id) => updateUserPermissions(id, [])));
    toast.success(t("toast.bulk_revoked", { count: ids.length }));
    setRowStates((prev) => {
      const updated = { ...prev };
      ids.forEach((uid) => {
        updated[uid] = { permissions: [] };
      });
      return updated;
    });
    setSelectedIds(new Set());
  }, [selectedIds, t]);

  // ── SELECTION HELPERS ────────────────────────────────────────────
  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds(
      selectedIds.size === users.length
        ? new Set()
        : new Set(users.map((u) => u.id))
    );
  };

  // ── FILTER STATE ─────────────────────────────────────────────────
  const activeFiltersCount =
    (filterStoreId ? 1 : 0) +
    (filterPositionId ? 1 : 0) +
    (filterPermission ? 1 : 0);

  const clearAllFilters = () => {
    setFilterStoreId(null);
    setFilterPositionId(null);
    setFilterPermission(null);
  };

  // ── PAGINATION ────────────────────────────────────────────────────
  const totalPages = Math.ceil(totalUsers / PAGE_SIZE);

  // ── PERMISSION LABEL ──────────────────────────────────────────────
  const permLabel = React.useMemo(
    (): Record<Permission, string> => ({
      CASHIER: tPerm("cashier"),
      SALES_FLOOR: tPerm("sales_floor"),
      SELF_CHECKOUT: tPerm("self_checkout"),
      WAREHOUSE: tPerm("warehouse"),
      PRODUCTION_LINE: tPerm("production_line"),
    }),
    [tPerm]
  );

  // ── RENDER: LOADING ──────────────────────────────────────────────
  if (loading && users.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Card key={i} className="rounded-xl">
              <CardContent className="p-5">
                <Skeleton className="h-5 w-24 mb-3 rounded-full" />
                <Skeleton className="h-7 w-20 mb-2" />
                <Skeleton className="h-1.5 w-full rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="rounded-xl">
          <CardContent className="p-0">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 px-4 py-3 border-b last:border-0"
              >
                <Skeleton className="size-4 rounded" />
                <Skeleton className="size-8 rounded-full shrink-0" />
                <Skeleton className="h-4 w-32 flex-1" />
                {[0, 1, 2, 3].map((j) => (
                  <Skeleton key={j} className="size-8 rounded-full" />
                ))}
                <Skeleton className="size-8 rounded" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── RENDER: ERROR ────────────────────────────────────────────────
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription className="flex items-center justify-between gap-4">
          <span>{error}</span>
          <Button size="sm" variant="outline" onClick={() => loadData()}>
            {tCommon("retry")}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // ── STATS 4 PERMISSIONS (without PRODUCTION_LINE) ────────────────
  const stats4 = coverage.filter((r) => PERMISSIONS_4.includes(r.permission));

  // ── RENDER ───────────────────────────────────────────────────────
  return (
    <TooltipProvider>
      <div className="flex flex-col gap-6">
        {/* ── PAGE HEADER ────────────────────────────────────────────── */}
        <PageHeader
          breadcrumbs={[
            { label: t("breadcrumb_employees"), href: ADMIN_ROUTES.employees },
            { label: t("breadcrumb_permissions") },
          ]}
          title={t("page_title")}
          actions={
            <div className="flex items-center gap-2">
              {/* Mobile overflow menu */}
              <div className="md:hidden">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="h-9 w-9">
                      <MoreHorizontal className="size-4" />
                      <span className="sr-only">{tCommon("more")}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => setBulkAssignOpen(true)}>
                      <UserPlus className="size-4 mr-2" />
                      {t("actions.bulk_assign")}
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Download className="size-4 mr-2" />
                      {t("actions.export_csv")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {/* Desktop buttons */}
              <Button
                variant="outline"
                className="hidden md:flex items-center gap-2"
                onClick={() => setBulkAssignOpen(true)}
              >
                <UserPlus className="size-4" />
                {t("actions.bulk_assign")}
              </Button>
              <Button
                variant="outline"
                className="hidden md:flex items-center gap-2"
              >
                <Download className="size-4" />
                {t("actions.export_csv")}
              </Button>
            </div>
          }
        />

        {/* ── STATS ROW ────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {stats4.map((row) => (
            <StatCard key={row.permission} row={row} />
          ))}
        </div>

        {/* ── TOOLBAR (filters + chips) ────────────────────────────── */}
        <FiltersBar
          search={search}
          onSearchChange={setSearch}
          isNetworkScope={isNetworkScope}
          stores={stores}
          positions={positions}
          filterStoreId={filterStoreId}
          onFilterStoreChange={setFilterStoreId}
          filterPositionId={filterPositionId}
          onFilterPositionChange={setFilterPositionId}
          filterPermission={filterPermission}
          onFilterPermissionChange={setFilterPermission}
          permLabel={permLabel}
        />

        {/* ── BULK ACTION BAR ───────────────────────────────────────── */}
        <BulkActionBar
          selectedCount={selectedIds.size}
          onBulkAssign={() => setBulkAssignOpen(true)}
          onBulkRevoke={() => setBulkRevokeOpen(true)}
          onClear={() => setSelectedIds(new Set())}
        />

        {/* ── EMPTY STATES ─────────────────────────────────────────── */}
        {!loading && users.length === 0 && (
          <>
            {activeFiltersCount > 0 || search ? (
              <EmptyState
                icon={SearchX}
                title={t("empty.filtered_title")}
                description={t("empty.filtered_subtitle")}
                action={{
                  label: t("empty.filtered_reset"),
                  onClick: () => {
                    clearAllFilters();
                    setSearch("");
                  },
                }}
              />
            ) : (
              <EmptyState
                icon={Users}
                title={t("empty.no_workers_title")}
                description=""
                action={{
                  label: t("empty.no_workers_cta"),
                  href: ADMIN_ROUTES.employeeNew,
                  icon: UserPlus,
                }}
              />
            )}
          </>
        )}

        {/* ── MATRIX TABLE (desktop) + CARDS (mobile) + PAGINATION ── */}
        {users.length > 0 && (
          <MatrixTable
            users={users}
            rowStates={rowStates}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onToggleSelectAll={toggleSelectAll}
            isNetworkScope={isNetworkScope}
            permLabel={permLabel}
            revokeTarget={revokeTarget}
            onSetRevokeTarget={setRevokeTarget}
            onGrant={handleGrant}
            onRevoke={handleRevoke}
            onGrantAll={handleGrantAll}
            onRevokeAll={handleRevokeAll}
            page={page}
            totalPages={totalPages}
            totalUsers={totalUsers}
            loading={loading}
            onPageChange={setPage}
          />
        )}

        {/* ── BULK ASSIGN DIALOG ───────────────────────────────────── */}
        <BulkAssignDialog
          open={bulkAssignOpen}
          onOpenChange={setBulkAssignOpen}
          selectedCount={selectedIds.size > 0 ? selectedIds.size : users.length}
          onConfirm={handleBulkAssign}
        />

        {/* ── BULK REVOKE DIALOG ───────────────────────────────────── */}
        <BulkRevokeDialog
          open={bulkRevokeOpen}
          onOpenChange={setBulkRevokeOpen}
          selectedCount={selectedIds.size}
          onConfirm={handleBulkRevoke}
        />
      </div>
    </TooltipProvider>
  );
}
