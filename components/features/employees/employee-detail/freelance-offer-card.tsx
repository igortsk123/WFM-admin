"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { CheckCircle2, ChevronDown, ChevronUp, XCircle } from "lucide-react"

import type { UserDetail } from "@/lib/api/users"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

import type { FormatDate } from "./_shared"

interface FreelanceOfferCardProps {
  user: UserDetail
  locale: string
  formatDate: FormatDate
  t: ReturnType<typeof useTranslations<"screen.employeeDetail">>
  tCommon: ReturnType<typeof useTranslations<"common">>
  onSendLink: () => Promise<void>
}

export function FreelanceOfferCard({ user, locale, formatDate, t, tCommon, onSendLink }: FreelanceOfferCardProps) {
  const isSigned = !!user.oferta_accepted_at
  const [open, setOpen] = useState(!isSigned)
  const [sending, setSending] = useState(false)

  async function handleSend() {
    setSending(true)
    try {
      await onSendLink()
    } finally {
      setSending(false)
    }
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer select-none">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CardTitle className="text-base">{t("freelance_hero.offer_card_title")}</CardTitle>
                <span
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${
                    isSigned
                      ? "bg-success/10 text-success"
                      : "bg-warning/10 text-warning"
                  }`}
                >
                  {isSigned ? (
                    <CheckCircle2 className="size-3" aria-hidden="true" />
                  ) : (
                    <XCircle className="size-3" aria-hidden="true" />
                  )}
                  {isSigned ? t("freelance_hero.offer_signed") : t("freelance_hero.offer_not_signed")}
                </span>
              </div>
              {open ? (
                <ChevronUp className="size-4 text-muted-foreground" aria-hidden="true" />
              ) : (
                <ChevronDown className="size-4 text-muted-foreground" aria-hidden="true" />
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 pb-4">
            <div className="flex flex-col gap-3">
              {isSigned && user.oferta_accepted_at && (
                <p className="text-sm text-muted-foreground">
                  {t("freelance_hero.offer_signed_at", {
                    date: formatDate(user.oferta_accepted_at, locale),
                  })}
                </p>
              )}
              {!isSigned && (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-fit min-h-9"
                  onClick={handleSend}
                  disabled={sending}
                >
                  {sending ? tCommon("loading") : t("freelance_hero.offer_send_link")}
                </Button>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}
