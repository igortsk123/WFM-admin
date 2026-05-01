"use client"

import * as React from "react"
import { Pencil, Check, X } from "lucide-react"
import { useTranslations } from "next-intl"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface TouchInlineEditProps {
  value: string
  onSave: (newValue: string) => void | Promise<void>
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function TouchInlineEdit({
  value,
  onSave,
  placeholder,
  disabled = false,
  className,
}: TouchInlineEditProps) {
  const t = useTranslations("common")
  const [editing, setEditing] = React.useState(false)
  const [draft, setDraft] = React.useState(value)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const longPressTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(() => {
    if (editing) {
      setDraft(value)
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing, value])

  function startEdit() {
    if (!disabled) setEditing(true)
  }

  function cancel() {
    setEditing(false)
    setDraft(value)
  }

  async function save() {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== value) {
      await onSave(trimmed)
    }
    setEditing(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") save()
    if (e.key === "Escape") cancel()
  }

  // Long-press handlers for mobile
  function handleTouchStart() {
    if (disabled) return
    longPressTimer.current = setTimeout(() => startEdit(), 500)
  }

  function handleTouchEnd() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  if (editing) {
    return (
      <div className={cn("flex items-center gap-1.5", className)}>
        <Input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={cancel}
          placeholder={placeholder}
          className="h-8 text-sm"
          aria-label={t("edit")}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 shrink-0 text-success hover:text-success"
          onMouseDown={(e) => { e.preventDefault(); save() }}
          aria-label={t("save")}
        >
          <Check className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 shrink-0 text-muted-foreground"
          onMouseDown={(e) => { e.preventDefault(); cancel() }}
          aria-label={t("cancel")}
        >
          <X className="size-4" />
        </Button>
      </div>
    )
  }

  return (
    <div
      className={cn("flex items-center gap-1.5 group min-h-[44px] md:min-h-0", className)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchEnd}
    >
      <span className="text-sm text-foreground">{value || placeholder}</span>

      {!disabled && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            "size-8 shrink-0 text-muted-foreground hover:text-foreground transition-opacity",
            // Always visible on mobile, hover-only on desktop
            "opacity-100 md:opacity-0 md:group-hover:opacity-100"
          )}
          onClick={startEdit}
          aria-label={t("edit")}
        >
          <Pencil className="size-3.5" />
        </Button>
      )}
    </div>
  )
}
