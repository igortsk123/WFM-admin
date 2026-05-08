// ─────────────────────────────────────────────────────────────────────────────
// SHARED TYPES & HELPERS for ai-coach-editor split
// ─────────────────────────────────────────────────────────────────────────────

export type HintFilter = "all" | "with_hint" | "without_hint";

export interface HintFormState {
  why: string;
  step1: string;
  step2: string;
  step3: string;
  error1: string;
  error2: string;
  error3: string;
}

// IDs with AI hints
export const HINT_WORK_TYPE_IDS = new Set<number>([4]);

export const MOCK_METRICS_CHART = Array.from({ length: 90 }, (_, i) => {
  const date = new Date("2026-02-04");
  date.setDate(date.getDate() + i);
  return {
    date: date.toLocaleDateString("ru-RU", { day: "2-digit", month: "short" }),
    rate: Math.round(65 + Math.sin(i / 8) * 10 + i * 0.08 + Math.random() * 5),
  };
});

export function parseHintText(
  text: string
): Omit<HintFormState, "error1" | "error2" | "error3"> {
  // Best-effort: put the full text into "why"
  return {
    why: text,
    step1: "",
    step2: "",
    step3: "",
  };
}

export function getDaysDiff(from: string, to: string): number {
  return Math.round(
    (new Date(to).getTime() - new Date(from).getTime()) / (1000 * 60 * 60 * 24)
  );
}
