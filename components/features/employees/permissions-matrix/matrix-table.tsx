"use client";

import { useTranslations } from "next-intl";
import {
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Lock,
  MoreHorizontal,
  XCircle,
} from "lucide-react";

import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { UserCell } from "@/components/shared/user-cell";
import { PermissionPill } from "@/components/shared/permission-pill";

import { ADMIN_ROUTES } from "@/lib/constants/routes";
import type { Permission } from "@/lib/types";
import type { UserWithAssignment } from "@/lib/api/users";

import {
  ALL_PERMISSIONS,
  PERMISSIONS_4,
  isManagerUser,
  type RevokeTarget,
  type RowState,
} from "./_shared";
import { HeaderRow } from "./header-row";
import { MatrixCell } from "./matrix-cell";

interface MatrixTableProps {
  users: UserWithAssignment[];
  rowStates: Record<number, RowState>;
  selectedIds: Set<number>;
  onToggleSelect: (id: number) => void;
  onToggleSelectAll: () => void;
  isNetworkScope: boolean;
  permLabel: Record<Permission, string>;
  revokeTarget: RevokeTarget | null;
  onSetRevokeTarget: (target: RevokeTarget | null) => void;
  onGrant: (
    userId: number,
    permission: Permission,
    currentPerms: Permission[]
  ) => Promise<void>;
  onRevoke: (
    userId: number,
    permission: Permission,
    currentPerms: Permission[]
  ) => Promise<void>;
  onGrantAll: (userId: number, currentPerms: Permission[]) => Promise<void>;
  onRevokeAll: (userId: number, currentPerms: Permission[]) => Promise<void>;
  page: number;
  totalPages: number;
  totalUsers: number;
  loading: boolean;
  onPageChange: (page: number) => void;
}

export function MatrixTable({
  users,
  rowStates,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  isNetworkScope,
  permLabel,
  revokeTarget,
  onSetRevokeTarget,
  onGrant,
  onRevoke,
  onGrantAll,
  onRevokeAll,
  page,
  totalPages,
  totalUsers,
  loading,
  onPageChange,
}: MatrixTableProps) {
  const t = useTranslations("screen.permissions");
  const tCommon = useTranslations("common");

  const getRowPerms = (userId: number, fallback: Permission[]) =>
    rowStates[userId]?.permissions ?? fallback;

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block rounded-xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <HeaderRow
              isAllSelected={
                selectedIds.size === users.length && users.length > 0
              }
              onToggleAll={onToggleSelectAll}
              isNetworkScope={isNetworkScope}
            />
            <tbody>
              {users.map((u) => {
                const manager = isManagerUser(u);
                const rowPerms = getRowPerms(u.id, u.permissions);
                const isSelected = selectedIds.has(u.id);
                const userName = `${u.first_name} ${u.last_name}`;

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
                        onCheckedChange={() => onToggleSelect(u.id)}
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
                    {PERMISSIONS_4.map((perm) => (
                      <td key={perm} className="px-3 py-3">
                        <MatrixCell
                          userId={u.id}
                          userName={userName}
                          permission={perm}
                          granted={rowPerms.includes(perm)}
                          manager={manager}
                          rowPerms={rowPerms}
                          permLabel={permLabel}
                          revokeTarget={revokeTarget}
                          onSetRevokeTarget={onSetRevokeTarget}
                          onGrant={onGrant}
                          onRevoke={onRevoke}
                        />
                      </td>
                    ))}

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
                              href={ADMIN_ROUTES.employeeDetail(String(u.id))}
                            >
                              <ExternalLink className="size-4 mr-2" />
                              {t("matrix.row_actions_open")}
                            </Link>
                          </DropdownMenuItem>
                          {!manager && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onSelect={() => onGrantAll(u.id, rowPerms)}
                              >
                                <CheckCheck className="size-4 mr-2" />
                                {t("matrix.row_actions_grant_all")}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onSelect={() => onRevokeAll(u.id, rowPerms)}
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

      {/* Mobile card list */}
      <div className="flex flex-col gap-3 md:hidden">
        {users.map((u) => {
          const manager = isManagerUser(u);
          const rowPerms = getRowPerms(u.id, u.permissions);

          return (
            <Card key={u.id} className="rounded-xl">
              <CardContent className="p-4 flex flex-col gap-3">
                {/* Card header */}
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedIds.has(u.id)}
                    onCheckedChange={() => onToggleSelect(u.id)}
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
                    <Link href={ADMIN_ROUTES.employeeDetail(String(u.id))}>
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
                              await onGrant(u.id, perm, rowPerms);
                            } else {
                              await onRevoke(u.id, perm, rowPerms);
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
            onClick={() => onPageChange(page + 1)}
            disabled={loading}
          >
            {loading ? tCommon("loading") : t("load_more")}
          </Button>
        )}
      </div>

      {/* Desktop pagination */}
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
              onClick={() => onPageChange(page - 1)}
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
              onClick={() => onPageChange(page + 1)}
            >
              <ChevronRight className="size-4" />
              <span className="sr-only">{tCommon("next")}</span>
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
