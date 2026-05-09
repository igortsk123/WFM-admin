"use client";

import { memo } from "react";

import { Badge } from "@/components/ui/badge";
import { RoleBadge } from "@/components/shared/role-badge";

import type { FunctionalRole } from "@/lib/types";
import type { PositionWithCounts } from "@/lib/api/taxonomy";

import { DbRoleBadge } from "./db-role-badge";
import { PositionRowActions } from "./position-row-actions";
import type { TFn } from "./_shared";

interface PositionMobileCardProps {
  position: PositionWithCounts;
  canEdit: boolean;
  onEdit: (pos: PositionWithCounts) => void;
  onDuplicate: (pos: PositionWithCounts) => void;
  onDelete: (pos: PositionWithCounts) => void;
  t: TFn;
}

export const PositionMobileCard = memo(function PositionMobileCard({
  position,
  canEdit,
  onEdit,
  onDuplicate,
  onDelete,
  t,
}: PositionMobileCardProps) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div className="flex flex-col gap-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">{position.name}</span>
          <Badge variant="outline" className="font-mono text-[11px]">
            {position.code}
          </Badge>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <DbRoleBadge roleId={position.role_id} />
          {position.functional_role_default && (
            <RoleBadge
              role={position.functional_role_default as FunctionalRole}
              size="sm"
            />
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {t("columns.employees_count")}:{" "}
          <span className="font-medium text-foreground">
            {position.employees_count}
          </span>
        </span>
      </div>
      <PositionRowActions
        position={position}
        canEdit={canEdit}
        isMobile
        onEdit={onEdit}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
        t={t}
      />
    </div>
  );
});
