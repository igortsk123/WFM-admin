"use client";

import * as React from "react";

import {
  getRegulations,
  getRegulationsStats,
  type RegulationsStats,
} from "@/lib/api/regulations";
import type { Regulation } from "@/lib/types";

interface UseRegulationsDataParams {
  search: string;
  workTypeIds: number[];
  zoneIds: number[];
  showArchived: boolean;
  untaggedOnly: boolean;
}

interface UseRegulationsDataResult {
  regulations: Regulation[];
  total: number;
  stats: RegulationsStats | null;
  loading: boolean;
  statsLoading: boolean;
  error: boolean;
  liveUses: number | null;
  refetchData: () => Promise<void>;
  refetchStats: () => Promise<void>;
}

export function useRegulationsData({
  search,
  workTypeIds,
  zoneIds,
  showArchived,
  untaggedOnly,
}: UseRegulationsDataParams): UseRegulationsDataResult {
  const [regulations, setRegulations] = React.useState<Regulation[]>([]);
  const [total, setTotal] = React.useState(0);
  const [stats, setStats] = React.useState<RegulationsStats | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [statsLoading, setStatsLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  const [liveUses, setLiveUses] = React.useState<number | null>(null);

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await getRegulations({
        search: search || undefined,
        work_type_ids: workTypeIds.length > 0 ? workTypeIds : undefined,
        zone_ids: zoneIds.length > 0 ? zoneIds : undefined,
        is_archived: showArchived ? undefined : false,
        untagged_only: untaggedOnly ? true : undefined,
      });
      setRegulations(res.data);
      setTotal(res.total);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [search, workTypeIds, zoneIds, showArchived, untaggedOnly]);

  const fetchStats = React.useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await getRegulationsStats();
      setStats(res.data);
      setLiveUses(res.data.ai_uses_7d);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void fetchData();
  }, [fetchData]);

  React.useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  // ws simulation: live AI usage counter
  React.useEffect(() => {
    const interval = setInterval(() => {
      setLiveUses((prev) => {
        if (prev === null && stats) return stats.ai_uses_7d;
        if (prev !== null && Math.random() < 0.15) return prev + 1;
        return prev;
      });
    }, 4000);
    return () => clearInterval(interval);
  }, [stats]);

  return {
    regulations,
    total,
    stats,
    loading,
    statsLoading,
    error,
    liveUses,
    refetchData: fetchData,
    refetchStats: fetchStats,
  };
}
