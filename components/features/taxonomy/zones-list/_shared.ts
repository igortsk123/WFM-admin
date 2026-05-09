// ═══════════════════════════════════════════════════════════════════
// Shared constants, types & helpers for zones-list split
// ═══════════════════════════════════════════════════════════════════

import {
  Store,
  MapPin,
  ShoppingCart,
  Truck,
  Coffee,
  Box,
  Tag,
  Wrench,
  Refrigerator,
  Lightbulb,
  Sparkles,
  Building,
} from "lucide-react";
import { z } from "zod";

// ── Icon registry ─────────────────────────────────────────────────────

export const ICON_OPTIONS = [
  { value: "store", label: "Store", Icon: Store },
  { value: "map-pin", label: "MapPin", Icon: MapPin },
  { value: "shopping-cart", label: "ShoppingCart", Icon: ShoppingCart },
  { value: "truck", label: "Truck", Icon: Truck },
  { value: "coffee", label: "Coffee", Icon: Coffee },
  { value: "box", label: "Box", Icon: Box },
  { value: "tag", label: "Tag", Icon: Tag },
  { value: "wrench", label: "Wrench", Icon: Wrench },
  { value: "refrigerator", label: "Refrigerator", Icon: Refrigerator },
  { value: "lightbulb", label: "Lightbulb", Icon: Lightbulb },
  { value: "sparkles", label: "Sparkles", Icon: Sparkles },
  { value: "building", label: "Building", Icon: Building },
] as const;

// ── SWR keys ──────────────────────────────────────────────────────────

export const SWR_KEY_GLOBAL = "zones-global";
export const SWR_KEY_STORE = (storeId?: string) =>
  `zones-store-${storeId ?? "all"}`;

// ── Tab type ──────────────────────────────────────────────────────────

export type ZonesTab = "global" | "by_store";

// ── Zod schema ────────────────────────────────────────────────────────

export const zoneFormSchema = z
  .object({
    code: z
      .string()
      .min(1)
      .max(32)
      .regex(/^[A-Z0-9_]+$/, "Только заглавные буквы, цифры и _"),
    name: z.string().min(1).max(60),
    description: z.string().max(300).optional(),
    scope: z.enum(["GLOBAL", "STORE"]),
    store_id: z.string().optional(),
    icon: z.string().min(1),
    active: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.scope === "STORE" && !data.store_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Выберите магазин",
        path: ["store_id"],
      });
    }
  });

export type ZoneFormValues = z.infer<typeof zoneFormSchema>;

// ── Translation helper type ───────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TFn = (key: string, values?: Record<string, any>) => string;

// ── Store option type for combobox ────────────────────────────────────

export interface StoreOption {
  value: string;
  label: string;
}
