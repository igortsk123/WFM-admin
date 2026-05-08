import { useEffect, useState } from "react";

import {
  getTeams,
  type LeaderboardPeriod,
  type Team,
} from "@/lib/api/leaderboards";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

import { getInitials, type T } from "./_shared";
import { AvatarGroupRow } from "./indicators";

export function TeamsTab({
  period,
  t,
}: {
  period: LeaderboardPeriod;
  t: T;
}) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  useEffect(() => {
    setLoading(true);
    getTeams({ period })
      .then((res) => setTeams(res.data))
      .finally(() => setLoading(false));
  }, [period]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-36" />
        ))}
      </div>
    );
  }

  return (
    <>
      <p className="text-sm text-muted-foreground">{t("teams_tab.section_subtitle")}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
        {teams.map((team) => (
          <Card
            key={team.id}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setSelectedTeam(team)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && setSelectedTeam(team)}
          >
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-sm leading-tight">{team.name}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {team.store_name}
                  </p>
                </div>
                <Badge
                  variant={team.status === "active" ? "default" : "secondary"}
                  className="shrink-0 text-xs"
                >
                  {team.status === "active" ? "Активна" : "Пауза"}
                </Badge>
              </div>

              <div className="flex items-center justify-between gap-4">
                <AvatarGroupRow members={team.members} total={team.members_total} />
                <span className="text-xs text-muted-foreground shrink-0">
                  {t("teams_tab.members_count", { count: team.members_total })}
                </span>
              </div>

              <div className="flex items-end justify-between gap-4">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {t("teams_tab.activity_label")}
                    </span>
                    <span className="text-xs font-medium">{team.activity_pct}%</span>
                  </div>
                  <Progress value={team.activity_pct} className="h-1.5" />
                </div>
                <div className="shrink-0 text-right">
                  <span className="text-xs text-muted-foreground">{t("teams_tab.score_label")}</span>
                  <p className="text-base font-bold leading-tight">
                    {team.points.toLocaleString("ru-RU")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Team detail drawer */}
      <Drawer
        open={!!selectedTeam}
        onOpenChange={(open) => !open && setSelectedTeam(null)}
        direction="right"
      >
        <DrawerContent>
          <DrawerHeader className="border-b">
            <DrawerTitle>
              {selectedTeam
                ? t("teams_tab.drawer_title", { name: selectedTeam.name })
                : ""}
            </DrawerTitle>
            {selectedTeam && (
              <DrawerDescription>{selectedTeam.store_name}</DrawerDescription>
            )}
          </DrawerHeader>
          {selectedTeam && (
            <div className="overflow-y-auto flex-1 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {t("teams_tab.score_label")}
                </span>
                <span className="text-xl font-bold">
                  {selectedTeam.points.toLocaleString("ru-RU")}
                </span>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {t("teams_tab.activity_label")}
                  </span>
                  <span className="text-sm font-medium">{selectedTeam.activity_pct}%</span>
                </div>
                <Progress value={selectedTeam.activity_pct} className="h-2" />
              </div>
              <div>
                <p className="text-sm font-semibold mb-2">{t("teams_tab.drawer_members")}</p>
                <div className="space-y-2">
                  {selectedTeam.members.map((m) => (
                    <div key={m.user_id} className="flex items-center gap-2.5">
                      <Avatar className="size-8">
                        <AvatarFallback className="text-xs bg-muted text-muted-foreground">
                          {getInitials(m.user_name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{m.user_name}</span>
                    </div>
                  ))}
                  {selectedTeam.members_total > selectedTeam.members.length && (
                    <p className="text-xs text-muted-foreground pl-10">
                      +{selectedTeam.members_total - selectedTeam.members.length}{" "}
                      ещё
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
          <div className="p-4 border-t">
            <DrawerClose asChild>
              <Button variant="outline" className="w-full">
                Закрыть
              </Button>
            </DrawerClose>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
