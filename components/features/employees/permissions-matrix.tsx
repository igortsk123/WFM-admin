"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  UserPlus,
  Download,
  Check,
  Plus,
  Lock,
  SearchX,
  Users,
  MoreHorizontal,
  ExternalLink,
  CheckCheck,
  XCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { LineChart, Line, ResponsiveContainer } from "recharts";

import { useAuth } from "@/lib/contexts/auth-context";
import { Link } from "@/i18n/navigation";
import {
  getUsers,
  getPermissionsCoverage,
  updateUserPermissions,
  bulkAssignPermission,
  bulkRevokePermission,
  type UserWithAssignment,
  type PermissionCoverageRow,
} from "@/lib/api/users";
import { getStores } from "@/lib/api/stores";
import { getPositions } from "@/lib/api/taxonomy";
import { ADMIN_ROUTES } from "@/lib/constants/routes";
import type { Permission, Store, FunctionalRole } from "@/lib/types";

import { PageHeader } from "@/components/shared/page-header";
import { FilterChip } from "@/components/shared/filter-chip";
import { UserCell } from "@/components/shared/user-cell";
import { PermissionPill } from "@/components/shared/permission-pill";
import { EmptyState } from "@/components/shared/empty-state";
import { MobileFilterSheet } from "@/components/shared/mobile-filter-sheet";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";

// ─────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────

const PERMISSIONS_4: Permission[] = [
  "CASHIER",
  "SALES_FLOOR",
  "SELF_CHECKOUT",
  "WAREHOUSE",
];

const ALL_PERMISSIONS: Permission[] = [
  "CASHIER",
  "SALES_FLOOR",
  "SELF_CHECKOUT",
  "WAREHOUSE",
  "PRODUCTION_LINE",
];

const MANAGER_ROLES: FunctionalRole[] = [
  "STORE_DIRECTOR",
  "SUPERVISOR",
  "REGIONAL",
  "NETWORK_OPS",
  "HR_MANAGER",
  "OPERATOR",
  "PLATFORM_ADMIN",
];

const PAGE_SIZE = 15;

// ─────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────

interface RowState {
  permissions: Permission[];
}

interface RevokeTarget {
  userId: number;
  userName: string;
  permission: Permission;
}

// ─────────────────────────────────────────────────────────────────────
// STAT CARD
// ─────────────────────────────────────────────────────────────────────

