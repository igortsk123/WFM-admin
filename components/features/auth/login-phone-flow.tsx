"use client"

import { useState, useEffect, useCallback } from "react"
import { useTranslations } from "next-intl"
import { useLocale } from "next-intl"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { ArrowLeft, Send, MessageCircle, Phone, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  LazyInputOTP as InputOTP,
  LazyInputOTPGroup as InputOTPGroup,
  LazyInputOTPSlot as InputOTPSlot,
} from "@/components/shared/lazy-input-otp"
import { cn } from "@/lib/utils"
import { requestPhoneCode, verifyPhoneCode } from "@/lib/api/auth"
import type { FunctionalRole } from "@/lib/types"

type PhoneStep = "phone-input" | "channel-select" | "code-verify"
type Channel = "telegram" | "max" | "call"

interface LoginPhoneFlowProps {
  onBack: () => void
  onSuccess: (role?: FunctionalRole) => void
}

const channelConfig: Record<Channel, { icon: typeof Send }> = {
  telegram: { icon: Send },
  max: { icon: MessageCircle },
  call: { icon: Phone },
}

// Phone validation - simple regex, locale-aware
const phoneSchemaRu = z.object({
  phone: z.string().regex(/^\+7\s?\(?\d{3}\)?\s?\d{3}[-\s]?\d{2}[-\s]?\d{2}$/, "validation.phone"),
  rememberMe: z.boolean().optional(),
})

const phoneSchemaEn = z.object({
  phone: z.string().min(10, "validation.phone"),
  rememberMe: z.boolean().optional(),
})

export function LoginPhoneFlow({ onBack, onSuccess }: LoginPhoneFlowProps) {
  const t = useTranslations("screen.login")
  const tValidation = useTranslations("validation")
  const locale = useLocale()

  const [step, setStep] = useState<PhoneStep>("phone-input")
  const [phone, setPhone] = useState("")
  const [channel, setChannel] = useState<Channel | null>(null)
  const [code, setCode] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(0)

  const phoneSchema = locale === "ru" ? phoneSchemaRu : phoneSchemaEn

  const form = useForm<z.infer<typeof phoneSchemaRu>>({
    resolver: zodResolver(phoneSchema),
    defaultValues: {
      phone: "",
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
    if (locale === "ru") {
      const formatted = formatPhoneRu(value)
      form.setValue("phone", formatted)
    } else {
      form.setValue("phone", value)
    }
  }

  async function handlePhoneSubmit(data: z.infer<typeof phoneSchemaRu>) {
    setPhone(data.phone)
    setStep("channel-select")
  }

  async function handleChannelSubmit() {
    if (!channel) return

    setIsSubmitting(true)
    setError(null)

    try {
      const result = await requestPhoneCode(phone, channel)
      if (result.success) {
        setCountdown(60)
        setStep("code-verify")
      } else {
        setError(result.error?.message ?? t("error_invalid_phone"))
      }
    } catch {
      setError(t("error_invalid_phone"))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCodeComplete = useCallback(async (value: string) => {
    if (value.length !== 4) return

    setIsSubmitting(true)
    setError(null)

    try {
      // Mock: code "1234" is valid
      if (value === "1234") {
        await verifyPhoneCode(phone, value.padEnd(6, "0"))
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
  }, [phone, onSuccess, t])

  async function handleResendCode() {
    if (countdown > 0 || !channel) return

    setIsSubmitting(true)
    setError(null)

    try {
      const result = await requestPhoneCode(phone, channel)
      if (result.success) {
        setCountdown(60)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleBack() {
    if (step === "code-verify") {
      setStep("channel-select")
      setCode("")
    } else if (step === "channel-select") {
      setStep("phone-input")
      setChannel(null)
    } else {
      onBack()
    }
  }

  const channels: Channel[] = ["telegram", "max", "call"]
  const channelLabels: Record<Channel, string> = {
    telegram: t("channel_telegram"),
    max: t("channel_max"),
    call: t("channel_call"),
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

      {step === "phone-input" && (
        <div className="flex flex-col gap-6">
          <h2 className="text-xl font-semibold text-foreground">
            {t("phone_title")}
          </h2>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handlePhoneSubmit)} className="flex flex-col gap-4">
              <FormField
                control={form.control}
                name="phone"
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
                        autoFocus
                      />
                    </FormControl>
                    <FormMessage>{tValidation("phone")}</FormMessage>
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

              <Button type="submit" className="w-full h-11">
                {t("method_continue")}
              </Button>
            </form>
          </Form>
        </div>
      )}

      {step === "channel-select" && (
        <div className="flex flex-col gap-6">
          <h2 className="text-xl font-semibold text-foreground">
            {t("channel_title")}
          </h2>

          <RadioGroup
            value={channel ?? ""}
            onValueChange={(value) => setChannel(value as Channel)}
            className="flex flex-col gap-3"
          >
            {channels.map((ch) => {
              const Icon = channelConfig[ch].icon
              const isSelected = channel === ch

              return (
                <Label key={ch} htmlFor={`channel-${ch}`} className="cursor-pointer">
                  <Card
                    className={cn(
                      "transition-colors",
                      isSelected
                        ? "border-primary ring-1 ring-primary"
                        : "hover:border-muted-foreground/30"
                    )}
                  >
                    <CardContent className="flex items-start gap-4 p-4">
                      <RadioGroupItem
                        value={ch}
                        id={`channel-${ch}`}
                        className="mt-0.5 shrink-0"
                      />
                      <div
                        className={cn(
                          "flex size-9 shrink-0 items-center justify-center rounded-lg",
                          isSelected ? "bg-primary/10" : "bg-muted"
                        )}
                      >
                        <Icon
                          className={cn(
                            "size-4",
                            isSelected ? "text-primary" : "text-muted-foreground"
                          )}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground">
                          {channelLabels[ch]}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {t(`channel_${ch}_hint`)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </Label>
              )
            })}
          </RadioGroup>

          <p className="text-xs text-muted-foreground">
            {t("channel_sms_fallback")}
          </p>

          <Button
            onClick={handleChannelSubmit}
            disabled={!channel || isSubmitting}
            className="w-full h-11"
          >
            {isSubmitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              t("channel_send")
            )}
          </Button>
        </div>
      )}

      {step === "code-verify" && (
        <div className="flex flex-col gap-6">
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              {t("code_title")}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("code_sent_via", { channel: channelLabels[channel!], phone })}
            </p>
          </div>

          <div className="flex flex-col items-center gap-4">
            <InputOTP
              maxLength={4}
              value={code}
              onChange={setCode}
              onComplete={handleCodeComplete}
              disabled={isSubmitting}
              autoFocus
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} className="size-14 text-2xl" />
                <InputOTPSlot index={1} className="size-14 text-2xl" />
                <InputOTPSlot index={2} className="size-14 text-2xl" />
                <InputOTPSlot index={3} className="size-14 text-2xl" />
              </InputOTPGroup>
            </InputOTP>

            {isSubmitting && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                <span>{t("code_sign_in")}</span>
              </div>
            )}
          </div>

          <div className="text-center">
            {countdown > 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("code_resend_in", { time: `${countdown}s` })}
              </p>
            ) : (
              <Button
                variant="link"
                onClick={handleResendCode}
                disabled={isSubmitting}
                className="text-sm"
              >
                {t("code_resend")}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
