"use client";

import * as React from "react";
import {
  File,
  FileText,
  Download,
  Archive,
  Upload,
  Clock,
  Sparkles,
  AlertCircle,
  Tag,
  Info,
  BarChart2,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";

import type { Locale } from "@/lib/types";
import { pickLocalized } from "@/lib/utils/locale-pick";

const RegulationUsageChart = dynamic(
  () =>
    import("./regulation-usage-chart").then((m) => m.RegulationUsageChart),
  { ssr: false, loading: () => null }
);

import {
  getRegulationById,
  archiveRegulation,
  downloadRegulation,
  type RegulationDetail,
} from "@/lib/api/regulations";
import { MOCK_WORK_TYPES } from "@/lib/mock-data/work-types";
import { MOCK_ZONES } from "@/lib/mock-data/zones";
import { MOCK_USERS } from "@/lib/mock-data/users";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { cn } from "@/lib/utils";

// ─── helpers ────────────────────────────────────────────────────────────────

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "сегодня";
  if (days === 1) return "вчера";
  if (days < 7) return `${days} дн. назад`;
  if (days < 30) return `${Math.floor(days / 7)} нед. назад`;
  return `${Math.floor(days / 30)} мес. назад`;
}

function FileIcon({ type, size = "default" }: { type: string; size?: "default" | "large" }) {
  const sz = size === "large" ? "size-10" : "size-6";
  if (type === "PDF") return <File className={cn(sz, "text-red-500")} aria-hidden="true" />;
  if (type === "WORD") return <FileText className={cn(sz, "text-blue-500")} aria-hidden="true" />;
  return <FileText className={cn(sz, "text-muted-foreground")} aria-hidden="true" />;
}

// ─── types ───────────────────────────────────────────────────────────────────

interface RegulationDetailSheetProps {
  regulationId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onArchived?: () => void;
  onReplaceRequest?: (id: string) => void;
}

// ─── section header ─────────────────────────────────────────────────────────

function SectionLabel({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="size-4 text-muted-foreground shrink-0" />
      <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide text-xs">
        {label}
      </span>
    </div>
  );
}

// ─── metadata row ────────────────────────────────────────────────────────────

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2.5 border-b border-border/60 last:border-0">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm text-foreground text-right">{children}</span>
    </div>
  );
}

// ─── main component ─────────────────────────────────────────────────────────

