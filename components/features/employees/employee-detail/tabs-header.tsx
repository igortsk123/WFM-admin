"use client"

import { useTranslations } from "next-intl"

import type { UserDetail } from "@/lib/api/users"

import { Badge } from "@/components/ui/badge"
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
        {(["profile", "tasks", "shifts", "permissions", "history"] as const).map((tab) => (
          <TabsTrigger key={tab} value={tab} className={TAB_TRIGGER_CLASS}>
            {t(`tabs.${tab}`)}
          </TabsTrigger>
        ))}
        {/* Documents tab */}
        <TabsTrigger value="documents" className={TAB_TRIGGER_CLASS}>
          {t("tabs.documents")}
          {user.type === "STAFF" && (
            <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">
              {t("documents.tab_optional")}
            </Badge>
          )}
        </TabsTrigger>
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
