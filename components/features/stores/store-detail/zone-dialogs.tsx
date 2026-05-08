"use client"

import { useTranslations } from "next-intl"

import type { StoreZoneWithCounts } from "@/lib/api"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export interface ZoneDialogState {
  mode: "add" | "edit"
  zone?: StoreZoneWithCounts
}

interface ZoneFormDialogProps {
  state: ZoneDialogState | null
  form: { name: string; code: string }
  saving: boolean
  onChange: (form: { name: string; code: string }) => void
  onClose: () => void
  onSubmit: () => void
}

export function ZoneFormDialog({
  state,
  form,
  saving,
  onChange,
  onClose,
  onSubmit,
}: ZoneFormDialogProps) {
  const t = useTranslations("screen.storeDetail")
  const tCommon = useTranslations("common")

  return (
    <Dialog open={state !== null} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{state?.mode === "edit" ? t("zones.dialog_edit_title") : t("zones.dialog_add_title")}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="zone-name">{t("zones.field_name")}</Label>
            <Input
              id="zone-name"
              value={form.name}
              onChange={(e) => onChange({ ...form, name: e.target.value })}
              placeholder={t("zones.field_name_placeholder")}
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="zone-code">{t("zones.field_code")}</Label>
            <Input
              id="zone-code"
              value={form.code}
              onChange={(e) => onChange({ ...form, code: e.target.value })}
              placeholder={t("zones.field_code_placeholder")}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            {tCommon("cancel")}
          </Button>
          <Button onClick={onSubmit} disabled={saving || !form.name.trim()}>
            {tCommon("save")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface ZoneDeleteDialogProps {
  zoneId: number | null
  onClose: () => void
  onConfirm: (zoneId: number) => void
}

export function ZoneDeleteDialog({ zoneId, onClose, onConfirm }: ZoneDeleteDialogProps) {
  const t = useTranslations("screen.storeDetail")
  const tCommon = useTranslations("common")

  return (
    <AlertDialog open={zoneId !== null} onOpenChange={(v) => !v && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("zones.delete_dialog_title")}</AlertDialogTitle>
          <AlertDialogDescription>{t("zones.delete_dialog_desc")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => zoneId !== null && onConfirm(zoneId)}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {t("zones.delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
