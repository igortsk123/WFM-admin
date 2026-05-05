import { redirect } from "next/navigation";
import { ADMIN_ROUTES } from "@/lib/constants/routes";

/**
 * Root page redirects to KPI report (chat 39).
 * Quick-links for demo navigation are in /navigation.
 */
export default function RootPage() {
  redirect(ADMIN_ROUTES.reportsKpi);
}
