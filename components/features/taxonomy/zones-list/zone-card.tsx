"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import type { ZoneWithCounts } from "@/lib/api/taxonomy";

import { ZoneIcon } from "./zone-icon";

interface ZoneCardProps {
  zone: ZoneWithCounts;
  showStoreBadge?: boolean;
  onEdit: (zone: ZoneWithCounts) => void;
  onDelete: (zone: ZoneWithCounts) => void;
}

export function ZoneCard({
  zone,
  showStoreBadge = false,
  onEdit,
  onDelete,
}: ZoneCardProps) {
  const t = useTranslations("screen.zones");
  const canDelete = zone.tasks_count === 0;

  return (
    <Card className="group relative flex flex-col cursor-pointer hover:border-primary transition-colors">
      <CardHeader className="p-4 pb-2">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <ZoneIcon icon={zone.icon} className="size-5" />
          </span>
          <div className="flex flex-col gap-0.5 min-w-0 flex-1">
            <p className="text-base font-semibold text-foreground leading-tight truncate">
              {zone.name}
            </p>
            <code className="font-mono text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded w-fit">
              {zone.code}
            </code>
          </div>
        </div>
        {!zone.approved && (
          <Badge
            variant="outline"
            className="text-warning border-warning mt-2 w-fit text-xs"
          >
            {t("card.pending_approval")}
          </Badge>
        )}
        {showStoreBadge && zone.store_name && (
          <Badge variant="secondary" className="mt-2 w-fit text-xs">
            {zone.store_name}
          </Badge>
        )}
      </CardHeader>

      <CardContent className="px-4 pb-3 flex flex-col gap-2 flex-1 justify-end">
        <div className="flex flex-col gap-1">
          <p className="text-xs text-muted-foreground">
            {t("card.stores_count", { count: zone.stores_count })}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("card.tasks_today", { count: zone.tasks_count })}
          </p>
        </div>

        <div className="flex items-center justify-end gap-1 pt-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-9"
                  aria-label={t("dialogs.edit_title", { name: zone.name })}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(zone);
                  }}
                >
                  <Pencil className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t("dialogs.fields.name")}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-9 text-destructive hover:text-destructive"
                    aria-label={t("dialogs.delete_action")}
                    disabled={!canDelete}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (canDelete) onDelete(zone);
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </span>
              </TooltipTrigger>
              {!canDelete && (
                <TooltipContent>
                  {t("dialogs.delete_in_use_error", {
                    count: zone.tasks_count,
                  })}
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardContent>
    </Card>
  );
}
