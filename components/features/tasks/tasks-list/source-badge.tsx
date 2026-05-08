"use client"

import { Sparkles } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import type { TaskWithAvatar } from "@/lib/api/tasks"

interface SourceBadgeProps {
  task: TaskWithAvatar
  onAiClick?: (suggestionId: string) => void
}

export function SourceBadge({ task, onAiClick }: SourceBadgeProps) {
  if (task.source === "AI") {
    return (
      <Badge
        className="bg-primary/10 text-primary border-primary/20 gap-1 cursor-pointer hover:bg-primary/20 transition-colors"
        onClick={() => task.ai_suggestion_id && onAiClick?.(task.ai_suggestion_id)}
        role="button"
        tabIndex={0}
      >
        <Sparkles className="size-3" />
        ИИ
      </Badge>
    )
  }
  if (task.source === "PLANNED") {
    return <Badge className="bg-info/10 text-info border-info/20">Плановая</Badge>
  }
  return <Badge variant="secondary">Менеджер</Badge>
}
