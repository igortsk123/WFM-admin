"use client";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { REJECT_REASONS, type TFn, type TCommonFn } from "./_shared";

export interface RejectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason: string;
  onReasonChange: (reason: string) => void;
  comment: string;
  onCommentChange: (comment: string) => void;
  onConfirm: () => void;
  t: TFn;
  tCommon: TCommonFn;
}

export function RejectDialog({
  open,
  onOpenChange,
  reason,
  onReasonChange,
  comment,
  onCommentChange,
  onConfirm,
  t,
  tCommon,
}: RejectDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("reject_dialog.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("reject_dialog.message")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label className="text-sm font-medium mb-2 block">
              {t("reject_dialog.reason_label")}
            </Label>
            <RadioGroup value={reason} onValueChange={onReasonChange}>
              {REJECT_REASONS.map((r) => (
                <div key={r} className="flex items-center space-x-2">
                  <RadioGroupItem value={r} id={r} />
                  <Label htmlFor={r}>
                    {t(`reject_dialog.reasons.${r}` as Parameters<typeof t>[0])}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
          <div>
            <Label className="text-sm font-medium mb-2 block">
              {t("reject_dialog.comment_label")}
            </Label>
            <Textarea
              placeholder={t("reject_dialog.comment_placeholder")}
              value={comment}
              onChange={(e) => onCommentChange(e.target.value)}
              rows={2}
            />
          </div>
        </div>
        <AlertDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tCommon("cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={!reason || comment.length < 10}
          >
            {t("actions.reject")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
