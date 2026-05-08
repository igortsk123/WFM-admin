"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";

import { type LeaderboardPeriod } from "@/lib/api/leaderboards";
import { ADMIN_ROUTES } from "@/lib/constants/routes";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { PageHeader } from "@/components/shared/page-header";

import { CreateChallengeDialog } from "./leaderboards/create-challenge-dialog";
import { ChallengesTab } from "./leaderboards/tab-challenges";
import { StoresTab } from "./leaderboards/tab-stores";
import { TeamsTab } from "./leaderboards/tab-teams";
import { UsersTab } from "./leaderboards/tab-users";

export function Leaderboards() {
  const t = useTranslations("screen.leaderboards");
  const [period, setPeriod] = useState<LeaderboardPeriod>("month");
  const [activeTab, setActiveTab] = useState("users");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // In production this would come from auth context
  const canManage = true;

  const breadcrumbs = [
    { label: t("breadcrumbs.home"), href: ADMIN_ROUTES.dashboard },
    { label: t("breadcrumbs.future") },
    { label: t("breadcrumbs.leaderboards") },
  ];

  const periodOptions: Array<{ key: LeaderboardPeriod; label: string }> = [
    { key: "week", label: t("filters.period_week") },
    { key: "month", label: t("filters.period_month") },
    { key: "quarter", label: t("filters.period_quarter") },
  ];

  return (
    <div className="space-y-6 pb-10">
      {/* Page header */}
      <PageHeader
        title={t("page_title")}
        subtitle={t("page_subtitle")}
        breadcrumbs={breadcrumbs}
        actions={
          <Badge variant="secondary" className="text-xs font-semibold">
            {t("beta_badge")}
          </Badge>
        }
      />

      {/* Sticky toolbar */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b -mx-4 md:-mx-6 px-4 md:px-6 py-3 flex flex-wrap items-center gap-3">
        {/* Period switcher */}
        <Tabs
          value={period}
          onValueChange={(v) => setPeriod(v as LeaderboardPeriod)}
        >
          <TabsList className="h-8">
            {periodOptions.map((p) => (
              <TabsTrigger key={p.key} value={p.key} className="text-xs px-3">
                {p.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex-1" />

        {canManage && (
          <Button
            size="sm"
            onClick={() => setCreateDialogOpen(true)}
            className="shrink-0 min-h-[36px] min-w-[44px]"
          >
            <Plus className="size-4 mr-1.5" />
            <span className="hidden sm:inline">{t("actions.create_challenge")}</span>
            <span className="sm:hidden" aria-label={t("actions.create_challenge")} />
          </Button>
        )}
      </div>

      {/* Main content tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto -mx-4 md:-mx-0 px-4 md:px-0">
          <TabsList className="mb-4 w-full sm:w-auto">
            <TabsTrigger value="users">{t("tabs.users")}</TabsTrigger>
            <TabsTrigger value="stores">{t("tabs.stores")}</TabsTrigger>
            <TabsTrigger value="teams">{t("tabs.teams")}</TabsTrigger>
            <TabsTrigger value="challenges">{t("tabs.challenges")}</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="users" className="mt-0 space-y-4">
          <UsersTab period={period} t={t} />
        </TabsContent>

        <TabsContent value="stores" className="mt-0 space-y-4">
          <StoresTab period={period} t={t} />
        </TabsContent>

        <TabsContent value="teams" className="mt-0 space-y-4">
          <TeamsTab period={period} t={t} />
        </TabsContent>

        <TabsContent value="challenges" className="mt-0 space-y-4">
          <ChallengesTab
            canManage={canManage}
            onCreateChallenge={() => setCreateDialogOpen(true)}
            t={t}
          />
        </TabsContent>
      </Tabs>

      <CreateChallengeDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={() => setActiveTab("challenges")}
        t={t}
      />
    </div>
  );
}
