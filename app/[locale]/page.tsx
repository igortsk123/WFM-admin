import { redirect } from "next/navigation";
import { ADMIN_ROUTES } from "@/lib/constants/routes";

/**
 * Root page redirects to task detail demo (t-1042).
 * Demonstrates the task detail screen with a real completed task.
 * In production, this would check auth and redirect appropriately.
 */
export default function RootPage() {
  redirect(ADMIN_ROUTES.taskDetail("t-1042"));
}
