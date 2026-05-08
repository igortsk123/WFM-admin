"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  BarChart3,
  BookOpen,
  Clock,
  Eye,
  FlaskConical,
  GripVertical,
  History,
  Loader2,
  Save,
  Sparkles,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

import {
  activateAiHint,
  generateAiHint,
  updateAiHint,
  type AIHint,
  type AbTest,
} from "@/lib/api/ai-coach";
import { cn } from "@/lib/utils";

import { parseHintText, type HintFormState } from "./_shared";
import { AbTestTab, HistoryTab } from "./history-panel";
import { MetricsTab, PreviewDrawer } from "./preview-panel";

// ═══════════════════════════════════════════════════════════════════
// GENERATE DIALOG — AI-powered hint generation
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
                onChange={(e) =>
                  setVariantsCount(Math.min(3, Math.max(1, Number(e.target.value))))
                }
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
            {loading ? (
              <Loader2 className="size-4 animate-spin mr-1.5" />
            ) : (
              <Sparkles className="size-4 mr-1.5" />
            )}
            {t("submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════
// EDIT TAB — main hint editor (why / steps / errors)
// ═══════════════════════════════════════════════════════════════════

interface EditTabProps {
  form: HintFormState;
  isDirty: boolean;
  onUpdate: (key: keyof HintFormState, value: string) => void;
  onSaveDraft: () => void;
  onActivate: () => void;
  onOpenGenerate: () => void;
  onOpenPreview: () => void;
  saving: boolean;
  activating: boolean;
  hasActiveHint: boolean;
}

function EditTab({
  form,
  isDirty,
  onUpdate,
  onSaveDraft,
  onActivate,
  onOpenGenerate,
  onOpenPreview,
  saving,
  activating,
  hasActiveHint,
}: EditTabProps) {
  const t = useTranslations("screen.aiCoach");
  const maxChars = 300;
  const charCount = form.why.length;

  return (
    <>
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
                onChange={(e) => onUpdate("why", e.target.value.slice(0, maxChars))}
                rows={5}
                placeholder={t("edit_tab.why_placeholder")}
                className="resize-none"
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{t("edit_tab.why_card_hint")}</p>
                <span
                  className={cn(
                    "text-xs",
                    charCount >= maxChars ? "text-destructive" : "text-muted-foreground"
                  )}
                >
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
                    onChange={(e) =>
                      onUpdate(`step${n}` as keyof HintFormState, e.target.value)
                    }
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
                  <span className="text-destructive font-bold text-base shrink-0 w-4 text-center">
                    ×
                  </span>
                  <Input
                    placeholder={t("edit_tab.error_placeholder")}
                    value={form[`error${n}` as keyof HintFormState]}
                    onChange={(e) =>
                      onUpdate(`error${n}` as keyof HintFormState, e.target.value)
                    }
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
        <Button variant="outline" size="sm" onClick={onOpenGenerate}>
          <Sparkles className="size-4 mr-1.5" />
          {t("edit_tab.actions.generate_via_ai")}
        </Button>
        <Button variant="outline" size="sm" onClick={onOpenPreview}>
          <Eye className="size-4 mr-1.5" />
          {t("edit_tab.actions.preview")}
        </Button>
        <Button variant="outline" size="sm" onClick={onSaveDraft} disabled={saving}>
          {saving ? (
            <Loader2 className="size-4 animate-spin mr-1.5" />
          ) : (
            <Save className="size-4 mr-1.5" />
          )}
          {t("edit_tab.actions.save_draft")}
        </Button>
        <Button size="sm" onClick={onActivate} disabled={activating || !hasActiveHint}>
          {activating ? (
            <Loader2 className="size-4 animate-spin mr-1.5" />
          ) : (
            <Zap className="size-4 mr-1.5" />
          )}
          {t("edit_tab.actions.activate")}
        </Button>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════
// EDITOR TABS — orchestrator for all 4 tabs
// ═══════════════════════════════════════════════════════════════════

interface EditorTabsProps {
  hints: AIHint[];
  abTest: AbTest | null;
  abTestLoading: boolean;
  workTypeName: string;
  workTypeId: number;
}

export function EditorTabs({
  hints,
  abTest,
  abTestLoading,
  workTypeName,
  workTypeId,
}: EditorTabsProps) {
  const t = useTranslations("screen.aiCoach");

  const activeHint = hints.find(
    (h) => h.version === Math.max(...hints.map((x) => x.version))
  );

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
      await updateAiHint(activeHint?.id ?? "new", {
        text,
        work_type_id: workTypeId,
        work_type_name: workTypeName,
      });
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

  function handleUseVariant(text: string) {
    const parsed = parseHintText(text);
    setForm((prev) => ({ ...prev, ...parsed }));
    setIsDirty(true);
    toast.success(t("toasts.generated", { count: 1 }));
  }

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

        <TabsContent value="edit" className="mt-4 flex-1 flex flex-col">
          <EditTab
            form={form}
            isDirty={isDirty}
            onUpdate={updateForm}
            onSaveDraft={handleSaveDraft}
            onActivate={handleActivate}
            onOpenGenerate={() => setGenerateOpen(true)}
            onOpenPreview={() => setPreviewOpen(true)}
            saving={saving}
            activating={activating}
            hasActiveHint={!!activeHint}
          />
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <HistoryTab hints={hints} />
        </TabsContent>

        <TabsContent value="ab_test" className="mt-4">
          <AbTestTab
            hints={hints}
            abTest={abTest}
            abTestLoading={abTestLoading}
            workTypeId={workTypeId}
          />
        </TabsContent>

        <TabsContent value="metrics" className="mt-4">
          <MetricsTab hints={hints} />
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
    </>
  );
}
