"use client"

import { AlertCircle } from "lucide-react"

import { cn } from "@/lib/utils"
import { formatLamaSync } from "./_shared"

interface LamaSyncCellProps {
  lama_synced_at?: string
}

export function LamaSyncCell({ lama_synced_at }: LamaSyncCellProps) {
  const { label, level } = formatLamaSync(lama_synced_at)
  return (
    <div className="flex items-center gap-1.5">
      {level === "critical" && (
        <AlertCircle className="size-3.5 text-destructive shrink-0" aria-hidden="true" />
      )}
      <span
        className={cn(
          "text-xs",
          level === "fresh" && "text-success",
          level === "stale" && "text-warning",
          level === "critical" && "text-destructive",
          level === "never" && "text-muted-foreground",
        )}
      >
        {label}
      </span>
    </div>
  )
}
