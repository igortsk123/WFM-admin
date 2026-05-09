"use client";

import { useTranslations } from "next-intl";

import { AlertDialog } from "@/components/ui/alert-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

import type { ScheduleSlot } from "@/lib/api/shifts";

export type ShiftAction = "reopen" | "force_close";

export interface ConfirmActionState {
  type: ShiftAction;
  slot: ScheduleSlot;
}

interface ConfirmActionDialogProps {
  action: ConfirmActionState;
  onClose: () => void;
  onConfirm: () => void;
}

export function ConfirmActionDialog({
  action,
  onClose,
  onConfirm,
}: ConfirmActionDialogProps) {
  const t = useTranslations("screen.schedule");

  return (
    <AlertDialog open onOpenChange={(open) => !open && onClose()}>
      <ConfirmDialog
        title={
          action.type === "reopen"
            ? t("dialogs.reopen_confirm_title")
            : t("dialogs.force_close_warning_title")
        }
        message={
          action.type === "reopen"
            ? t("dialogs.reopen_confirm_description", {
                user: action.slot.user_name,
              })
            : t("dialogs.force_close_warning_description", {
                user: action.slot.user_name,
              })
        }
        confirmLabel={
          action.type === "reopen"
            ? t("dialogs.reopen_confirm_action")
            : t("dialogs.force_close_warning_action")
        }
        onConfirm={onConfirm}
        onOpenChange={(open) => !open && onClose()}
        variant={action.type === "force_close" ? "destructive" : "default"}
      />
    </AlertDialog>
  );
}
