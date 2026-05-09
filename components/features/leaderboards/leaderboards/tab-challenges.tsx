import { useEffect, useState, useTransition } from "react";
import { format } from "date-fns";
import { Gift, MoreHorizontal, Plus, XCircle } from "lucide-react";
import { toast } from "sonner";

import {
  cancelChallenge,
  getChallenges,
  type Challenge,
  type ChallengeStatus,
} from "@/lib/api/leaderboards";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog } from "@/components/ui/alert-dialog";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";

import type { T } from "./_shared";
import { ChallengeBadge, goalTypeLabel } from "./challenge-helpers";
import { ChallengeDetailDrawer } from "./challenge-detail-drawer";
import { AvatarGroupRow } from "./indicators";

export function ChallengesTab({
  canManage,
  onCreateChallenge,
  t,
}: {
  canManage: boolean;
  onCreateChallenge: () => void;
  t: T;
}) {
  const [, startTransition] = useTransition();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ChallengeStatus | "ALL">("ALL");
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [cancelId, setCancelId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    getChallenges(statusFilter !== "ALL" ? { status: statusFilter } : {})
      .then((res) => setChallenges(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const handleCancel = async (id: string) => {
    try {
      await cancelChallenge(id);
      toast.success(t("toasts.challenge_cancelled"));
      load();
    } catch {
      toast.error(t("toasts.error"));
    }
    setCancelId(null);
    setDrawerOpen(false);
  };

  const filters: Array<{ key: ChallengeStatus | "ALL"; label: string }> = [
    { key: "ALL", label: "Все" },
    { key: "ACTIVE", label: t("challenges_tab.filter_active") },
    { key: "COMPLETED", label: t("challenges_tab.filter_completed") },
    { key: "UPCOMING", label: t("challenges_tab.filter_upcoming") },
  ];

  return (
    <>
      {/* Filter row — horizontal scroll on mobile */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => startTransition(() => setStatusFilter(f.key))}
            className={`shrink-0 px-3 py-1 rounded-full text-sm font-medium transition-colors min-h-[36px] ${
              statusFilter === f.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div
          className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2 transition-opacity duration-200"
          aria-busy="true"
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-52" />
          ))}
        </div>
      ) : challenges.length === 0 ? (
        <EmptyState
          icon={Gift}
          title={t("empty.no_challenges_title")}
          description=""
          action={
            canManage
              ? { label: t("empty.no_challenges_cta"), onClick: onCreateChallenge, icon: Plus }
              : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2 animate-in fade-in">
          {challenges.map((ch) => {
            const pct =
              ch.goal_value > 0
                ? Math.min(100, Math.round((ch.current_value / ch.goal_value) * 100))
                : 100;
            return (
              <Card key={ch.id} className="flex flex-col">
                <CardContent className="p-4 flex flex-col gap-3 flex-1">
                  {/* Header */}
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm leading-tight">{ch.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {format(new Date(ch.period_start), "d MMM")} —{" "}
                        {format(new Date(ch.period_end), "d MMM")}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <ChallengeBadge status={ch.status} t={t} />
                      {canManage && ch.status === "ACTIVE" && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-7"
                              aria-label="Actions"
                            >
                              <MoreHorizontal className="size-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setCancelId(ch.id)}
                            >
                              <XCircle className="size-3.5 mr-2" />
                              {t("actions.cancel")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                    {ch.description}
                  </p>

                  {/* Goal + Progress */}
                  {ch.goal_value > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {t("challenges_tab.goal_label", {
                            value: `${goalTypeLabel(ch.goal_type, t)}: ${ch.goal_value}`,
                          })}
                        </span>
                        <span className="text-xs font-medium">{pct}%</span>
                      </div>
                      <Progress value={pct} className="h-1.5 w-full" />
                      <p className="text-xs text-muted-foreground">
                        {ch.current_value} / {ch.goal_value}
                      </p>
                    </div>
                  )}

                  {/* Participants + Reward */}
                  <div className="flex items-center justify-between pt-1 border-t mt-auto">
                    <AvatarGroupRow members={ch.participants} total={ch.participants_total} />
                    {ch.reward_text && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0 ml-2">
                        <Gift className="size-3.5 shrink-0" />
                        <span className="truncate max-w-[120px]">{ch.reward_text}</span>
                      </div>
                    )}
                  </div>

                  {/* CTA */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      setSelectedChallenge(ch);
                      setDrawerOpen(true);
                    }}
                  >
                    {t("actions.details")}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <ChallengeDetailDrawer
        challenge={selectedChallenge}
        open={drawerOpen}
        onOpenChange={(v) => {
          setDrawerOpen(v);
          if (!v) setSelectedChallenge(null);
        }}
        canManage={canManage}
        onCancel={(id) => {
          setCancelId(id);
          setDrawerOpen(false);
        }}
        t={t}
      />

      <AlertDialog open={cancelId !== null} onOpenChange={(v) => !v && setCancelId(null)}>
        <ConfirmDialog
          title={t("cancel_dialog.title")}
          message={t("cancel_dialog.description")}
          confirmLabel={t("cancel_dialog.confirm")}
          variant="destructive"
          onConfirm={async () => {
            if (cancelId) await handleCancel(cancelId);
          }}
          onOpenChange={(v) => !v && setCancelId(null)}
        />
      </AlertDialog>
    </>
  );
}
