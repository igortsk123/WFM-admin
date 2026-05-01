"use client"

import * as React from "react"
import { Filter } from "lucide-react"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

interface MobileFilterSheetProps {
  activeCount: number
  onClearAll: () => void
  onApply: () => void
  children: React.ReactNode
  className?: string
}

export function MobileFilterSheet({
  activeCount,
  onClearAll,
  onApply,
  children,
  className,
}: MobileFilterSheetProps) {
  const t = useTranslations("common")
  const [open, setOpen] = React.useState(false)

  // Render null on ≥ md (CSS handles it, but we also skip DOM on large screens)
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {/* Visible only on mobile */}
        <Button
          variant="outline"
          className={cn("md:hidden w-full justify-start gap-2 h-11", className)}
          aria-label={activeCount > 0 ? `${t("filters")} (${activeCount})` : t("filters")}
        >
          <Filter className="size-4 shrink-0" aria-hidden="true" />
          <span>
            {t("filters")}
            {activeCount > 0 && (
              <span className="ml-1 inline-flex items-center justify-center size-5 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                {activeCount}
              </span>
            )}
          </span>
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="w-full max-w-md flex flex-col p-0" showCloseButton={false}>
        <SheetHeader className="flex flex-row items-center justify-between border-b px-4 py-3">
          <SheetTitle className="text-base">
            {t("filters")}
            {activeCount > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({activeCount})
              </span>
            )}
          </SheetTitle>
          <SheetClose asChild>
            <Button variant="ghost" size="icon" className="size-8" aria-label={t("close")}>
              <span aria-hidden="true" className="text-lg leading-none">&times;</span>
            </Button>
          </SheetClose>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {children}
        </div>

        <SheetFooter className="flex flex-row gap-2 border-t px-4 py-3">
          <Button
            variant="ghost"
            className="flex-1 h-11"
            onClick={() => {
              onClearAll()
            }}
          >
            {t("clearAll")}
          </Button>
          <Button
            className="flex-1 h-11"
            onClick={() => {
              onApply()
              setOpen(false)
            }}
          >
            {t("apply")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
