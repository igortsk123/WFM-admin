"use client"

import { useState, useCallback } from "react"
import { useTranslations, useLocale } from "next-intl"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { ArrowLeft, Loader2, KeyRound } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { verifyTotp } from "@/lib/api/auth"

type TotpStep = "totp-identifier" | "totp-code"
type IdentifierType = "phone" | "email"

interface LoginTotpFlowProps {
  onBack: () => void
  onSuccess: () => void
}

const phoneSchemaRu = z.object({
  identifier: z.string().regex(/^\+7\s?\(?\d{3}\)?\s?\d{3}[-\s]?\d{2}[-\s]?\d{2}$/, "validation.phone"),
})

const phoneSchemaEn = z.object({
  identifier: z.string().min(10, "validation.phone"),
})

const emailSchema = z.object({
  identifier: z.string().email("validation.email"),
})

export function LoginTotpFlow({ onBack, onSuccess }: LoginTotpFlowProps) {
  const t = useTranslations("screen.login")
  const tValidation = useTranslations("validation")
  const locale = useLocale()

  const [step, setStep] = useState<TotpStep>("totp-identifier")
  const [identifierType, setIdentifierType] = useState<IdentifierType>("phone")
  const [identifier, setIdentifier] = useState("")
  const [code, setCode] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const currentSchema = identifierType === "email" 
    ? emailSchema 
    : (locale === "ru" ? phoneSchemaRu : phoneSchemaEn)

  const form = useForm<{ identifier: string }>({
    resolver: zodResolver(currentSchema),
    defaultValues: {
      identifier: "",
    },
  })

  // Reset form when switching identifier type
  function handleIdentifierTypeChange(type: string) {
    setIdentifierType(type as IdentifierType)
    form.reset({ identifier: "" })
    setError(null)
  }

  // Format phone input for RU locale
  function formatPhoneRu(value: string): string {
    const digits = value.replace(/\D/g, "")
    if (digits.length === 0) return ""
    if (digits.length <= 1) return `+${digits}`
    if (digits.length <= 4) return `+${digits.slice(0, 1)} (${digits.slice(1)}`
    if (digits.length <= 7) return `+${digits.slice(0, 1)} (${digits.slice(1, 4)}) ${digits.slice(4)}`
    if (digits.length <= 9) return `+${digits.slice(0, 1)} (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
    return `+${digits.slice(0, 1)} (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9, 11)}`
  }

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    if (identifierType === "phone" && locale === "ru") {
      const formatted = formatPhoneRu(value)
      form.setValue("identifier", formatted)
    } else {
      form.setValue("identifier", value)
    }
  }

  async function handleIdentifierSubmit(data: { identifier: string }) {
    setIdentifier(data.identifier)
    setStep("totp-code")
  }

  const handleCodeComplete = useCallback(async (value: string) => {
    if (value.length !== 6) return

    setIsSubmitting(true)
    setError(null)

    try {
      // Mock: code "123456" is valid
      if (value === "123456") {
        await verifyTotp(4, value) // Mock user ID 4
        onSuccess()
      } else {
        setError(t("error_invalid_code"))
        setCode("")
      }
    } catch {
      setError(t("error_invalid_code"))
      setCode("")
    } finally {
      setIsSubmitting(false)
    }
  }, [onSuccess, t])

  function handleBack() {
    if (step === "totp-code") {
      setStep("totp-identifier")
      setCode("")
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

      {step === "totp-identifier" && (
        <div className="flex flex-col gap-6">
          <h2 className="text-xl font-semibold text-foreground">
            {t("totp_identifier_title")}
          </h2>

          <Tabs value={identifierType} onValueChange={handleIdentifierTypeChange}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="phone">{t("totp_tab_phone")}</TabsTrigger>
              <TabsTrigger value="email">{t("totp_tab_email")}</TabsTrigger>
            </TabsList>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleIdentifierSubmit)} className="flex flex-col gap-4 mt-4">
                <TabsContent value="phone" className="mt-0">
                  <FormField
                    control={form.control}
                    name="identifier"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            {...field}
                            type="tel"
                            placeholder={locale === "ru" ? "+7 (___) ___-__-__" : t("phone_placeholder")}
                            className="h-11 text-base"
                            onChange={handlePhoneChange}
                            autoComplete="tel"
                          />
                        </FormControl>
                        <FormMessage>{tValidation("phone")}</FormMessage>
                      </FormItem>
                    )}
                  />
                </TabsContent>

                <TabsContent value="email" className="mt-0">
                  <FormField
                    control={form.control}
                    name="identifier"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            {...field}
                            type="email"
                            placeholder={t("email_placeholder")}
                            className="h-11 text-base"
                            autoComplete="email"
                          />
                        </FormControl>
                        <FormMessage>{tValidation("email")}</FormMessage>
                      </FormItem>
                    )}
                  />
                </TabsContent>

                <Button type="submit" className="w-full h-11">
                  {t("method_continue")}
                </Button>
              </form>
            </Form>
          </Tabs>
        </div>
      )}

      {step === "totp-code" && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-4 py-2">
            <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
              <KeyRound className="size-7 text-primary" />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-semibold text-foreground">
                {t("totp_code_title")}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("totp_code_subtitle", { identifier })}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-4">
            <InputOTP
              maxLength={6}
              value={code}
              onChange={setCode}
              onComplete={handleCodeComplete}
              disabled={isSubmitting}
              autoFocus
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} className="size-12 text-xl md:size-14 md:text-2xl" />
                <InputOTPSlot index={1} className="size-12 text-xl md:size-14 md:text-2xl" />
                <InputOTPSlot index={2} className="size-12 text-xl md:size-14 md:text-2xl" />
                <InputOTPSlot index={3} className="size-12 text-xl md:size-14 md:text-2xl" />
                <InputOTPSlot index={4} className="size-12 text-xl md:size-14 md:text-2xl" />
                <InputOTPSlot index={5} className="size-12 text-xl md:size-14 md:text-2xl" />
              </InputOTPGroup>
            </InputOTP>

            {isSubmitting && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                <span>{t("code_sign_in")}</span>
              </div>
            )}
          </div>

          <p className="text-center text-xs text-muted-foreground">
            {t("totp_code_hint")}
          </p>
        </div>
      )}
    </div>
  )
}
