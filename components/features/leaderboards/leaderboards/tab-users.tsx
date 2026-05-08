import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";

import {
  getLeaderboardUsers,
  type LeaderboardEntry,
  type LeaderboardPeriod,
} from "@/lib/api/leaderboards";
import { ADMIN_ROUTES } from "@/lib/constants/routes";

import { EmptyState } from "@/components/shared/empty-state";

import type { T } from "./_shared";
import { LeaderboardTable } from "./leaderboard-table";
import { PodiumRow } from "./podium-row";
import { ErrorRetry, LeaderboardSkeleton } from "./states";

export function UsersTab({
  period,
  t,
}: {
  period: LeaderboardPeriod;
  t: T;
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

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

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
