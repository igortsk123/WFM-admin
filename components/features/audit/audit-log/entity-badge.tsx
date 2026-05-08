"use client";

import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import { ENTITY_TYPE_STYLES } from "./_shared";

interface EntityBadgeProps {
  type: string;
  label?: string;
}

export function EntityBadge({ type, label }: EntityBadgeProps) {
  const style =
    ENTITY_TYPE_STYLES[type] ?? "bg-muted text-muted-foreground border-border";
  return (
    <Badge variant="outline" className={cn("text-xs font-medium shrink-0", style)}>
      {label ?? type}
    </Badge>
  );
}
