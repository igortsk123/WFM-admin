import { z } from "zod";
import type { CurrentUser } from "@/lib/api/auth";
import type { FunctionalRole } from "@/lib/types";

// ─── TIMEZONES ────────────────────────────────────────────────────────────────

export const TIMEZONES = [
  { value: "Asia/Tomsk", label: "Томск (UTC+7)" },
  { value: "Asia/Novosibirsk", label: "Новосибирск (UTC+7)" },
  { value: "Asia/Krasnoyarsk", label: "Красноярск (UTC+7)" },
  { value: "Europe/Moscow", label: "Москва (UTC+3)" },
  { value: "Europe/Kaliningrad", label: "Калининград (UTC+2)" },
  { value: "Europe/Samara", label: "Самара (UTC+4)" },
  { value: "Asia/Yekaterinburg", label: "Екатеринбург (UTC+5)" },
  { value: "Asia/Omsk", label: "Омск (UTC+6)" },
  { value: "Asia/Irkutsk", label: "Иркутск (UTC+8)" },
  { value: "Asia/Vladivostok", label: "Владивосток (UTC+10)" },
  { value: "Europe/London", label: "Лондон (UTC+0/+1)" },
  { value: "Europe/Berlin", label: "Берлин (UTC+1/+2)" },
  { value: "America/New_York", label: "Нью-Йорк (UTC-5/-4)" },
  { value: "America/Los_Angeles", label: "Лос-Анджелес (UTC-8/-7)" },
  { value: "UTC", label: "UTC" },
];

// ─── SECTION TYPE ─────────────────────────────────────────────────────────────

export type Section =
  | "profile"
  | "security"
  | "notifications"
  | "assignments"
  | "appearance"
  | "organizations";

export function getSectionsForRole(role: FunctionalRole): Section[] {
  switch (role) {
    case "AGENT":
      return ["profile", "notifications", "appearance"];
    case "PLATFORM_ADMIN":
      return ["profile", "security", "notifications", "assignments", "appearance", "organizations"];
    default:
      return ["profile", "security", "notifications", "assignments", "appearance"];
  }
}

// ─── PROFILE FORM SCHEMA ──────────────────────────────────────────────────────

export const profileFormSchema = z.object({
  last_name: z.string().min(2, "Минимум 2 символа").max(60, "Максимум 60 символов"),
  first_name: z.string().min(2, "Минимум 2 символа").max(60, "Максимум 60 символов"),
  middle_name: z.string().max(60, "Максимум 60 символов").optional(),
  phone: z
    .string()
    .regex(/^\+7 \(\d{3}\) \d{3}-\d{2}-\d{2}$/, "Введите телефон в формате +7 (XXX) XXX-XX-XX"),
  date_of_birth: z.string().optional(),
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;

// ─── HELPERS ──────────────────────────────────────────────────────────────────

export function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 0) return "";
  let result = "+7";
  if (digits.length > 1) result += ` (${digits.slice(1, 4)}`;
  if (digits.length >= 4) result += `)`;
  if (digits.length > 4) result += ` ${digits.slice(4, 7)}`;
  if (digits.length > 7) result += `-${digits.slice(7, 9)}`;
  if (digits.length > 9) result += `-${digits.slice(9, 11)}`;
  return result;
}

export function getInitials(user: CurrentUser): string {
  return `${user.last_name[0] ?? ""}${user.first_name[0] ?? ""}`.toUpperCase();
}

export function formatDate(isoDate: string | undefined, locale: string): string {
  if (!isoDate) return "—";
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(isoDate));
}

export function formatDateTime(isoDate: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(isoDate));
}
