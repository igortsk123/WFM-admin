"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Activity, Wallet } from "lucide-react";

import type { DashboardPeriod } from "@/lib/types";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { useAuth } from "@/lib/contexts/auth-context";

import { NetworkHealthTab } from "./network-health-tab";
import { BudgetTab } from "./budget-tab";

type TabKey = "health" | "budget";

const VALID_PERIODS: DashboardPeriod[] = ["7d", "30d", "current_month", "prev_month"];

function isValidTab(v: string | null): v is TabKey {
  return v === "health" || v === "budget";
}

function isValidPeriod(v: string | null): v is DashboardPeriod {
  return v !== null && (VALID_PERIODS as string[]).includes(v);
}

/**
 * Дашборд для SUPERVISOR / REGIONAL / NETWORK_OPS — два таба:
 * 1. Здоровье сети (прогноз/назначено часов, аномалии)
 * 2. Бюджет (расход внештата, риск нехватки, заявки на одобрение)
 *
 * Состояние табов и периода синхронизируется с URL: ?tab=health&period=current_month
 */
export function NetworkDashboard() {
  const t = useTranslations("screen.dashboard");
  const tHealth = useTranslations("screen.dashboard.health");
  const locale = useLocale();
  const { user } = useAuth();

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const tabParam = searchParams.get("tab");
  const periodParam = searchParams.get("period");

  const [activeTab, setActiveTab] = useState<TabKey>(isValidTab(tabParam) ? tabParam : "health");
  const [period, setPeriod] = useState<DashboardPeriod>(
    isValidPeriod(periodParam) ? periodParam : "current_month",
  );

  function updateUrl(nextTab: TabKey, nextPeriod: DashboardPeriod) {
    const sp = new URLSearchParams(searchParams.toString());
    sp.set("tab", nextTab);
    sp.set("period", nextPeriod);
    router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
  }

  function handleTabChange(v: string) {
    const next = isValidTab(v) ? v : "health";
    setActiveTab(next);
    updateUrl(next, period);
  }

  function handlePeriodChange(v: string) {
    const next = isValidPeriod(v) ? v : "current_month";
    setPeriod(next);
    updateUrl(activeTab, next);
  }

  const greetingKeyByHour = (() => {
    const h = new Date().getHours();
    if (h < 12) return "greeting_morning";
    if (h < 18) return "greeting_afternoon";
    return "greeting_evening";
  })();

  const dateLabel = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${t(greetingKeyByHour as Parameters<typeof t>[0])}, ${user.first_name}`}
        subtitle={dateLabel}
      />

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="health" className="gap-2">
              <Activity className="size-4" />
              {tHealth("tab_health")}
            </TabsTrigger>
            <TabsTrigger value="budget" className="gap-2">
              <Wallet className="size-4" />
              {tHealth("tab_budget")}
            </TabsTrigger>
          </TabsList>

          <Select value={period} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">{tHealth("period_7d")}</SelectItem>
              <SelectItem value="30d">{tHealth("period_30d")}</SelectItem>
              <SelectItem value="current_month">{tHealth("period_current_month")}</SelectItem>
              <SelectItem value="prev_month">{tHealth("period_prev_month")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <TabsContent value="health" className="mt-0">
          <NetworkHealthTab period={period} />
        </TabsContent>
        <TabsContent value="budget" className="mt-0">
          <BudgetTab period={period} locale={locale} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
