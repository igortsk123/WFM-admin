"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useTranslations, useLocale } from "next-intl";
import {
  Sparkles,
  CheckCircle2,
  Clock,
  ThumbsUp,
  AlertTriangle,
  ChevronDown,
  MessageSquareWarning,
  Send,
} from "lucide-react";

import { getAiPerformance } from "@/lib/api/ai-performance";
import type { AIPerformanceMetrics } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiCard, EmptyState } from "@/components/shared";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const HistoryChartCard = dynamic(
  () =>
    import("./network-goals-history-chart").then((m) => m.HistoryChartCard),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[320px] w-full rounded-xl" />,
  }
);

// Mock 90-day history data
const HISTORY_DATA = Array.from({ length: 12 }, (_, i) => {
  const week = i + 1;
  const proposed = 15 + Math.floor(Math.random() * 10);
  const accepted = Math.floor(proposed * (0.6 + Math.random() * 0.2));
  return {
    week: `W${week}`,
    proposed,
    accepted,
    acceptRate: Math.round((accepted / proposed) * 100),
  };
});

// Mock by-type breakdown
const BY_TYPE_DATA = [
  { type: "TASK_SUGGESTION", proposed: 24, accepted: 18, rejected: 6, acceptRate: 75 },
  { type: "GOAL_SUGGESTION", proposed: 12, accepted: 9, rejected: 3, acceptRate: 75 },
  { type: "BONUS_TASK_SUGGESTION", proposed: 8, accepted: 3, rejected: 5, acceptRate: 38 },
  { type: "INSIGHT", proposed: 6, accepted: 4, rejected: 2, acceptRate: 67 },
];

export function AiQualityPanel() {
  const t = useTranslations("screen.networkGoals.ai_quality_tab");
  const tToasts = useTranslations("screen.networkGoals.toasts");
  const tCommon = useTranslations("common");

  const [isLoading, setIsLoading] = React.useState(true);
  const [metrics, setMetrics] = React.useState<AIPerformanceMetrics | null>(null);
  const [reportDialogOpen, setReportDialogOpen] = React.useState(false);

  // Fetch data
  React.useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const result = await getAiPerformance({
          scope_type: "NETWORK",
          period_start: "2026-04-01",
          period_end: "2026-05-01",
        });
        setMetrics(result.data);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Skeleton className="h-80 w-full rounded-xl" />
          <Skeleton className="h-80 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <EmptyState
        icon={Sparkles}
        title={tCommon("noData")}
        description={tCommon("noResults")}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Stats KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          icon={Sparkles}
          label={t("stats.generated")}
          value={metrics.suggestions_generated}
          diff={8}
          trend={HISTORY_DATA.map((d) => d.proposed)}
        />
        <KpiCard
          icon={CheckCircle2}
          label={t("stats.accepted")}
          value={metrics.suggestions_accepted}
          diff={5}
          trend={HISTORY_DATA.map((d) => d.accepted)}
        />
        <KpiCard
          icon={Clock}
          label={t("stats.avg_decision_time")}
          value={`${metrics.average_decision_time_min} мин`}
          diff={-12}
        />
        <KpiCard
          icon={ThumbsUp}
          label={t("stats.helpful_rate")}
          value={`${metrics.helpful_rate_pct ?? 73}%`}
          diff={2}
        />
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* By Type Card */}
        <ByTypeCard />

        {/* Reject Reasons Card */}
        <RejectReasonsCard reasons={metrics.top_reject_reasons} />
      </div>

      {/* Secondary row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Anomalies Card */}
        <AnomaliesCard
          anomalies={metrics.anomalies ?? []}
          onReport={() => setReportDialogOpen(true)}
        />

        {/* History Chart Card */}
        <HistoryChartCard data={HISTORY_DATA} />
      </div>

      {/* Report Dialog */}
      <ReportAiIssueDialog
        open={reportDialogOpen}
        onOpenChange={setReportDialogOpen}
        onSubmit={() => {
          toast.success(tToasts("issue_reported"));
          setReportDialogOpen(false);
        }}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// BY TYPE CARD
// ═══════════════════════════════════════════════════════════════════

const SUGGESTION_TYPE_LABELS: Record<string, { ru: string; en: string }> = {
  TASK_SUGGESTION: { ru: "Предложение задачи", en: "Task suggestion" },
  GOAL_SUGGESTION: { ru: "Предложение цели", en: "Goal suggestion" },
  BONUS_TASK_SUGGESTION: { ru: "Бонусная задача", en: "Bonus task suggestion" },
  INSIGHT: { ru: "Инсайт", en: "Insight" },
};

