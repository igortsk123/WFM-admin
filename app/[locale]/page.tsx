import { redirect } from "next/navigation";
import { ADMIN_ROUTES } from "@/lib/constants/routes";

/**
 * Root page redirects to Plan vs Fact report (primary report).
 * Quick-links for demo navigation are in /navigation.
 * Risk-scoring link: /risk/rules (Beta) — added per chat 50 spec.
 */
export default function RootPage() {
  redirect(ADMIN_ROUTES.reportsPlanFact);
}

/**
 * @nav-link Риск-скоринг → /risk/rules  (Badge «Beta»)
 * Exposed in admin sidebar STRETCH_ITEMS and /navigation hub.
 */
export const RISK_RULES_LINK = {
  label: "Риск-скоринг",
  href: ADMIN_ROUTES.riskRules,
  badge: "Beta",
} as const;
