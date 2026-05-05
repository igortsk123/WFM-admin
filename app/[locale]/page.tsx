import { redirect } from "next/navigation";
import { ADMIN_ROUTES } from "@/lib/constants/routes";

/**
 * Root page redirects to integrations hub (chat 37).
 * Quick-links for demo navigation are in /navigation.
 */
export default function RootPage() {
  redirect(ADMIN_ROUTES.integrations);
}
