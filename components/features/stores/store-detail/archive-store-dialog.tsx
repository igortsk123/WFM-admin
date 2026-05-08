"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"

import type { ArchiveReason } from "@/lib/types"
import { archiveStore } from "@/lib/api"

import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { ARCHIVE_REASONS } from "./_shared"

interface ArchiveStoreDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  storeId: number
  onArchived: () => void
}

export function ArchiveStoreDialog({ open, onOpenChange, storeId, onArchived }: ArchiveStoreDialogProps) {
  const t = useTranslations("screen.storeDetail")
  const [reason, setReason] = useState<ArchiveReason>("OTHER")
  const [loading, setLoading] = useState(false)

  async function handleArchive() {
    setLoading(true)
    try {
      await archiveStore(storeId, reason)
      toast.success(t("toast.archived"))
      onArchived()
      onOpenChange(false)
    } catch {
      toast.error(t("toast.error"))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("dialogs.archive_title")}</AlertDialogTitle>
          <AlertDialogDescription>{t("dialogs.archive_description")}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-2">
          <Label className="mb-2 block text-sm">{t("dialogs.archive_reason_label")}</Label>
          <Select value={reason} onValueChange={(v) => setReason(v as ArchiveReason)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ARCHIVE_REASONS.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {t(`dialogs.${r.labelKey}` as Parameters<typeof t>[0])}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <AlertDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Отмена</Button>
          <Button variant="destructive" onClick={handleArchive} disabled={loading}>
            {loading ? "Архивирование..." : t("actions.archive")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
