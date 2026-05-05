"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { ListChecks, Users, BarChart3 } from "lucide-react"

import { useRouter } from "@/i18n/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { LanguageSwitcher } from "@/components/shared/language-switcher"
import { LoginMethodStep, type AuthMethod } from "./login-method-step"
import { LoginPhoneFlow } from "./login-phone-flow"
import { LoginEmailFlow } from "./login-email-flow"
import { LoginTotpFlow } from "./login-totp-flow"
import { ADMIN_ROUTES, AGENT_ROUTES } from "@/lib/constants/routes"
import type { FunctionalRole } from "@/lib/types"

type Step = "method-select" | "phone" | "email" | "totp"

const valueProps = [
  { icon: ListChecks, key: "value_tasks" },
  { icon: Users, key: "value_team" },
  { icon: BarChart3, key: "value_analytics" },
] as const

export function LoginForm() {
  const t = useTranslations("screen.login")
  const router = useRouter()
  const [step, setStep] = useState<Step>("method-select")

  function handleMethodSelect(method: AuthMethod) {
    setStep(method)
  }

  function handleBack() {
    setStep("method-select")
  }

  function handleSuccess(role: FunctionalRole = "SUPERVISOR") {
    // Persist role in cookie so middleware route guards can read it
    document.cookie = `wfm-current-role=${role}; path=/; samesite=lax; max-age=86400`;

    // Small delay for UX before redirect
    setTimeout(() => {
      if (role === "AGENT") {
        router.push(AGENT_ROUTES.dashboard)
      } else {
        router.push(ADMIN_ROUTES.dashboard)
      }
    }, 300)
  }

  return (
    <div className="flex min-h-svh w-full">
      {/* Branding Panel - hidden on mobile */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-primary p-10 text-primary-foreground">
        <div>
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary-foreground/10">
              <span className="text-xl font-bold">W</span>
            </div>
            <span className="text-xl font-semibold">WFM Admin</span>
          </div>
        </div>

        <div className="space-y-6">
          {/* Tagline */}
          <h1 className="text-3xl font-bold tracking-tight text-balance">
            {t("tagline")}
          </h1>

          {/* Value Props */}
          <ul className="space-y-4">
            {valueProps.map(({ icon: Icon, key }) => (
              <li key={key} className="flex items-center gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/10">
                  <Icon className="size-5" />
                </div>
                <span className="text-base">{t(key)}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <p className="text-sm text-primary-foreground/60">
          {"© WFM 2026 · Powered by Beyond Violet"}
        </p>
      </div>

      {/* Form Panel */}
      <div className="relative flex w-full flex-col items-center justify-center p-4 lg:w-1/2 lg:p-10">
        {/* Language Switcher - positioned top right */}
        <div className="absolute right-4 top-4 lg:right-10 lg:top-10">
          <LanguageSwitcher variant="full" />
        </div>

        {/* Mobile Logo - shown only on mobile */}
        <div className="mb-8 flex items-center gap-2 lg:hidden">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary">
            <span className="text-xl font-bold text-primary-foreground">W</span>
          </div>
          <span className="text-xl font-semibold text-foreground">WFM Admin</span>
        </div>

        {/* Form Card */}
        <Card className="w-full max-w-md border-0 shadow-none lg:border lg:shadow-sm">
          <CardContent className="p-0 lg:p-6">
            {step === "method-select" && (
              <LoginMethodStep onMethodSelect={handleMethodSelect} />
            )}

            {step === "phone" && (
              <LoginPhoneFlow onBack={handleBack} onSuccess={handleSuccess} />
            )}

            {step === "email" && (
              <LoginEmailFlow onBack={handleBack} onSuccess={handleSuccess} />
            )}

            {step === "totp" && (
              <LoginTotpFlow onBack={handleBack} onSuccess={handleSuccess} />
            )}
          </CardContent>
        </Card>

        {/* Mobile tagline - shown only on mobile */}
        <p className="mt-8 text-center text-xs text-muted-foreground lg:hidden">
          {"© WFM 2026 · Powered by Beyond Violet"}
        </p>
      </div>
    </div>
  )
}
