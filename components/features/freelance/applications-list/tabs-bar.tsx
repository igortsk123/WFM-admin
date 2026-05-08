"use client"

import { Badge } from "@/components/ui/badge"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SingleSelectCombobox } from "@/components/shared/single-select-combobox"

import { TAB_LABELS, TAB_STATUS_MAP } from "./_shared"

interface TabsBarProps {
  tab: string
  onChange: (tab: string) => void
  tabCounts: Record<string, number>
}

export function TabsBar({ tab, onChange, tabCounts }: TabsBarProps) {
  return (
    <>
      {/* Desktop tabs */}
      <ScrollArea className="hidden md:block w-full">
        <Tabs value={tab} onValueChange={(v) => onChange(v)}>
          <TabsList className="h-9">
            {Object.keys(TAB_STATUS_MAP).map((key) => (
              <TabsTrigger key={key} value={key} className="text-xs gap-1.5">
                {TAB_LABELS[key]}
                {tabCounts[key] != null && tabCounts[key] > 0 && (
                  <Badge
                    variant="secondary"
                    className="h-4 min-w-4 px-1 text-[10px] rounded-full"
                  >
                    {tabCounts[key]}
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Mobile: tab as combobox */}
      <div className="md:hidden">
        <SingleSelectCombobox
          options={Object.keys(TAB_STATUS_MAP).map((key) => ({
            value: key,
            label: TAB_LABELS[key] + (tabCounts[key] ? ` (${tabCounts[key]})` : ""),
          }))}
          value={tab}
          onValueChange={(v) => onChange(v || "pending")}
          placeholder="Выберите вкладку"
          className="w-full sticky top-0 z-10"
        />
      </div>
    </>
  )
}
