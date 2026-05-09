"use client";

import * as React from "react";
import { useTranslations, useLocale } from "next-intl";

import { Tabs, TabsContent } from "@/components/ui/tabs";

import { PageHeader } from "@/components/shared/page-header";

import { ADMIN_ROUTES } from "@/lib/constants/routes";
import type { Locale } from "@/lib/types";

import {
  CATEGORY_OPTIONS,
  TAB_VALUES,
  type PeriodOption,
  type TabValue,
} from "./notifications-center/_shared";
import { SectionHeaderActions } from "./notifications-center/section-header-actions";
import { SectionList } from "./notifications-center/section-list";
import { SectionTabsHeader } from "./notifications-center/section-tabs-header";
import {
  SectionToolbar,
  type FilterChipDescriptor,
} from "./notifications-center/section-toolbar";
import { useNotificationsData } from "./notifications-center/use-notifications-data";

export function NotificationsCenter() {
  const t = useTranslations("screen.notifications");
  const locale = useLocale() as Locale;

  // ── Filter / tab state ─────────────────────────────────────────
  const [activeTab, setActiveTab] = React.useState<TabValue>("all");
  const [search, setSearch] = React.useState("");
  const [category, setCategory] = React.useState<string>("all");
  const [period, setPeriod] = React.useState<PeriodOption>("30d");

  // ── Dialog state ───────────────────────────────────────────────
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [markAllOpen, setMarkAllOpen] = React.useState(false);

  // ── Data hook ──────────────────────────────────────────────────
  const {
    notifications,
    unreadCount,
    archivedCount,
    aiUnreadCount,
    total,
    loading,
    error,
    hasMore,
    fetchNotifications,
    loadMore,
    handleMarkRead,
    handleArchive,
    handleMarkAllRead,
    handleNavigate,
  } = useNotificationsData({ activeTab, search, category, period });

  // ── Derived: active filter count for mobile sheet ──────────────
  const activeFilterCount =
    (category !== "all" ? 1 : 0) + (period !== "30d" ? 1 : 0);

  // ── Derived: filter chips ──────────────────────────────────────
  const filterChips: FilterChipDescriptor[] = [];
  if (category !== "all") {
    const cat = CATEGORY_OPTIONS.find((c) => c.value === category);
    if (cat) {
      filterChips.push({
        label: t("filters.category"),
        value: t(cat.labelKey as Parameters<typeof t>[0]),
        onRemove: () => setCategory("all"),
      });
    }
  }
  if (period !== "30d") {
    const periodLabels: Record<PeriodOption, string> = {
      today: "Сегодня",
      "7d": "7 дней",
      "30d": "30 дней",
      all: "Всё время",
    };
    filterChips.push({
      label: t("filters.date_range"),
      value: periodLabels[period],
      onRemove: () => setPeriod("30d"),
    });
  }

  // ── Handlers ───────────────────────────────────────────────────
  function handleTabChange(value: string) {
    setActiveTab(value as TabValue);
    setSearch("");
    setCategory("all");
    setPeriod("30d");
  }

  function handleClearFilters() {
    setCategory("all");
    setPeriod("30d");
  }

  function handleResetAllFilters() {
    setSearch("");
    setCategory("all");
    setPeriod("30d");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("breadcrumbs.notifications")}
        breadcrumbs={[
          { label: t("breadcrumbs.home"), href: ADMIN_ROUTES.dashboard },
          { label: t("breadcrumbs.notifications") },
        ]}
        actions={
          <SectionHeaderActions
            unreadCount={unreadCount}
            markAllOpen={markAllOpen}
            onMarkAllOpenChange={setMarkAllOpen}
            onMarkAllRead={handleMarkAllRead}
            settingsOpen={settingsOpen}
            onSettingsOpenChange={setSettingsOpen}
          />
        }
      />

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <SectionTabsHeader
          total={total}
          unreadCount={unreadCount}
          aiUnreadCount={aiUnreadCount}
          archivedCount={archivedCount}
        />

        {TAB_VALUES.map((tab) => (
          <TabsContent key={tab} value={tab} className="mt-4 space-y-4">
            <SectionToolbar
              search={search}
              onSearchChange={setSearch}
              category={category}
              onCategoryChange={setCategory}
              period={period}
              onPeriodChange={setPeriod}
              filterChips={filterChips}
              activeFilterCount={activeFilterCount}
              onClearFilters={handleClearFilters}
              onApplyFilters={() => fetchNotifications(true)}
            />

            <SectionList
              notifications={notifications}
              loading={loading}
              error={error}
              hasMore={hasMore}
              activeTab={activeTab}
              search={search}
              category={category}
              period={period}
              locale={locale}
              onRetry={() => fetchNotifications(true)}
              onLoadMore={loadMore}
              onMarkRead={handleMarkRead}
              onArchive={handleArchive}
              onNavigate={handleNavigate}
              onResetFilters={handleResetAllFilters}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
