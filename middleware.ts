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

/**
 * Очистить Location header от внутреннего порта listener'а.
 * Next.js standalone (PORT=3000) генерирует абсолютные URL с этим портом
 * при работе за reverse proxy — даже если Host header без порта. Эта функция
 * убирает `:3000` из Location, чтобы редиректы оставались на основном домене.
 */
function stripUpstreamPort(response: NextResponse): NextResponse {
  const location = response.headers.get("location");
  if (!location) return response;
  // Убираем :3000 из абсолютных URL (https://host:3000/... → https://host/...)
  // и из относительных protocol-less (//host:3000/... → //host/...)
  const fixed = location.replace(/^(https?:\/\/[^/:]+):3000(\/|$)/, "$1$2");
  if (fixed !== location) {
    response.headers.set("location", fixed);
  }
  return response;
}

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
    agentUrl.port = "";
    return stripUpstreamPort(NextResponse.redirect(agentUrl));
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
    dashboardUrl.port = "";
    return stripUpstreamPort(NextResponse.redirect(dashboardUrl));
  }

  // Let next-intl handle locale routing for everything else
  return stripUpstreamPort(handleI18nRouting(request));
}

export const config = {
  // Match all pathnames except for
  // - /api (API routes)
  // - /_next (Next.js internals)
  // - /static (inside /public)
  // - all files with extensions (e.g. favicon.ico, manifest.json)
  matcher: ["/((?!api|_next|static|.*\\..*).*)"],
};
