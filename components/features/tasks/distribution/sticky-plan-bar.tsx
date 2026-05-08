"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { Wand2, RotateCcw, CheckCircle2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

import { formatHM } from "./_utils"

// ─────────────────────────────────────────────────────────────────────────────
// StickyPlanBar — нижняя панель «N задач в плане → подтвердить/сбросить»
// Показывается только когда план непустой.
// ─────────────────────────────────────────────────────────────────────────────

export interface StickyPlanBarProps {
  taskCount: number
  totalMinutes: number
  isConfirming: boolean
  canEdit: boolean
  onConfirm: () => void
  onReset: () => void
  t: ReturnType<typeof useTranslations>
}

export function StickyPlanBar({
  taskCount, totalMinutes, isConfirming, canEdit, onConfirm, onReset, t,
}: StickyPlanBarProps) {
  if (taskCount === 0) return null

  // bottom-16 на mobile (64px) чтобы не перекрываться с MobileBottomNav (h-16, fixed),
  // bottom-0 на md+ (нет mobile nav)
  return (
    <div className="sticky bottom-16 md:bottom-0 -mx-4 md:-mx-6 px-4 md:px-6 py-3 bg-card/95 backdrop-blur border-t shadow-lg z-30">
      <div className="flex items-center gap-2 sm:gap-3">
        <Wand2 className="size-4 text-primary shrink-0" />
        <span className="text-xs sm:text-sm font-medium truncate min-w-0 flex-1">
          {t("plan_bar.summary", {
            tasks: taskCount,
            time: formatHM(totalMinutes, t),
          })}
        </span>
        {/* Reset: на узких icon-only с tooltip; sm+ обычная */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={onReset}
                disabled={isConfirming}
                className="shrink-0 gap-1.5"
                aria-label={t("plan_bar.reset")}
              >
                <RotateCcw className="size-3.5" />
                <span className="hidden sm:inline">{t("plan_bar.reset")}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent className="sm:hidden">{t("plan_bar.reset")}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <Button
          size="sm"
          onClick={onConfirm}
          disabled={!canEdit || isConfirming}
          className="shrink-0 gap-1.5"
        >
          <CheckCircle2 className="size-3.5" />
          <span>{isConfirming ? t("plan_bar.confirming") : t("plan_bar.confirm")}</span>
        </Button>
      </div>
    </div>
  )
}
