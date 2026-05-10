"use client";

import * as React from "react";
import { useTranslations, useLocale } from "next-intl";
import type { ColumnDef } from "@tanstack/react-table";

import { MOCK_USERS } from "@/lib/mock-data/users";
import type { Regulation, Locale } from "@/lib/types";
import { pickLocalized } from "@/lib/utils/locale-pick";

import { Badge } from "@/components/ui/badge";
import { UserCell } from "@/components/shared/user-cell";
import { cn } from "@/lib/utils";

import { FileIcon } from "./file-icon";
import { TagPills } from "./tag-pills";
import { MiniSparkline } from "./mini-sparkline";
import { RowActionsMenu } from "./row-actions-menu";
import { formatDateShort, formatFileSize } from "./_shared";

interface BuildColumnsArgs {
  onView: (id: string) => void;
  onEditTags: (id: string) => void;
  onReplace: (id: string) => void;
  onArchive: (id: string) => void;
  onDownload: (id: string) => void;
}

export function useRegulationsColumns({
  onView,
  onEditTags,
  onReplace,
  onArchive,
  onDownload,
}: BuildColumnsArgs): ColumnDef<Regulation>[] {
  const t = useTranslations("screen.regulations");
  const locale = useLocale() as Locale;

  return React.useMemo<ColumnDef<Regulation>[]>(
    () => [
      {
        id: "file_type",
        header: "",
        size: 36,
        cell: ({ row }) => (
          <div className="flex items-center justify-center w-8">
            <FileIcon type={row.original.file_type} />
          </div>
        ),
      },
      {
        id: "name",
        header: t("columns.name"),
        cell: ({ row }) => (
          <button
            type="button"
            className="text-sm font-medium text-foreground hover:text-primary text-left line-clamp-2 max-w-xs transition-colors"
            onClick={() => onView(row.original.id)}
          >
            {pickLocalized(row.original.name, row.original.name_en, locale)}
          </button>
        ),
      },
      {
        id: "tags",
        header: t("columns.tags"),
        cell: ({ row }) => (
          <TagPills workTypeIds={row.original.work_type_ids} zoneIds={row.original.zone_ids} />
        ),
      },
      {
        id: "size",
        header: t("columns.size"),
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground tabular-nums whitespace-nowrap">
            {formatFileSize(row.original.file_size_bytes)}
          </span>
        ),
      },
      {
        id: "ai_uses",
        header: t("columns.ai_uses"),
        cell: ({ row }) => <MiniSparkline value={row.original.ai_usage_count_30d} />,
      },
      {
        id: "version",
        header: "Версия",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            v{row.original.version}
            <span className="ml-1 text-muted-foreground/60">·</span>
            <span className="ml-1">{formatDateShort(row.original.uploaded_at)}</span>
          </span>
        ),
      },
      {
        id: "uploaded_by",
        header: t("columns.uploaded_by"),
        cell: ({ row }) => {
          const user = MOCK_USERS.find((u) => u.id === row.original.uploaded_by);
          if (!user) return <span className="text-xs text-muted-foreground">—</span>;
          return (
            <UserCell
              user={{ ...user, position_name: undefined }}
              className="max-w-[140px]"
            />
          );
        },
      },
      {
        id: "status",
        header: t("columns.status"),
        cell: ({ row }) => (
          <Badge
            variant={row.original.is_archived ? "secondary" : "outline"}
            className={cn(
              "text-xs whitespace-nowrap",
              !row.original.is_archived && "border-success text-success bg-success/10",
            )}
          >
            {row.original.is_archived ? t("status.archived") : t("status.active")}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: "",
        size: 44,
        cell: ({ row }) => (
          <RowActionsMenu
            regulation={row.original}
            onView={onView}
            onEditTags={onEditTags}
            onReplace={onReplace}
            onArchive={onArchive}
            onDownload={onDownload}
          />
        ),
      },
    ],
    [t, locale, onView, onEditTags, onReplace, onArchive, onDownload],
  );
}
