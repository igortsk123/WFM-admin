"use client";

import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

import type { Regulation } from "@/lib/types";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import { FileIcon } from "./file-icon";
import { TagPills } from "./tag-pills";
import { RowActionsMenu } from "./row-actions-menu";
import { formatFileSize } from "./_shared";

interface RegulationsMobileCardProps {
  regulation: Regulation;
  onView: (id: string) => void;
  onEditTags: (id: string) => void;
  onReplace: (id: string) => void;
  onArchive: (id: string) => void;
  onDownload: (id: string) => void;
}

export function RegulationsMobileCard({
  regulation: reg,
  onView,
  onEditTags,
  onReplace,
  onArchive,
  onDownload,
}: RegulationsMobileCardProps) {
  const t = useTranslations("screen.regulations");

  return (
    <div className="flex items-start gap-3">
      <div className="flex size-9 items-center justify-center rounded-lg bg-muted shrink-0">
        <FileIcon type={reg.file_type} />
      </div>
      <div className="flex-1 min-w-0">
        <button
          type="button"
          className="text-sm font-medium text-foreground hover:text-primary text-left line-clamp-2 block w-full"
          onClick={() => onView(reg.id)}
        >
          {reg.name}
        </button>
        <div className="mt-1.5 flex flex-wrap gap-1">
          <TagPills workTypeIds={reg.work_type_ids} zoneIds={reg.zone_ids} />
        </div>
        <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Sparkles className="size-3 text-muted-foreground" />
            {reg.ai_usage_count_30d}
          </span>
          <span className="font-mono">{formatFileSize(reg.file_size_bytes)}</span>
          <span>v{reg.version}</span>
          <Badge
            variant={reg.is_archived ? "secondary" : "outline"}
            className={cn(
              "text-[10px] h-4 px-1",
              !reg.is_archived && "border-success text-success bg-success/10",
            )}
          >
            {reg.is_archived ? t("status.archived") : t("status.active")}
          </Badge>
        </div>
      </div>
      <RowActionsMenu
        regulation={reg}
        onView={onView}
        onEditTags={onEditTags}
        onReplace={onReplace}
        onArchive={onArchive}
        onDownload={onDownload}
      />
    </div>
  );
}
