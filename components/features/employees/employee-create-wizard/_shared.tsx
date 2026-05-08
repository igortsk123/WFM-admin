import { z } from "zod";
import type { ReactNode } from "react";
import type {
  InviteMethod,
  OfertaChannel,
} from "@/lib/api";
import type { Permission, EmployeeType } from "@/lib/types";

// ─── Master wizard form value ────────────────────────────────────────────────

export interface WizardValues {
  // Step 1
  last_name: string;
  first_name: string;
  middle_name?: string;
  phone: string;
  email?: string;
  date_of_birth?: Date;
  employee_type: EmployeeType;
  rate_fraction?: "QUARTER" | "HALF" | "THREE_QUARTER" | "FULL";
  avatar_preview?: string;
  // Step 2
  store_id: number;
  position_id: number;
  rank: number;
  hired_at: Date;
  /** Agent ID — only for FREELANCE + NOMINAL_ACCOUNT */
  agent_id?: string | null;
  /** Oferta delivery channel — only for FREELANCE */
  oferta_channel?: OfertaChannel;
  // Step 3
  permissions: Permission[];
  // Step 4
  invite_method: InviteMethod;
  invite_message?: string;
  notify_manager: boolean;
}

// ─── Zod schemas per step ───────────────────────────────────────────────────

export function buildStep1Schema(tV: (key: string) => string) {
  return z.object({
    last_name: z.string().min(2, tV("last_name_min")),
    first_name: z.string().min(2, tV("first_name_min")),
    middle_name: z.string().optional(),
    phone: z
      .string()
      .min(1, tV("phone_required"))
      .regex(/^\+\d{1,4}[\s()\d-]{6,20}$/, tV("phone_invalid")),
    email: z
      .string()
      .optional()
      .refine(
        (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
        tV("email_invalid")
      ),
    date_of_birth: z.date().optional(),
    employee_type: z.enum(["STAFF", "FREELANCE"]),
    /** Доля ставки — для штатных сотрудников. */
    rate_fraction: z.enum(["QUARTER", "HALF", "THREE_QUARTER", "FULL"]).optional(),
    avatar_preview: z.string().optional(),
  });
}

export function buildStep2Schema(tV: (key: string) => string) {
  return z.object({
    store_id: z.number({ message: tV("store_required") }).positive(tV("store_required")),
    position_id: z.number({ message: tV("position_required") }).positive(tV("position_required")),
    rank: z.number().min(1).max(6).default(1),
    hired_at: z
      .date()
      .refine(
        (d) => d <= new Date(),
        tV("hired_at_future")
      )
      .default(new Date()),
  });
}

export function buildStep3Schema() {
  return z.object({
    permissions: z.array(z.enum(["CASHIER", "SALES_FLOOR", "SELF_CHECKOUT", "WAREHOUSE", "PRODUCTION_LINE"])),
  });
}

export function buildStep4Schema(tV: (key: string) => string) {
  return z.object({
    invite_method: z.enum(["EMAIL", "TELEGRAM", "MAX", "WHATSAPP", "NONE"], {
      message: tV("invite_method_required"),
    }),
    invite_message: z.string().optional(),
    notify_manager: z.boolean().default(false),
  });
}

export type Step1Schema = ReturnType<typeof buildStep1Schema>;
export type Step2Schema = ReturnType<typeof buildStep2Schema>;
export type Step3Schema = ReturnType<typeof buildStep3Schema>;
export type Step4Schema = ReturnType<typeof buildStep4Schema>;

export type Step1Values = z.infer<Step1Schema>;
export type Step2Input = z.input<Step2Schema>;
export type Step3Values = z.infer<Step3Schema>;
export type Step4Input = z.input<Step4Schema>;

// ─── Permission constants ──────────────────────────────────────────────────────

export const PERMISSIONS_LIST: Permission[] = [
  "CASHIER",
  "SALES_FLOOR",
  "SELF_CHECKOUT",
  "WAREHOUSE",
  "PRODUCTION_LINE",
];

export const PERM_ICONS: Record<Permission, ReactNode> = {
  CASHIER: <span className="text-base">🏧</span>,
  SALES_FLOOR: <span className="text-base">🛒</span>,
  SELF_CHECKOUT: <span className="text-base">🖥️</span>,
  WAREHOUSE: <span className="text-base">📦</span>,
  PRODUCTION_LINE: <span className="text-base">⚙️</span>,
};

// ─── Phone country codes ────────────────────────────────────────────────────

export type PhoneCountry = {
  code: string; // ISO-2 used as key
  flag: string;
  dial: string; // dial prefix incl '+', e.g. '+7'
  name: string;
  /** Number of national digits expected after the dial prefix. */
  length: number;
};

export const PHONE_COUNTRIES: PhoneCountry[] = [
  { code: "RU", flag: "🇷🇺", dial: "+7", name: "Россия", length: 10 },
  { code: "KZ", flag: "🇰🇿", dial: "+7", name: "Казахстан", length: 10 },
  { code: "BY", flag: "🇧🇾", dial: "+375", name: "Беларусь", length: 9 },
  { code: "UA", flag: "🇺🇦", dial: "+380", name: "Украина", length: 9 },
  { code: "TJ", flag: "🇹🇯", dial: "+992", name: "Таджикистан", length: 9 },
  { code: "KG", flag: "🇰🇬", dial: "+996", name: "Кыргызстан", length: 9 },
  { code: "UZ", flag: "🇺🇿", dial: "+998", name: "Узбекистан", length: 9 },
];

export const DEFAULT_COUNTRY: PhoneCountry = PHONE_COUNTRIES[0];

// Phone mask helper — формат подстраивается под страну
export function applyPhoneMask(raw: string, country: PhoneCountry = DEFAULT_COUNTRY): string {
  const dialDigits = country.dial.replace(/\D/g, "");
  const allDigits = raw.replace(/\D/g, "");
  const national = allDigits.startsWith(dialDigits)
    ? allDigits.slice(dialDigits.length)
    : allDigits;
  const d = national.slice(0, country.length);
  let result = country.dial;
  // RU/KZ — формат +7 (XXX) XXX-XX-XX, остальные — +XXX XX XXX XX XX
  if (country.dial === "+7") {
    if (d.length > 0) result += ` (${d.slice(0, 3)}`;
    if (d.length >= 3) result += `) ${d.slice(3, 6)}`;
    if (d.length >= 6) result += `-${d.slice(6, 8)}`;
    if (d.length >= 8) result += `-${d.slice(8, 10)}`;
  } else {
    if (d.length > 0) result += ` ${d.slice(0, 2)}`;
    if (d.length >= 2) result += ` ${d.slice(2, 5)}`;
    if (d.length >= 5) result += ` ${d.slice(5, 7)}`;
    if (d.length >= 7) result += ` ${d.slice(7, 9)}`;
  }
  return result;
}

// ─── Invite template ──────────────────────────────────────────────────────────

interface BuildInviteTemplateArgs {
  vals: Partial<WizardValues>;
  storeName?: string;
}

export function buildInviteTemplate({ vals, storeName }: BuildInviteTemplateArgs): string {
  const fio = [vals.last_name, vals.first_name, vals.middle_name]
    .filter(Boolean)
    .join(" ") || "{fio}";
  const store = storeName || "{store}";
  return `Здравствуйте, ${fio}! Вас пригласили в WFM — систему управления задачами магазина ${store}. Скачайте приложение по ссылке: {link}`;
}