function StatCard({ row }: { row: PermissionCoverageRow }) {
  const t = useTranslations("screen.permissions.stats");
  const sparkData = row.trend_30d.map((v, i) => ({ i, v }));
  const isPositive =
    (row.trend_30d[row.trend_30d.length - 1] ?? 0) > (row.trend_30d[0] ?? 0);

  return (
    <Card className="rounded-xl">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-3 min-w-0 flex-1">
            <PermissionPill permission={row.permission} />
            <div className="flex flex-col gap-0.5">
              <span className="text-2xl font-semibold tracking-tight text-foreground">
                {t("employees_count", { count: row.granted_count })}
              </span>
              <span className="text-xs text-muted-foreground">
                {t("coverage", {
                  granted: row.granted_count,
                  total: row.eligible_count,
                  pct: row.coverage_pct,
                })}
              </span>
            </div>
            <Progress value={row.coverage_pct} className="h-1.5" />
          </div>
          <div className="shrink-0 w-20 h-10" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparkData}>
                <Line
                  type="monotone"
                  dataKey="v"
                  stroke={
                    isPositive
                      ? "var(--color-success)"
                      : "var(--color-muted-foreground)"
                  }
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────
// BULK ASSIGN DIALOG
// ─────────────────────────────────────────────────────────────────────

function BulkAssignDialog({
  open,
  onOpenChange,
  selectedCount,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  selectedCount: number;
  onConfirm: (permission: Permission) => Promise<void>;
}) {
  const t = useTranslations("screen.permissions.dialogs");
  const tCommon = useTranslations("common");
  const tPerm = useTranslations("permission");

  const [selected, setSelected] = React.useState<Permission | "">("");
  const [comboOpen, setComboOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

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

  const handleConfirm = async () => {
    if (!selected) return;
    setLoading(true);
    await onConfirm(selected as Permission);
    setLoading(false);
    onOpenChange(false);
    setSelected("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("bulk_assign_title")}</DialogTitle>
          <DialogDescription>
            {t("bulk_assign_info", { count: selectedCount })}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <Popover open={comboOpen} onOpenChange={setComboOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start">
                {selected
                  ? permLabel[selected as Permission]
                  : t("bulk_assign_select")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0 w-56" align="start">
              <Command>
                <CommandInput placeholder={t("bulk_assign_select")} />
                <CommandList>
                  <CommandEmpty>{tCommon("noResults")}</CommandEmpty>
                  <CommandGroup>
                    {ALL_PERMISSIONS.map((p) => (
                      <CommandItem
                        key={p}
                        value={p}
                        onSelect={() => {
                          setSelected(p);
                          setComboOpen(false);
                        }}
                      >
                        {permLabel[p]}
                        {selected === p && (
                          <Check className="ml-auto size-4 text-primary" />
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tCommon("cancel")}
          </Button>
          <Button onClick={handleConfirm} disabled={!selected || loading}>
            {t("bulk_assign_confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────
// BULK REVOKE DIALOG
// ─────────────────────────────────────────────────────────────────────

function BulkRevokeDialog({
  open,
  onOpenChange,
  selectedCount,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  selectedCount: number;
  onConfirm: () => Promise<void>;
}) {
  const t = useTranslations("screen.permissions.dialogs");
  const tCommon = useTranslations("common");
  const [loading, setLoading] = React.useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    await onConfirm();
    setLoading(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("bulk_revoke_title")}</DialogTitle>
          <DialogDescription>
            {t("bulk_revoke_warning", { count: selectedCount })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tCommon("cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={loading}
          >
            {t("bulk_revoke_confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────

export function PermissionsMatrix() {
  const t = useTranslations("screen.permissions");
  const tCommon = useTranslations("common");
  const tPerm = useTranslations("permission");
  const { user: authUser } = useAuth();
  const locale = authUser.preferred_locale ?? "ru";

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
  const [filterPositionId, setFilterPositionId] = React.useState<
    number | null
  >(null);
  const [filterPermission, setFilterPermission] =
    React.useState<Permission | null>(null);

  // ── LOCAL ROW STATE (optimistic) ──────────────────────────────────
  const [rowStates, setRowStates] = React.useState<Record<number, RowState>>(
    {}
  );

  // ── SELECTION ─────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = React.useState<Set<number>>(
    new Set()
  );

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
        setPositions(positionsRes.data.map((pos) => ({ id: pos.id, name: pos.name })));

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

  // ── HELPERS ───────────────────────────────────────────────────────
  const isManager = (u: UserWithAssignment) =>
    u.functional_role !== undefined &&
    MANAGER_ROLES.includes(u.functional_role);

  const getRowPerms = (userId: number, fallback: Permission[]) =>
    rowStates[userId]?.permissions ?? fallback;

  // ── GRANT SINGLE ─────────────────────────────────────────────────
  const handleGrant = React.useCallback(
    async (userId: number, permission: Permission, currentPerms: Permission[]) => {
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
    async (userId: number, permission: Permission, currentPerms: Permission[]) => {
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
    await Promise.all(
      ids.map((id) =>
        updateUserPermissions(id, [])
      )
    );
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

  // ── FILTER CHIPS ─────────────────────────────────────────────────
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

        {/* ── TOOLBAR ──────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <Input
              placeholder={t("toolbar.search_placeholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 md:w-64"
            />

            {/* Desktop filters */}
            <div className="hidden md:flex items-center gap-2 flex-1">
              {isNetworkScope && (
                <Select
                  value={filterStoreId ? String(filterStoreId) : "all"}
                  onValueChange={(v) =>
                    setFilterStoreId(v === "all" ? null : Number(v))
                  }
                >
                  <SelectTrigger className="h-9 w-48">
                    <SelectValue placeholder={t("toolbar.store")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{tCommon("all")}</SelectItem>
                    {stores
                      .filter((s) => !s.archived)
                      .map((s) => (
                        <SelectItem key={s.id} value={String(s.id)}>
                          {s.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              )}

              <Select
                value={filterPositionId ? String(filterPositionId) : "all"}
                onValueChange={(v) =>
                  setFilterPositionId(v === "all" ? null : Number(v))
                }
              >
                <SelectTrigger className="h-9 w-48">
                  <SelectValue placeholder={t("toolbar.position")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{tCommon("all")}</SelectItem>
                  {positions.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filterPermission ?? "all"}
                onValueChange={(v) =>
                  setFilterPermission(v === "all" ? null : (v as Permission))
                }
              >
                <SelectTrigger className="h-9 w-48">
                  <SelectValue placeholder={t("toolbar.permission")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{tCommon("all")}</SelectItem>
                  {ALL_PERMISSIONS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {permLabel[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Mobile filter sheet */}
            <MobileFilterSheet
              activeCount={activeFiltersCount}
              onClearAll={clearAllFilters}
              onApply={() => {}}
              className="md:hidden"
            >
              {isNetworkScope && (
                <div className="flex flex-col gap-1.5">
                  <Label>{t("toolbar.store")}</Label>
                  <Select
                    value={filterStoreId ? String(filterStoreId) : "all"}
                    onValueChange={(v) =>
                      setFilterStoreId(v === "all" ? null : Number(v))
                    }
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder={t("toolbar.store")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{tCommon("all")}</SelectItem>
                      {stores
                        .filter((s) => !s.archived)
                        .map((s) => (
                          <SelectItem key={s.id} value={String(s.id)}>
                            {s.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <Label>{t("toolbar.position")}</Label>
                <Select
                  value={filterPositionId ? String(filterPositionId) : "all"}
                  onValueChange={(v) =>
                    setFilterPositionId(v === "all" ? null : Number(v))
                  }
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder={t("toolbar.position")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{tCommon("all")}</SelectItem>
                    {positions.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>{t("toolbar.permission")}</Label>
                <Select
                  value={filterPermission ?? "all"}
                  onValueChange={(v) =>
                    setFilterPermission(v === "all" ? null : (v as Permission))
                  }
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder={t("toolbar.permission")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{tCommon("all")}</SelectItem>
                    {ALL_PERMISSIONS.map((p) => (
                      <SelectItem key={p} value={p}>
                        {permLabel[p]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </MobileFilterSheet>
          </div>

          {/* Filter chips row */}
          {activeFiltersCount > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {filterStoreId && (
                <FilterChip
                  label={t("toolbar.store")}
                  value={stores.find((s) => s.id === filterStoreId)?.name ?? "—"}
                  onRemove={() => setFilterStoreId(null)}
                />
              )}
              {filterPositionId && (
                <FilterChip
                  label={t("toolbar.position")}
                  value={
                    positions.find((p) => p.id === filterPositionId)?.name ?? "—"
                  }
                  onRemove={() => setFilterPositionId(null)}
                />
              )}
              {filterPermission && (
                <FilterChip
                  label={t("toolbar.permission")}
                  value={permLabel[filterPermission]}
                  onRemove={() => setFilterPermission(null)}
                />
              )}
              <button
                type="button"
                onClick={clearAllFilters}
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
              >
                {t("toolbar.clear_all")}
              </button>
            </div>
          )}
        </div>

        {/* ── BULK ACTION BAR ───────────────────────────────────────── */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 shadow-sm flex-wrap">
            <span className="text-sm font-medium text-foreground">
              {t("bulk.selected", { count: selectedIds.size })}
            </span>
            <div className="flex items-center gap-2 ml-auto flex-wrap">
              <Button
                size="sm"
                variant="outline"
                className="h-9"
                onClick={() => setBulkAssignOpen(true)}
              >
                <CheckCheck className="size-4 mr-1.5" />
                <span className="hidden md:inline">{t("bulk.assign_permission")}</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-9 border-destructive text-destructive hover:bg-destructive/5"
                onClick={() => setBulkRevokeOpen(true)}
              >
                <XCircle className="size-4 mr-1.5" />
                <span className="hidden md:inline">{t("bulk.revoke_permission")}</span>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-9"
                onClick={() => setSelectedIds(new Set())}
              >
                {t("bulk.clear")}
              </Button>
            </div>
          </div>
        )}

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

        {/* ── DESKTOP TABLE ─────────────────────────────────────────── */}
        {users.length > 0 && (
          <>
            {/* Desktop table */}
            <div className="hidden md:block rounded-xl border bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="sticky left-0 z-10 bg-muted/40 w-10 px-3 py-3 text-left">
                        <Checkbox
                          checked={
                            selectedIds.size === users.length && users.length > 0
                          }
                          onCheckedChange={toggleSelectAll}
                          aria-label="Select all"
                        />
                      </th>
                      <th className="sticky left-10 z-10 bg-muted/40 min-w-[200px] px-3 py-3 text-left font-medium text-muted-foreground">
                        {t("matrix.col_employee")}
                      </th>
                      {isNetworkScope && (
                        <th className="min-w-[160px] px-3 py-3 text-left font-medium text-muted-foreground">
                          {t("matrix.col_store")}
                        </th>
                      )}
                      {PERMISSIONS_4.map((p) => (
                        <th
                          key={p}
                          className="w-24 px-3 py-3 text-center font-medium text-muted-foreground"
                        >
                          {t(`matrix.col_${p.toLowerCase()}` as Parameters<typeof t>[0])}
                        </th>
                      ))}
                      <th className="w-12 px-3 py-3 text-center font-medium text-muted-foreground">
                        {t("matrix.col_actions")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => {
                      const manager = isManager(u);
                      const rowPerms = getRowPerms(u.id, u.permissions);
                      const isSelected = selectedIds.has(u.id);

                      return (
                        <tr
                          key={u.id}
                          className={`border-b last:border-0 transition-colors hover:bg-muted/30 ${
                            isSelected ? "bg-primary/5" : ""
                          }`}
                          onClick={(e) => {
                            const target = e.target as HTMLElement;
                            if (
                              target.closest("button") ||
                              target.closest("[role='checkbox']") ||
                              target.closest("[data-radix-collection-item]")
                            )
                              return;
                            if (e.metaKey || e.ctrlKey) {
                              window.open(
                                ADMIN_ROUTES.employeeDetail(String(u.id)),
                                "_blank"
                              );
                            }
                          }}
                        >
                          {/* Checkbox */}
                          <td
                            className="sticky left-0 z-10 bg-card w-10 px-3 py-3"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleSelect(u.id)}
                              aria-label={`Select ${u.first_name}`}
                            />
                          </td>

                          {/* Employee */}
                          <td className="sticky left-10 z-10 bg-card min-w-[200px] px-3 py-3">
                            <Link
                              href={ADMIN_ROUTES.employeeDetail(String(u.id))}
                              className="block hover:opacity-80 transition-opacity"
                            >
                              <UserCell
                                user={{
                                  ...u,
                                  position_name: u.assignment?.position_name,
                                }}
                              />
                            </Link>
                          </td>

                          {/* Store */}
                          {isNetworkScope && (
                            <td className="px-3 py-3 text-sm text-muted-foreground">
                              {u.assignment?.store_name}
                            </td>
                          )}

                          {/* Permission toggle cells */}
                          {PERMISSIONS_4.map((perm) => {
                            const granted = rowPerms.includes(perm);
                            return (
                              <td key={perm} className="px-3 py-3">
                                <div className="flex items-center justify-center">
                                  {manager ? (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className="flex size-8 items-center justify-center rounded-full bg-muted/50 cursor-not-allowed">
                                          <Lock className="size-3.5 text-muted-foreground" />
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        {t("matrix.manager_no_privileges")}
                                      </TooltipContent>
                                    </Tooltip>
                                  ) : granted ? (
                                    /* Granted → click opens revoke confirm */
                                    <AlertDialog
                                      open={
                                        revokeTarget?.userId === u.id &&
                                        revokeTarget?.permission === perm
                                      }
                                      onOpenChange={(open) => {
                                        if (!open) setRevokeTarget(null);
                                      }}
                                    >
                                      <AlertDialogTrigger asChild>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setRevokeTarget({
                                                  userId: u.id,
                                                  userName: `${u.first_name} ${u.last_name}`,
                                                  permission: perm,
                                                });
                                              }}
                                              className="group flex size-8 items-center justify-center rounded-full bg-success/10 transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                              aria-label={`Revoke ${perm}`}
                                            >
                                              <Check className="size-4 text-success group-hover:hidden" />
                                              <XCircle className="size-4 text-destructive hidden group-hover:block" />
                                            </button>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            {t("matrix.tooltip_granted", {
                                              date: "—",
                                              by: "—",
                                            })}
                                          </TooltipContent>
                                        </Tooltip>
                                      </AlertDialogTrigger>
                                      <ConfirmDialog
                                        title={t("dialogs.single_revoke_title", {
                                          name: `${u.first_name} ${u.last_name}`,
                                        })}
                                        message={t(
                                          "dialogs.single_revoke_description",
                                          { permission: permLabel[perm] }
                                        )}
                                        confirmLabel={t(
                                          "dialogs.single_revoke_confirm"
                                        )}
                                        variant="destructive"
                                        onConfirm={() =>
                                          handleRevoke(u.id, perm, rowPerms)
                                        }
                                        onOpenChange={(open) => {
                                          if (!open) setRevokeTarget(null);
                                        }}
                                      />
                                    </AlertDialog>
                                  ) : (
                                    /* Not granted → click grants directly */
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleGrant(u.id, perm, rowPerms);
                                          }}
                                          className="group flex size-8 items-center justify-center rounded-full border-2 border-dashed border-border transition-colors hover:border-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                          aria-label={`Grant ${perm}`}
                                        >
                                          <Plus className="size-3.5 text-muted-foreground group-hover:text-primary" />
                                        </button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        {t("matrix.tooltip_grant_hint")}
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                </div>
                              </td>
                            );
                          })}

                          {/* Row actions */}
                          <td
                            className="px-3 py-3 text-center"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-8"
                                  aria-label="Row actions"
                                >
                                  <MoreHorizontal className="size-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                  <Link
                                    href={ADMIN_ROUTES.employeeDetail(
                                      String(u.id)
                                    )}
                                  >
                                    <ExternalLink className="size-4 mr-2" />
                                    {t("matrix.row_actions_open")}
                                  </Link>
                                </DropdownMenuItem>
                                {!manager && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onSelect={() =>
                                        handleGrantAll(u.id, rowPerms)
                                      }
                                    >
                                      <CheckCheck className="size-4 mr-2" />
                                      {t("matrix.row_actions_grant_all")}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="text-destructive focus:text-destructive"
                                      onSelect={() =>
                                        handleRevokeAll(u.id, rowPerms)
                                      }
                                    >
                                      <XCircle className="size-4 mr-2" />
                                      {t("matrix.row_actions_revoke_all")}
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── MOBILE CARD LIST ──────────────────────────────────── */}
            <div className="flex flex-col gap-3 md:hidden">
              {users.map((u) => {
                const manager = isManager(u);
                const rowPerms = getRowPerms(u.id, u.permissions);

                return (
                  <Card key={u.id} className="rounded-xl">
                    <CardContent className="p-4 flex flex-col gap-3">
                      {/* Card header */}
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedIds.has(u.id)}
                          onCheckedChange={() => toggleSelect(u.id)}
                          className="shrink-0"
                          aria-label={`Select ${u.first_name}`}
                        />
                        <UserCell
                          user={{
                            ...u,
                            position_name: u.assignment?.position_name,
                          }}
                          className="flex-1"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 shrink-0"
                          asChild
                        >
                          <Link
                            href={ADMIN_ROUTES.employeeDetail(String(u.id))}
                          >
                            <ExternalLink className="size-4" />
                            <span className="sr-only">
                              {t("matrix.row_actions_open")}
                            </span>
                          </Link>
                        </Button>
                      </div>

                      {/* Store label for NETWORK_OPS */}
                      {isNetworkScope && (
                        <p className="text-xs text-muted-foreground pl-6">
                          {u.assignment?.store_name}
                        </p>
                      )}

                      {/* Permission toggle rows */}
                      <div className="flex flex-col divide-y divide-border rounded-lg border overflow-hidden">
                        {ALL_PERMISSIONS.map((perm) => (
                          <div
                            key={perm}
                            className="flex items-center justify-between px-3 min-h-11 gap-3"
                          >
                            <PermissionPill permission={perm} />
                            {manager ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center gap-1 cursor-not-allowed">
                                    <Lock className="size-3.5 text-muted-foreground" />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {t("matrix.manager_no_privileges")}
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <Switch
                                checked={rowPerms.includes(perm)}
                                onCheckedChange={async (checked) => {
                                  if (checked) {
                                    await handleGrant(u.id, perm, rowPerms);
                                  } else {
                                    await handleRevoke(u.id, perm, rowPerms);
                                  }
                                }}
                                aria-label={`${permLabel[perm]} for ${u.first_name}`}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {/* Mobile load-more */}
              {page < totalPages && (
                <Button
                  variant="outline"
                  className="h-11 w-full"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={loading}
                >
                  {loading ? tCommon("loading") : t("load_more")}
                </Button>
              )}
            </div>

            {/* ── DESKTOP PAGINATION ────────────────────────────────── */}
            {totalPages > 1 && (
              <div className="hidden md:flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  {totalUsers} {tCommon("total")}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-8"
                    disabled={page === 1 || loading}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <ChevronLeft className="size-4" />
                    <span className="sr-only">{tCommon("previous")}</span>
                  </Button>
                  <span>
                    {tCommon("page")} {page} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-8"
                    disabled={page === totalPages || loading}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <ChevronRight className="size-4" />
                    <span className="sr-only">{tCommon("next")}</span>
                  </Button>
                </div>
              </div>
            )}
          </>
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
