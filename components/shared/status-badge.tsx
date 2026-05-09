"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────
// STATUS-BADGE TONE VARIANTS
//
// shadcn Badge supports default/secondary/destructive/outline/ghost/link.
// Status badges in this codebase consistently use soft pastel tones
// (bg-<token>/10 + text-<token>) on top of the underlying Badge. We
// extend variants locally via cva instead of editing components/ui/.
// ─────────────────────────────────────────────────────────────────────

const statusToneVariants = cva("border", {
  variants: {
    tone: {
      success: "bg-success/10 text-success border-success/20",
      warning: "bg-warning/10 text-warning border-warning/20",
      destructive:
        "bg-destructive/10 text-destructive border-destructive/20",
      info: "bg-info/10 text-info border-info/20",
      muted: "bg-muted text-muted-foreground border-border",
      // shadcn-builtin tones — kept here so callers can mix-n-match
      default: "",
      secondary: "",
      outline: "",
    },
  },
  defaultVariants: {
    tone: "muted",
  },
});

export type StatusTone = NonNullable<
  VariantProps<typeof statusToneVariants>["tone"]
>;

const TONE_TO_BADGE_VARIANT: Record<
  StatusTone,
  "default" | "secondary" | "destructive" | "outline"
> = {
  success: "outline",
  warning: "outline",
  destructive: "outline",
  info: "outline",
  muted: "outline",
  default: "default",
  secondary: "secondary",
  outline: "outline",
};

type StatusBadgeSize = "sm" | "default";

const SIZE_CLASSES: Record<StatusBadgeSize, string> = {
  sm: "px-1.5 py-0 text-[11px]",
  default: "",
};

// ─────────────────────────────────────────────────────────────────────
// CONFIG TYPES
// ─────────────────────────────────────────────────────────────────────

export interface StatusEntryConfig {
  /** Translated label — i18n must happen in the wrapper, not here. */
  label: string;
  /** Visual tone — picks bg/text/border tokens from semantic palette. */
  tone: StatusTone;
  /** Show a small leading dot (e.g. for "in progress" / "processing"). */
  dot?: boolean;
  /** Animate the dot (pulse). */
  pulse?: boolean;
}

export type StatusConfig<S extends string> = Record<S, StatusEntryConfig>;

// ─────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────

export interface StatusBadgeProps<S extends string>
  extends Omit<React.ComponentProps<"span">, "children"> {
  status: S;
  config: StatusConfig<S>;
  size?: StatusBadgeSize;
}

export function StatusBadge<S extends string>({
  status,
  config,
  size,
  className,
  ...rest
}: StatusBadgeProps<S>) {
  const resolvedSize: StatusBadgeSize = size ?? "default";
  const entry = config[status];

  // Defensive: unknown status falls back to muted/raw key. Avoids crashes
  // when backend ships a new enum value before frontend catches up.
  if (!entry) {
    return (
      <Badge
        variant="outline"
        className={cn(
          statusToneVariants({ tone: "muted" }),
          SIZE_CLASSES[resolvedSize],
          className,
        )}
        {...rest}
      >
        {status}
      </Badge>
    );
  }

  return (
    <Badge
      variant={TONE_TO_BADGE_VARIANT[entry.tone]}
      data-status={status}
      className={cn(
        statusToneVariants({ tone: entry.tone }),
        SIZE_CLASSES[resolvedSize],
        className,
      )}
      {...rest}
    >
      {entry.dot && (
        <span
          aria-hidden="true"
          className={cn(
            "inline-block size-1.5 rounded-full bg-current shrink-0",
            entry.pulse && "animate-pulse",
          )}
        />
      )}
      {entry.label}
    </Badge>
  );
}
