"use client";

import { Box } from "lucide-react";

import { ICON_OPTIONS } from "./_shared";

interface ZoneIconProps {
  icon: string;
  className?: string;
}

export function ZoneIcon({ icon, className = "size-5" }: ZoneIconProps) {
  const found = ICON_OPTIONS.find((o) => o.value === icon);
  if (!found) return <Box className={className} />;
  const { Icon } = found;
  return <Icon className={className} />;
}
