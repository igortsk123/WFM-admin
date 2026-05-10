import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { PermissionsMatrix } from "@/components/features/employees/permissions-matrix";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("permissions") };
}

export default function PermissionsPage() {
  return <PermissionsMatrix />;
}
