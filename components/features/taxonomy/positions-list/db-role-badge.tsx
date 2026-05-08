"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface DbRoleBadgeProps {
  roleId: 1 | 2;
}

export function DbRoleBadge({ roleId }: DbRoleBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-xs font-medium",
        roleId === 1
          ? "bg-muted text-muted-foreground border-transparent"
          : "bg-info/10 text-info border-info/20"
      )}
    >
      {roleId === 1 ? "WORKER" : "MANAGER"}
    </Badge>
  );
}
