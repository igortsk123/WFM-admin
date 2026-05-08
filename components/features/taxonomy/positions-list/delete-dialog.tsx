"use client";

import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";

import { deletePosition, type PositionWithCounts } from "@/lib/api/taxonomy";

import type { TFn } from "./_shared";

interface DeleteDialogProps {
  position: PositionWithCounts | null;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  t: TFn;
}

export function DeleteDialog({
  position,
  onOpenChange,
  onSuccess,
  t,
}: DeleteDialogProps) {
  const [deleting, setDeleting] = React.useState(false);

  async function handleConfirm() {
    if (!position) return;
    setDeleting(true);
    try {
      const result = await deletePosition(position.id);
      if (result.success) {
        toast.success(t("toasts.deleted"));
        onSuccess();
        onOpenChange(false);
      } else if (
        result.error?.code === "HAS_DEPENDENCIES" ||
        (position.employees_count ?? 0) > 0
      ) {
        toast.warning(t("toasts.in_use_warning"));
        onOpenChange(false);
      } else {
        toast.error(t("toasts.error"));
      }
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AlertDialog open={!!position} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t("dialogs.delete_confirm_title", { name: position?.name ?? "" })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {position && (position.employees_count ?? 0) > 0
              ? t("dialogs.delete_in_use_error", {
                  count: position.employees_count,
                })
              : t("dialogs.delete_confirm_warning")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("dialogs.cancel")}
          </Button>
          <Button
            variant="destructive"
            disabled={
              deleting || (position?.employees_count ?? 0) > 0
            }
            onClick={handleConfirm}
          >
            {deleting ? "..." : t("dialogs.delete_action")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
