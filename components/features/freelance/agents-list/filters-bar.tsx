"use client"

import { useTranslations } from "next-intl"

import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SingleSelectCombobox } from "@/components/shared/single-select-combobox"

import type { AgentTab } from "./_shared"

interface FiltersBarProps {
  activeTab: AgentTab
  onTabChange: (tab: string) => void
  searchValue: string
  onSearchChange: (v: string) => void
  typeValue: string
  onTypeChange: (v: string) => void
}

export function FiltersBar({
  activeTab,
  onTabChange,
  searchValue,
  onSearchChange,
  typeValue,
  onTypeChange,
}: FiltersBarProps) {
  const t = useTranslations("screen.freelanceAgents")

  const tabOptions = [
    { value: "active",  label: t("tabs.active") },
    { value: "blocked", label: t("tabs.blocked") },
    { value: "archive", label: t("tabs.archive") },
  ]

  const typeOptions = [
    { value: "INDIVIDUAL", label: t("type.INDIVIDUAL") },
    { value: "COMPANY", label: t("type.COMPANY") },
  ]

  return (
    <>
      {/* Tabs — desktop */}
      <div className="hidden md:block">
        <Tabs value={activeTab} onValueChange={onTabChange}>
          <TabsList>
            <TabsTrigger value="active">{t("tabs.active")}</TabsTrigger>
            <TabsTrigger value="blocked">{t("tabs.blocked")}</TabsTrigger>
            <TabsTrigger value="archive">{t("tabs.archive")}</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Tabs — mobile combobox */}
      <div className="md:hidden">
        <SingleSelectCombobox
          value={activeTab}
          onValueChange={(v) => onTabChange(v || "active")}
          placeholder={t("tabs.active")}
          options={tabOptions}
          className="min-w-[140px]"
        />
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap gap-2 items-center">
        <Input
          placeholder={t("filters.search")}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-9 w-full sm:w-64"
          aria-label={t("filters.search")}
        />
        <SingleSelectCombobox
          value={typeValue}
          onValueChange={onTypeChange}
          placeholder={t("filters.type")}
          options={typeOptions}
          className="min-w-[140px]"
        />
      </div>
    </>
  )
}
