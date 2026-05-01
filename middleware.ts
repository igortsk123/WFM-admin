import createMiddleware from "next-intl/middleware";
import { locales, defaultLocale } from "./i18n";

export default createMiddleware({
  locales,
  defaultLocale,
  localePrefix: "as-needed",
  localeDetection: true,
});

export const config = {
  // Skip API routes, Next.js internals, Vercel files, and static files
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
