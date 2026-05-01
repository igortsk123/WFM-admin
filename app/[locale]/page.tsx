import { redirect } from "next/navigation";
import { ADMIN_ROUTES } from "@/lib/constants/routes";

/**
 * Root page redirects to dashboard.
 * In production, this would check auth and redirect to login if needed.
 */
export default function RootPage() {
  redirect(ADMIN_ROUTES.dashboard);
}
