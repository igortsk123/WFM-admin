"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

import { AlertDialog } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// NOTE: ConfirmDialog doesn't support an input field,
// so BlockDialogWithReason has a custom UI for the reason textarea.

interface BlockDialogWithReasonProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: (reason: string) => Promise<void>;
  t: ReturnType<typeof useTranslations>;
  tc: ReturnType<typeof useTranslations>;
}

export function BlockDialogWithReason({
  open,
  onOpenChange,
  onConfirm,
  t,
  tc,
}: BlockDialogWithReasonProps) {
  const [reason, setReason] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const isValid = reason.trim().length >= 10;

  async function handleConfirm() {
    if (!isValid) return;
    setBusy(true);
    await onConfirm(reason.trim());
    setBusy(false);
    setReason("");
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("block_dialog.title")}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        {/* Overlay */}
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm"
          onClick={() => onOpenChange(false)}
          aria-hidden="true"
        />
        <div className="relative z-50 w-full max-w-sm rounded-xl border border-border bg-card shadow-xl p-6 flex flex-col gap-4">
          <h2 className="text-base font-semibold text-foreground">{t("block_dialog.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("block_dialog.description")}</p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="block-reason">{t("block_dialog.reason_label")}</Label>
            <Textarea
              id="block-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t("block_dialog.reason_placeholder")}
              rows={3}
            />
            {reason.length > 0 && !isValid && (
              <p className="text-xs text-destructive">Минимум 10 символов</p>
            )}
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              {tc("cancel")}
            </Button>
            <Button variant="destructive" onClick={handleConfirm} disabled={!isValid || busy}>
              {busy ? "..." : t("block_dialog.confirm")}
            </Button>
          </div>
        </div>
      </div>
    </AlertDialog>
  );
}
