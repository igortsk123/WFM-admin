// ═══════════════════════════════════════════════════════════════════
// Shared constants & types for work-types-list split
// ═══════════════════════════════════════════════════════════════════

export type ViewMode = "list" | "accordion"

export const PAGE_SIZE = 10

// ── Category color map (badge semantic vars) ──────────────────────
// Group name → semantic var pair. Matches editor dialog mapping.
export const GROUP_COLORS: Record<string, { bg: string; text: string }> = {
  "Мерчендайзинг": {
    bg: "var(--color-badge-violet-bg-light)",
    text: "var(--color-badge-violet-text-light)",
  },
  "Логистика": {
    bg: "var(--color-badge-blue-bg-light)",
    text: "var(--color-badge-blue-text-light)",
  },
  "Касса": {
    bg: "var(--color-badge-yellow-bg-light)",
    text: "var(--color-badge-yellow-text-light)",
  },
  "Поддержка": {
    bg: "var(--color-badge-pink-bg-light)",
    text: "var(--color-badge-pink-text-light)",
  },
  "Качество": {
    bg: "var(--color-badge-green-bg-light)",
    text: "var(--color-badge-green-text-light)",
  },
  "Управление": {
    bg: "var(--color-badge-orange-bg-light)",
    text: "var(--color-badge-orange-text-light)",
  },
  "Производство": {
    bg: "var(--color-badge-blue-bg-light)",
    text: "var(--color-badge-blue-text-light)",
  },
}

// ── Translation helper type ────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TFn = (key: string, values?: Record<string, any>) => string
