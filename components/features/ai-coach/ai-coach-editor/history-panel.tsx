"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import {
  CheckCircle,
  GitCompare,
  Loader2,
  RotateCcw,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog } from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";

import {
  createAbTest,
  type AIHint,
  type AbTest,
} from "@/lib/api/ai-coach";
import { cn } from "@/lib/utils";
import { pickLocalized } from "@/lib/utils/locale-pick";
import type { Locale } from "@/lib/types";

import { getDaysDiff } from "./_shared";

// ═══════════════════════════════════════════════════════════════════
// HISTORY TAB — versions list with rollback / compare
// ═══════════════════════════════════════════════════════════════════

interface HistoryTabProps {
  hints: AIHint[];
}

export function HistoryTab({ hints }: HistoryTabProps) {
  const t = useTranslations("screen.aiCoach");
  const locale = useLocale() as Locale;

  const [rollbackVersion, setRollbackVersion] = useState<number | null>(null);
  const [rollbackOpen, setRollbackOpen] = useState(false);

  async function handleRollback() {
    if (rollbackVersion === null) return;
    try {
      toast.success(t("toasts.rolled_back"));
    } catch {
      toast.error(t("toasts.error"));
    }
  }

  if (hints.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        {t("history_tab.empty")}
      </div>
    );
  }

  const maxVersion = Math.max(...hints.map((x) => x.version));

  return (
    <>
      <div className="space-y-3">
        {[...hints].reverse().map((hint) => {
          const isLatest = hint.version === maxVersion;
          return (
            <Card key={hint.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="font-mono text-xs">
                        v{hint.version}
                      </Badge>
                      {isLatest && (
                        <Badge className="bg-success text-success-foreground text-xs">
                          {t("history_tab.active_badge")}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {new Date(hint.created_at).toLocaleDateString("ru-RU", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("history_tab.applied_count", { count: hint.stats.impressions })} ·{" "}
                      {t("history_tab.helpful_count", {
                        applied: hint.stats.applications,
                        rate: Math.round(hint.stats.helpful_rate * 100),
                      })}
                    </p>
                    <p className="text-sm line-clamp-2 mt-1">
                      {pickLocalized(hint.text, hint.text_en, locale)}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs"
                      onClick={() => {
                        setRollbackVersion(hint.version);
                        setRollbackOpen(true);
                      }}
                      disabled={isLatest}
                    >
                      <RotateCcw className="size-3.5 mr-1" />
                      {t("history_tab.rollback")}
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 text-xs">
                      <GitCompare className="size-3.5 mr-1" />
                      {t("history_tab.compare")}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <AlertDialog open={rollbackOpen} onOpenChange={setRollbackOpen}>
        <ConfirmDialog
          title={t("history_tab.rollback_dialog_title", { version: rollbackVersion ?? 0 })}
          message={t("history_tab.rollback_dialog_description")}
          confirmLabel={t("history_tab.rollback_confirm")}
          variant="destructive"
          onConfirm={handleRollback}
          onOpenChange={setRollbackOpen}
        />
      </AlertDialog>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════
// A/B TEST TAB — view active test or create new
// ═══════════════════════════════════════════════════════════════════

interface AbTestTabProps {
  hints: AIHint[];
  abTest: AbTest | null;
  abTestLoading: boolean;
  workTypeId: number;
}

export function AbTestTab({
  hints,
  abTest,
  abTestLoading,
  workTypeId,
}: AbTestTabProps) {
  const t = useTranslations("screen.aiCoach");

  const [abControlVer, setAbControlVer] = useState<string>("");
  const [abTreatmentVer, setAbTreatmentVer] = useState<string>("");
  const [abTrafficB, setAbTrafficB] = useState("50");
  const [abDuration, setAbDuration] = useState("14");
  const [abCreating, setAbCreating] = useState(false);

  async function handleCreateAbTest() {
    if (!abControlVer || !abTreatmentVer) return;
    setAbCreating(true);
    try {
      await createAbTest({
        work_type_id: workTypeId,
        control_version: Number(abControlVer),
        treatment_version: Number(abTreatmentVer),
        traffic_b_pct: Number(abTrafficB),
        duration_days: Number(abDuration),
      });
      toast.success(t("toasts.ab_test_started"));
    } catch {
      toast.error(t("toasts.error"));
    } finally {
      setAbCreating(false);
    }
  }

  if (abTestLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (abTest) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle className="text-sm">
                {t("ab_test_tab.active_section_title")}
              </CardTitle>
              <Badge
                className={cn(
                  "text-xs",
                  abTest.status === "running"
                    ? "bg-info text-info-foreground"
                    : "bg-success text-success-foreground"
                )}
              >
                {abTest.status === "running"
                  ? t("ab_test_tab.running_badge")
                  : t("ab_test_tab.completed_badge")}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("ab_test_tab.running_label", {
                startDate: new Date(abTest.started_at).toLocaleDateString("ru-RU", {
                  day: "2-digit",
                  month: "short",
                }),
                days: getDaysDiff(abTest.started_at, abTest.ends_at),
              })}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {/* Version A */}
              <Card className="border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-semibold">
                    {t("ab_test_tab.version_a_title")}
                  </CardTitle>
                  <Badge variant="outline" className="font-mono text-xs w-fit">
                    v{abTest.control_version}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-1.5 pt-0">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">
                      {t("ab_test_tab.stats.impressions")}
                    </span>
                    <span className="font-medium">{abTest.control_stats.impressions}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">
                      {t("ab_test_tab.stats.applications")}
                    </span>
                    <span className="font-medium">{abTest.control_stats.applications}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">
                      {t("ab_test_tab.stats.helpful_rate")}
                    </span>
                    <span className="font-medium">
                      {Math.round(abTest.control_stats.helpful_rate * 100)}%
                    </span>
                  </div>
                </CardContent>
              </Card>
              {/* Version B */}
              <Card className="border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-semibold">
                    {t("ab_test_tab.version_b_title")}
                  </CardTitle>
                  <Badge variant="outline" className="font-mono text-xs w-fit">
                    v{abTest.treatment_version}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-1.5 pt-0">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">
                      {t("ab_test_tab.stats.impressions")}
                    </span>
                    <span className="font-medium">{abTest.treatment_stats.impressions}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">
                      {t("ab_test_tab.stats.applications")}
                    </span>
                    <span className="font-medium">{abTest.treatment_stats.applications}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">
                      {t("ab_test_tab.stats.helpful_rate")}
                    </span>
                    <span className="font-medium text-success">
                      {Math.round(abTest.treatment_stats.helpful_rate * 100)}%
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* p-value */}
            {abTest.p_value != null && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-mono text-foreground">
                  {t("ab_test_tab.p_value_label", { value: abTest.p_value })}
                </span>
                <Badge
                  className={cn(
                    "text-xs",
                    abTest.significant
                      ? "bg-success text-success-foreground"
                      : "bg-warning text-warning-foreground"
                  )}
                >
                  {abTest.significant
                    ? t("ab_test_tab.significant_badge")
                    : t("ab_test_tab.not_enough_data")}
                </Badge>
              </div>
            )}

            <div className="flex gap-2 flex-wrap">
              <Button size="sm">
                <CheckCircle className="size-4 mr-1.5" />
                {t("ab_test_tab.actions.apply_better")}
              </Button>
              <Button size="sm" variant="outline">
                {t("ab_test_tab.actions.finish_test")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{t("ab_test_tab.create_section_title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium">
              {t("ab_test_tab.create_form.control_label")}
            </label>
            <Select value={abControlVer} onValueChange={setAbControlVer}>
              <SelectTrigger>
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                {hints.map((h) => (
                  <SelectItem key={h.id} value={String(h.version)}>
                    v{h.version}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">
              {t("ab_test_tab.create_form.treatment_label")}
            </label>
            <Select value={abTreatmentVer} onValueChange={setAbTreatmentVer}>
              <SelectTrigger>
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                {hints.map((h) => (
                  <SelectItem key={h.id} value={String(h.version)}>
                    v{h.version}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium">
              {t("ab_test_tab.create_form.traffic_b_label")}
            </label>
            <Input
              type="number"
              min={10}
              max={90}
              value={abTrafficB}
              onChange={(e) => setAbTrafficB(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">
              {t("ab_test_tab.create_form.duration_label")}
            </label>
            <Input
              type="number"
              min={3}
              value={abDuration}
              onChange={(e) => setAbDuration(e.target.value)}
            />
          </div>
        </div>
        <Button
          size="sm"
          onClick={handleCreateAbTest}
          disabled={abCreating || !abControlVer || !abTreatmentVer}
        >
          {abCreating && <Loader2 className="size-4 animate-spin mr-1.5" />}
          {t("ab_test_tab.create_form.submit")}
        </Button>
      </CardContent>
    </Card>
  );
}
