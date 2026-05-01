import { Metadata } from "next"
import { getTranslations } from "next-intl/server"

import { LoginForm } from "@/components/features/auth/login-form"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("screen.login")

  return {
    title: t("method_title"),
    description: t("method_subtitle"),
  }
}

export default function LoginPage() {
  return <LoginForm />
}
