"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Smartphone, Mail, KeyRound } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

export type AuthMethod = "phone" | "email" | "totp"

interface LoginMethodStepProps {
  onMethodSelect: (method: AuthMethod) => void
}

const methodConfig: Record<AuthMethod, { icon: typeof Smartphone }> = {
  phone: { icon: Smartphone },
  email: { icon: Mail },
  totp: { icon: KeyRound },
}

export function LoginMethodStep({ onMethodSelect }: LoginMethodStepProps) {
  const t = useTranslations("screen.login")
  const [selectedMethod, setSelectedMethod] = useState<AuthMethod | null>(null)

  const methods: AuthMethod[] = ["phone", "email", "totp"]

  function handleContinue() {
    if (selectedMethod) {
      onMethodSelect(selectedMethod)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {t("method_title")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("method_subtitle")}
        </p>
      </div>

      <RadioGroup
        value={selectedMethod ?? ""}
        onValueChange={(value) => setSelectedMethod(value as AuthMethod)}
        className="flex flex-col gap-3"
      >
        {methods.map((method) => {
          const Icon = methodConfig[method].icon
          const isSelected = selectedMethod === method

          return (
            <Label
              key={method}
              htmlFor={`method-${method}`}
              className="cursor-pointer"
            >
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
                    value={method}
                    id={`method-${method}`}
                    className="mt-1 shrink-0"
                  />
                  <div
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-lg",
                      isSelected ? "bg-primary/10" : "bg-muted"
                    )}
                  >
                    <Icon
                      className={cn(
                        "size-5",
                        isSelected ? "text-primary" : "text-muted-foreground"
                      )}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground">
                      {t(`method_${method}_title`)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t(`method_${method}_subtitle`)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Label>
          )
        })}
      </RadioGroup>

      <Button
        onClick={handleContinue}
        disabled={!selectedMethod}
        className="w-full h-11"
      >
        {t("method_continue")}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        {t("method_hint")}
      </p>
    </div>
  )
}
