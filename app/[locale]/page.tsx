import { redirect } from "next/navigation";
import { ADMIN_ROUTES } from "@/lib/constants/routes";

/**
 * Root page → Dashboard (главный экран admin'а).
 * Quick-links для demo-навигации остаются в /navigation.
 */
export default function RootPage() {
  redirect(ADMIN_ROUTES.dashboard);
}
