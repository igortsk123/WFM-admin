import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Match all pathnames except for
  // - /api (API routes)
  // - /_next (Next.js internals)
  // - /static (inside /public)
  // - all files with extensions (e.g. favicon.ico, manifest.json)
  matcher: ["/((?!api|_next|static|.*\\..*).*)"],
};