function ByTypeCard() {
  const t = useTranslations("screen.networkGoals.ai_quality_tab.by_type_card");
  const locale = useLocale() as "ru" | "en";

  return (
    <Card className="rounded-xl">
      <CardHeader>
        <CardTitle className="text-base">{t("title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          {BY_TYPE_DATA.map((item) => {
            const isLow = item.acceptRate < 50;
            const typeLabel = SUGGESTION_TYPE_LABELS[item.type]?.[locale] ?? item.type;

            return (
              <div key={item.type} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{typeLabel}</span>
                    {isLow && (
                      <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20 text-xs h-5">
                        <AlertTriangle className="size-3 mr-1" />
                        {t("warning_low_accept")}
                      </Badge>
                    )}
                  </div>
                  <span className="text-muted-foreground tabular-nums">
                    {item.accepted}/{item.proposed}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Progress
                    value={item.acceptRate}
                    className={cn("h-2 flex-1", isLow && "[&>div]:bg-warning")}
                  />
                  <span
                    className={cn(
                      "text-xs font-medium tabular-nums w-10 text-right",
                      isLow ? "text-warning" : "text-foreground"
                    )}
                  >
                    {item.acceptRate}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════
// REJECT REASONS CARD
// ═══════════════════════════════════════════════════════════════════

interface RejectReasonsCardProps {
  reasons: Array<{ reason: string; count: number }>;
}

function RejectReasonsCard({ reasons }: RejectReasonsCardProps) {
  const t = useTranslations("screen.networkGoals.ai_quality_tab.reject_reasons_card");
  const [expanded, setExpanded] = React.useState(false);

  const maxCount = Math.max(...reasons.map((r) => r.count), 1);

  return (
    <Card className="rounded-xl">
      <CardHeader>
        <CardTitle className="text-base">{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {reasons.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No rejections yet
          </p>
        ) : (
          <>
            {reasons.map((item, i) => (
              <div key={i} className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground truncate max-w-[200px]">
                    {item.reason}
                  </span>
                  <span className="text-muted-foreground tabular-nums ml-2 shrink-0">
                    {item.count}
                  </span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-destructive/60 rounded-full transition-all"
                    style={{ width: `${(item.count / maxCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}

            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-center gap-1 text-muted-foreground mt-2"
              onClick={() => setExpanded(!expanded)}
            >
              {t("expand_examples")}
              <ChevronDown
                className={cn("size-4 transition-transform", expanded && "rotate-180")}
              />
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ANOMALIES CARD
// ═══════════════════════════════════════════════════════════════════

interface AnomaliesCardProps {
  anomalies: Array<{ type: string; description: string; severity: "low" | "med" | "high" }>;
  onReport: () => void;
}

function AnomaliesCard({ anomalies, onReport }: AnomaliesCardProps) {
  const t = useTranslations("screen.networkGoals.ai_quality_tab.anomalies_card");

  const severityColors = {
    low: "bg-muted text-muted-foreground",
    med: "bg-warning/10 text-warning border-warning/20",
    high: "bg-destructive/10 text-destructive border-destructive/20",
  };

  return (
    <Card className="rounded-xl">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-base">{t("title")}</CardTitle>
          {anomalies.length > 0 && (
            <CardDescription className="mt-1">
              Найдено аномалий: {anomalies.length}
            </CardDescription>
          )}
        </div>
        <Button variant="outline" size="sm" className="gap-2 shrink-0" onClick={onReport}>
          <MessageSquareWarning className="size-4" />
          <span className="hidden sm:inline">{t("report_button")}</span>
        </Button>
      </CardHeader>
      <CardContent>
        {anomalies.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle2 className="size-10 text-success mb-2" />
            <p className="text-sm text-muted-foreground">Аномалий не найдено</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {anomalies.map((anomaly, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border"
              >
                <AlertTriangle
                  className={cn(
                    "size-4 shrink-0 mt-0.5",
                    anomaly.severity === "high"
                      ? "text-destructive"
                      : anomaly.severity === "med"
                        ? "text-warning"
                        : "text-muted-foreground"
                  )}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className={cn("text-xs h-5", severityColors[anomaly.severity])}>
                      {anomaly.severity.toUpperCase()}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{anomaly.type}</span>
                  </div>
                  <p className="text-sm text-foreground">{anomaly.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════
// REPORT DIALOG
// ═══════════════════════════════════════════════════════════════════

interface ReportAiIssueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
}

function ReportAiIssueDialog({ open, onOpenChange, onSubmit }: ReportAiIssueDialogProps) {
  const t = useTranslations("screen.networkGoals.report_dialog");
  const tCommon = useTranslations("common");

  const [issueType, setIssueType] = React.useState<string>("nonsense");
  const [details, setDetails] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 800));
    setIsSubmitting(false);
    onSubmit();
    setDetails("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="issue-type">{t("type_label")}</Label>
            <Select value={issueType} onValueChange={setIssueType}>
              <SelectTrigger id="issue-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nonsense">{t("type_options.nonsense")}</SelectItem>
                <SelectItem value="wrong_volume">{t("type_options.wrong_volume")}</SelectItem>
                <SelectItem value="no_context">{t("type_options.no_context")}</SelectItem>
                <SelectItem value="other">{t("type_options.other")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="details">{t("details_label")}</Label>
            <Textarea
              id="details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="..."
              className="min-h-[100px] resize-none"
            />
          </div>

          <p className="text-xs text-muted-foreground">{t("auto_attached_hint")}</p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tCommon("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} className="gap-2">
            {isSubmitting ? (
              <span className="animate-pulse">{tCommon("loading")}</span>
            ) : (
              <>
                <Send className="size-4" />
                {t("submit")}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
