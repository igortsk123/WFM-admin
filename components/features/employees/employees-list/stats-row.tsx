"use client"

import * as React from "react"
import { useTranslations } from "next-intl"

import { Badge } from "@/components/ui/badge"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface StatsRowProps {
  statusParam: string
  activeCount: number
  archivedCount: number
  onStatusChange: (status: string) => void
}

export function StatsRow({
  statusParam,
  activeCount,
  archivedCount,
  onStatusChange,
}: StatsRowProps) {
  const t = useTranslations("screen.employees")

  return (
    <ScrollArea className="w-full">
      <Tabs value={statusParam} onValueChange={onStatusChange}>
        <TabsList className="h-9">
          <TabsTrigger value="active">
            {t("tabs.employees")}
            {activeCount > 0 && (
              <Badge
                variant="secondary"
                className="ml-1.5 text-xs h-5 px-1.5"
              >
                {activeCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="archived">
            {t("tabs.archived")}
            {archivedCount > 0 && (
              <Badge
                variant="secondary"
                className="ml-1.5 text-xs h-5 px-1.5"
              >
                {archivedCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
      </Tabs>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  )
}
