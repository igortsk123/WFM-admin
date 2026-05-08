"use client"

import { useTranslations } from "next-intl"

import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { TaskTabCounts } from "@/lib/api/tasks"

import { TAB_KEYS, type TabKey } from "./_shared"

interface TabsRowProps {
  activeTab: TabKey
  onChange: (tab: TabKey) => void
  tabCounts: TaskTabCounts | null
}

export function TabsRow({ activeTab, onChange, tabCounts }: TabsRowProps) {
  const t = useTranslations("screen.tasks")

  return (
    <ScrollArea className="w-full" type="scroll">
      <Tabs value={activeTab} onValueChange={(v) => onChange(v as TabKey)}>
        <TabsList className="h-9 gap-0.5 bg-muted/50 p-0.5 flex-nowrap w-max">
          {TAB_KEYS.map((tab) => {
            const count = tabCounts
              ? tab === "all"
                ? tabCounts.all
                : tab === "active"
                  ? tabCounts.active
                  : tab === "on_review"
                    ? tabCounts.on_review
                    : tab === "completed"
                      ? tabCounts.completed
                      : tab === "rejected"
                        ? tabCounts.rejected
                        : tabCounts.archived
              : null

            return (
              <TabsTrigger
                key={tab}
                value={tab}
                className="h-8 px-3 text-sm whitespace-nowrap"
              >
                {t(`tabs.${tab}`)}
                {count !== null && (
                  <Badge
                    variant="secondary"
                    className="ml-1.5 h-5 px-1.5 text-xs font-normal"
                  >
                    {count}
                  </Badge>
                )}
              </TabsTrigger>
            )
          })}
        </TabsList>
      </Tabs>
    </ScrollArea>
  )
}
