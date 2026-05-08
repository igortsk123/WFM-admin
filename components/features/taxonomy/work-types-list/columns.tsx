"use client"

import Link from "next/link"
import type { ColumnDef } from "@tanstack/react-table"

import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { ADMIN_ROUTES } from "@/lib/constants/routes"

import type { WorkTypeWithCount } from "@/lib/api/taxonomy"

import { GroupBadge } from "./group-badge"
import { RowActions } from "./row-actions"
import type { TFn } from "./_shared"

interface BuildColumnsArgs {
  t: TFn
  tCommon: TFn
  onEdit: (wt: WorkTypeWithCount) => void
  onDuplicate: (wt: WorkTypeWithCount) => void
  onDelete: (wt: WorkTypeWithCount) => void
}

export function buildWorkTypesColumns({
  t,
  tCommon,
  onEdit,
  onDuplicate,
  onDelete,
}: BuildColumnsArgs): ColumnDef<WorkTypeWithCount>[] {
  return [
    {
      id: "code",
      accessorKey: "code",
      header: t("columns.code"),
      enableSorting: true,
      cell: ({ row }) => (
        <span className="font-mono text-xs uppercase tracking-wide bg-muted px-1.5 py-0.5 rounded text-foreground">
          {row.original.code}
        </span>
      ),
    },
    {
      id: "name",
      accessorKey: "name",
      header: t("columns.name"),
      enableSorting: true,
      cell: ({ row }) => (
        <span className="font-medium text-sm">{row.original.name}</span>
      ),
    },
    {
      id: "group",
      accessorKey: "group",
      header: t("columns.group"),
      enableSorting: true,
      cell: ({ row }) => <GroupBadge group={row.original.group} />,
    },
    {
      id: "default_duration_min",
      accessorKey: "default_duration_min",
      header: t("columns.default_duration"),
      enableSorting: true,
      cell: ({ row }) => (
        <span className="tabular-nums text-sm text-right block">
          {row.original.default_duration_min}
        </span>
      ),
    },
    {
      id: "hints_count",
      accessorKey: "hints_count",
      header: t("columns.hints_count"),
      enableSorting: true,
      cell: ({ row }) =>
        row.original.hints_count > 0 ? (
          <Link
            href={`${ADMIN_ROUTES.hints}?work_type_id=${row.original.id}`}
            className="text-primary hover:underline text-sm tabular-nums"
            onClick={(e) => e.stopPropagation()}
          >
            {row.original.hints_count}
          </Link>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        ),
    },
    {
      id: "usage_count",
      accessorKey: "usage_count",
      header: t("columns.usage_count"),
      enableSorting: true,
      cell: ({ row }) => {
        const count = row.original.usage_count ?? 0
        return count > 0 ? (
          <Link
            href={`${ADMIN_ROUTES.tasks}?work_type_id=${row.original.id}`}
            className="text-primary hover:underline text-sm tabular-nums"
            onClick={(e) => e.stopPropagation()}
          >
            {count}
          </Link>
        ) : (
          <span className="text-muted-foreground text-sm">0</span>
        )
      },
    },
    {
      id: "requires_photo_default",
      accessorKey: "requires_photo_default",
      header: t("columns.requires_photo"),
      cell: ({ row }) => (
        <Switch
          checked={row.original.requires_photo_default}
          disabled
          aria-label={row.original.requires_photo_default ? "Да" : "Нет"}
          className="pointer-events-none"
        />
      ),
    },
    {
      id: "requires_report_default",
      accessorKey: "requires_report_default",
      header: t("columns.requires_report"),
      cell: ({ row }) => (
        <Switch
          checked={row.original.requires_report_default}
          disabled
          aria-label={row.original.requires_report_default ? "Да" : "Нет"}
          className="pointer-events-none"
        />
      ),
    },
    {
      id: "acceptance_policy_default",
      accessorKey: "acceptance_policy_default",
      header: t("columns.acceptance_policy"),
      cell: ({ row }) => (
        <Badge variant="outline" className="text-xs">
          {row.original.acceptance_policy_default === "AUTO"
            ? t("policy.AUTO")
            : t("policy.MANUAL")}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row }) => (
        <RowActions
          workType={row.original}
          onEdit={onEdit}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
          t={t}
          tCommon={tCommon}
        />
      ),
    },
  ]
}
