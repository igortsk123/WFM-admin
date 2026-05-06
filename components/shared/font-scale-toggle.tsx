"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { Type, Check } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

type FontScale = "M" | "L" | "XL"

const STORAGE_KEY = "wfm-font-scale"

/** Применяет масштаб к <html data-font-scale=...>. Идемпотентно. */
function applyScale(scale: FontScale) {
  if (typeof document === "undefined") return
  if (scale === "M") {
    document.documentElement.removeAttribute("data-font-scale")
  } else {
    document.documentElement.setAttribute("data-font-scale", scale)
  }
}

/**
 * Аccessibility toggle для размера шрифта в TopBar.
 * 3 уровня: M (16px дефолт) / L (+10%) / XL (+20%).
 * Persist в localStorage. Применяется без reload.
 *
 * Hydration-safe: на сервере рендерим без значения, hydrate'имся в useEffect.
 */
export function FontScaleToggle() {
  const t = useTranslations("nav.font_scale")
  const [scale, setScale] = useState<FontScale>("M")
  const [hydrated, setHydrated] = useState(false)

  // Hydrate из localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as FontScale | null
      if (stored === "L" || stored === "XL") {
        setScale(stored)
        applyScale(stored)
      }
    } catch {
      // localStorage может быть недоступен (private mode и т.д.)
    }
    setHydrated(true)
  }, [])

  function changeScale(next: FontScale) {
    setScale(next)
    applyScale(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // ignore
    }
  }

  return (
    <DropdownMenu>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-9 relative"
                aria-label={t("aria_label")}
              >
                <Type className="size-4" />
                {hydrated && scale !== "M" && (
                  <span className="absolute -bottom-0.5 -right-0.5 text-[9px] font-bold leading-none bg-primary text-primary-foreground rounded-full size-3.5 flex items-center justify-center">
                    {scale === "L" ? "+" : "++"}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>{t("tooltip")}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>{t("label")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => changeScale("M")}>
          <span className={cn("text-sm flex-1", scale === "M" && "font-medium")}>
            {t("m")}
          </span>
          {scale === "M" && <Check className="size-4 ml-2" />}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => changeScale("L")}>
          <span className={cn("flex-1", scale === "L" && "font-medium")} style={{ fontSize: "1rem" }}>
            {t("l")}
          </span>
          {scale === "L" && <Check className="size-4 ml-2" />}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => changeScale("XL")}>
          <span className={cn("flex-1", scale === "XL" && "font-medium")} style={{ fontSize: "1.1rem" }}>
            {t("xl")}
          </span>
          {scale === "XL" && <Check className="size-4 ml-2" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * Hydration script — выполняется до первого render'а чтобы не было FOUC
 * (вспышки немасштабированного текста для пользователей с L/XL preference).
 *
 * Use в app/layout.tsx через `<script dangerouslySetInnerHTML>`.
 */
export const FONT_SCALE_HYDRATE_SCRIPT = `(function(){try{var s=localStorage.getItem('${STORAGE_KEY}');if(s==='L'||s==='XL'){document.documentElement.setAttribute('data-font-scale',s);}}catch(e){}})();`