export function RegulationDetailSheet({
  regulationId,
  open,
  onOpenChange,
  onArchived,
  onReplaceRequest,
}: RegulationDetailSheetProps) {
  const t = useTranslations("screen.regulations");
  const locale = useLocale() as Locale;

  const [data, setData] = React.useState<RegulationDetail | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [archiveOpen, setArchiveOpen] = React.useState(false);
  const [archiving, setArchiving] = React.useState(false);

  // fetch on open
  React.useEffect(() => {
    if (!open || !regulationId) return;
    setData(null);
    setError(null);
    setLoading(true);
    getRegulationById(regulationId)
      .then((res) => setData(res.data))
      .catch(() => setError("Не удалось загрузить документ"))
      .finally(() => setLoading(false));
  }, [open, regulationId]);

  async function handleDownload() {
    if (!data) return;
    try {
      const blob = await downloadRegulation(data.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = pickLocalized(data.name, data.name_en, locale);
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t("toasts.downloaded"));
    } catch {
      toast.error(t("toasts.error"));
    }
  }

  async function handleArchive() {
    if (!data) return;
    setArchiving(true);
    try {
      const result = await archiveRegulation(data.id);
      if (result.success) {
        toast.success(t("toasts.archived"));
        onArchived?.();
        onOpenChange(false);
      } else {
        toast.error(t("toasts.error"));
      }
    } catch {
      toast.error(t("toasts.error"));
    } finally {
      setArchiving(false);
    }
  }

  // Resolve tag names
  const workTypeNames = React.useMemo(
    () => (data?.work_type_ids ?? []).map(
      (id) => ({ id, name: MOCK_WORK_TYPES.find((wt) => wt.id === id)?.name ?? `#${id}` }),
    ),
    [data],
  );
  const zoneNames = React.useMemo(
    () => (data?.zone_ids ?? []).map(
      (id) => ({ id, name: MOCK_ZONES.find((z) => z.id === id)?.name ?? `#${id}` }),
    ),
    [data],
  );
  const uploader = React.useMemo(
    () => MOCK_USERS.find((u) => u.id === data?.uploaded_by),
    [data],
  );

  // Chart data (90 days → show last 90 points)
  const chartData = React.useMemo(
    () =>
      (data?.usage_chart_90d ?? []).map((v, i) => ({
        day: i + 1,
        uses: v,
      })),
    [data],
  );

  // Usage history with resolved users
  const usageHistory = React.useMemo(
    () =>
      (data?.usage_history ?? []).map((h) => ({
        ...h,
        user: MOCK_USERS.find((u) => u.id === h.user_id),
        workTypeName: MOCK_WORK_TYPES.find((wt) => wt.id === h.work_type_id)?.name,
      })),
    [data],
  );

  const hasNoTags = workTypeNames.length === 0 && zoneNames.length === 0;
  const totalUsage = data?.usage_chart_90d.reduce((a, b) => a + b, 0) ?? 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full max-w-xl flex flex-col p-0 sm:max-w-xl"
        aria-label="Детали регламента"
      >
        {/* Header */}
        <SheetHeader className="border-b border-border px-6 py-4 shrink-0">
          {loading || !data ? (
            <div className="flex items-center gap-3">
              <Skeleton className="size-10 rounded-lg" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-muted shrink-0">
                <FileIcon type={data.file_type} />
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <SheetTitle className="text-sm font-semibold leading-tight text-foreground line-clamp-2">
                  {pickLocalized(data.name, data.name_en, locale)}
                </SheetTitle>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    variant={data.is_archived ? "secondary" : "outline"}
                    className={cn(
                      "text-xs",
                      !data.is_archived && "border-success text-success bg-success/10",
                    )}
                  >
                    {data.is_archived ? t("status.archived") : t("status.active")}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    v{data.version} · {data.file_type}
                  </span>
                </div>
              </div>
            </div>
          )}
        </SheetHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="px-6 py-5 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className={cn("h-4 w-full", i === 2 && "w-3/4")} />
              ))}
            </div>
          )}

          {error && !loading && (
            <div className="flex items-center gap-2 px-6 py-5 text-destructive">
              <AlertCircle className="size-4 shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {data && !loading && (
            <Tabs defaultValue="info" className="h-full">
              <TabsList className="w-full rounded-none border-b border-border bg-transparent px-6 justify-start gap-0 h-auto pb-0">
                {[
                  { value: "info", label: t("detail_sheet.info_section"), icon: Info },
                  { value: "tags", label: t("detail_sheet.tags_section"), icon: Tag },
                  { value: "usage", label: t("detail_sheet.ai_usage_section"), icon: BarChart2 },
                ].map(({ value, label, icon: Icon }) => (
                  <TabsTrigger
                    key={value}
                    value={value}
                    className={cn(
                      "rounded-none border-b-2 border-transparent px-4 py-3 text-sm font-medium text-muted-foreground",
                      "data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:bg-transparent",
                      "data-[state=active]:shadow-none",
                    )}
                  >
                    <Icon className="size-3.5 mr-1.5" />
                    {label}
                  </TabsTrigger>
                ))}
              </TabsList>

              {/* Info tab */}
              <TabsContent value="info" className="mt-0 p-6 space-y-5">
                {/* Description */}
                {data.description && (
                  <div>
                    <p className="text-sm text-foreground leading-relaxed">
                      {pickLocalized(data.description, data.description_en, locale)}
                    </p>
                  </div>
                )}

                {/* PDF Preview placeholder */}
                <div>
                  <SectionLabel icon={FileText} label="Превью" />
                  {data.file_type === "PDF" ? (
                    <div className="rounded-lg border border-border bg-muted/30 h-48 flex flex-col items-center justify-center gap-2">
                      <File className="size-8 text-red-400" />
                      <p className="text-sm text-muted-foreground text-center">
                        PDF Preview
                        <br />
                        <span className="text-xs">(откроется в браузере)</span>
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-border bg-muted/30 h-24 flex items-center justify-center">
                      <p className="text-sm text-muted-foreground text-center px-4">
                        Скачайте документ для просмотра
                      </p>
                    </div>
                  )}
                </div>

                {/* Metadata */}
                <div>
                  <SectionLabel icon={Info} label={t("detail_sheet.info_section")} />
                  <div className="rounded-lg border border-border divide-y divide-border/60 overflow-hidden">
                    <MetaRow label={t("detail_sheet.format_label")}>
                      <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                        {data.file_type}
                      </span>
                    </MetaRow>
                    <MetaRow label={t("detail_sheet.size_label")}>
                      <span className="font-mono text-xs">{formatFileSize(data.file_size_bytes)}</span>
                    </MetaRow>
                    <MetaRow label={t("detail_sheet.version_label")}>
                      v{data.version}
                    </MetaRow>
                    <MetaRow label={t("detail_sheet.uploaded_label")}>
                      {formatDate(data.uploaded_at)}
                    </MetaRow>
                    {uploader && (
                      <MetaRow label={t("detail_sheet.uploaded_by_label")}>
                        <span className="text-sm font-medium">
                          {uploader.last_name} {uploader.first_name[0]}.
                        </span>
                      </MetaRow>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* Tags tab */}
              <TabsContent value="tags" className="mt-0 p-6 space-y-5">
                {hasNoTags ? (
                  <div className="flex flex-col items-center gap-3 py-10">
                    <div className="flex size-12 items-center justify-center rounded-full bg-warning/10">
                      <AlertCircle className="size-6 text-warning" />
                    </div>
                    <p className="text-sm text-muted-foreground text-center max-w-xs">
                      {t("detail_sheet.no_tags")} — ИИ не знает, когда загружать этот документ. Добавьте теги.
                    </p>
                  </div>
                ) : (
                  <>
                    {workTypeNames.length > 0 && (
                      <div>
                        <SectionLabel icon={Tag} label="Типы работ" />
                        <div className="flex flex-wrap gap-2">
                          {workTypeNames.map((wt) => (
                            <Badge key={wt.id} variant="secondary">{wt.name}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {zoneNames.length > 0 && (
                      <div>
                        <SectionLabel icon={Tag} label="Зоны" />
                        <div className="flex flex-wrap gap-2">
                          {zoneNames.map((zone) => (
                            <Badge key={zone.id} variant="outline">{zone.name}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </TabsContent>

              {/* Usage tab */}
              <TabsContent value="usage" className="mt-0 p-6 space-y-5">
                {/* KPI row */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-border p-4 flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground">{t("detail_sheet.ai_usage_period")}</span>
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="size-4 text-primary" />
                      <span className="text-xl font-semibold">{totalUsage}</span>
                    </div>
                  </div>
                  <div className="rounded-lg border border-border p-4 flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground">За неделю</span>
                    <div className="flex items-center gap-1.5">
                      <BarChart2 className="size-4 text-muted-foreground" />
                      <span className="text-xl font-semibold">{data.ai_usage_count_30d}</span>
                    </div>
                  </div>
                </div>

                {/* 90-day chart */}
                <div>
                  <p className="text-xs text-muted-foreground mb-2">{t("detail_sheet.ai_usage_period")}</p>
                  <div className="h-32 w-full" aria-hidden="true">
                    <RegulationUsageChart data={chartData} />
                  </div>
                </div>

                {/* Usage history */}
                {usageHistory.length > 0 && (
                  <div>
                    <SectionLabel icon={Clock} label={t("detail_sheet.history_section")} />
                    <ul className="divide-y divide-border/60">
                      {usageHistory.map((h, i) => (
                        <li key={i} className="flex items-center gap-3 py-3">
                          <div className="flex size-7 items-center justify-center rounded-full bg-muted shrink-0">
                            <Sparkles className="size-3.5 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {h.user
                                ? `${h.user.last_name} ${h.user.first_name[0]}.`
                                : `Работник #${h.user_id}`}
                            </p>
                            {h.workTypeName && (
                              <p className="text-xs text-muted-foreground truncate">{h.workTypeName}</p>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {relativeTime(h.occurred_at)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>

        {/* Footer */}
        {data && !loading && (
          <SheetFooter className="border-t border-border px-6 py-4 shrink-0 flex flex-row flex-wrap gap-2">
            <Button variant="outline" size="sm" className="h-10 gap-1.5" onClick={handleDownload}>
              <Download className="size-4" />
              {t("row_actions.download")}
            </Button>

            {!data.is_archived && onReplaceRequest && (
              <Button
                variant="outline"
                size="sm"
                className="h-10 gap-1.5"
                onClick={() => { onReplaceRequest(data.id); onOpenChange(false); }}
              >
                <Upload className="size-4" />
                Новая версия
              </Button>
            )}

            {!data.is_archived && (
              <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="h-10 gap-1.5 text-destructive hover:text-destructive ml-auto">
                    <Archive className="size-4" />
                    {t("row_actions.archive")}
                  </Button>
                </AlertDialogTrigger>
                <ConfirmDialog
                  title="Архивировать документ?"
                  message="ИИ перестанет использовать этот документ в контексте. Документ можно будет восстановить."
                  confirmLabel="Архивировать"
                  variant="destructive"
                  onConfirm={handleArchive}
                  onOpenChange={setArchiveOpen}
                />
              </AlertDialog>
            )}
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
