"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Sparkles,
  Eye,
  Save,
  Zap,
  Plus,
  Search,
  GripVertical,
  RotateCcw,
  GitCompare,
  CheckCircle,
  Clock,
  Loader2,
  BookOpen,
  BarChart3,
  FlaskConical,
  History,
  Info,
} from "lucide-react";

import {
  getAiHints,
  updateAiHint,
  activateAiHint,
  generateAiHint,
  getAbTest,
  createAbTest,
  type AIHint,
  type AbTest,
} from "@/lib/api/ai-coach";
import { MOCK_WORK_TYPES } from "@/lib/mock-data/work-types";

import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
} from "@/components/ui/drawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertDialog } from "@/components/ui/alert-dialog";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

type HintFilter = "all" | "with_hint" | "without_hint";

interface HintFormState {
  why: string;
  step1: string;
  step2: string;
  step3: string;
  error1: string;
  error2: string;
  error3: string;
}

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

const MOCK_METRICS_CHART = Array.from({ length: 90 }, (_, i) => {
  const date = new Date("2026-02-04");
  date.setDate(date.getDate() + i);
  return {
    date: date.toLocaleDateString("ru-RU", { day: "2-digit", month: "short" }),
    rate: Math.round(65 + Math.sin(i / 8) * 10 + i * 0.08 + Math.random() * 5),
  };
});

// IDs with AI hints
const HINT_WORK_TYPE_IDS = new Set([4]);

function parseHintText(text: string): Omit<HintFormState, "error1" | "error2" | "error3"> {
  // Best-effort: put the full text into "why"
  return {
    why: text,
    step1: "",
    step2: "",
    step3: "",
  };
}

function getDaysDiff(from: string, to: string): number {
  return Math.round(
    (new Date(to).getTime() - new Date(from).getTime()) / (1000 * 60 * 60 * 24)
  );
}

// ═══════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════


function EditorSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// GENERATE DIALOG
// ═══════════════════════════════════════════════════════════════════

interface GenerateDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  workTypeId: number;
  workTypeName: string;
  onUseVariant: (text: string) => void;
}

