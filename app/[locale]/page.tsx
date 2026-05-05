import { redirect } from "next/navigation";
import { ADMIN_ROUTES } from "@/lib/constants/routes";

/**
 * Root page redirects to Plan vs Fact report (primary report).
 * Quick-links for demo navigation are in /navigation.
 */
export default function RootPage() {
  redirect(ADMIN_ROUTES.reportsPlanFact);
}
