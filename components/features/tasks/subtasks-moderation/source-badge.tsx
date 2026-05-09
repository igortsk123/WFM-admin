"use client"

import { useTranslations } from "next-intl"
import { User, UserCog } from "lucide-react"

import type { OperationSuggestionSource } from "@/lib/types"

interface SourceBadgeProps {
  source?: OperationSuggestionSource
}

export function SourceBadge({ source }: SourceBadgeProps) {
  const t = useTranslations("screen.subtasksModeration.source")

  if (source === "worker") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-primary bg-primary/10 border border-primary/20 rounded-full px-2 py-0.5">
        <User className="size-3 shrink-0" />
        {t("worker")}
      </span>
    )
  }

  if (source === "store_director") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-foreground bg-muted border border-border rounded-full px-2 py-0.5">
        <UserCog className="size-3 shrink-0" />
        {t("store_director")}
      </span>
    )
  }

  return null
}