function GenerateDialog({
  open,
  onOpenChange,
  workTypeId,
  workTypeName,
  onUseVariant,
}: GenerateDialogProps) {
  const t = useTranslations("screen.aiCoach.generate_dialog");

  const [context, setContext] = useState(
    `Тип работы: ${workTypeName}. Опишите зачем важна эта задача, 3 ключевых шага и частые ошибки.`
  );
  const [style, setStyle] = useState<"concise" | "detailed" | "friendly">("concise");
  const [variantsCount, setVariantsCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [variants, setVariants] = useState<string[]>([]);

  const handleGenerate = async () => {
    setLoading(true);
    setVariants([]);
    try {
      const res = await generateAiHint({
        work_type_id: workTypeId,
        context,
        style,
        variants_count: variantsCount,
      });
      setVariants(res.data.variants);
    } catch {
      toast.error(t("../../toasts.error" as Parameters<typeof t>[0]));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            {t("title")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t("context_label")}</label>
            <Textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t("style_label")}</label>
              <Select value={style} onValueChange={(v) => setStyle(v as typeof style)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="concise">{t("style_concise")}</SelectItem>
                  <SelectItem value="detailed">{t("style_detailed")}</SelectItem>
                  <SelectItem value="friendly">{t("style_friendly")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t("variants_label")}</label>
              <Input
                type="number"
                min={1}
                max={3}
                value={variantsCount}
                onChange={(e) => setVariantsCount(Math.min(3, Math.max(1, Number(e.target.value))))}
              />
            </div>
          </div>

          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4 justify-center">
              <Loader2 className="size-4 animate-spin" />
              {t("loading")}
            </div>
          )}

          {variants.length > 0 && (
            <div className="space-y-3">
              {variants.map((v, i) => (
                <Card key={i} className="border-dashed">
                  <CardContent className="p-3 space-y-2">
                    <p className="text-sm">{v}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        onUseVariant(v);
                        onOpenChange(false);
                      }}
                    >
                      {t("use_variant")}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Закрыть
          </Button>
          <Button onClick={handleGenerate} disabled={loading}>
            {loading ? <Loader2 className="size-4 animate-spin mr-1.5" /> : <Sparkles className="size-4 mr-1.5" />}
            {t("submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════
// PREVIEW DRAWER
// ═══════════════════════════════════════════════════════════════════

interface PreviewDrawerProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  workTypeName: string;
  form: HintFormState;
}

function PreviewDrawer({ open, onOpenChange, workTypeName, form }: PreviewDrawerProps) {
  const t = useTranslations("screen.aiCoach.preview_drawer");

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader>
          <DrawerTitle>{t("title")}</DrawerTitle>
        </DrawerHeader>
        <ScrollArea className="flex-1 overflow-auto">
          <div className="p-4 pb-8 max-w-sm mx-auto space-y-4">
            {/* Mock mobile card */}
            <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
              <div className="bg-primary/10 px-4 py-3 border-b border-border">
                <p className="text-xs text-muted-foreground">Задача</p>
                <p className="text-sm font-semibold text-foreground">{workTypeName}</p>
              </div>
              <div className="p-4 space-y-4">
                {form.why && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("section_why")}</p>
                    <p className="text-sm leading-relaxed">{form.why}</p>
                  </div>
                )}
                {(form.step1 || form.step2 || form.step3) && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("section_steps")}</p>
                    {[form.step1, form.step2, form.step3].filter(Boolean).map((step, i) => (
                      <div key={i} className="flex gap-2.5">
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold mt-0.5">
                          {i + 1}
                        </span>
                        <p className="text-sm">{step}</p>
                      </div>
                    ))}
                  </div>
                )}
                {(form.error1 || form.error2 || form.error3) && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("section_errors")}</p>
                    {[form.error1, form.error2, form.error3].filter(Boolean).map((err, i) => (
                      <div key={i} className="flex gap-2 items-start">
                        <span className="text-destructive font-bold mt-0.5 shrink-0">×</span>
                        <p className="text-sm text-destructive">{err}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
}

// ═══════════════════════════════════════════════════════════════════
// EDITOR TABS
// ═══════════════════════════════════════════════════════════════════

interface EditorTabsProps {
  hints: AIHint[];
  abTest: AbTest | null;
  abTestLoading: boolean;
  workTypeName: string;
  workTypeId: number;
  onHintsChange: (hints: AIHint[]) => void;
  onAbTestChange: (t: AbTest | null) => void;
}

function EditorTabs({
  hints,
  abTest,
  abTestLoading,
  workTypeName,
  workTypeId,
  onHintsChange: _onHintsChange,
  onAbTestChange: _onAbTestChange,
}: EditorTabsProps) {
  const t = useTranslations("screen.aiCoach");

  const activeHint = hints.find((h) => h.version === Math.max(...hints.map((x) => x.version)));

  // Form state
  const [form, setForm] = useState<HintFormState>({
    why: activeHint?.text ?? "",
    step1: "",
    step2: "",
    step3: "",
    error1: "",
    error2: "",
    error3: "",
  });
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activating, setActivating] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [rollbackVersion, setRollbackVersion] = useState<number | null>(null);
  const [rollbackOpen, setRollbackOpen] = useState(false);

  // A/B test create form
  const [abControlVer, setAbControlVer] = useState<string>("");
  const [abTreatmentVer, setAbTreatmentVer] = useState<string>("");
  const [abTrafficB, setAbTrafficB] = useState("50");
  const [abDuration, setAbDuration] = useState("14");
  const [abCreating, setAbCreating] = useState(false);

  function updateForm(key: keyof HintFormState, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setIsDirty(true);
  }

  async function handleSaveDraft() {
    setSaving(true);
    try {
      const text = [
        form.why,
        form.step1 && `Шаг 1: ${form.step1}`,
        form.step2 && `Шаг 2: ${form.step2}`,
        form.step3 && `Шаг 3: ${form.step3}`,
        form.error1 && `Ошибка: ${form.error1}`,
        form.error2 && `Ошибка: ${form.error2}`,
        form.error3 && `Ошибка: ${form.error3}`,
      ]
        .filter(Boolean)
        .join("\n");
      await updateAiHint(activeHint?.id ?? "new", { text, work_type_id: workTypeId, work_type_name: workTypeName });
      setIsDirty(false);
      toast.success(t("toasts.saved_draft"));
    } catch {
      toast.error(t("toasts.error"));
    } finally {
      setSaving(false);
    }
  }

  async function handleActivate() {
    if (!activeHint) return;
    setActivating(true);
    try {
      await activateAiHint(activeHint.id);
      toast.success(t("toasts.activated"));
    } catch {
      toast.error(t("toasts.error"));
    } finally {
      setActivating(false);
    }
  }

  async function handleRollback() {
    if (rollbackVersion === null) return;
    try {
      toast.success(t("toasts.rolled_back"));
    } catch {
      toast.error(t("toasts.error"));
    }
  }

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

  function handleUseVariant(text: string) {
    const parsed = parseHintText(text);
    setForm((prev) => ({ ...prev, ...parsed }));
    setIsDirty(true);
    toast.success(t("toasts.generated", { count: 1 }));
  }

  const charCount = form.why.length;
  const maxChars = 300;

  return (
    <>
      <Tabs defaultValue="edit" className="flex flex-col flex-1">
        <TabsList className="w-full grid grid-cols-4 shrink-0">
          <TabsTrigger value="edit" className="flex items-center gap-1.5">
            <BookOpen className="size-3.5 hidden sm:block" />
            {t("editor.tabs.edit")}
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-1.5">
            <History className="size-3.5 hidden sm:block" />
            {t("editor.tabs.history")}
          </TabsTrigger>
          <TabsTrigger value="ab_test" className="flex items-center gap-1.5">
            <FlaskConical className="size-3.5 hidden sm:block" />
            {t("editor.tabs.ab_test")}
          </TabsTrigger>
          <TabsTrigger value="metrics" className="flex items-center gap-1.5">
            <BarChart3 className="size-3.5 hidden sm:block" />
            {t("editor.tabs.metrics")}
          </TabsTrigger>
        </TabsList>

        {/* ── Edit Tab ── */}
        <TabsContent value="edit" className="mt-4 flex-1 flex flex-col">
          <ScrollArea className="flex-1">
            <div className="space-y-4 pr-1">
              {/* Why card */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{t("edit_tab.why_card_title")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Textarea
                    value={form.why}
                    onChange={(e) => updateForm("why", e.target.value.slice(0, maxChars))}
                    rows={5}
                    placeholder={t("edit_tab.why_placeholder")}
                    className="resize-none"
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">{t("edit_tab.why_card_hint")}</p>
                    <span className={cn("text-xs", charCount >= maxChars ? "text-destructive" : "text-muted-foreground")}>
                      {charCount}/{maxChars}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* 3 steps card */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{t("edit_tab.steps_card_title")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {([1, 2, 3] as const).map((n) => (
                    <div key={n} className="flex items-center gap-2">
                      <GripVertical className="size-4 text-muted-foreground shrink-0 cursor-grab" />
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                        {n}
                      </span>
                      <Input
                        placeholder={t("edit_tab.step_label", { n })}
                        value={form[`step${n}` as keyof HintFormState]}
                        onChange={(e) => updateForm(`step${n}` as keyof HintFormState, e.target.value)}
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Errors card */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{t("edit_tab.errors_card_title")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {([1, 2, 3] as const).map((n) => (
                    <div key={n} className="flex items-center gap-2">
                      <span className="text-destructive font-bold text-base shrink-0 w-4 text-center">×</span>
                      <Input
                        placeholder={t("edit_tab.error_placeholder")}
                        value={form[`error${n}` as keyof HintFormState]}
                        onChange={(e) => updateForm(`error${n}` as keyof HintFormState, e.target.value)}
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </ScrollArea>

          {/* Action row — sticky bottom on mobile */}
          <div className="flex flex-wrap items-center justify-end gap-2 pt-4 border-t border-border mt-4 shrink-0 sticky bottom-0 bg-background pb-1 md:static md:pb-0">
            {isDirty && (
              <span className="text-xs text-warning flex items-center gap-1 mr-auto">
                <Clock className="size-3.5" />
                {t("states.draft_dirty_indicator")}
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setGenerateOpen(true)}
            >
              <Sparkles className="size-4 mr-1.5" />
              {t("edit_tab.actions.generate_via_ai")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreviewOpen(true)}
            >
              <Eye className="size-4 mr-1.5" />
              {t("edit_tab.actions.preview")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveDraft}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin mr-1.5" />
              ) : (
                <Save className="size-4 mr-1.5" />
              )}
              {t("edit_tab.actions.save_draft")}
            </Button>
            <Button
              size="sm"
              onClick={handleActivate}
              disabled={activating || !activeHint}
            >
              {activating ? (
                <Loader2 className="size-4 animate-spin mr-1.5" />
              ) : (
                <Zap className="size-4 mr-1.5" />
              )}
              {t("edit_tab.actions.activate")}
            </Button>
          </div>
        </TabsContent>

        {/* ── History Tab ── */}
        <TabsContent value="history" className="mt-4">
          {hints.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">{t("history_tab.empty")}</div>
          ) : (
            <div className="space-y-3">
              {[...hints].reverse().map((hint) => {
                const isLatest = hint.version === Math.max(...hints.map((x) => x.version));
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
                          <p className="text-sm line-clamp-2 mt-1">{hint.text}</p>
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
          )}
        </TabsContent>

        {/* ── A/B Test Tab ── */}
        <TabsContent value="ab_test" className="mt-4">
          {abTestLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : abTest ? (
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <CardTitle className="text-sm">{t("ab_test_tab.active_section_title")}</CardTitle>
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
                        <CardTitle className="text-xs font-semibold">{t("ab_test_tab.version_a_title")}</CardTitle>
                        <Badge variant="outline" className="font-mono text-xs w-fit">v{abTest.control_version}</Badge>
                      </CardHeader>
                      <CardContent className="space-y-1.5 pt-0">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">{t("ab_test_tab.stats.impressions")}</span>
                          <span className="font-medium">{abTest.control_stats.impressions}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">{t("ab_test_tab.stats.applications")}</span>
                          <span className="font-medium">{abTest.control_stats.applications}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">{t("ab_test_tab.stats.helpful_rate")}</span>
                          <span className="font-medium">{Math.round(abTest.control_stats.helpful_rate * 100)}%</span>
                        </div>
                      </CardContent>
                    </Card>
                    {/* Version B */}
                    <Card className="border-border">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-semibold">{t("ab_test_tab.version_b_title")}</CardTitle>
                        <Badge variant="outline" className="font-mono text-xs w-fit">v{abTest.treatment_version}</Badge>
                      </CardHeader>
                      <CardContent className="space-y-1.5 pt-0">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">{t("ab_test_tab.stats.impressions")}</span>
                          <span className="font-medium">{abTest.treatment_stats.impressions}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">{t("ab_test_tab.stats.applications")}</span>
                          <span className="font-medium">{abTest.treatment_stats.applications}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">{t("ab_test_tab.stats.helpful_rate")}</span>
                          <span className="font-medium text-success">{Math.round(abTest.treatment_stats.helpful_rate * 100)}%</span>
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
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">{t("ab_test_tab.create_section_title")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">{t("ab_test_tab.create_form.control_label")}</label>
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
                    <label className="text-xs font-medium">{t("ab_test_tab.create_form.treatment_label")}</label>
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
                    <label className="text-xs font-medium">{t("ab_test_tab.create_form.traffic_b_label")}</label>
                    <Input
                      type="number"
                      min={10}
                      max={90}
                      value={abTrafficB}
                      onChange={(e) => setAbTrafficB(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">{t("ab_test_tab.create_form.duration_label")}</label>
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
          )}
        </TabsContent>

        {/* ── Metrics Tab ── */}
        <TabsContent value="metrics" className="mt-4">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: t("metrics_tab.stats.applications_30d"), value: hints[0]?.stats.impressions ?? 0 },
                { label: t("metrics_tab.stats.helpful"), value: hints[0]?.stats.applications ?? 0 },
                {
                  label: t("metrics_tab.stats.helpful_rate"),
                  value: hints[0] ? `${Math.round(hints[0].stats.helpful_rate * 100)}%` : "—",
                },
                { label: t("metrics_tab.stats.ai_feedback"), value: "4.3" },
              ].map(({ label, value }) => (
                <Card key={label}>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{t("metrics_tab.history_chart_title")}</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={MOCK_METRICS_CHART} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      interval={14}
                      className="text-muted-foreground"
                    />
                    <YAxis
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      domain={[50, 100]}
                      className="text-muted-foreground"
                    />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      formatter={((value: number) => [`${value}%`, "Helpful rate"]) as never}
                    />
                    <Line
                      type="monotone"
                      dataKey="rate"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Alert>
              <Info className="size-4" />
              <AlertDescription className="text-xs">{t("metrics_tab.info_alert")}</AlertDescription>
            </Alert>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialogs & Drawers */}
      <GenerateDialog
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        workTypeId={workTypeId}
        workTypeName={workTypeName}
        onUseVariant={handleUseVariant}
      />
      <PreviewDrawer
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        workTypeName={workTypeName}
        form={form}
      />
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
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

export function AiCoachEditor() {
  const t = useTranslations("screen.aiCoach");

  // Work types list
  const workTypes = MOCK_WORK_TYPES.filter((wt) => wt.id <= 13);

  const [filter, setFilter] = useState<HintFilter>("all");
  const [search, setSearch] = useState("");
  const [selectedWorkTypeId, setSelectedWorkTypeId] = useState<number | null>(4); // default to "Выкладка"

  // Hints data
  const [hints, setHints] = useState<AIHint[]>([]);
  const [hintsLoading, setHintsLoading] = useState(false);

  // A/B test data
  const [abTest, setAbTest] = useState<AbTest | null>(null);
  const [abTestLoading, setAbTestLoading] = useState(false);

  // Mobile left-panel drawer
  const [mobileListOpen, setMobileListOpen] = useState(false);

  const loadHints = useCallback(async (workTypeId: number) => {
    setHintsLoading(true);
    try {
      const res = await getAiHints({ work_type_id: workTypeId });
      setHints(res.data);
    } catch {
      toast.error(t("toasts.error"));
    } finally {
      setHintsLoading(false);
    }
  }, [t]);

  const loadAbTest = useCallback(async (workTypeId: number) => {
    setAbTestLoading(true);
    try {
      const res = await getAbTest(workTypeId);
      setAbTest(res.data);
    } catch {
      // silently fail
    } finally {
      setAbTestLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedWorkTypeId != null) {
      loadHints(selectedWorkTypeId);
      loadAbTest(selectedWorkTypeId);
    }
  }, [selectedWorkTypeId, loadHints, loadAbTest]);

  const filteredWorkTypes = workTypes.filter((wt) => {
    const matchesSearch = wt.name.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (filter === "with_hint") return HINT_WORK_TYPE_IDS.has(wt.id);
    if (filter === "without_hint") return !HINT_WORK_TYPE_IDS.has(wt.id);
    return true;
  });

  const selectedWorkType = workTypes.find((wt) => wt.id === selectedWorkTypeId);
  const latestHint = hints.length > 0 ? hints.reduce((a, b) => (a.version > b.version ? a : b)) : null;

  // Left panel content (shared between desktop and mobile drawer)
  const LeftPanelContent = (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border space-y-2 shrink-0">
        <p className="text-sm font-medium text-foreground">{t("left_panel.title")}</p>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            placeholder={t("left_panel.search_placeholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {(["all", "with_hint", "without_hint"] as HintFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                filter === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {f === "all"
                ? t("left_panel.filter_all")
                : f === "with_hint"
                ? t("left_panel.filter_with_hint")
                : t("left_panel.filter_without")}
            </button>
          ))}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-0.5">
          {filteredWorkTypes.map((wt) => {
            const hasHint = HINT_WORK_TYPE_IDS.has(wt.id);
            const isSelected = wt.id === selectedWorkTypeId;
            const topVersion = wt.id === 4 ? 3 : null;
            return (
              <button
                key={wt.id}
                onClick={() => {
                  setSelectedWorkTypeId(wt.id);
                  setMobileListOpen(false);
                }}
                className={cn(
                  "w-full flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left transition-colors",
                  isSelected
                    ? "bg-accent border-l-4 border-primary"
                    : "hover:bg-muted/50 border-l-4 border-transparent"
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={cn(
                      "size-2 rounded-full shrink-0",
                      hasHint ? "bg-success" : "bg-muted-foreground/30"
                    )}
                  />
                  <span className="text-sm font-medium truncate">{wt.name}</span>
                </div>
                <Badge variant="outline" className="font-mono text-xs shrink-0">
                  {topVersion != null ? `v${topVersion}` : t("left_panel.no_version")}
                </Badge>
              </button>
            );
          })}
        </div>
      </ScrollArea>

      <div className="p-3 border-t border-border shrink-0">
        <Button variant="outline" size="sm" className="w-full">
          <Plus className="size-4 mr-1.5" />
          <span className="text-xs">{t("left_panel.add_for_missing")}</span>
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Page Header */}
      <PageHeader
        breadcrumbs={[
          { label: t("breadcrumbs.home"), href: "/dashboard" },
          { label: t("breadcrumbs.future") },
          { label: t("breadcrumbs.ai_coach") },
        ]}
        title={t("page_title")}
        subtitle={t("page_subtitle")}
        actions={
          <Badge className="bg-primary/10 text-primary border-primary/20 text-xs font-semibold">
            {t("beta_badge")}
          </Badge>
        }
      />

      {/* Mobile: selector button */}
      <div className="lg:hidden">
        <Button
          variant="outline"
          className="w-full justify-between"
          onClick={() => setMobileListOpen(true)}
        >
          <span className="text-sm">
            {selectedWorkType?.name ?? t("left_panel.title")}
          </span>
          <Search className="size-4 text-muted-foreground" />
        </Button>
      </div>

      {/* Mobile list drawer */}
      <Drawer open={mobileListOpen} onOpenChange={setMobileListOpen}>
        <DrawerContent className="h-[80vh]">
          <DrawerHeader>
            <DrawerTitle>{t("left_panel.title")}</DrawerTitle>
          </DrawerHeader>
          <div className="flex-1 overflow-hidden">
            {LeftPanelContent}
          </div>
        </DrawerContent>
      </Drawer>

      {/* Main 2-col layout */}
      <div className="grid lg:grid-cols-[20rem_1fr] gap-6" style={{ height: "calc(100vh - 9rem)" }}>
        {/* Left col — desktop only */}
        <Card className="hidden lg:flex flex-col overflow-hidden">
          {LeftPanelContent}
        </Card>

        {/* Right col — Editor */}
        <Card className="flex flex-col overflow-hidden">
          {selectedWorkType == null ? (
            <EmptyState
              icon={BookOpen}
              title="Выберите тип работы"
              description="Выберите тип работы из списка слева, чтобы управлять подсказками"
              className="flex-1"
            />
          ) : hintsLoading ? (
            <EditorSkeleton />
          ) : (
            <div className="flex flex-col flex-1 overflow-hidden p-4 md:p-6 gap-4">
              {/* Header */}
              <div className="shrink-0">
                <div className="flex items-start gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-base font-semibold text-foreground">{selectedWorkType.name}</h2>
                    {latestHint ? (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {t("editor.version_meta", {
                          version: latestHint.version,
                          activatedAt: new Date(latestHint.created_at).toLocaleDateString("ru-RU", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          }),
                          createdBy: "Соколова А. В.",
                        })}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {t("empty.no_hint_title")}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <Separator className="shrink-0" />

              {hints.length === 0 ? (
                <EmptyState
                  icon={Sparkles}
                  title={t("empty.no_hint_title")}
                  description={t("page_subtitle")}
                  action={{
                    label: t("empty.no_hint_cta"),
                    icon: Plus,
                    onClick: () => {},
                  }}
                  className="flex-1"
                />
              ) : (
                <div className="flex-1 overflow-hidden flex flex-col">
                  <EditorTabs
                    hints={hints}
                    abTest={abTest}
                    abTestLoading={abTestLoading}
                    workTypeName={selectedWorkType.name}
                    workTypeId={selectedWorkType.id}
                    onHintsChange={setHints}
                    onAbTestChange={setAbTest}
                  />
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
