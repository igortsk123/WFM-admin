"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { TaskState } from "@/lib/types"

interface StatusOverrideDialogContentProps {
  currentState: TaskState
  onOverride: (newState: TaskState, justification: string) => Promise<void>
  onClose: () => void
  isPending?: boolean
}

const ALL_STATES: TaskState[] = ["NEW", "IN_PROGRESS", "PAUSED", "COMPLETED"]

export function StatusOverrideDialogContent({
  currentState,
  onOverride,
  onClose,
  isPending,
}: StatusOverrideDialogContentProps) {
  const t = useTranslations("screen.taskDetail")
  const tCommon = useTranslations("common")
  const tState = useTranslations("task.state")
  const [newState, setNewState] = useState<TaskState>(currentState)
  const [justification, setJustification] = useState("")
  const isValid = justification.trim().length >= 10

  async function handleSubmit() {
    if (!isValid) return
    await onOverride(newState, justification.trim())
    onClose()
  }

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{t("status_override_dialog_title")}</DialogTitle>
        <DialogDescription>{t("status_override_dialog_desc")}</DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-4 py-2">
        <div className="flex flex-col gap-1.5">
          <Label>{tCommon("status")}</Label>
          <Select value={newState} onValueChange={(v) => setNewState(v as TaskState)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ALL_STATES.map((s) => (
                <SelectItem key={s} value={s}>
                  {tState(s.toLowerCase() as Parameters<typeof tState>[0])}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="override-justification">{t("status_override_justification_label")}</Label>
          <Textarea
            id="override-justification"
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            placeholder={t("status_override_justification_placeholder")}
            rows={3}
            className="resize-none"
          />
        </div>
      </div>

      <DialogFooter className="gap-2">
        <Button variant="outline" onClick={onClose} disabled={isPending}>
          {tCommon("cancel")}
        </Button>
        <Button onClick={handleSubmit} disabled={!isValid || isPending}>
          {t("status_override_submit")}
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}
