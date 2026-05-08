"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";

interface ReasonDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  label: string;
  placeholder: string;
  confirmLabel: string;
  warning?: string;
  onConfirm: (reason: string) => Promise<void>;
  isMobile?: boolean;
}

export function ReasonDialog({
  open,
  onOpenChange,
  title,
  label,
  placeholder,
  confirmLabel,
  warning,
  onConfirm,
  isMobile,
}: ReasonDialogProps) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const t = useTranslations("common");

  async function handleConfirm() {
    setSaving(true);
    try {
      await onConfirm(reason);
      setReason("");
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  const body = (
    <div className="space-y-3">
      {warning && (
        <Alert variant="destructive" className="py-2">
          <AlertTriangle className="size-4" />
          <AlertDescription className="text-sm">{warning}</AlertDescription>
        </Alert>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="reason-input" className="text-sm font-medium">
          {label}
        </Label>
        <Textarea
          id="reason-input"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="resize-none"
        />
      </div>
    </div>
  );

  const actions = (
    <>
      <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
        {t("cancel")}
      </Button>
      <Button onClick={handleConfirm} disabled={!reason.trim() || saving}>
        {saving ? t("loading") : confirmLabel}
      </Button>
    </>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="rounded-t-2xl pb-8">
          <SheetHeader className="mb-4">
            <SheetTitle>{title}</SheetTitle>
          </SheetHeader>
          {body}
          <SheetFooter className="mt-4 flex-row gap-2">{actions}</SheetFooter>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {body}
        <DialogFooter>{actions}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
