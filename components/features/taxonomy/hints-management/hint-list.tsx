"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Plus, Lightbulb, AlertCircle, RefreshCw } from "lucide-react";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog } from "@/components/ui/alert-dialog";

import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

import { MOCK_WORK_TYPES } from "@/lib/mock-data/work-types";
import { MOCK_ZONES } from "@/lib/mock-data/zones";
import { MOCK_HINTS } from "@/lib/mock-data/hints";
import { updateHint, deleteHint, reorderHints } from "@/lib/api/hints";

import { SortableHintCard } from "./hint-row";
import { HintDialog } from "./hint-dialog";
import type { LocalHint } from "./_shared";

interface PairHintsListProps {
  workTypeId: number;
  zoneId: number;
  isMobile: boolean;
  onAddClick: () => void;
}

export function PairHintsList({ workTypeId, zoneId, isMobile, onAddClick }: PairHintsListProps) {
  const t = useTranslations("screen.hints");
  const tCommon = useTranslations("common");

  const [hints, setHints] = React.useState<LocalHint[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isError, setIsError] = React.useState(false);
  const [editDialogHint, setEditDialogHint] = React.useState<LocalHint | null>(null);
  const [deleteDialogHint, setDeleteDialogHint] = React.useState<LocalHint | null>(null);
  const [deleteAlertOpen, setDeleteAlertOpen] = React.useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const workTypeName = MOCK_WORK_TYPES.find((wt) => wt.id === workTypeId)?.name ?? "";
  const zoneName = MOCK_ZONES.find((z) => z.id === zoneId)?.name ?? "";

  React.useEffect(() => {
    setIsLoading(true);
    setIsError(false);

    // Filter from mock data
    const filtered: LocalHint[] = MOCK_HINTS.filter(
      (h) => h.work_type_id === workTypeId && h.zone_id === zoneId
    );
    setTimeout(() => {
      setHints(filtered);
      setIsLoading(false);
    }, 250);
  }, [workTypeId, zoneId]);

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = hints.findIndex((h) => h.id === active.id);
    const newIndex = hints.findIndex((h) => h.id === over.id);
    const reordered = arrayMove(hints, oldIndex, newIndex);
    setHints(reordered);

    await reorderHints(workTypeId, zoneId, reordered.map((h) => h.id));
  }

  function handleMoveUp(id: number) {
    const idx = hints.findIndex((h) => h.id === id);
    if (idx <= 0) return;
    setHints((prev) => arrayMove(prev, idx, idx - 1));
  }

  function handleMoveDown(id: number) {
    const idx = hints.findIndex((h) => h.id === id);
    if (idx >= hints.length - 1) return;
    setHints((prev) => arrayMove(prev, idx, idx + 1));
  }

  async function handleInlineEdit(id: number, text: string) {
    await updateHint(String(id), { text });
    setHints((prev) => prev.map((h) => h.id === id ? { ...h, text } : h));
  }

  async function handleEditSave(data: { work_type_id: number; zone_id: number; text: string }) {
    if (!editDialogHint) return;
    await updateHint(String(editDialogHint.id), { text: data.text });
    setHints((prev) =>
      prev.map((h) => h.id === editDialogHint.id ? { ...h, text: data.text } : h)
    );
  }

  async function handleDelete() {
    if (!deleteDialogHint) return;
    await deleteHint(String(deleteDialogHint.id));
    setHints((prev) => prev.filter((h) => h.id !== deleteDialogHint.id));
    setDeleteDialogHint(null);
    setDeleteAlertOpen(false);
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2 pt-2">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full rounded-md" />)}
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="size-4" />
        <AlertDescription className="flex items-center gap-3">
          {tCommon("error")}
          <Button size="sm" variant="outline" onClick={() => setIsError(false)}>
            <RefreshCw className="size-3.5 mr-1.5" />
            {tCommon("retry")}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center gap-2 flex-wrap">
        <h3 className="text-sm font-medium text-foreground">
          {t("pair_view.header", { work_type: workTypeName, zone: zoneName })}
        </h3>
        <Badge variant="secondary" className="text-xs">
          {t("pair_view.header_count", { count: hints.length })}
        </Badge>
        <Badge variant="outline" className="text-xs text-muted-foreground hidden md:inline-flex">
          {workTypeName}
        </Badge>
        <Badge variant="outline" className="text-xs text-muted-foreground hidden md:inline-flex">
          {zoneName}
        </Badge>
      </div>

      {/* List */}
      {hints.length === 0 ? (
        <EmptyState
          icon={Lightbulb}
          title={t("pair_view.empty_pair_title")}
          description={t("pair_view.empty_pair_cta")}
          action={{ label: t("pair_view.add_btn"), onClick: onAddClick }}
          className="py-8"
        />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={hints.map((h) => h.id)} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-2">
              {hints.map((hint, idx) => (
                <SortableHintCard
                  key={hint.id}
                  hint={hint}
                  isMobile={isMobile}
                  isFirst={idx === 0}
                  isLast={idx === hints.length - 1}
                  onEdit={(h) => setEditDialogHint(h)}
                  onDelete={(h) => {
                    setDeleteDialogHint(h);
                    setDeleteAlertOpen(true);
                  }}
                  onMoveUp={handleMoveUp}
                  onMoveDown={handleMoveDown}
                  onInlineEditSave={handleInlineEdit}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Footer add button */}
      {hints.length > 0 && (
        <Button variant="outline" size="sm" onClick={onAddClick} className="self-start">
          <Plus className="size-4 mr-1.5" />
          {t("pair_view.add_btn")}
        </Button>
      )}

      {/* Edit dialog */}
      <HintDialog
        open={!!editDialogHint}
        onOpenChange={(o) => { if (!o) setEditDialogHint(null); }}
        editHint={editDialogHint}
        onSave={handleEditSave}
      />

      {/* Delete alert */}
      <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <ConfirmDialog
          title={t("dialogs.delete_confirm_title")}
          message={t("dialogs.delete_confirm_warning")}
          confirmLabel={t("dialogs.delete_action")}
          variant="destructive"
          onConfirm={handleDelete}
          onOpenChange={setDeleteAlertOpen}
        />
      </AlertDialog>
    </div>
  );
}
