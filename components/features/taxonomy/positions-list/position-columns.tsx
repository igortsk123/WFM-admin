"use client";

import { type ColumnDef } from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

import { Link } from "@/i18n/navigation";
import { ADMIN_ROUTES } from "@/lib/constants/routes";
import type { PositionWithCounts } from "@/lib/api/taxonomy";

import { DbRoleBadge } from "./db-role-badge";
import { PositionRowActions } from "./position-row-actions";
import type { TFn } from "./_shared";

interface BuildColumnsArgs {
  canEdit: boolean;
  onEdit: (pos: PositionWithCounts) => void;
  onDuplicate: (pos: PositionWithCounts) => void;
  onDelete: (pos: PositionWithCounts) => void;
  t: TFn;
}

export function buildPositionColumns({
  canEdit,
  onEdit,
  onDuplicate,
  onDelete,
  t,
}: BuildColumnsArgs): ColumnDef<PositionWithCounts>[] {
  return [
    // Checkbox
    {
      id: "select",
      enableSorting: false,
      header: () => <span className="sr-only">Выбрать</span>,
      cell: () => (
        <div className="flex items-center justify-center min-w-[44px] min-h-[44px]">
          <Checkbox aria-label="Выбрать строку" />
        </div>
      ),
      size: 48,
    },
    // Code
    {
      accessorKey: "code",
      header: () => t("columns.code"),
      cell: ({ row }) => (
        <Badge variant="outline" className="font-mono text-xs">
          {row.original.code}
        </Badge>
      ),
    },
    // Name
    {
      accessorKey: "name",
      header: () => t("columns.name"),
      cell: ({ row }) => (
        <span className="font-medium text-sm">{row.original.name}</span>
      ),
      enableSorting: true,
    },
    // DB Role badge
    {
      accessorKey: "role_id",
      header: () => t("columns.role"),
      cell: ({ row }) => <DbRoleBadge roleId={row.original.role_id} />,
    },
    // Description
    {
      accessorKey: "description",
      header: () => t("columns.description"),
      enableSorting: false,
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]">
          {row.original.description || "—"}
        </span>
      ),
    },
    // Employees count — link to filtered employees
    {
      accessorKey: "employees_count",
      header: () => t("columns.employees_count"),
      cell: ({ row }) => {
        const count = row.original.employees_count;
        return count > 0 ? (
          <Link
            href={`${ADMIN_ROUTES.employees}?position_id=${row.original.id}`}
            className="text-sm text-primary hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {count}
          </Link>
        ) : (
          <span className="text-sm text-muted-foreground">0</span>
        );
      },
    },
    // Stores count
    {
      accessorKey: "stores_count",
      header: () => t("columns.stores_count"),
      cell: ({ row }) => (
        <span className="text-sm">{row.original.stores_count}</span>
      ),
    },
    // Actions
    {
      id: "actions",
      enableSorting: false,
      header: () => <span className="sr-only">{t("columns.actions")}</span>,
      cell: ({ row }) => (
        <PositionRowActions
          position={row.original}
          canEdit={canEdit}
          isMobile={false}
          onEdit={onEdit}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
          t={t}
        />
      ),
    },
  ];
}
