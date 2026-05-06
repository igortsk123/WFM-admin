import { redirect } from "next/navigation";

/**
 * /employees/permissions is now deprecated in favour of the bulk-actions bar
 * on the employees list page. Redirect permanently.
 */
export default function PermissionsPage() {
  redirect("/employees");
}
