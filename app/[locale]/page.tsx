import { redirect } from "next/navigation";
import { ADMIN_ROUTES } from "@/lib/constants/routes";

/**
 * Root page redirects to dashboard.
 * Quick-links for demo navigation are in /navigation.
 * Должности → /taxonomy/positions
 */
export default function RootPage() {
  redirect(ADMIN_ROUTES.taxonomyPositions);
}
