"use client";

import { Skeleton } from "@/components/ui/skeleton";

interface StatsCardProps {
  label: string;
  value: number;
  loading: boolean;
}

export function StatsCard({ label, value, loading }: StatsCardProps) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg border border-border bg-card p-3">
      <span className="text-xs text-muted-foreground font-medium">{label}</span>
      {loading ? (
        <Skeleton className="h-6 w-10 mt-0.5" />
      ) : (
        <span className="text-xl font-bold text-foreground tabular-nums">
          {value}
        </span>
      )}
    </div>
  );
}
