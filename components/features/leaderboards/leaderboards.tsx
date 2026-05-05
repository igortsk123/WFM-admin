"use client";

import { useState, useEffect, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Crown,
  Medal,
  Flame,
  TrendingUp,
  TrendingDown,
  Minus,
  Plus,
  Gift,
  Trophy,
  AlertCircle,
  RotateCcw,
  Pencil,
  XCircle,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import {
  getLeaderboardUsers,
  getLeaderboardStores,
  getTeams,
  getChallenges,
  createChallenge,
  cancelChallenge,
  type LeaderboardPeriod,
  type ChallengeStatus,
  type ChallengeGoalType,
  type CreateChallengeData,
  type LeaderboardEntry,
  type Team,
  type Challenge,
} from "@/lib/api/leaderboards";
import { ADMIN_ROUTES } from "@/lib/constants/routes";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
} from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { AlertDialog } from "@/components/ui/alert-dialog";

// ─────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────

function getInitials(name: string): string {
  const parts = name.split(" ");
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function getShortName(name: string): string {
  return name.split(" ").slice(0, 2).join(" ");
}

function TrendIcon({
  trend,
  positions,
}: {
  trend: "up" | "down" | "stable";
  positions: number;
}) {
  if (trend === "up")
    return (
      <span className="flex items-center gap-0.5 text-success text-xs font-medium">
        <TrendingUp className="size-3.5" />
        {positions > 0 && `+${positions}`}
      </span>
    );
  if (trend === "down")
    return (
      <span className="flex items-center gap-0.5 text-muted-foreground text-xs font-medium">
        <TrendingDown className="size-3.5" />
        {positions > 0 && `−${positions}`}
      </span>
    );
  return (
    <span className="flex items-center text-muted-foreground text-xs">
      <Minus className="size-3.5" />
    </span>
  );
}

function StreakBadge({ days }: { days?: number }) {
  if (!days || days <= 7) return null;
  const display = days >= 30 ? "30+" : String(days);
  return (
    <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
      <Flame className="size-3.5" />
      {display}
    </span>
  );
}

function AvatarGroupRow({
  members,
  total,
}: {
  members: Array<{ user_id: number; user_name: string }>;
  total: number;
}) {
  const visible = members.slice(0, 4);
  const extra = total - visible.length;
  return (
    <div className="flex items-center">
      {visible.map((m, i) => (
        <Avatar
          key={m.user_id}
          className="size-6 border-2 border-background"
          style={{ marginLeft: i > 0 ? -8 : 0 }}
        >
          <AvatarFallback className="text-[10px] bg-muted text-muted-foreground">
            {getInitials(m.user_name)}
          </AvatarFallback>
        </Avatar>
      ))}
      {extra > 0 && (
        <span className="ml-1.5 text-xs text-muted-foreground">+{extra}</span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Podium
// ─────────────────────────────────────────────────────────

function PodiumCard({
  entry,
  place,
  onClick,
}: {
  entry: LeaderboardEntry;
  place: 1 | 2 | 3;
  onClick?: () => void;
}) {
  const isFirst = place === 1;
  const isSecond = place === 2;

  const cardClass = isFirst
    ? "bg-warning/10 border-warning/30 h-40"
    : isSecond
    ? "bg-muted/50 border-muted-foreground/30 h-32"
    : "bg-warning/5 border-warning/20 h-28";

  const avatarSize = isFirst ? "size-14" : "size-10";
  const scoreClass = isFirst ? "text-3xl" : isSecond ? "text-xl" : "text-lg";

  return (
    <Card
      className={`relative flex flex-col items-center justify-center gap-1 cursor-pointer hover:shadow-md transition-shadow border ${cardClass}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick?.()}
    >
      <div className="absolute top-2 left-1/2 -translate-x-1/2">
        {isFirst ? (
          <Crown className="size-4 text-warning" />
        ) : (
          <Medal
            className={`size-3.5 ${isSecond ? "text-muted-foreground" : "text-warning/60"}`}
          />
        )}
      </div>
      <Avatar className={`${avatarSize} mt-4`}>
        <AvatarFallback
          className={`text-sm font-semibold ${
            isFirst
              ? "bg-warning/20 text-foreground"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {getInitials(entry.entity_name)}
        </AvatarFallback>
      </Avatar>
      <span className="text-xs font-medium text-center leading-tight px-1 truncate w-full text-center">
        {getShortName(entry.entity_name)}
      </span>
      <span className={`${scoreClass} font-bold text-foreground`}>
        {entry.points.toLocaleString("ru-RU")}
      </span>
    </Card>
  );
}

function PodiumRow({
  entries,
  onItemClick,
}: {
  entries: LeaderboardEntry[];
  onItemClick?: (e: LeaderboardEntry) => void;
}) {
  if (entries.length < 3) return null;
  // Render order: 2nd | 1st | 3rd
  const display = [entries[1], entries[0], entries[2]] as const;
  const places = [2, 1, 3] as const;

  return (
    <div className="grid grid-cols-3 gap-3 md:gap-4">
      {display.map((entry, i) => (
        <PodiumCard
          key={entry.entity_id}
          entry={entry}
          place={places[i]}
          onClick={() => onItemClick?.(entry)}
        />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Loading skeleton
// ─────────────────────────────────────────────────────────

function LeaderboardSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-40" />
        <Skeleton className="h-28" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Error / retry block
// ─────────────────────────────────────────────────────────

function ErrorRetry({ onRetry, t }: { onRetry: () => void; t: ReturnType<typeof useTranslations> }) {
  return (
    <Alert variant="destructive">
      <AlertCircle className="size-4" />
      <AlertTitle>{t("states.forbidden_title")}</AlertTitle>
      <AlertDescription>
        <Button size="sm" variant="outline" className="mt-2" onClick={onRetry}>
          <RotateCcw className="size-3.5 mr-1.5" />
          Retry
        </Button>
      </AlertDescription>
    </Alert>
  );
}

// ─────────────────────────────────────────────────────────
// Leaderboard table (shared by users + stores)
// ─────────────────────────────────────────────────────────

const PAGE_SIZE = 7;

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  mode: "users" | "stores";
  t: ReturnType<typeof useTranslations>;
  onRowClick: (entry: LeaderboardEntry) => void;
}

function LeaderboardTable({ entries, mode, t, onRowClick }: LeaderboardTableProps) {
  const [page, setPage] = useState(1);
  const tableEntries = entries.slice(3);
  const totalPages = Math.max(1, Math.ceil(tableEntries.length / PAGE_SIZE));
  const pageEntries = tableEntries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const colKeys = mode === "users" ? t.raw("users_tab.columns") : t.raw("stores_tab.columns");

  return (
    <Card>
      {mode === "users" && (
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("users_tab.table_title")}</CardTitle>
        </CardHeader>
      )}
      <CardContent className="p-0">
        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">{colKeys.rank}</TableHead>
                <TableHead>{mode === "users" ? colKeys.user : colKeys.store}</TableHead>
                {mode === "stores" && <TableHead>{colKeys.city}</TableHead>}
                <TableHead className="text-right">{colKeys.score}</TableHead>
                {mode === "stores" && (
                  <TableHead className="text-right">{colKeys.employees}</TableHead>
                )}
                <TableHead className="w-20 text-center">
                  {mode === "users" ? colKeys.streak : colKeys.streak_weeks}
                </TableHead>
                <TableHead className="w-16 text-center">{colKeys.trend}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageEntries.map((entry) => (
                <TableRow
                  key={entry.entity_id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onRowClick(entry)}
                >
                  <TableCell>
                    <span
                      className={`text-base font-semibold ${
                        entry.rank <= 3 ? "text-success" : "text-muted-foreground"
                      }`}
                    >
                      {entry.rank}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <Avatar className="size-8 shrink-0">
                        <AvatarFallback className="text-xs bg-muted text-muted-foreground">
                          {getInitials(entry.entity_name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium truncate">{entry.entity_name}</span>
                    </div>
                  </TableCell>
                  {mode === "stores" && (
                    <TableCell className="text-sm text-muted-foreground">Томск</TableCell>
                  )}
                  <TableCell className="text-right font-semibold text-base">
                    {entry.points.toLocaleString("ru-RU")}
                  </TableCell>
                  {mode === "stores" && (
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {entry.tasks_completed}
                    </TableCell>
                  )}
                  <TableCell className="text-center">
                    <StreakBadge />
                  </TableCell>
                  <TableCell className="text-center">
                    <TrendIcon trend={entry.trend} positions={entry.trend_positions} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-border">
          {pageEntries.map((entry) => (
            <div
              key={entry.entity_id}
              className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 min-h-[56px]"
              onClick={() => onRowClick(entry)}
            >
              <span
                className={`w-7 text-sm font-semibold shrink-0 ${
                  entry.rank <= 3 ? "text-success" : "text-muted-foreground"
                }`}
              >
                {entry.rank}
              </span>
              <Avatar className="size-8 shrink-0">
                <AvatarFallback className="text-xs bg-muted text-muted-foreground">
                  {getInitials(entry.entity_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{entry.entity_name}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <StreakBadge />
                <span className="text-sm font-semibold">
                  {entry.points.toLocaleString("ru-RU")}
                </span>
                <TrendIcon trend={entry.trend} positions={entry.trend_positions} />
              </div>
            </div>
          ))}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-end gap-2 p-3 border-t">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              aria-label="Previous page"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              {page} / {totalPages}
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              aria-label="Next page"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────
// Users Tab
// ─────────────────────────────────────────────────────────

function UsersTab({
  period,
  t,
}: {
  period: LeaderboardPeriod;
  t: ReturnType<typeof useTranslations>;
}) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = () => {
    setLoading(true);
    setError(false);
    getLeaderboardUsers({ period })
      .then((res) => setEntries(res.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [period]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <LeaderboardSkeleton />;
  if (error) return <ErrorRetry onRetry={load} t={t} />;
  if (entries.length < 3)
    return (
      <EmptyState
        icon={Trophy}
        title={t("empty.no_users_title")}
        description={t("empty.no_users_subtitle")}
      />
    );

  return (
    <div className="space-y-4">
      <PodiumRow
        entries={entries.slice(0, 3)}
        onItemClick={(e) => {
          window.location.href = ADMIN_ROUTES.employeeDetail(String(e.entity_id));
        }}
      />
      <LeaderboardTable
        entries={entries}
        mode="users"
        t={t}
        onRowClick={(e) => {
          window.location.href = ADMIN_ROUTES.employeeDetail(String(e.entity_id));
        }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Stores Tab
// ─────────────────────────────────────────────────────────

function StoresTab({
  period,
  t,
}: {
  period: LeaderboardPeriod;
  t: ReturnType<typeof useTranslations>;
}) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = () => {
    setLoading(true);
    setError(false);
    getLeaderboardStores({ period })
      .then((res) => setEntries(res.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [period]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <LeaderboardSkeleton />;
  if (error) return <ErrorRetry onRetry={load} t={t} />;
  if (entries.length < 3)
    return (
      <EmptyState
        icon={Trophy}
        title={t("empty.no_users_title")}
        description={t("empty.no_users_subtitle")}
      />
    );

  return (
    <div className="space-y-4">
      <PodiumRow
        entries={entries.slice(0, 3)}
        onItemClick={(e) => {
          window.location.href = ADMIN_ROUTES.storeDetail(String(e.entity_id));
        }}
      />
      <LeaderboardTable
        entries={entries}
        mode="stores"
        t={t}
        onRowClick={(e) => {
          window.location.href = ADMIN_ROUTES.storeDetail(String(e.entity_id));
        }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Teams Tab
// ─────────────────────────────────────────────────────────

function TeamsTab({
  period,
  t,
}: {
  period: LeaderboardPeriod;
  t: ReturnType<typeof useTranslations>;
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

// ─────────────────────────────────────────────────────────
// Challenge helpers
// ─────────────────────────────────────────────────────────

function ChallengeBadge({
  status,
  t,
}: {
  status: ChallengeStatus;
  t: ReturnType<typeof useTranslations>;
}) {
  const label = t(`challenges_tab.status.${status}`);
  if (status === "ACTIVE")
    return (
      <Badge variant="default" className="text-xs">
        {label}
      </Badge>
    );
  if (status === "COMPLETED")
    return (
      <Badge variant="secondary" className="text-xs">
        {label}
      </Badge>
    );
  return (
    <Badge variant="outline" className="text-xs">
      {label}
    </Badge>
  );
}

function goalTypeLabel(
  type: ChallengeGoalType,
  t: ReturnType<typeof useTranslations>
): string {
  return t(`create_dialog.goal_type_options.${type}`);
}

// ─────────────────────────────────────────────────────────
// Challenge detail drawer
// ─────────────────────────────────────────────────────────

function ChallengeDetailDrawer({
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
  t: ReturnType<typeof useTranslations>;
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

// ─────────────────────────────────────────────────────────
// Challenges Tab
// ─────────────────────────────────────────────────────────

function ChallengesTab({
  canManage,
  onCreateChallenge,
  t,
}: {
  canManage: boolean;
  onCreateChallenge: () => void;
  t: ReturnType<typeof useTranslations>;
}) {
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

  useEffect(() => { load(); }, [statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

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
            onClick={() => setStatusFilter(f.key)}
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
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

// ─────────────────────────────────────────────────────────
// Create Challenge Dialog
// ─────────────────────────────────────────────────────────

function CreateChallengeDialog({
  open,
  onOpenChange,
  onSuccess,
  t,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess: () => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<Partial<CreateChallengeData>>({
    participants_scope: "ALL_STORE_EMPLOYEES",
    goal_type: "TASKS_COUNT",
  });
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const reset = () => {
    setForm({ participants_scope: "ALL_STORE_EMPLOYEES", goal_type: "TASKS_COUNT" });
    setStartDate("");
    setEndDate("");
  };

  const handleSubmit = () => {
    if (!form.title || !startDate || !endDate) return;
    startTransition(async () => {
      try {
        await createChallenge({
          title: form.title!,
          description: form.description ?? "",
          period_start: startDate,
          period_end: endDate,
          goal_type: form.goal_type!,
          goal_value: Number(form.goal_value ?? 0),
          work_type_ids: [],
          zone_ids: [],
          participants_scope: form.participants_scope!,
          reward_text: form.reward_text ?? "",
        });
        toast.success(t("toasts.challenge_created"));
        onSuccess();
        onOpenChange(false);
        reset();
      } catch {
        toast.error(t("toasts.error"));
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("create_dialog.title")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="ch-title">{t("create_dialog.title_label")}</Label>
            <Input
              id="ch-title"
              value={form.title ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Чистая полка апреля"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ch-description">{t("create_dialog.description_label")}</Label>
            <Textarea
              id="ch-description"
              value={form.description ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ch-start">{t("create_dialog.period_label")} (начало)</Label>
              <Input
                id="ch-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ch-end">{t("create_dialog.period_label")} (конец)</Label>
              <Input
                id="ch-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ch-goal-type">{t("create_dialog.goal_type_label")}</Label>
              <Select
                value={form.goal_type}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, goal_type: v as ChallengeGoalType }))
                }
              >
                <SelectTrigger id="ch-goal-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(
                    ["TASKS_COUNT", "HOURS", "COMPLETION_RATE", "NO_REJECTS"] as const
                  ).map((v) => (
                    <SelectItem key={v} value={v}>
                      {t(`create_dialog.goal_type_options.${v}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ch-goal-value">{t("create_dialog.goal_value_label")}</Label>
              <Input
                id="ch-goal-value"
                type="number"
                min={0}
                value={form.goal_value ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, goal_value: Number(e.target.value) }))
                }
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ch-participants">{t("create_dialog.participants_label")}</Label>
            <Select
              value={form.participants_scope}
              onValueChange={(v) =>
                setForm((f) => ({
                  ...f,
                  participants_scope: v as CreateChallengeData["participants_scope"],
                }))
              }
            >
              <SelectTrigger id="ch-participants">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(
                  ["ALL_STORE_EMPLOYEES", "BY_POSITION", "SPECIFIC_USERS"] as const
                ).map((v) => (
                  <SelectItem key={v} value={v}>
                    {t(`create_dialog.participants_options.${v}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ch-reward">{t("create_dialog.reward_label")}</Label>
            <Input
              id="ch-reward"
              value={form.reward_text ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, reward_text: e.target.value }))}
              placeholder="Бонус 1 500 ₽ + Badge «Чистюля»"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { onOpenChange(false); reset(); }}>
            Отмена
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending || !form.title || !startDate || !endDate}
          >
            {isPending ? "Создание..." : t("create_dialog.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────
// Root export
// ─────────────────────────────────────────────────────────

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
