"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { GripVertical, Pencil, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import type { LocalHint } from "./_shared";

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

export function SortableHintCard({
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
