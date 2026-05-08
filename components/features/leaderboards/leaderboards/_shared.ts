import type { useTranslations } from "next-intl";

// ─────────────────────────────────────────────────────────
// Shared types
// ─────────────────────────────────────────────────────────

export type T = ReturnType<typeof useTranslations>;

// ─────────────────────────────────────────────────────────
// Shared constants
// ─────────────────────────────────────────────────────────

export const PAGE_SIZE = 7;

// ─────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────

export function getInitials(name: string): string {
  const parts = name.split(" ");
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function getShortName(name: string): string {
  return name.split(" ").slice(0, 2).join(" ");
}
