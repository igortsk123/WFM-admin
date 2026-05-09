"use client";

import { useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import type { ScheduleSlot } from "@/lib/api/shifts";

import { formatHM, getSlotVariant, SLOT_STYLES } from "./_shared";

interface ShiftBlockProps {
  slot: ScheduleSlot;
  onClick: (slot: ScheduleSlot) => void;
  onAction: (action: "reopen" | "force_close", slot: ScheduleSlot) => void;
  compact?: boolean;
}

export function ShiftBlock({
  slot,
  onClick,
  onAction,
  compact = false,
}: ShiftBlockProps) {
  const t = useTranslations("screen.schedule");
  const variant = getSlotVariant(slot);
  const styles = SLOT_STYLES[variant];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClick(slot);
          }}
          className={`w-full text-left rounded-md p-1.5 text-xs transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${styles}`}
          aria-label={`Shift ${slot.user_name} ${formatHM(slot.planned_start)}–${formatHM(slot.planned_end)}`}
        >
          <div className="flex items-center gap-1 font-medium truncate">
            {slot.status === "OPENED" && !slot.has_conflict && (
              <span
                aria-hidden="true"
                className="size-1.5 rounded-full bg-success shrink-0 animate-pulse"
              />
            )}
            {slot.has_conflict && (
              <AlertTriangle className="size-3 shrink-0" aria-hidden="true" />
            )}
            <span className="truncate">
              {formatHM(slot.planned_start)}–{formatHM(slot.planned_end)}
            </span>
          </div>
          {!compact && slot.zone_name && (
            <div className="truncate opacity-75 mt-0.5">{slot.zone_name}</div>
          )}
          {!compact && slot.late_minutes && slot.late_minutes > 0 ? (
            <div className="truncate opacity-75">
              {t("slot.late_hint", { minutes: slot.late_minutes })}
            </div>
          ) : null}
          {!compact && slot.overtime_minutes && slot.overtime_minutes > 30 ? (
            <div className="truncate opacity-75">
              {t("slot.overtime_hint", { minutes: slot.overtime_minutes })}
            </div>
          ) : null}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-56">
        {/* Header — info всегда */}
        <div className="px-2 py-1.5 text-xs">
          <div className="font-medium text-foreground">{slot.user_name}</div>
          <div className="text-muted-foreground">
            {formatHM(slot.planned_start)}–{formatHM(slot.planned_end)}
            {slot.zone_name ? ` · ${slot.zone_name}` : ""}
          </div>
          {slot.position_name && (
            <div className="text-muted-foreground">{slot.position_name}</div>
          )}
        </div>

        {/* Conflict explanation */}
        {slot.has_conflict && (
          <>
            <div className="my-1 h-px bg-border" />
            <div className="px-2 py-1.5 text-xs">
              <div className="flex items-center gap-1.5 font-medium text-destructive">
                <AlertTriangle className="size-3" />
                {t("slot.conflict_title")}
              </div>
              <div className="mt-0.5 text-muted-foreground">
                {t(`slot.conflict_reason.${slot.conflict_reason ?? "OTHER"}`)}
              </div>
            </div>
          </>
        )}

        {/* Status-specific actions */}
        {slot.status === "NEW" && (
          <>
            <div className="my-1 h-px bg-border" />
            <div className="px-2 py-1 text-xs text-muted-foreground italic">
              {t("slot.planned_hint")}
            </div>
          </>
        )}
        {slot.status === "CLOSED" && (
          <>
            <div className="my-1 h-px bg-border" />
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onAction("reopen", slot);
              }}
            >
              {t("slot.actions.reopen")}
            </DropdownMenuItem>
          </>
        )}
        {slot.status === "OPENED" && (
          <>
            <div className="my-1 h-px bg-border" />
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onAction("force_close", slot);
              }}
              className="text-destructive focus:text-destructive"
            >
              {t("slot.actions.force_close")}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
