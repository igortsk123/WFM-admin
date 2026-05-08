import { format } from "date-fns";
import { Gift, XCircle } from "lucide-react";

import type { Challenge } from "@/lib/api/leaderboards";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Progress } from "@/components/ui/progress";

import { getInitials, type T } from "./_shared";
import { ChallengeBadge, goalTypeLabel } from "./challenge-helpers";

export function ChallengeDetailDrawer({
  challenge,
  open,
  onOpenChange,
  onCancel,
  canManage,
  t,
}: {
  challenge: Challenge | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCancel?: (id: string) => void;
  canManage: boolean;
  t: T;
}) {
  if (!challenge) return null;
  const pct =
    challenge.goal_value > 0
      ? Math.min(100, Math.round((challenge.current_value / challenge.goal_value) * 100))
      : 100;

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent>
        <DrawerHeader className="border-b">
          <div className="flex items-center justify-between gap-2 pr-2">
            <DrawerTitle className="leading-snug">{challenge.title}</DrawerTitle>
            <ChallengeBadge status={challenge.status} t={t} />
          </div>
          <DrawerDescription>
            {format(new Date(challenge.period_start), "d MMM")} —{" "}
            {format(new Date(challenge.period_end), "d MMM yyyy")}
          </DrawerDescription>
        </DrawerHeader>

        <div className="overflow-y-auto flex-1 p-4 space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {challenge.description}
          </p>

          {/* Goal + progress */}
          <div className="space-y-1.5">
            <p className="text-sm font-medium">
              {t("challenges_tab.goal_label", {
                value: `${goalTypeLabel(challenge.goal_type, t)}: ${challenge.goal_value}`,
              })}
            </p>
            {challenge.goal_value > 0 && (
              <>
                <Progress value={pct} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {t("challenges_tab.progress_label", {
                    current: challenge.current_value,
                    target: challenge.goal_value,
                    percent: pct,
                  })}
                </p>
              </>
            )}
          </div>

          {/* Reward */}
          {challenge.reward_text && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
              <Gift className="size-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-0.5">
                  {t("challenges_tab.reward_label")}
                </p>
                <p className="text-sm">{challenge.reward_text}</p>
              </div>
            </div>
          )}

          {/* Participants */}
          {challenge.participants.length > 0 && (
            <div>
              <p className="text-sm font-semibold mb-2">
                {t("challenges_tab.drawer_participants")}
              </p>
              <div className="space-y-2">
                {challenge.participants.map((p) => (
                  <div key={p.user_id} className="flex items-center gap-2.5">
                    <Avatar className="size-8">
                      <AvatarFallback className="text-xs bg-muted text-muted-foreground">
                        {getInitials(p.user_name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{p.user_name}</span>
                  </div>
                ))}
                {challenge.participants_total > challenge.participants.length && (
                  <p className="text-xs text-muted-foreground pl-10">
                    +{challenge.participants_total - challenge.participants.length} ещё
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t space-y-2">
          {canManage && challenge.status === "ACTIVE" && onCancel && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-destructive hover:text-destructive"
              onClick={() => onCancel(challenge.id)}
            >
              <XCircle className="size-3.5 mr-1.5" />
              {t("actions.cancel")}
            </Button>
          )}
          <DrawerClose asChild>
            <Button variant="outline" className="w-full">
              Закрыть
            </Button>
          </DrawerClose>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
