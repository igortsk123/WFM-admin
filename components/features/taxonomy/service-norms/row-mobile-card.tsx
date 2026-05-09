"use client";

import type { ServiceNorm } from "@/lib/types";

import { ObjectFormatBadge } from "./badge-object-format";
import { NormativeUnitBadge } from "./badge-normative-unit";
import { RowActions } from "./row-actions";
import { formatRelative, type TFn } from "./_shared";

interface MobileNormCardProps {
  norm: ServiceNorm;
  isWriter: boolean;
  isArchive: boolean;
  onEdit: (norm: ServiceNorm) => void;
  onArchive: (id: string) => void;
  t: TFn;
  tFreelance: TFn;
}

export function MobileNormCard({
  norm,
  isWriter,
  isArchive,
  onEdit,
  onArchive,
  t,
  tFreelance,
}: MobileNormCardProps) {
  return (
    <div className="flex flex-col gap-2 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <ObjectFormatBadge format={norm.object_format} tFreelance={tFreelance} />
          <span className="text-sm font-medium text-foreground mt-1">
            {norm.work_type_name}
          </span>
        </div>
        {isWriter && !isArchive && (
          <RowActions
            norm={norm}
            canEdit={true}
            onEdit={onEdit}
            onArchive={onArchive}
            t={t}
          />
        )}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
          {norm.normative_per_hour}
        </span>
        <NormativeUnitBadge unit={norm.unit} tFreelance={tFreelance} />
        <span className="text-xs text-muted-foreground">{t("per_hour")}</span>
        {norm.hourly_rate != null && (
          <span className="text-xs text-muted-foreground ml-auto">
            {norm.hourly_rate.toLocaleString("ru-RU")} {norm.currency}/ч
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
        <span>{norm.approved_by_name}</span>
        <span>·</span>
        <span>{formatRelative(norm.approved_at)}</span>
      </div>
    </div>
  );
}
