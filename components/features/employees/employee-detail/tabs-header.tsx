"use client"

import { useTranslations } from "next-intl"

import type { UserDetail } from "@/lib/api/users"

import { TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"

interface EmployeeTabsHeaderProps {
  user: UserDetail
  t: ReturnType<typeof useTranslations<"screen.employeeDetail">>
}

const TAB_TRIGGER_CLASS =
  "rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none"

export function EmployeeTabsHeader({ user, t }: EmployeeTabsHeaderProps) {
  return (
    <ScrollArea className="w-full">
      <TabsList className="h-10 inline-flex w-auto min-w-full justify-start rounded-none border-b bg-transparent p-0">
        {/* Базовые вкладки — порядок: Профиль → Задачи → Смены → Зоны → Типы → История */}
        {(["profile", "tasks", "shifts", "permissions", "work_types", "history"] as const).map((tab) => (
          <TabsTrigger key={tab} value={tab} className={TAB_TRIGGER_CLASS}>
            {t(`tabs.${tab}`)}
          </TabsTrigger>
        ))}
        {/* Documents tab — только для FREELANCE (внештатникам нужны паспорт/ИНН/договор) */}
        {user.type === "FREELANCE" && (
          <TabsTrigger value="documents" className={TAB_TRIGGER_CLASS}>
            {t("tabs.documents")}
          </TabsTrigger>
        )}
        {/* FREELANCE-only tabs */}
        {user.type === "FREELANCE" && (
          <>
            <TabsTrigger value="services" className={TAB_TRIGGER_CLASS}>
              {t("tabs.services")}
            </TabsTrigger>
            {user.payment_mode !== "CLIENT_DIRECT" && (
              <TabsTrigger value="payouts" className={TAB_TRIGGER_CLASS}>
                {t("tabs.payouts")}
              </TabsTrigger>
            )}
            <TabsTrigger value="rating" className={TAB_TRIGGER_CLASS}>
              {t("tabs.rating")}
            </TabsTrigger>
          </>
        )}
      </TabsList>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  )
}
