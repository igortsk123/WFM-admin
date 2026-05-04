import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { EmployeeCreateWizard } from "@/components/features/employees/employee-create-wizard";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("screen.employeeCreate");
  return {
    title: t("page_title"),
  };
}

export default function EmployeeCreatePage() {
  return <EmployeeCreateWizard />;
}
