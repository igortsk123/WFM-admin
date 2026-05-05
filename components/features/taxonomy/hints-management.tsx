"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Plus,
  Download,
  Lightbulb,
  GripVertical,
  Pencil,
  Trash2,
  Search,
  ChevronUp,
  ChevronDown,
  Lock,
  AlertCircle,
  RefreshCw,
  SearchX,
  LayoutList,
  Table2,
} from "lucide-react";

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
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

import { MOCK_WORK_TYPES } from "@/lib/mock-data/work-types";
import { MOCK_ZONES } from "@/lib/mock-data/zones";
import { MOCK_HINTS } from "@/lib/mock-data/hints";
import {
  getAllHints,
  getHintsCoverage,
  createHint,
  updateHint,
  deleteHint,
  reorderHints,
  type HintWithLabels,
  type HintsCoverage,
} from "@/lib/api/hints";

import { cn } from "@/lib/utils";
import type { Hint } from "@/lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type ViewMode = "pair" | "table";

interface LocalHint extends Hint {
  work_type_name?: string;
  zone_name?: string;
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    }).format(new Date(iso));
  } catch {
    return "—";
  }
}

// ─── Sortable Hint Card ────────────────────────────────────────────────────────

interface SortableHintCardProps {
  hint: LocalHint;
  isMobile: boolean;
  isFirst: boolean;
  isLast: boolean;
  onEdit: (hint: LocalHint) => void;
  onDelete: (hint: LocalHint) => void;
  onMoveUp: (id: number) => void;
  onMoveDown: (id: number) => void;
  onInlineEditSave: (id: number, text: string) => Promise<void>;
}

function SortableHintCard({
  hint,
  isMobile,
  isFirst,
  isLast,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  onInlineEditSave,
}: SortableHintCardProps) {
  const t = useTranslations("screen.hints");
  const tCommon = useTranslations("common");

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: hint.id, disabled: isMobile });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const [isEditing, setIsEditing] = React.useState(false);
  const [editText, setEditText] = React.useState(hint.text);
  const [isSaving, setIsSaving] = React.useState(false);

  async function handleSave() {
    if (!editText.trim() || editText === hint.text) {
      setIsEditing(false);
      setEditText(hint.text);
      return;
    }
    setIsSaving(true);
    await onInlineEditSave(hint.id, editText);
    setIsSaving(false);
    setIsEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setIsEditing(false);
      setEditText(hint.text);
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-start gap-2 rounded-md border border-border bg-card p-3 group",
        isDragging && "opacity-50 shadow-lg z-50"
      )}
    >
      {/* Drag handle — desktop only */}
      {!isMobile && (
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground shrink-0 touch-none"
          aria-label="Переместить"
        >
          <GripVertical className="size-4" />
        </button>
      )}

      {/* Mobile up/down */}
      {isMobile && (
        <div className="flex flex-col gap-0.5 shrink-0">
          <button
            onClick={() => onMoveUp(hint.id)}
            disabled={isFirst}
            className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-30 min-h-[22px]"
            aria-label="Вверх"
          >
            <ChevronUp className="size-3.5" />
          </button>
          <button
            onClick={() => onMoveDown(hint.id)}
            disabled={isLast}
            className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-30 min-h-[22px]"
            aria-label="Вниз"
          >
            <ChevronDown className="size-3.5" />
          </button>
        </div>
      )}

      {/* Text */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <div className="flex flex-col gap-2">
            <Textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={3}
              autoFocus
              className="text-sm resize-none"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving || !editText.trim()}
              >
                {tCommon("save")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setIsEditing(false);
                  setEditText(hint.text);
                }}
              >
                {tCommon("cancel")}
              </Button>
            </div>
          </div>
        ) : (
          <p
            className="text-sm text-foreground cursor-text leading-relaxed"
            onClick={() => setIsEditing(true)}
          >
            {hint.text}
          </p>
        )}
      </div>

      {/* Actions */}
      {!isEditing && (
        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 md:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(hint)}
            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground min-h-[44px] md:min-h-0"
            aria-label={t("row_actions.edit")}
          >
            <Pencil className="size-4" />
          </button>
          <button
            onClick={() => onDelete(hint)}
            className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive min-h-[44px] md:min-h-0"
            aria-label={t("row_actions.delete")}
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Add/Edit Hint Dialog ──────────────────────────────────────────────────────

interface HintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editHint?: LocalHint | null;
  defaultWorkTypeId?: number;
  defaultZoneId?: number;
  onSave: (data: { work_type_id: number; zone_id: number; text: string }) => Promise<void>;
}

