"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { MoreVertical, Sparkles, User, Users, Coins } from "lucide-react";
import { toast } from "sonner";

import { AlertDialog, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";

import { removeBonusTask } from "@/lib/api/bonus";
import type { BonusTaskWithSource } from "@/lib/api/bonus";

import { BONUS_SOURCE_COLORS } from "./_shared";

interface BonusTaskCardProps {
  task: BonusTaskWithSource;
  isProposal?: boolean;
  onRemove?: (id: string) => void;
  onPublishProposal?: (id: string) => void;
  onRejectProposal?: (id: string) => void;
}

export function BonusTaskCard({
  task,
  isProposal,
  onRemove,
  onPublishProposal,
  onRejectProposal,
}: BonusTaskCardProps) {
  const t = useTranslations("screen.bonusTasks");
  const [removeOpen, setRemoveOpen] = useState(false);
  const [removeReason] = useState("");
  const [, setRemoving] = useState(false);

  const handleRemove = async () => {
    if (!onRemove) return;
    setRemoving(true);
    const res = await removeBonusTask(task.id, removeReason || "Снято менеджером");
    setRemoving(false);
    if (res.success) {
      toast.success(t("toasts.task_removed"));
      setRemoveOpen(false);
      onRemove(task.id);
    } else {
      toast.error(t("toasts.error"));
    }
  };

  return (
    <Card className="rounded-xl group hover:shadow-sm transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-2 min-w-0 flex-1">
            {/* Header row */}
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`inline-flex items-center rounded-full border px-2.5 h-6 text-xs font-medium ${BONUS_SOURCE_COLORS[task.bonus_source] ?? "bg-muted text-muted-foreground"}`}
              >
                {t(`completed_tab.source.${task.bonus_source}`)}
              </span>
              {isProposal && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary border border-primary/20 px-2.5 h-6 text-xs font-medium">
                  <Sparkles className="size-3" aria-hidden="true" />
                  AI
                </span>
              )}
            </div>

            {/* Title */}
            <p className="text-sm font-semibold text-foreground leading-snug line-clamp-2">
              {task.title}
            </p>
            {task.description && (
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                {task.description}
              </p>
            )}

            {/* Meta row */}
            <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
              {task.assignee_name ? (
                <span className="flex items-center gap-1">
                  <User className="size-3" aria-hidden="true" />
                  {task.assignee_name}
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <Users className="size-3" aria-hidden="true" />
                  {t("task_card.any_assignee")}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Coins className="size-3" aria-hidden="true" />
                <span className="font-semibold text-foreground">
                  {task.bonus_points} {t("task_card.points_suffix")}
                </span>
              </span>
            </div>
          </div>

          {/* Actions */}
          {isProposal ? (
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant="default"
                className="h-8 text-xs"
                onClick={() => onPublishProposal?.(task.id)}
              >
                {t("actions.publish")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={() => onRejectProposal?.(task.id)}
              >
                {t("actions.reject")}
              </Button>
            </div>
          ) : (
            <AlertDialog open={removeOpen} onOpenChange={setRemoveOpen}>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label={t("actions.remove")}
                >
                  <MoreVertical className="size-4" />
                </Button>
              </AlertDialogTrigger>
              <ConfirmDialog
                title={t("remove_dialog.title")}
                message={t("remove_dialog.description")}
                confirmLabel={t("remove_dialog.confirm")}
                variant="destructive"
                onConfirm={handleRemove}
                onOpenChange={setRemoveOpen}
              />
            </AlertDialog>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
