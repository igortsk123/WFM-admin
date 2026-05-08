"use client"

import * as React from "react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import type { TFn } from "./_shared"

export interface HotkeysDialogProps {
  open: boolean
  onClose: () => void
  t: TFn
}

export function HotkeysDialog({ open, onClose, t }: HotkeysDialogProps) {
  const hotkeys = [
    t("hotkey_navigate"),
    t("hotkey_approve"),
    t("hotkey_reject"),
    t("hotkey_open"),
    t("hotkey_clear"),
    t("hotkey_help"),
  ]
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("hotkeys_title")}</DialogTitle>
        </DialogHeader>
        <ul className="flex flex-col gap-2">
          {hotkeys.map((h) => (
            <li key={h} className="text-sm text-muted-foreground">{h}</li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  )
}
