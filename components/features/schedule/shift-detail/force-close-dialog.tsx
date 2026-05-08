"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ForceCloseDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  hasActiveTasks: boolean;
  onConfirm: () => Promise<void>;
}

export function ForceCloseDialog({
  open,
  onOpenChange,
  hasActiveTasks,
  onConfirm,
}: ForceCloseDialogProps) {
  const t = useTranslations("screen.shiftDetail");
  const tc = useTranslations("common");
  const [saving, setSaving] = useState(false);

  async function handleConfirm() {
    setSaving(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("dialogs.force_close_title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {hasActiveTasks
              ? "На смене есть задачи в работе. Они будут переведены в PAUSED. Точно закрыть?"
              : t("dialogs.force_close_description")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {hasActiveTasks && (
          <Alert variant="destructive" className="py-2">
            <AlertTriangle className="size-4" />
            <AlertDescription className="text-sm">
              Активные задачи перейдут в статус «На паузе».
            </AlertDescription>
          </Alert>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={saving}>{tc("cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={saving}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {saving ? tc("loading") : t("dialogs.force_close_confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
