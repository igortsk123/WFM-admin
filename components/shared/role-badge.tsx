"use client"

import { useTranslations } from "next-intl"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { FunctionalRole } from "@/lib/types"

interface RoleBadgeProps {
  role: FunctionalRole
  size?: "sm" | "md"
  className?: string
}

const ROLE_STYLES: Record<FunctionalRole, string> = {
  NETWORK_OPS:    "bg-primary/10 text-primary border-primary/20",
  REGIONAL:       "bg-primary/10 text-primary border-primary/20",
  SUPERVISOR:     "bg-info/10 text-info border-info/20",
  STORE_DIRECTOR: "bg-info/10 text-info border-info/20",
  HR_MANAGER:     "bg-success/10 text-success border-success/20",
  OPERATOR:       "bg-accent text-accent-foreground border-transparent",
  WORKER:         "bg-muted text-muted-foreground border-transparent",
  AGENT:          "bg-warning/10 text-warning border-warning/20",
  PLATFORM_ADMIN: "bg-primary text-primary-foreground border-transparent",
}

const ROLE_KEY: Record<FunctionalRole, string> = {
  NETWORK_OPS:    "network_ops",
  REGIONAL:       "regional",
  SUPERVISOR:     "supervisor",
  STORE_DIRECTOR: "store_director",
  HR_MANAGER:     "hr_manager",
  OPERATOR:       "operator",
  WORKER:         "worker",
  AGENT:          "agent",
  PLATFORM_ADMIN: "platform_admin",
}

export function RoleBadge({ role, size = "md", className }: RoleBadgeProps) {
  const t = useTranslations("role.functional")

  return (
    <Badge
      className={cn(
        ROLE_STYLES[role],
        size === "sm" && "px-1.5 py-0 text-[11px]",
        className
      )}
    >
      {t(ROLE_KEY[role])}
    </Badge>
  )
}
