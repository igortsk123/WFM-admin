"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  Building2,
  TrendingUp,
  CheckCircle2,
  XCircle,
  ChevronRight,
} from "lucide-react";

import { getSupervisorsAiQuality, type SupervisorAiQuality } from "@/lib/api/ai-performance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserCell, EmptyState } from "@/components/shared";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useRouter } from "@/i18n/navigation";

export function SupervisorsTab() {
  const t = useTranslations("screen.networkGoals.supervisors_tab");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [isLoading, setIsLoading] = React.useState(true);
  const [data, setData] = React.useState<SupervisorAiQuality[]>([]);

  // Fetch data
  React.useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const result = await getSupervisorsAiQuality({
          period_start: "2026-04-01",
          period_end: "2026-05-01",
        });
        setData(result.data);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="rounded-xl">
            <CardHeader>
              <Skeleton className="h-10 w-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Empty state
  if (!isLoading && data.length === 0) {
    return (
      <EmptyState
        icon={Building2}
        title={tCommon("noResults")}
        description={tCommon("noData")}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {data.map((item) => (
        <SupervisorCard key={item.supervisor.id} data={item} />
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SUPERVISOR CARD
// ═══════════════════════════════════════════════════════════════════

interface SupervisorCardProps {
  data: SupervisorAiQuality;
}

function SupervisorCard({ data }: SupervisorCardProps) {
  const t = useTranslations("screen.networkGoals.supervisors_tab");
  const tActions = useTranslations("screen.networkGoals.actions");
  const router = useRouter();

  const { supervisor, stores_count, ai_metrics, alert } = data;
  const acceptRate = ai_metrics.accept_rate_pct;
  const isLowAccept = acceptRate < 50;

  return (
    <Card
      className={cn(
        "rounded-xl transition-colors hover:border-primary/30 cursor-pointer",
        alert && "border-warning/50"
      )}
      onClick={() => router.push(`/employees/${supervisor.id}`)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <UserCell user={supervisor} />
          {alert && (
            <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20 gap-1 shrink-0">
              <AlertTriangle className="size-3" />
              {alert === "rejection_spike" ? "!" : "?"}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
          <Building2 className="size-3" />
          <span>{t("stores_count", { count: stores_count })}</span>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <StatItem
            icon={TrendingUp}
            label={t("stats.avg_progress")}
            value="67%"
            variant="default"
          />
          <StatItem
            icon={CheckCircle2}
            label={t("stats.ai_accepted")}
            value={String(ai_metrics.suggestions_accepted)}
            variant="success"
          />
          <StatItem
            icon={XCircle}
            label={t("stats.ai_rejected")}
            value={String(ai_metrics.suggestions_rejected)}
            variant={ai_metrics.suggestions_rejected > ai_metrics.suggestions_accepted ? "destructive" : "default"}
          />
          <StatItem
            icon={TrendingUp}
            label="Accept rate"
            value={`${acceptRate}%`}
            variant={isLowAccept ? "warning" : "success"}
          />
        </div>

        {/* AI Warning Chip */}
        {isLowAccept && (
          <button
            className="flex items-center gap-2 text-xs text-warning hover:text-warning/80 transition-colors text-left"
            onClick={(e) => {
              e.stopPropagation();
              // Would open AI issue report dialog in real app
            }}
          >
            <AlertTriangle className="size-3 shrink-0" />
            <span>{t("ai_warning_chip")}</span>
          </button>
        )}

        {/* Action */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-between text-muted-foreground hover:text-foreground"
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/employees/${supervisor.id}`);
          }}
        >
          {tActions("drill_to_supervisor")}
          <ChevronRight className="size-4" />
        </Button>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════
// STAT ITEM
// ═══════════════════════════════════════════════════════════════════

interface StatItemProps {
  icon: React.ElementType;
  label: string;
  value: string;
  variant?: "default" | "success" | "warning" | "destructive";
}

function StatItem({ icon: Icon, label, value, variant = "default" }: StatItemProps) {
  const variantClasses = {
    default: "text-foreground",
    success: "text-success",
    warning: "text-warning",
    destructive: "text-destructive",
  };

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Icon className="size-3" />
        <span className="truncate">{label}</span>
      </div>
      <span className={cn("text-sm font-semibold tabular-nums", variantClasses[variant])}>
        {value}
      </span>
    </div>
  );
}
