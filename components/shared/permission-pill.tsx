"use client"

import { useTranslations } from "next-intl"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { Permission } from "@/lib/types"

interface PermissionPillProps {
  permission: Permission
  className?: string
}

const PERMISSION_STYLES: Record<Permission, string> = {
  CASHIER:         "bg-info/10 text-info border-info/20",
  SALES_FLOOR:     "bg-accent text-accent-foreground border-transparent",
  SELF_CHECKOUT:   "bg-primary/10 text-primary border-primary/20",
  WAREHOUSE:       "bg-warning/10 text-warning border-warning/20",
  PRODUCTION_LINE: "bg-muted text-muted-foreground border-transparent",
}

const PERMISSION_KEY: Record<Permission, string> = {
  CASHIER:         "cashier",
  SALES_FLOOR:     "sales_floor",
  SELF_CHECKOUT:   "self_checkout",
  WAREHOUSE:       "warehouse",
  PRODUCTION_LINE: "production_line",
}

export function PermissionPill({ permission, className }: PermissionPillProps) {
  const t = useTranslations("permission")

  return (
    <Badge
      className={cn(
        "rounded-md px-2 py-0.5 text-xs font-medium",
        PERMISSION_STYLES[permission],
        className
      )}
    >
      {t(PERMISSION_KEY[permission])}
    </Badge>
  )
}
