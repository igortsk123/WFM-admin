"use client"

import * as React from "react"
import { useTranslations, useLocale } from "next-intl"
import { Building2, User2, Download } from "lucide-react"

import { AgentStatusBadge } from "@/components/shared/agent-status-badge"
import { DetailPageHero } from "@/components/shared"
import { Badge } from "@/components/ui/badge"

import { formatDate, type AgentWithRoster } from "./_shared"

interface HeroCardProps {
  agent: AgentWithRoster
  t: ReturnType<typeof useTranslations>
}

export function HeroCard({ agent, t }: HeroCardProps) {
  const locale = useLocale()

  const rows: { label: string; value: React.ReactNode }[] = []

  if (agent.inn) rows.push({ label: t("hero.inn"), value: agent.inn })
  if (agent.kpp) rows.push({ label: t("hero.kpp"), value: agent.kpp })
  if (agent.ogrn) rows.push({ label: t("hero.ogrn"), value: agent.ogrn })
  if (agent.contact_person_name)
    rows.push({ label: t("hero.contact_person"), value: agent.contact_person_name })

  if (agent.contact_phone)
    rows.push({
      label: t("hero.phone"),
      value: (
        <a
          href={`tel:${agent.contact_phone}`}
          className="text-primary hover:underline underline-offset-2"
        >
          {agent.contact_phone}
        </a>
      ),
    })

  if (agent.contact_email)
    rows.push({
      label: t("hero.email"),
      value: (
        <a
          href={`mailto:${agent.contact_email}`}
          className="text-primary hover:underline underline-offset-2"
        >
          {agent.contact_email}
        </a>
      ),
    })

  rows.push({
    label: t("hero.contract"),
    value: (
      <div className="flex items-center gap-2">
        {agent.contract_signed_at ? (
          <Badge variant="outline" className="border-success text-success text-xs">
            {t("hero.contract_signed")}
          </Badge>
        ) : (
          <Badge variant="outline" className="border-muted-foreground text-muted-foreground text-xs">
            {t("hero.contract_unsigned")}
          </Badge>
        )}
        {agent.contract_url && (
          <a
            href={agent.contract_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-primary hover:underline underline-offset-2"
          >
            <Download className="size-3" aria-hidden="true" />
            {t("hero.contract_download")}
          </a>
        )}
      </div>
    ),
  })

  rows.push({
    label: t("hero.commission"),
    value: (
      <span className="font-semibold text-foreground">
        {t("hero.commission_label", { pct: agent.commission_pct })}
      </span>
    ),
  })

  if (agent.contract_signed_at)
    rows.push({
      label: t("hero.signed_at"),
      value: formatDate(agent.contract_signed_at, locale),
    })

  rows.push({
    label: t("hero.status"),
    value: <AgentStatusBadge status={agent.status} />,
  })

  const Icon = agent.type === "COMPANY" ? Building2 : User2
  const title = agent.type === "INDIVIDUAL" ? t("hero.type_individual") : t("hero.type_company")

  const leading = (
    <span className="flex size-10 items-center justify-center rounded-md bg-muted text-muted-foreground">
      <Icon className="size-5" aria-hidden="true" />
    </span>
  )

  const statsSlot = (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 md:grid-cols-3">
      {rows.map(({ label, value }) => (
        <div key={label} className="flex flex-col gap-0.5">
          <dt className="text-xs text-muted-foreground">{label}</dt>
          <dd className="text-sm text-foreground">{value}</dd>
        </div>
      ))}
    </dl>
  )

  return <DetailPageHero leading={leading} title={title} statsSlot={statsSlot} />
}
