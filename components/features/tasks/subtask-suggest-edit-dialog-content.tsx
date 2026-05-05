"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

interface Props {
  currentText: string
  onSubmit: (newText: string) => void
  onClose: () => void
}

export function SubtaskSuggestEditDialogContent({ currentText, onSubmit, onClose }: Props) {
  const t = useTranslations("screen.taskDetail.subtask_suggest_edit")
  const [text, setText] = useState(currentText)
  const canSubmit = text.trim().length >= 3 && text.trim() !== currentText.trim()

  return (
    <DialogContent className="sm:max-w-[500px]">
      <DialogHeader>
        <DialogTitle>{t("title")}</DialogTitle>
        <DialogDescription>{t("description")}</DialogDescription>
      </DialogHeader>
      <div className="space-y-3">
        <div>
          <Label className="text-xs text-muted-foreground">{t("current_label")}</Label>
          <p className="text-sm mt-1 p-2 bg-muted/40 rounded">{currentText}</p>
        </div>
        <div>
          <Label htmlFor="suggest-text" className="text-xs">{t("new_label")}</Label>
          <Textarea
            id="suggest-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            placeholder={t("placeholder")}
            className="mt-1"
          />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>{t("cancel")}</Button>
        <Button
          disabled={!canSubmit}
          onClick={() => {
            onSubmit(text.trim())
          }}
        >
          {t("submit")}
        </Button>
      </div>
    </DialogContent>
  )
}
