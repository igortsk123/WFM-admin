"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

interface SubtaskAddDialogContentProps {
  onAdd: (name: string, hint?: string) => Promise<void>
  onClose: () => void
  isPending?: boolean
}

export function SubtaskAddDialogContent({ onAdd, onClose, isPending }: SubtaskAddDialogContentProps) {
  const t = useTranslations("screen.taskDetail")
  const tCommon = useTranslations("common")
  const [name, setName] = useState("")
  const [hint, setHint] = useState("")
  const isValid = name.trim().length > 0

  async function handleSubmit() {
    if (!isValid) return
    await onAdd(name.trim(), hint.trim() || undefined)
    onClose()
  }

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{t("subtask_add_dialog_title")}</DialogTitle>
      </DialogHeader>

      <div className="flex flex-col gap-4 py-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="subtask-name">{t("subtask_name_label")}</Label>
          <Input
            id="subtask-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("subtask_name_placeholder")}
            onKeyDown={(e) => { if (e.key === "Enter") handleSubmit() }}
            autoFocus
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="subtask-hint">{t("subtask_hint_label")}</Label>
          <Textarea
            id="subtask-hint"
            value={hint}
            onChange={(e) => setHint(e.target.value)}
            placeholder={t("subtask_hint_placeholder")}
            rows={2}
            className="resize-none"
          />
        </div>
      </div>

      <DialogFooter className="gap-2">
        <Button variant="outline" onClick={onClose} disabled={isPending}>
          {tCommon("cancel")}
        </Button>
        <Button onClick={handleSubmit} disabled={!isValid || isPending}>
          {t("subtask_add_submit")}
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}
