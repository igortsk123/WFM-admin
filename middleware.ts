import createMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";

const handleI18nRouting = createMiddleware(routing);

/** Cookie name written by AuthContext on every switchRole call */
const ROLE_COOKIE = "wfm-current-role";

/**
 * Prefixes that belong to the agent mini-app only.
 * next-intl rewrites /en/agent → /agent internally, so we strip the locale prefix.
 */
const AGENT_PREFIX = "/agent";

/**
 * Prefixes that are exclusively for authenticated non-agent users (admin app).
 * PLATFORM_ADMIN is allowed everywhere (cross-tenant debugging).
 */
const ADMIN_PREFIXES = [
  "/dashboard",
  "/tasks",
  "/goals",
  "/schedule",
  "/employees",
  "/stores",
  "/reports",
  "/ai",
  "/settings",
  "/taxonomy",
  "/audit",
  "/risk",
  "/leaderboards",
  "/payouts",
  "/bonus",
  "/freelance",
  "/notifications",
  "/integrations",
  "/subtasks",
];

export default function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  // Strip locale prefix (/en/...) to get the raw path for role checks
  const strippedPath = pathname.replace(/^\/en/, "") || "/";

  const role = request.cookies.get(ROLE_COOKIE)?.value ?? null;

  // ── Guard: AGENT trying to access admin routes ──────────────────────────────
  if (
    role === "AGENT" &&
    ADMIN_PREFIXES.some((prefix) => strippedPath.startsWith(prefix))
  ) {
    const agentUrl = request.nextUrl.clone();
    agentUrl.pathname = "/agent";
    return NextResponse.redirect(agentUrl);
  }

  // ── Guard: non-AGENT (and non-PLATFORM_ADMIN) trying to access /agent ───────
  if (
    role !== null &&
    role !== "AGENT" &&
    role !== "PLATFORM_ADMIN" &&
    strippedPath.startsWith(AGENT_PREFIX)
  ) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/dashboard";
    return NextResponse.redirect(dashboardUrl);
  }

  // Let next-intl handle locale routing for everything else
  return handleI18nRouting(request);
}

export const config = {
  // Match all pathnames except for
  // - /api (API routes)
  // - /_next (Next.js internals)
  // - /static (inside /public)
  // - all files with extensions (e.g. favicon.ico, manifest.json)
  matcher: ["/((?!api|_next|static|.*\\..*).*)"],
};