function HintDialog({
  open,
  onOpenChange,
  editHint,
  defaultWorkTypeId,
  defaultZoneId,
  onSave,
}: HintDialogProps) {
  const t = useTranslations("screen.hints");
  const tCommon = useTranslations("common");

  const globalZones = MOCK_ZONES.filter((z) => z.approved && !z.store_id);
  const globalWorkTypes = MOCK_WORK_TYPES.filter((wt) => wt.id <= 13);

  const [workTypeId, setWorkTypeId] = React.useState<string>(
    editHint ? String(editHint.work_type_id) : defaultWorkTypeId ? String(defaultWorkTypeId) : ""
  );
  const [zoneId, setZoneId] = React.useState<string>(
    editHint ? String(editHint.zone_id) : defaultZoneId ? String(defaultZoneId) : ""
  );
  const [text, setText] = React.useState(editHint?.text ?? "");
  const [isSaving, setIsSaving] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  // Reset on open
  React.useEffect(() => {
    if (open) {
      setWorkTypeId(editHint ? String(editHint.work_type_id) : defaultWorkTypeId ? String(defaultWorkTypeId) : "");
      setZoneId(editHint ? String(editHint.zone_id) : defaultZoneId ? String(defaultZoneId) : "");
      setText(editHint?.text ?? "");
      setErrors({});
    }
  }, [open, editHint, defaultWorkTypeId, defaultZoneId]);

  function validate() {
    const e: Record<string, string> = {};
    if (!workTypeId) e.work_type_id = tCommon("required");
    if (!zoneId) e.zone_id = tCommon("required");
    if (!text.trim()) e.text = tCommon("required");
    else if (text.trim().length < 5)
      e.text = tCommon("validation") ?? "Минимум 5 символов";
    else if (text.trim().length > 500)
      e.text = "Максимум 500 символов";
    return e;
  }

  async function handleSave() {
    const e = validate();
    if (Object.keys(e).length > 0) {
      setErrors(e);
      return;
    }
    setIsSaving(true);
    try {
      await onSave({
        work_type_id: Number(workTypeId),
        zone_id: Number(zoneId),
        text: text.trim(),
      });
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  }

  const isEdit = !!editHint;
  const workTypeName = globalWorkTypes.find((wt) => wt.id === Number(workTypeId))?.name ?? "";
  const zoneName = globalZones.find((z) => z.id === Number(zoneId))?.name ?? "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("dialogs.edit_title") : t("dialogs.create_title")}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* Work type */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="wt-select">{t("dialogs.fields.work_type_id")}</Label>
            <Select
              value={workTypeId}
              onValueChange={setWorkTypeId}
              disabled={isEdit}
            >
              <SelectTrigger id="wt-select">
                <SelectValue placeholder="Выберите тип работы" />
              </SelectTrigger>
              <SelectContent>
                {globalWorkTypes.map((wt) => (
                  <SelectItem key={wt.id} value={String(wt.id)}>
                    {wt.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.work_type_id && (
              <p className="text-xs text-destructive">{errors.work_type_id}</p>
            )}
          </div>

          {/* Zone */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="zone-select">{t("dialogs.fields.zone_id")}</Label>
            <Select
              value={zoneId}
              onValueChange={setZoneId}
              disabled={isEdit}
            >
              <SelectTrigger id="zone-select">
                <SelectValue placeholder="Выберите зону" />
              </SelectTrigger>
              <SelectContent>
                {globalZones.map((z) => (
                  <SelectItem key={z.id} value={String(z.id)}>
                    {z.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.zone_id && (
              <p className="text-xs text-destructive">{errors.zone_id}</p>
            )}
          </div>

          {/* Text */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="hint-text">{t("dialogs.fields.text")}</Label>
            <Textarea
              id="hint-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t("dialogs.fields.text_placeholder")}
              rows={4}
              maxLength={500}
              className="resize-none"
            />
            <div className="flex justify-between">
              {errors.text ? (
                <p className="text-xs text-destructive">{errors.text}</p>
              ) : (
                <span />
              )}
              <p className="text-xs text-muted-foreground">{text.length} / 500</p>
            </div>
          </div>

          {/* Live preview */}
          {text.trim() && (
            <div className="rounded-lg bg-muted/30 border border-border p-3 flex gap-2">
              <Lightbulb className="size-4 text-warning shrink-0 mt-0.5" strokeWidth={1.5} />
              <div className="flex flex-col gap-1">
                {workTypeName && zoneName && (
                  <p className="text-xs text-muted-foreground">
                    {workTypeName} / {zoneName}
                  </p>
                )}
                <p className="text-sm text-foreground leading-relaxed">{text}</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("dialogs.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {t("dialogs.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Pair View: Hints List ─────────────────────────────────────────────────────

interface PairHintsListProps {
  workTypeId: number;
  zoneId: number;
  isMobile: boolean;
  onAddClick: () => void;
}

function PairHintsList({ workTypeId, zoneId, isMobile, onAddClick }: PairHintsListProps) {
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

// ─── Table View ───────────────────────────────────────────────────────────────

interface TableViewProps {
  onEdit: (hint: HintWithLabels) => void;
  onDelete: (hint: HintWithLabels) => void;
}

function TableView({ onEdit, onDelete }: TableViewProps) {
  const t = useTranslations("screen.hints");
  const tCommon = useTranslations("common");

  const [searchText, setSearchText] = React.useState("");
  const [data, setData] = React.useState<HintWithLabels[]>([]);
  const [total, setTotal] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isError, setIsError] = React.useState(false);

  async function load(search: string) {
    setIsLoading(true);
    setIsError(false);
    try {
      const result = await getAllHints({ search, page_size: 100 });
      setData(result.data);
      setTotal(result.total);
    } catch {
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }

  React.useEffect(() => {
    load(searchText);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => load(searchText), 300);
    return () => clearTimeout(timer);
     
  }, [searchText]);

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="size-4" />
        <AlertDescription className="flex items-center gap-3">
          {tCommon("error")}
          <Button size="sm" variant="outline" onClick={() => load(searchText)}>
            <RefreshCw className="size-3.5 mr-1.5" /> {tCommon("retry")}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder={t("filters.search_placeholder")}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Desktop table */}
      <div className="hidden md:block rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead className="text-muted-foreground text-xs uppercase tracking-wide h-9 w-10 px-4">#</TableHead>
              <TableHead className="text-muted-foreground text-xs uppercase tracking-wide h-9 px-4">{t("table_view.col_work_type")}</TableHead>
              <TableHead className="text-muted-foreground text-xs uppercase tracking-wide h-9 px-4">{t("table_view.col_zone")}</TableHead>
              <TableHead className="text-muted-foreground text-xs uppercase tracking-wide h-9 px-4">{t("table_view.col_text")}</TableHead>
              <TableHead className="text-muted-foreground text-xs uppercase tracking-wide h-9 px-4">{t("table_view.col_created_at")}</TableHead>
              <TableHead className="text-muted-foreground text-xs uppercase tracking-wide h-9 px-4">{t("table_view.col_updated_at")}</TableHead>
              <TableHead className="text-muted-foreground text-xs uppercase tracking-wide h-9 px-4 w-12">{t("table_view.col_actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j} className="px-4 py-3">
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="p-0">
                  <EmptyState
                    icon={SearchX}
                    title={t("empty.filtered_title")}
                    description={t("empty.filtered_reset")}
                    action={searchText ? { label: t("empty.filtered_reset"), onClick: () => setSearchText("") } : undefined}
                  />
                </TableCell>
              </TableRow>
            ) : (
              data.map((hint, idx) => (
                <TableRow key={hint.id}>
                  <TableCell className="px-4 py-3 text-muted-foreground text-xs">{idx + 1}</TableCell>
                  <TableCell className="px-4 py-3">
                    <Badge variant="secondary" className="text-xs">{hint.work_type_name}</Badge>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <Badge variant="outline" className="text-xs">{hint.zone_name}</Badge>
                  </TableCell>
                  <TableCell className="px-4 py-3 max-w-xl">
                    <p className="text-sm font-medium line-clamp-2">{hint.text}</p>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <span className="text-xs text-muted-foreground">{formatDate(hint.created_at)}</span>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <span className="text-xs text-muted-foreground">{formatDate(hint.updated_at)}</span>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                          <span className="sr-only">{tCommon("actions")}</span>
                          <span className="text-base leading-none">⋮</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(hint)}>
                          <Pencil className="size-3.5 mr-2" />
                          {t("row_actions.edit")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onDelete(hint)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="size-3.5 mr-2" />
                          {t("row_actions.delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="flex flex-col gap-2 md:hidden">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)
        ) : data.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title={t("empty.filtered_title")}
            description={t("empty.filtered_reset")}
          />
        ) : (
          data.map((hint) => (
            <div key={hint.id} className="bg-card border border-border rounded-lg p-4 flex flex-col gap-2">
              <div className="flex gap-2 flex-wrap">
                <Badge variant="secondary" className="text-xs">{hint.work_type_name}</Badge>
                <Badge variant="outline" className="text-xs">{hint.zone_name}</Badge>
              </div>
              <p className="text-sm text-foreground leading-relaxed line-clamp-3">{hint.text}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{formatDate(hint.created_at)}</span>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="size-9 min-h-[44px]" onClick={() => onEdit(hint)}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="size-9 min-h-[44px] text-destructive" onClick={() => onDelete(hint)}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function HintsManagement() {
  const t = useTranslations("screen.hints");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const searchParams = useSearchParams();

  const viewParam = searchParams.get("view");
  const [view, setView] = React.useState<ViewMode>(
    viewParam === "table" ? "table" : "pair"
  );

  // Mobile detection
  const [isMobile, setIsMobile] = React.useState(false);
  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Coverage stats
  const [coverage, setCoverage] = React.useState<HintsCoverage | null>(null);
  const [statsLoading, setStatsLoading] = React.useState(true);

  React.useEffect(() => {
    getHintsCoverage().then((r: { data: HintsCoverage }) => {
      setCoverage(r.data);
      setStatsLoading(false);
    });
  }, []);

  // Pair selection
  const [selectedWorkTypeId, setSelectedWorkTypeId] = React.useState<number | null>(null);
  const [selectedZoneId, setSelectedZoneId] = React.useState<number | null>(null);

  // Filters inside pair view
  const [workTypeSearch, setWorkTypeSearch] = React.useState("");
  const [zoneSearch, setZoneSearch] = React.useState("");

  // Mobile collapse
  const [workTypeListOpen, setWorkTypeListOpen] = React.useState(true);
  const [zoneListOpen, setZoneListOpen] = React.useState(true);

  // Create/edit dialog
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<HintWithLabels | null>(null);

  // Delete dialog (table view)
  const [deleteTarget, setDeleteTarget] = React.useState<HintWithLabels | null>(null);
  const [deleteAlertOpen, setDeleteAlertOpen] = React.useState(false);

  // Global hint list (for re-renders after mutation)
  const [localHints, setLocalHints] = React.useState<LocalHint[]>([...MOCK_HINTS]);

  const globalZones = MOCK_ZONES.filter((z) => z.approved && !z.store_id);
  const globalWorkTypes = MOCK_WORK_TYPES.filter((wt) => wt.id <= 13);

  // Hint counts per work-type and zone
  function hintsCountForWorkType(wtId: number) {
    return localHints.filter((h) => h.work_type_id === wtId).length;
  }
  function hintsCountForZone(zId: number) {
    return localHints.filter(
      (h) => h.zone_id === zId && (selectedWorkTypeId ? h.work_type_id === selectedWorkTypeId : true)
    ).length;
  }

  // URL sync for view
  function handleViewChange(v: ViewMode) {
    setView(v);
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", v);
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  async function handleCreate(data: { work_type_id: number; zone_id: number; text: string }) {
    const res = await createHint(data);
    if (res.success) {
      const newHint: LocalHint = {
        id: Number(res.id),
        work_type_id: data.work_type_id,
        zone_id: data.zone_id,
        text: data.text,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setLocalHints((prev) => [...prev, newHint]);
    }
  }

  async function handleEditSave(data: { work_type_id: number; zone_id: number; text: string }) {
    if (!editTarget) return;
    await updateHint(String(editTarget.id), { text: data.text });
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    await deleteHint(String(deleteTarget.id));
    setLocalHints((prev) => prev.filter((h) => h.id !== deleteTarget.id));
    setDeleteTarget(null);
    setDeleteAlertOpen(false);
  }

  const filteredWorkTypes = globalWorkTypes.filter((wt) =>
    wt.name.toLowerCase().includes(workTypeSearch.toLowerCase())
  );
  const filteredZones = globalZones.filter((z) =>
    z.name.toLowerCase().includes(zoneSearch.toLowerCase())
  );

  // ─── Pair view sidebar list ──────────────────────────────────────────────────

  function WorkTypeList() {
    return (
      <div className="flex flex-col gap-1">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            placeholder={t("pair_view.search_placeholder")}
            value={workTypeSearch}
            onChange={(e) => setWorkTypeSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
        <div className="flex flex-col gap-0.5 max-h-56 overflow-y-auto pr-0.5">
          {filteredWorkTypes.map((wt) => {
            const count = hintsCountForWorkType(wt.id);
            const isSelected = selectedWorkTypeId === wt.id;
            return (
              <button
                key={wt.id}
                onClick={() => {
                  setSelectedWorkTypeId(isSelected ? null : wt.id);
                  setSelectedZoneId(null);
                }}
                className={cn(
                  "flex items-center justify-between gap-2 rounded-md px-2.5 py-2 text-sm text-left transition-colors",
                  "hover:bg-muted",
                  isSelected && "bg-accent border-l-4 border-primary pl-1.5"
                )}
              >
                <span className="truncate font-medium">{wt.name}</span>
                <span className="text-xs text-muted-foreground shrink-0">{count}</span>
              </button>
            );
          })}
          {filteredWorkTypes.length === 0 && (
            <p className="text-xs text-muted-foreground px-2 py-1">{tCommon("noResults")}</p>
          )}
        </div>
      </div>
    );
  }

  function ZoneList() {
    return (
      <div className="flex flex-col gap-1">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            placeholder={t("pair_view.search_placeholder")}
            value={zoneSearch}
            onChange={(e) => setZoneSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
        <div className="flex flex-col gap-0.5 max-h-56 overflow-y-auto pr-0.5">
          {filteredZones.map((z) => {
            const count = hintsCountForZone(z.id);
            const isSelected = selectedZoneId === z.id;
            return (
              <button
                key={z.id}
                onClick={() => setSelectedZoneId(isSelected ? null : z.id)}
                className={cn(
                  "flex items-center justify-between gap-2 rounded-md px-2.5 py-2 text-sm text-left transition-colors",
                  "hover:bg-muted",
                  isSelected && "bg-accent border-l-4 border-primary pl-1.5"
                )}
              >
                <span className="truncate font-medium">{z.name}</span>
                <span className="text-xs text-muted-foreground shrink-0">{count}</span>
              </button>
            );
          })}
          {filteredZones.length === 0 && (
            <p className="text-xs text-muted-foreground px-2 py-1">{tCommon("noResults")}</p>
          )}
        </div>
      </div>
    );
  }

  // ─── Stats cards ─────────────────────────────────────────────────────────────

  const coveredPairs = coverage?.covered_pairs ?? 0;
  const totalPairs = coverage?.total_pairs ?? 60;
  const emptyPairs = coverage ? totalPairs - coveredPairs : 12;

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <PageHeader
        breadcrumbs={[
          { label: t("breadcrumbs.taxonomy"), href: "/taxonomy/work-types" },
          { label: t("breadcrumbs.hints") },
        ]}
        title={t("page_title")}
        subtitle={t("page_subtitle")}
        actions={
          <>
            <Button variant="outline" size="sm">
              <Download className="size-4 mr-1.5" />
              {t("actions.export")}
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setEditTarget(null);
                setCreateDialogOpen(true);
              }}
            >
              <Plus className="size-4 mr-1.5" />
              {t("actions.create")}
            </Button>
          </>
        }
      />

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Total hints */}
        <Card className="rounded-xl">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t("stats.total_hints")}</p>
            {statsLoading ? (
              <Skeleton className="h-7 w-16 mt-1" />
            ) : (
              <p className="text-2xl font-semibold tracking-tight text-foreground mt-0.5">
                {coverage?.total_hints ?? 30}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Covered pairs */}
        <Card className="rounded-xl">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t("stats.covered_pairs")}</p>
            {statsLoading ? (
              <Skeleton className="h-7 w-24 mt-1" />
            ) : (
              <p className="text-2xl font-semibold tracking-tight text-foreground mt-0.5">
                {t("stats.coverage_format", { covered: coveredPairs, total: totalPairs })}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Empty pairs */}
        <Card className="rounded-xl">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t("stats.empty_pairs")}</p>
            {statsLoading ? (
              <Skeleton className="h-7 w-16 mt-1" />
            ) : (
              <div className="flex items-baseline gap-2 mt-0.5">
                <p className="text-2xl font-semibold tracking-tight text-warning">
                  {emptyPairs}
                </p>
                <button
                  className="text-xs text-primary hover:underline"
                  onClick={() => {
                    /* Could open a sheet with empty pairs list */
                  }}
                >
                  {t("stats.view_empty_list")}
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* View toggle — hidden on mobile (only pair view) */}
      <div className="hidden md:flex items-center gap-2">
        <ToggleGroup
          type="single"
          value={view}
          onValueChange={(v) => v && handleViewChange(v as ViewMode)}
          className="border border-border rounded-lg p-0.5 gap-0.5"
        >
          <ToggleGroupItem value="pair" className="h-8 px-3 text-sm gap-1.5 data-[state=on]:bg-background data-[state=on]:shadow-sm rounded-md">
            <LayoutList className="size-4" />
            {t("view.pair")}
          </ToggleGroupItem>
          <ToggleGroupItem value="table" className="h-8 px-3 text-sm gap-1.5 data-[state=on]:bg-background data-[state=on]:shadow-sm rounded-md">
            <Table2 className="size-4" />
            {t("view.table")}
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* ── PAIR VIEW ── */}
      {(view === "pair" || isMobile) && (
        <>
          {/* Desktop: 3-col grid */}
          <div className="hidden lg:grid lg:grid-cols-3 gap-4 items-start">
            {/* Left: work types + zones */}
            <div className="sticky top-20 flex flex-col gap-4">
              <Card>
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm font-medium">
                    {t("pair_view.work_types_card")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <WorkTypeList />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm font-medium">
                    {t("pair_view.zones_card")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <ZoneList />
                </CardContent>
              </Card>
            </div>

            {/* Right: hints */}
            <div className="col-span-2">
              {!selectedWorkTypeId || !selectedZoneId ? (
                <EmptyState
                  icon={Lightbulb}
                  title={t("pair_view.select_pair_title")}
                  description={t("pair_view.select_pair_subtitle")}
                />
              ) : (
                <PairHintsList
                  key={`${selectedWorkTypeId}-${selectedZoneId}`}
                  workTypeId={selectedWorkTypeId}
                  zoneId={selectedZoneId}
                  isMobile={false}
                  onAddClick={() => setCreateDialogOpen(true)}
                />
              )}
            </div>
          </div>

          {/* Tablet md–lg: stack */}
          <div className="hidden md:flex lg:hidden flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm font-medium">{t("pair_view.work_types_card")}</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <WorkTypeList />
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm font-medium">{t("pair_view.zones_card")}</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <ZoneList />
                </CardContent>
              </Card>
            </div>
            {!selectedWorkTypeId || !selectedZoneId ? (
              <EmptyState
                icon={Lightbulb}
                title={t("pair_view.select_pair_title")}
                description={t("pair_view.select_pair_subtitle")}
              />
            ) : (
              <PairHintsList
                key={`${selectedWorkTypeId}-${selectedZoneId}`}
                workTypeId={selectedWorkTypeId}
                zoneId={selectedZoneId}
                isMobile={false}
                onAddClick={() => setCreateDialogOpen(true)}
              />
            )}
          </div>

          {/* Mobile: single column stack */}
          <div className="flex flex-col gap-3 md:hidden">
            {/* Work types collapsible */}
            <Card>
              <button
                className="flex w-full items-center justify-between px-4 py-3"
                onClick={() => setWorkTypeListOpen((p) => !p)}
              >
                <span className="text-sm font-medium">{t("pair_view.work_types_card")}</span>
                {workTypeListOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
              </button>
              {workTypeListOpen && (
                <CardContent className="px-4 pb-4 pt-0">
                  <WorkTypeList />
                </CardContent>
              )}
            </Card>

            {/* Zones collapsible */}
            <Card>
              <button
                className="flex w-full items-center justify-between px-4 py-3"
                onClick={() => setZoneListOpen((p) => !p)}
              >
                <span className="text-sm font-medium">{t("pair_view.zones_card")}</span>
                {zoneListOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
              </button>
              {zoneListOpen && (
                <CardContent className="px-4 pb-4 pt-0">
                  <ZoneList />
                </CardContent>
              )}
            </Card>

            {/* Hints for selected pair */}
            {selectedWorkTypeId && selectedZoneId && (
              <PairHintsList
                key={`${selectedWorkTypeId}-${selectedZoneId}`}
                workTypeId={selectedWorkTypeId}
                zoneId={selectedZoneId}
                isMobile={true}
                onAddClick={() => setCreateDialogOpen(true)}
              />
            )}

            {(!selectedWorkTypeId || !selectedZoneId) && (
              <EmptyState
                icon={Lightbulb}
                title={t("pair_view.select_pair_title")}
                description={t("pair_view.select_pair_subtitle")}
                className="py-10"
              />
            )}
          </div>
        </>
      )}

      {/* ── TABLE VIEW ── */}
      {view === "table" && !isMobile && (
        <TableView
          onEdit={(h) => {
            setEditTarget(h);
            setCreateDialogOpen(true);
          }}
          onDelete={(h) => {
            setDeleteTarget(h);
            setDeleteAlertOpen(true);
          }}
        />
      )}

      {/* ── Create/Edit Dialog ── */}
      <HintDialog
        open={createDialogOpen}
        onOpenChange={(o) => {
          setCreateDialogOpen(o);
          if (!o) setEditTarget(null);
        }}
        editHint={editTarget}
        defaultWorkTypeId={selectedWorkTypeId ?? undefined}
        defaultZoneId={selectedZoneId ?? undefined}
        onSave={editTarget ? handleEditSave : handleCreate}
      />

      {/* ── Delete AlertDialog (table view) ── */}
      <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <ConfirmDialog
          title={t("dialogs.delete_confirm_title")}
          message={t("dialogs.delete_confirm_warning")}
          confirmLabel={t("dialogs.delete_action")}
          variant="destructive"
          onConfirm={handleDeleteConfirm}
          onOpenChange={setDeleteAlertOpen}
        />
      </AlertDialog>
    </div>
  );
}
