"use client"

import * as React from "react"

import type { TaskWithAvatar } from "@/lib/api/tasks"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

import { PreviewPane } from "./preview-pane"
import type { TFn } from "./_shared"

export interface ReviewSheetProps {
  task: TaskWithAvatar | null
  open: boolean
  onClose: () => void
  comment: string
  onCommentChange: (v: string) => void
  commentError: boolean
  onApprove: () => void
  onReject: () => void
  isApproving: boolean
  isRejecting: boolean
  onOpenFull: () => void
  t: TFn
  locale: string
}

export function ReviewSheet({
  task,
  open,
  onClose,
  comment,
  onCommentChange,
  commentError,
  onApprove,
  onReject,
  isApproving,
  isRejecting,
  onOpenFull,
  t,
  locale,
}: ReviewSheetProps) {
  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:w-[500px] p-0 flex flex-col">
        <SheetHeader className="px-4 pt-4 pb-2 border-b">
          <SheetTitle className="text-sm text-left">{task?.title ?? ""}</SheetTitle>
        </SheetHeader>
        <ScrollArea className="flex-1 px-4 py-3">
          {task && (
            <PreviewPane
              task={task}
              comment={comment}
              onCommentChange={onCommentChange}
              commentError={commentError}
              onApprove={onApprove}
              onReject={onReject}
              isApproving={isApproving}
              isRejecting={isRejecting}
              onOpenFull={onOpenFull}
              t={t}
              locale={locale}
            />
          )}
        </ScrollArea>
        {/* Sticky mobile buttons */}
        {task && (
          <div className="border-t p-3 flex gap-2">
            <Button
              variant="destructive"
              className="flex-1 h-12"
              onClick={onReject}
              disabled={isRejecting || isApproving}
            >
              {t("btn_reject_short")}
            </Button>
            <Button
              className="flex-1 h-12 bg-success text-success-foreground hover:bg-success/90"
              onClick={onApprove}
              disabled={isApproving || isRejecting}
            >
              {t("btn_approve_short")}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
