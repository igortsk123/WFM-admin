"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { ArrowLeft, Mail, Loader2, CheckCircle2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { requestEmailMagicLink, verifyEmailMagicLink } from "@/lib/api/auth"
import type { FunctionalRole } from "@/lib/types"

type EmailStep = "email-input" | "email-sent"

interface LoginEmailFlowProps {
  onBack: () => void
  onSuccess: (role?: FunctionalRole) => void
}

const emailSchema = z.object({
  email: z.string().email("validation.email"),
  rememberMe: z.boolean().optional(),
})

export function LoginEmailFlow({ onBack, onSuccess }: LoginEmailFlowProps) {
  const t = useTranslations("screen.login")
  const tValidation = useTranslations("validation")

  const [step, setStep] = useState<EmailStep>("email-input")
  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(0)

  const form = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      email: "",
      rememberMe: false,
    },
  })

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  async function handleEmailSubmit(data: z.infer<typeof emailSchema>) {
    setIsSubmitting(true)
    setError(null)

    try {
      const result = await requestEmailMagicLink(data.email)
      if (result.success) {
        setEmail(data.email)
        setCountdown(60)
        setStep("email-sent")
      } else {
        setError(result.error?.message ?? t("error_invalid_email"))
      }
    } catch {
      setError(t("error_invalid_email"))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleResendEmail() {
    if (countdown > 0) return

    setIsSubmitting(true)
    setError(null)

    try {
      const result = await requestEmailMagicLink(email)
      if (result.success) {
        setCountdown(60)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleSimulateClick() {
    setIsSubmitting(true)
    try {
      await verifyEmailMagicLink("mock_token_12345")
      onSuccess()
    } catch {
      setError(t("error_invalid_email"))
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleBack() {
    if (step === "email-sent") {
      setStep("email-input")
    } else {
      onBack()
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Button
        variant="ghost"
        onClick={handleBack}
        className="w-fit -ml-2 gap-1.5 text-muted-foreground"
      >
        <ArrowLeft className="size-4" />
        {t("method_title")}
      </Button>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {step === "email-input" && (
        <div className="flex flex-col gap-6">
          <h2 className="text-xl font-semibold text-foreground">
            {t("email_title")}
          </h2>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleEmailSubmit)} className="flex flex-col gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        placeholder={t("email_placeholder")}
                        className="h-11 text-base"
                        autoComplete="email"
                        autoFocus
                      />
                    </FormControl>
                    <FormMessage>{tValidation("email")}</FormMessage>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="rememberMe"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="text-sm font-normal text-muted-foreground cursor-pointer">
                      {t("phone_remember")}
                    </FormLabel>
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={isSubmitting} className="w-full h-11">
                {isSubmitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  t("email_send_link")
                )}
              </Button>
            </form>
          </Form>
        </div>
      )}

      {step === "email-sent" && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="flex size-16 items-center justify-center rounded-full bg-success/10">
              <CheckCircle2 className="size-8 text-success" />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-semibold text-foreground">
                {t("email_sent_title")}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground max-w-xs">
                {t("email_sent_body", { email })}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="text-center">
              {countdown > 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("code_resend_in", { time: `${countdown}s` })}
                </p>
              ) : (
                <Button
                  variant="link"
                  onClick={handleResendEmail}
                  disabled={isSubmitting}
                  className="text-sm"
                >
                  {t("email_send_link")}
                </Button>
              )}
            </div>

            <p className="text-center text-xs text-muted-foreground">
              {t("email_spam_hint")}
            </p>
          </div>

          {/* Dev-only: Simulate click */}
          {process.env.NODE_ENV === "development" && (
            <Button
              variant="outline"
              onClick={handleSimulateClick}
              disabled={isSubmitting}
              className="w-full"
            >
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                t("email_simulate_click")
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
