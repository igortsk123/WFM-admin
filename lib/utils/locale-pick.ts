/**
 * Locale-aware text picker for bilingual demo mocks.
 *
 * Используется для полей вида `title` / `title_en` / `description` / `description_en` —
 * исторически RU-литерал лежит в основном поле, EN-перевод опционален в `*_en`.
 * На EN-локали → `en` если задан, иначе fallback на RU.
 * На RU-локали (или любой другой) → всегда RU.
 *
 * Пример:
 *   const t = pickLocalized(goal.title, goal.title_en, locale);
 */
import type { Locale } from "@/lib/types";

export function pickLocalized(
  ru: string,
  en: string | undefined,
  locale: Locale
): string {
  if (locale === "en" && en && en.length > 0) return en;
  return ru;
}

/**
 * Версия для массивов (например `rationale_breakdown` / `rationale_breakdown_en`).
 * Если EN-массив задан и не пуст — берём его, иначе RU.
 */
export function pickLocalizedList(
  ru: string[],
  en: string[] | undefined,
  locale: Locale
): string[] {
  if (locale === "en" && en && en.length > 0) return en;
  return ru;
}
