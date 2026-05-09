"use client";

import * as React from "react";
import { type ColumnDef } from "@tanstack/react-table";

import type { ServiceNorm } from "@/lib/types";
import { MOCK_USERS } from "@/lib/mock-data/users";

import { RoleBadge } from "@/components/shared/role-badge";
import { UserCell } from "@/components/shared/user-cell";

import { ObjectFormatBadge } from "./badge-object-format";
import { NormativeUnitBadge } from "./badge-normative-unit";
import { RowActions } from "./row-actions";
import { formatRelative, type TFn } from "./_shared";

interface UseServiceNormsColumnsParams {
  isWriter: boolean;
  isArchive: boolean;
  onEdit: (norm: ServiceNorm) => void;
  onArchive: (id: string) => void;
  t: TFn;
  tFreelance: TFn;
}

export function useServiceNormsColumns({
  isWriter,
  isArchive,
  onEdit,
  onArchive,
  t,
  tFreelance,
}: UseServiceNormsColumnsParams): ColumnDef<ServiceNorm>[] {
  return React.useMemo<ColumnDef<ServiceNorm>[]>(
    () => [
      {
        id: "object_format",
        header: t("columns.object_format"),
        cell: ({ row }) => (
          <ObjectFormatBadge
            format={row.original.object_format}
            tFreelance={tFreelance}
          />
        ),
      },
      {
        id: "work_type",
        header: t("columns.work_type"),
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">
              {row.original.work_type_name}
            </span>
          </div>
        ),
      },
      {
        id: "normative",
        header: t("columns.normative"),
        cell: ({ row }) => {
          const { normative_per_hour, unit } = row.original;
          return (
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="font-mono text-sm tabular-nums font-medium text-foreground">
                {normative_per_hour}
              </span>
              <NormativeUnitBadge unit={unit} tFreelance={tFreelance} />
              <span className="text-xs text-muted-foreground">
                {t("per_hour")}
              </span>
            </div>
          );
        },
      },
      {
        id: "rate",
        header: t("columns.rate"),
        cell: ({ row }) => {
          const { hourly_rate, currency } = row.original;
          if (hourly_rate == null)
            return (
              <span className="text-sm text-muted-foreground">
                {t("rate_empty")}
              </span>
            );
          return (
            <span className="font-mono text-sm tabular-nums whitespace-nowrap text-foreground">
              {hourly_rate.toLocaleString("ru-RU")}{" "}
              <span className="text-muted-foreground text-xs">{currency}/ч</span>
            </span>
          );
        },
      },
      {
        id: "approved_by",
        header: t("columns.approved_by"),
        cell: ({ row }) => {
          const { approved_by, approved_by_name } = row.original;
          const user = MOCK_USERS.find((u) => u.id === approved_by);
          if (!user)
            return (
              <span className="text-xs text-muted-foreground">
                {approved_by_name}
              </span>
            );
          return (
            <div className="flex flex-col gap-1">
              <UserCell
                user={{ ...user, position_name: undefined }}
                className="max-w-[160px]"
              />
              <RoleBadge role="SUPERVISOR" />
            </div>
          );
        },
      },
      {
        id: "approved_at",
        header: t("columns.approved_at"),
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatRelative(row.original.approved_at)}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        size: 44,
        cell: ({ row }) => (
          <RowActions
            norm={row.original}
            canEdit={isWriter && !isArchive}
            onEdit={onEdit}
            onArchive={onArchive}
            t={t}
          />
        ),
      },
    ],
    [isWriter, isArchive, onEdit, onArchive, t, tFreelance]
  );
}
