import { addDays, isBefore, startOfDay } from "date-fns";
import { z } from "zod";

// ─── Role helpers ──────────────────────────────────────────────────────────────

export type AllowedRole =
  | "STORE_DIRECTOR"
  | "SUPERVISOR"
  | "REGIONAL"
  | "NETWORK_OPS";

export function isSupervisorOrAbove(
  role: string
): role is "SUPERVISOR" | "REGIONAL" | "NETWORK_OPS" {
  return role === "SUPERVISOR" || role === "REGIONAL" || role === "NETWORK_OPS";
}

// ─── Date helpers ──────────────────────────────────────────────────────────────

export const today = (): Date => startOfDay(new Date());

export function deriveFlags(date: Date | undefined): {
  urgent: boolean;
  retroactive: boolean;
} {
  if (!date) return { urgent: false, retroactive: false };
  const d = startOfDay(date);
  const t = today();
  const threeDaysOut = addDays(t, 3);
  if (isBefore(d, t)) return { urgent: false, retroactive: true };
  if (isBefore(d, threeDaysOut)) return { urgent: true, retroactive: false };
  return { urgent: false, retroactive: false };
}

export function isTooEarlyForDirector(date: Date | undefined): boolean {
  if (!date) return false;
  return isBefore(startOfDay(date), addDays(today(), 3));
}

// ─── Zod schema ────────────────────────────────────────────────────────────────

export function buildSchema(role: string, t: (k: string) => string) {
  const isDirector = role === "STORE_DIRECTOR";

  return z
    .object({
      store_id: z
        .number({ message: t("store_required") })
        .positive(t("store_required")),
      planned_date: z.date({ message: t("date_required") }),
      requested_hours: z
        .number({ message: t("hours_required") })
        .min(0.5, t("hours_min"))
        .max(24, t("hours_max")),
      work_type_id: z
        .number({ message: t("work_type_required") })
        .positive(t("work_type_required")),
      comment: z.string().max(500).optional(),
    })
    .superRefine((data, ctx) => {
      if (
        isDirector &&
        data.planned_date &&
        isTooEarlyForDirector(data.planned_date)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t("date_too_early"),
          path: ["planned_date"],
        });
      }
    });
}

// ─── Form values ───────────────────────────────────────────────────────────────

export type FormValues = {
  store_id: number;
  planned_date: Date;
  requested_hours: number;
  work_type_id: number;
  comment?: string;
};

// ─── Work type option ──────────────────────────────────────────────────────────

export interface WorkTypeOption {
  id: number;
  name: string;
}
