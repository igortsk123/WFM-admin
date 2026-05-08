"use client"

import { useState, useEffect, useRef } from "react"
import { useTranslations } from "next-intl"
import { CheckCircle2, Pencil, XCircle } from "lucide-react"

import { Button } from "@/components/ui/button"

interface TitleInlineEditButtonProps {
  title: string
  onSave: (v: string) => void
}

export function TitleInlineEditButton({ title, onSave }: TitleInlineEditButtonProps) {
  const tCommon = useTranslations("common")
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(title)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      setDraft(title)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [editing, title])

  function save() {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== title) onSave(trimmed)
    setEditing(false)
  }

  function cancel() {
    setEditing(false)
    setDraft(title)
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1.5 -ml-2">
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel() }}
          onBlur={cancel}
          className="text-2xl font-semibold bg-transparent border-b-2 border-primary outline-none px-1 min-w-64 text-foreground"
          aria-label={tCommon("edit")}
        />
        <Button type="button" variant="ghost" size="icon" className="size-7 text-success" onMouseDown={(e) => { e.preventDefault(); save() }}>
          <CheckCircle2 className="size-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="size-7 text-muted-foreground" onMouseDown={(e) => { e.preventDefault(); cancel() }}>
          <XCircle className="size-4" />
        </Button>
      </div>
    )
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
      onClick={() => setEditing(true)}
      aria-label={tCommon("edit")}
    >
      <Pencil className="size-3.5" />
    </Button>
  )
}
