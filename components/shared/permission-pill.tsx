"use client"

import { useTranslations } from "next-intl"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { StoreZone } from "@/lib/types"

interface PermissionPillProps {
  permission: StoreZone
  className?: string
}

const ZONE_STYLES: Record<StoreZone, string> = {
  CASHIER:    "bg-info/10 text-info border-info/20",
  SALES_FLOOR:"bg-accent text-accent-foreground border-transparent",
  WAREHOUSE:  "bg-warning/10 text-warning border-warning/20",
  OFFICE:     "bg-muted text-muted-foreground border-transparent",
  PRODUCTION: "bg-primary/10 text-primary border-primary/20",
  RECEIVING:  "bg-muted text-muted-foreground border-transparent",
  CLEANING:   "bg-muted text-muted-foreground border-transparent",
}

const ZONE_KEY: Record<StoreZone, string> = {
  CASHIER:    "cashier",
  SALES_FLOOR:"sales_floor",
  WAREHOUSE:  "warehouse",
  OFFICE:     "office",
  PRODUCTION: "production",
  RECEIVING:  "receiving",
  CLEANING:   "cleaning",
}

export function PermissionPill({ permission, className }: PermissionPillProps) {
  const t = useTranslations("permission.zones")

  return (
    <Badge
      className={cn(
        "rounded-md px-2 py-0.5 text-xs font-medium",
        ZONE_STYLES[permission],
        className
      )}
    >
      {t(ZONE_KEY[permission])}
    </Badge>
  )
}
