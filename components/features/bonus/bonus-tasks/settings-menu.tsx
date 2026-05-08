"use client";

import { useTranslations } from "next-intl";
import { CheckCircle2, MoreVertical } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { updateBonusVisibilitySetting } from "@/lib/api/bonus";

import type { VisibilityMode } from "./_shared";

interface SettingsMenuProps {
  visibilityMode: VisibilityMode;
  onVisibilityChange: (mode: VisibilityMode) => void;
}

export function SettingsMenu({ visibilityMode, onVisibilityChange }: SettingsMenuProps) {
  const t = useTranslations("screen.bonusTasks.settings_menu");

  const handleToggle = async (mode: VisibilityMode) => {
    onVisibilityChange(mode);
    const res = await updateBonusVisibilitySetting(mode);
    if (!res.success) {
      onVisibilityChange(visibilityMode); // rollback
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 w-9 p-0" aria-label="Настройки">
          <MoreVertical className="size-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
          {t("visibility_label")}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => handleToggle("SUMMARY_ONLY")}
          className="flex items-center justify-between"
        >
          <span className="text-sm">{t("visibility_summary_only")}</span>
          {visibilityMode === "SUMMARY_ONLY" && (
            <CheckCircle2
              className="size-4 text-primary ml-2 shrink-0"
              aria-hidden="true"
            />
          )}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleToggle("ALWAYS_LIST")}
          className="flex items-center justify-between"
        >
          <span className="text-sm">{t("visibility_always")}</span>
          {visibilityMode === "ALWAYS_LIST" && (
            <CheckCircle2
              className="size-4 text-primary ml-2 shrink-0"
              aria-hidden="true"
            />
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
