"use client";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { REJECT_REASONS, type TFn, type TCommonFn } from "./_shared";

export interface BulkActionBarProps {
  selectedCount: number;
  bulkRejectDialogOpen: boolean;
  onBulkRejectDialogOpenChange: (open: boolean) => void;
  rejectReason: string;
  onRejectReasonChange: (reason: string) => void;
  rejectComment: string;
  onRejectCommentChange: (comment: string) => void;
  onBulkAccept: () => void;
  onBulkReject: () => void;
  t: TFn;
  tCommon: TCommonFn;
}

export function BulkActionBar({
  selectedCount,
  bulkRejectDialogOpen,
  onBulkRejectDialogOpenChange,
  rejectReason,
  onRejectReasonChange,
  rejectComment,
  onRejectCommentChange,
  onBulkAccept,
  onBulkReject,
  t,
  tCommon,
}: BulkActionBarProps) {
  return (
    <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
      <span className="text-sm font-medium">
        {tCommon("selected")}: {selectedCount}
      </span>
      <div className="flex items-center gap-2 ml-auto">
        <Button
          size="sm"
          className="bg-success hover:bg-success/90 text-success-foreground"
          onClick={onBulkAccept}
        >
          {t("actions.bulk_accept")}
        </Button>
        <AlertDialog
          open={bulkRejectDialogOpen}
          onOpenChange={onBulkRejectDialogOpenChange}
        >
          <AlertDialogTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className="text-destructive hover:text-destructive"
            >
              {t("actions.bulk_reject")}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t("bulk_reject_dialog.title", { count: selectedCount })}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t("bulk_reject_dialog.message")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-4 py-4">
              <RadioGroup value={rejectReason} onValueChange={onRejectReasonChange}>
                {REJECT_REASONS.map((reason) => (
                  <div key={reason} className="flex items-center space-x-2">
                    <RadioGroupItem value={reason} id={`bulk-${reason}`} />
                    <Label htmlFor={`bulk-${reason}`}>
                      {t(
                        `reject_dialog.reasons.${reason}` as Parameters<typeof t>[0]
                      )}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
              <Textarea
                placeholder={t("reject_dialog.comment_placeholder")}
                value={rejectComment}
                onChange={(e) => onRejectCommentChange(e.target.value)}
                rows={2}
              />
            </div>
            <AlertDialogFooter>
              <Button
                variant="outline"
                onClick={() => onBulkRejectDialogOpenChange(false)}
              >
                {tCommon("cancel")}
              </Button>
              <Button
                variant="destructive"
                onClick={onBulkReject}
                disabled={!rejectReason}
              >
                {t("actions.reject")}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
