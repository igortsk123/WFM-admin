import type { Locale } from "@/lib/types";

// ═══════════════════════════════════════════════════════════════════
// DATE & TIME FORMATTING
// ═══════════════════════════════════════════════════════════════════

/**
 * Format date according to locale
 * RU: «28 апр 2026»
 * EN: «28 Apr 2026»
 */
export function formatDate(date: Date, locale: Locale = "ru"): string {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

/**
 * Format time (24h format for both locales — enterprise standard)
 * Both: «14:30»
 */
export function formatTime(date: Date, locale: Locale = "ru"): string {
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

/**
 * Format date and time together
 * RU: «28 апр 2026, 14:30»
 * EN: «28 Apr 2026, 14:30»
 */
export function formatDateTime(date: Date, locale: Locale = "ru"): string {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

/**
 * Format relative time (e.g., "2 hours ago", "in 3 days").
 * Использует Math.trunc для дискретных порогов: 12 ч → "12 часов назад",
 * НЕ "1 день назад". Для разницы >30 дней даёт абсолютную дату.
 */
export function formatRelative(date: Date, locale: Locale = "ru"): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const sign = diffMs >= 0 ? 1 : -1;
  const absSec = Math.floor(Math.abs(diffMs) / 1000);

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  if (absSec < 60) return rtf.format(sign * absSec, "second");
  const absMin = Math.floor(absSec / 60);
  if (absMin < 60) return rtf.format(sign * absMin, "minute");
  const absHour = Math.floor(absMin / 60);
  if (absHour < 24) return rtf.format(sign * absHour, "hour");
  const absDay = Math.floor(absHour / 24);
  if (absDay < 30) return rtf.format(sign * absDay, "day");

  // >30 дней — абсолютная дата
  return formatDate(date, locale);
}

// ═══════════════════════════════════════════════════════════════════
// NUMBER FORMATTING
// ═══════════════════════════════════════════════════════════════════

/**
 * Format number with locale-specific separators
 * RU: «1 234 567»
 * EN: «1,234,567»
 */
export function formatNumber(value: number, locale: Locale = "ru"): string {
  return new Intl.NumberFormat(locale).format(value);
}

/**
 * Format decimal number
 * RU: «12,5»
 * EN: «12.5»
 */
export function formatDecimal(
  value: number,
  locale: Locale = "ru",
  decimals: number = 1
): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Format currency
 * RU: «12 450 ₽»
 * EN: «£12,450» (GBP for UK demo) or «$12,450» (USD)
 */
export function formatCurrency(
  value: number,
  locale: Locale = "ru",
  currency?: string
): string {
  const defaultCurrency = locale === "ru" ? "RUB" : "GBP";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency ?? defaultCurrency,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format percentage
 * RU: «12,5%»
 * EN: «12.5%»
 */
export function formatPercent(
  value: number,
  locale: Locale = "ru",
  decimals: number = 1
): string {
  return new Intl.NumberFormat(locale, {
    style: "percent",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value / 100);
}

// ═══════════════════════════════════════════════════════════════════
// PHONE FORMATTING
// ═══════════════════════════════════════════════════════════════════

/**
 * Format phone number according to locale
 * RU: +7 (XXX) XXX-XX-XX
 * EN: +44 (0) XXXX XXXXXX (UK format for demo)
 */
export function formatPhone(phone: string, locale: Locale = "ru"): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, "");

  if (locale === "ru") {
    // Russian format: +7 (XXX) XXX-XX-XX
    if (digits.length === 11 && digits.startsWith("7")) {
      const match = digits.match(/^7(\d{3})(\d{3})(\d{2})(\d{2})$/);
      if (match) {
        return `+7 (${match[1]}) ${match[2]}-${match[3]}-${match[4]}`;
      }
    }
    // Already formatted or different length — return as-is with +7 prefix
    if (digits.length === 10) {
      const match = digits.match(/^(\d{3})(\d{3})(\d{2})(\d{2})$/);
      if (match) {
        return `+7 (${match[1]}) ${match[2]}-${match[3]}-${match[4]}`;
      }
    }
  } else {
    // UK format for EN demo: +44 (0) XXXX XXXXXX
    if (digits.length === 12 && digits.startsWith("44")) {
      const match = digits.match(/^44(\d{4})(\d{6})$/);
      if (match) {
        return `+44 (0) ${match[1]} ${match[2]}`;
      }
    }
    if (digits.length === 11 && digits.startsWith("44")) {
      const match = digits.match(/^44(\d{3})(\d{6})$/);
      if (match) {
        return `+44 (0) ${match[1]} ${match[2]}`;
      }
    }
  }

  // Fallback: return original
  return phone;
}
