"use client"

import { useTranslations } from "next-intl"
import { CheckCircle2, SearchX } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"

import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"

import { useSubtasksModeration } from "./subtasks-moderation/use-subtasks-moderation"
import { ToolbarSection } from "./subtasks-moderation/section-toolbar"
import { SubtaskCard } from "./subtasks-moderation/subtask-card"
import { SubtaskCardSkeleton } from "./subtasks-moderation/subtask-card-skeleton"
import { RejectDialog } from "./subtasks-moderation/dialog-reject"

export function SubtasksModeration() {
  const t = useTranslations("screen.subtasksModeration")
  const tc = useTranslations("common")

  const {
    rows,
    total,
    isLoading,
    isError,
    storeOptions,
    workTypeOptions,
    zoneOptions,
    search,
    setSearch,
    storeId,
    setStoreId,
    workTypeId,
    setWorkTypeId,
    zoneId,
    setZoneId,
    clearAllFilters,
    expandedId,
    setExpandedId,
    rejectTarget,
    setRejectTarget,
    loadData,
    handleApprove,
    handleRejectConfirm,
  } = useSubtasksModeration(t("toast_approved"), t("toast_rejected"))

  // ── active filter chips ──
  const activeFilters = [
    storeId && { key: "store", label: t("filter_store"), value: storeOptions.find((o) => o.value === storeId)?.label ?? storeId, onRemove: () => setStoreId("") },
    workTypeId && { key: "workType", label: t("filter_work_type"), value: workTypeOptions.find((o) => o.value === workTypeId)?.label ?? workTypeId, onRemove: () => setWorkTypeId("") },
    zoneId && { key: "zone", label: t("filter_zone"), value: zoneOptions.find((o) => o.value === zoneId)?.label ?? zoneId, onRemove: () => setZoneId("") },
  ].filter(Boolean) as { key: string; label: string; value: string; onRemove: () => void }[]

  const isEmpty = !isLoading && rows.length === 0
  const isFiltered = !!(search || storeId || workTypeId || zoneId)

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <PageHeader
        title={t("title")}
        subtitle={t("hint")}
        actions={
          !isLoading && total > 0 ? (
            <Badge variant="secondary" className="bg-warning/15 text-warning border-warning/20 text-sm font-medium">
              {t("counter", { count: total })}
            </Badge>
          ) : undefined
        }
      />

      {/* Toolbar */}
      <ToolbarSection
        search={search}
        onSearchChange={setSearch}
        storeOptions={storeOptions}
        workTypeOptions={workTypeOptions}
        zoneOptions={zoneOptions}
        storeId={storeId}
        setStoreId={setStoreId}
        workTypeId={workTypeId}
        setWorkTypeId={setWorkTypeId}
        zoneId={zoneId}
        setZoneId={setZoneId}
        activeFilters={activeFilters}
        onClearAll={clearAllFilters}
      />

      {/* Error state */}
      {isError && (
        <Alert variant="destructive">
          <AlertDescription className="flex items-center gap-3">
            {t("error_title")} — {t("error_desc")}
            <Button size="sm" variant="outline" onClick={loadData}>{tc("retry")}</Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Card list */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SubtaskCardSkeleton key={i} />
          ))}
        </div>
      ) : isEmpty ? (
        isFiltered ? (
          <EmptyState
            icon={SearchX}
            title={t("empty_filtered_title")}
            description={t("empty_filtered_desc")}
          />
        ) : (
          <EmptyState
            icon={CheckCircle2}
            title={t("empty_queue_title")}
            description={t("empty_queue_desc")}
            className="[&_svg]:text-success"
          />
        )
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {rows.map((row) => (
            <SubtaskCard
              key={row.id}
              subtask={row}
              isExpanded={expandedId === row.id}
              onToggle={() => setExpandedId(expandedId === row.id ? null : row.id)}
              onApprove={handleApprove}
              onReject={(id) => setRejectTarget(id)}
            />
          ))}
        </div>
      )}

      {/* Reject dialog */}
      <RejectDialog
        open={rejectTarget !== null}
        title={t("reject_dialog_title")}
        onConfirm={handleRejectConfirm}
        onClose={() => setRejectTarget(null)}
      />

      {/* Clear selection pill (if filter is active, show count) */}
      {!isLoading && total > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          {t("counter", { count: total })}
        </p>
      )}
    </div>
  )
}
