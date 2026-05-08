"use client"

import * as React from "react"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface BlockDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  onConfirm: (reason: string) => Promise<void>
  isLoading: boolean
}

export function BlockDialog({ open, onOpenChange, onConfirm, isLoading }: BlockDialogProps) {
  const t = useTranslations("screen.freelanceAgents")
  const [reason, setReason] = React.useState("")

  React.useEffect(() => {
    if (!open) setReason("")
  }, [open])

  async function handleConfirm() {
    if (reason.trim().length < 5) return
    await onConfirm(reason.trim())
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("block_dialog.title")}</AlertDialogTitle>
          <AlertDialogDescription>{t("block_dialog.description")}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="block-reason">{t("block_dialog.reason_label")}</Label>
          <textarea
            id="block-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t("block_dialog.reason_placeholder")}
            rows={3}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none min-h-[80px]"
          />
        </div>
        <AlertDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("block_dialog.cancel")}
          </Button>
          <Button
            variant="destructive"
            disabled={reason.trim().length < 5 || isLoading}
            onClick={handleConfirm}
          >
            {t("block_dialog.confirm")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
