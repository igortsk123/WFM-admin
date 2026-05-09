"use client"

import { memo } from "react"
import { Camera } from "lucide-react"

import { EntityMobileCard } from "@/components/shared/entity-mobile-card"
import type { WorkTypeWithCount } from "@/lib/api/taxonomy"

import { GroupBadge } from "./group-badge"
import { RowActions } from "./row-actions"
import type { TFn } from "./_shared"

interface MobileCardProps {
  workType: WorkTypeWithCount
  onEdit: (wt: WorkTypeWithCount) => void
  onDuplicate: (wt: WorkTypeWithCount) => void
  onDelete: (wt: WorkTypeWithCount) => void
  t: TFn
  tCommon: TFn
}

export const WorkTypeMobileCard = memo(function WorkTypeMobileCard({
  workType: wt,
  onEdit,
  onDuplicate,
  onDelete,
  t,
  tCommon,
}: MobileCardProps) {
  return (
    <EntityMobileCard
      title={
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">{wt.name}</span>
          <span className="font-mono text-xs uppercase tracking-wide bg-muted px-1.5 py-0.5 rounded text-foreground">
            {wt.code}
          </span>
        </div>
      }
      actions={
        <RowActions
          workType={wt}
          onEdit={onEdit}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
          t={t}
          tCommon={tCommon}
          variant="card"
        />
      }
      meta={[
        <>
          <GroupBadge group={wt.group} />
          {wt.usage_count !== undefined && wt.usage_count > 0 && (
            <span className="text-xs text-muted-foreground">
              {wt.usage_count} задач
            </span>
          )}
        </>,
        <div key="extra" className="flex items-center gap-3">
          {wt.requires_photo_default && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Camera className="size-3" aria-hidden="true" />
              Фото
            </span>
          )}
          <span className="text-xs text-muted-foreground">
            {wt.default_duration_min} мин
          </span>
        </div>,
      ]}
    />
  )
})
