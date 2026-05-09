"use client";

import { useTranslations } from "next-intl";

import { TabsList, TabsTrigger } from "@/components/ui/tabs";

import { ComboboxFilter } from "./combobox-filter";
import type { TabKey } from "./_shared";

interface SectionTabsProps {
  tabs: TabKey[];
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
}

export function SectionTabs({ tabs, activeTab, onTabChange }: SectionTabsProps) {
  const t = useTranslations("screen.freelanceServicesList");
  const tc = useTranslations("common");

  return (
    <>
      {/* Desktop tab list */}
      <div className="hidden md:block overflow-x-auto">
        <TabsList className="h-auto gap-1 bg-muted/50 p-1 flex-wrap">
          {tabs.map((tabKey) => (
            <TabsTrigger key={tabKey} value={tabKey} className="text-sm">
              {t(`tabs.${tabKey}` as Parameters<typeof t>[0])}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      {/* Mobile: combobox tab selector */}
      <div className="md:hidden">
        <ComboboxFilter
          options={tabs.map((tabKey) => ({
            value: tabKey,
            label: t(`tabs.${tabKey}` as Parameters<typeof t>[0]),
          }))}
          value={activeTab}
          onChange={(v) => onTabChange((v || "all") as TabKey)}
          placeholder={t("tabs.all")}
          buttonLabel={tc("filter")}
        />
      </div>
    </>
  );
}
