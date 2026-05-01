import { getRequestConfig } from "next-intl/server";

export const locales = ["ru", "en"] as const;
export const defaultLocale = "ru" as const;

export type Locale = (typeof locales)[number];

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  // Validate that the incoming locale is valid
  if (!locale || !locales.includes(locale as Locale)) {
    locale = defaultLocale;
  }

  try {
    const messages = (await import(`./messages/${locale}.json`)).default;
    return {
      locale,
      messages,
    };
  } catch {
    // Fallback to default locale if messages file is missing
    if (process.env.NODE_ENV === "development") {
      console.warn(
        `[next-intl] Missing messages for locale "${locale}", falling back to "${defaultLocale}"`
      );
    }
    const messages = (await import(`./messages/${defaultLocale}.json`)).default;
    return {
      locale: defaultLocale,
      messages,
    };
  }
});
