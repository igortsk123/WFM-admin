"use client";

import * as React from "react";
import { memo } from "react";
import { Eye, Shield } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import type { AuditEntry } from "@/lib/types";

import { ENTITY_TYPE_ICONS, formatTime, getInitials } from "./_shared";
import { EntityBadge } from "./entity-badge";

interface EventRowProps {
  entry: AuditEntry;
  selected: boolean;
  onSelect: (id: string) => void;
  locale: string;
  entityTypeLabel: (type: string) => string;
  onEyeClick: (id: string) => void;
}

export const EventRow = memo(function EventRow({
  entry,
  selected,
  onSelect,
  locale,
  entityTypeLabel,
  onEyeClick,
}: EventRowProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(entry.id)}
      className={cn(
        "w-full text-left group flex items-start gap-3 px-4 py-3 transition-colors border-l-4",
        "hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
        selected ? "border-l-primary bg-accent" : "border-l-transparent"
      )}
      aria-pressed={selected}
    >
      {/* Time */}
      <span className="w-10 shrink-0 font-mono text-xs text-muted-foreground leading-none pt-1">
        {formatTime(entry.occurred_at, locale)}
      </span>

      {/* Avatar + entity icon */}
      <div className="relative shrink-0">
        <Avatar className="size-8">
          <AvatarFallback className="text-xs font-medium bg-accent text-accent-foreground">
            {getInitials(entry.actor.name)}
          </AvatarFallback>
        </Avatar>
        {(() => {
          const Icon = ENTITY_TYPE_ICONS[entry.entity_type];
          if (!Icon) return null;
          return (
            <span className="absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-full bg-background border border-border shadow-sm">
              <Icon className="size-2.5 text-muted-foreground" aria-hidden />
            </span>
          );
        })()}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <p className="text-sm leading-snug">
          <span className="font-medium text-foreground">{entry.actor.name}</span>{" "}
          <span className="text-muted-foreground">
            {entry.action_label.toLowerCase()}
          </span>{" "}
          <span className="font-medium text-foreground">{entry.entity_name}</span>
        </p>
        {entry.platform_action && (
          <span className="inline-flex items-center gap-1 text-xs text-info font-medium">
            <Shield className="size-3" aria-hidden />
            Beyond Violet
          </span>
        )}
      </div>

      {/* Entity badge + platform badge + eye */}
      <div className="flex items-center gap-1.5 shrink-0">
        {entry.platform_action && (
          <Badge
            variant="outline"
            className="text-xs font-medium bg-info/10 text-info border-info/30 shrink-0"
          >
            Платформа
          </Badge>
        )}
        <EntityBadge
          type={entry.entity_type}
          label={entityTypeLabel(entry.entity_type)}
        />
        <button
          type="button"
          aria-label="View details"
          onClick={(e) => {
            e.stopPropagation();
            onEyeClick(entry.id);
          }}
          className="hidden group-hover:flex size-7 items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <Eye className="size-4" />
        </button>
      </div>
    </button>
  );
});
