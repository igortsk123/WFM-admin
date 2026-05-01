import type { Locale } from "@/i18n";

/**
 * Format date according to locale
 * RU: «28 апр 2026»
 * EN: «28 Apr 2026»
 */
export function formatDate(
  date: Date | string,
  locale: Locale = "ru",
  opts?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...opts,
  }).format(d);
}

/**
 * Format time (24h format)
 * «14:30»
 */
export function formatTime(date: Date | string, locale: Locale = "ru"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

/**
 * Format date and time
 * RU: «28 апр 2026, 14:30»
 * EN: «28 Apr 2026, 14:30»
 */
export function formatDateTime(
  date: Date | string,
  locale: Locale = "ru"
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

/**
 * Format number with locale-specific separators
 * RU: «1 234 567» or «12,5»
 * EN: «1,234,567» or «12.5»
 */
export function formatNumber(
  value: number,
  locale: Locale = "ru",
  opts?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat(locale, opts).format(value);
}

/**
 * Format currency
 * RU: «12 450 ₽»
 * EN: «£12,450» or «$12,450»
 */
export function formatCurrency(
  amount: number,
  locale: Locale = "ru",
  currency: "RUB" | "GBP" | "USD" = "RUB"
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format percentage
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

/**
 * Format phone number according to locale
 * RU: +7 (XXX) XXX-XX-XX
 * EN: +44 (0) XXXX XXXXXX
 */
export function formatPhone(phone: string, locale: Locale = "ru"): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, "");

  if (locale === "ru") {
    // Russian format: +7 (XXX) XXX-XX-XX
    if (digits.length === 11 && digits.startsWith("7")) {
      return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9, 11)}`;
    }
    if (digits.length === 10) {
      return `+7 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 8)}-${digits.slice(8, 10)}`;
    }
  }

  if (locale === "en") {
    // UK format: +44 (0) XXXX XXXXXX
    if (digits.length === 12 && digits.startsWith("44")) {
      return `+44 (0) ${digits.slice(2, 6)} ${digits.slice(6, 12)}`;
    }
    if (digits.length === 11 && digits.startsWith("0")) {
      return `+44 (0) ${digits.slice(1, 5)} ${digits.slice(5, 11)}`;
    }
  }

  // Fallback: return original with basic formatting
  return phone;
}

/**
 * Format relative time
 * RU: «2 ч назад», «через 3 дня»
 * EN: «2 hours ago», «in 3 days»
 */
export function formatRelative(
  date: Date | string,
  locale: Locale = "ru"
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffInSeconds = Math.floor((d.getTime() - now.getTime()) / 1000);
  const absDiff = Math.abs(diffInSeconds);

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  if (absDiff < 60) {
    return rtf.format(
      diffInSeconds < 0 ? -Math.floor(absDiff) : Math.floor(absDiff),
      "second"
    );
  }
  if (absDiff < 3600) {
    const minutes = Math.floor(absDiff / 60);
    return rtf.format(diffInSeconds < 0 ? -minutes : minutes, "minute");
  }
  if (absDiff < 86400) {
    const hours = Math.floor(absDiff / 3600);
    return rtf.format(diffInSeconds < 0 ? -hours : hours, "hour");
  }
  if (absDiff < 2592000) {
    const days = Math.floor(absDiff / 86400);
    return rtf.format(diffInSeconds < 0 ? -days : days, "day");
  }
  if (absDiff < 31536000) {
    const months = Math.floor(absDiff / 2592000);
    return rtf.format(diffInSeconds < 0 ? -months : months, "month");
  }
  const years = Math.floor(absDiff / 31536000);
  return rtf.format(diffInSeconds < 0 ? -years : years, "year");
}
