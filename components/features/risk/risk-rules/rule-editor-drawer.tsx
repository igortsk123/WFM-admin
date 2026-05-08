"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";

import {
  updateRiskRule,
  type RiskRuleConfig,
  type RiskMode,
  type RiskTriggerKey,
} from "@/lib/api/risk";

import { TRIGGER_KEYS_WITH_THRESHOLD, TRIGGER_DEFAULTS } from "./_shared";

interface RuleEditorDrawerProps {
  rule: RiskRuleConfig | null;
  open: boolean;
  onClose: () => void;
  onSaved: (updated: RiskRuleConfig) => void;
}

export function RuleEditorDrawer({ rule, open, onClose, onSaved }: RuleEditorDrawerProps) {
  const t = useTranslations("screen.riskRules");
  const [saving, setSaving] = useState(false);

  const [mode, setMode] = useState<RiskMode>("FULL_REVIEW");
  const [sampleRate, setSampleRate] = useState(35);
  const [photoRequired, setPhotoRequired] = useState(false);
  const [triggers, setTriggers] = useState<RiskRuleConfig["triggers_config"]>([]);

  // Sync state when rule changes
  useEffect(() => {
    if (!rule) return;
    setMode(rule.mode);
    setSampleRate(rule.sample_rate ?? 35);
    setPhotoRequired(rule.photo_required);
    setTriggers(rule.triggers_config.map((tc) => ({ ...tc })));
  }, [rule]);

  const updateTriggerEnabled = (key: RiskTriggerKey, enabled: boolean) => {
    setTriggers((prev) =>
      prev.map((tc) => (tc.key === key ? { ...tc, enabled } : tc))
    );
  };

  const updateTriggerThreshold = (key: RiskTriggerKey, threshold: number) => {
    setTriggers((prev) =>
      prev.map((tc) => (tc.key === key ? { ...tc, threshold } : tc))
    );
  };

  const handleSave = async () => {
    if (!rule) return;
    setSaving(true);
    const updated: RiskRuleConfig = {
      ...rule,
      mode,
      sample_rate: mode === "SAMPLING" ? sampleRate : undefined,
      photo_required: photoRequired,
      triggers_config: triggers,
    };
    const res = await updateRiskRule(rule.id, updated);
    setSaving(false);
    if (res.success) {
      toast.success(t("toasts.rule_saved"));
      onSaved(updated);
      onClose();
    } else {
      toast.error(t("toasts.error"));
    }
  };

  const allModes: RiskMode[] = ["FULL_REVIEW", "SAMPLING", "PHOTO_REQUIRED", "AUTO_ACCEPT"];

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className="w-full max-w-2xl flex flex-col p-0 gap-0"
      >
        <SheetHeader className="px-6 py-4 border-b shrink-0">
          <SheetTitle>
            {rule ? t("rule_editor.title", { workType: rule.work_type_name }) : ""}
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="px-6 py-5 flex flex-col gap-6">
            {/* Mode section */}
            <section aria-labelledby="mode-section-heading">
              <h3
                id="mode-section-heading"
                className="text-sm font-semibold text-foreground mb-3"
              >
                {t("rule_editor.mode_section")}
              </h3>
              <RadioGroup
                value={mode}
                onValueChange={(v) => setMode(v as RiskMode)}
                className="flex flex-col gap-2"
              >
                {allModes.map((m) => (
                  <label
                    key={m}
                    className="flex items-start gap-3 rounded-lg border bg-card p-3 cursor-pointer hover:bg-muted/50 transition-colors has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
                  >
                    <RadioGroupItem value={m} id={`mode-${m}`} className="mt-0.5" />
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium text-foreground">
                        {t(`rules_tab.mode_label.${m}` as Parameters<typeof t>[0])}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {t(`rule_editor.mode_descriptions.${m}` as Parameters<typeof t>[0])}
                      </span>
                    </div>
                  </label>
                ))}
              </RadioGroup>
            </section>

            {/* Sample rate section (only for SAMPLING) */}
            {mode === "SAMPLING" && (
              <section aria-labelledby="sample-section-heading">
                <h3
                  id="sample-section-heading"
                  className="text-sm font-semibold text-foreground mb-3"
                >
                  {t("rule_editor.sample_section")}
                </h3>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {t("rules_tab.columns.sample_rate")}
                    </span>
                    <span className="text-sm font-mono font-semibold text-foreground">
                      {sampleRate}%
                    </span>
                  </div>
                  <Slider
                    min={5}
                    max={100}
                    step={5}
                    value={[sampleRate]}
                    onValueChange={([v]) => setSampleRate(v)}
                    className="w-full"
                    aria-label={t("rule_editor.sample_section")}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("rule_editor.sample_hint")}
                  </p>
                </div>
              </section>
            )}

            {/* Photo requirement */}
            <section aria-labelledby="photo-section-heading">
              <h3
                id="photo-section-heading"
                className="text-sm font-semibold text-foreground mb-3"
              >
                {t("rule_editor.photo_section")}
              </h3>
              <div className="flex items-center justify-between rounded-lg border bg-card p-3">
                <Label
                  htmlFor="photo-required-switch"
                  className="text-sm font-normal cursor-pointer"
                >
                  {t("rule_editor.photo_label")}
                </Label>
                <Switch
                  id="photo-required-switch"
                  checked={photoRequired}
                  onCheckedChange={setPhotoRequired}
                  aria-label={t("rule_editor.photo_label")}
                />
              </div>
            </section>

            {/* Escalation triggers */}
            <section aria-labelledby="triggers-section-heading">
              <h3
                id="triggers-section-heading"
                className="text-sm font-semibold text-foreground mb-3"
              >
                {t("rule_editor.triggers_section")}
              </h3>
              <div className="flex flex-col gap-2">
                {triggers.map((tc) => {
                  const hasThreshold = TRIGGER_KEYS_WITH_THRESHOLD.includes(tc.key);
                  return (
                    <div
                      key={tc.key}
                      className="rounded-lg border bg-card p-3 flex flex-col gap-2 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-medium text-foreground">
                          {t(`rule_editor.trigger_keys.${tc.key}` as Parameters<typeof t>[0])}
                        </span>
                        <Switch
                          checked={tc.enabled}
                          onCheckedChange={(v) => updateTriggerEnabled(tc.key, v)}
                          aria-label={t(`rule_editor.trigger_keys.${tc.key}` as Parameters<typeof t>[0])}
                          className="shrink-0"
                        />
                      </div>
                      {tc.enabled && hasThreshold && (
                        <div className="flex items-center gap-3 pt-1">
                          <Label className="text-xs text-muted-foreground whitespace-nowrap">
                            {t(`rule_editor.trigger_threshold_labels.${tc.key}` as Parameters<typeof t>[0])}
                          </Label>
                          <Input
                            type="number"
                            min={1}
                            value={tc.threshold ?? TRIGGER_DEFAULTS[tc.key] ?? 1}
                            onChange={(e) =>
                              updateTriggerThreshold(tc.key, Number(e.target.value))
                            }
                            className="h-8 w-24 text-sm"
                            aria-label={t(`rule_editor.trigger_threshold_labels.${tc.key}` as Parameters<typeof t>[0])}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </ScrollArea>

        <SheetFooter className="px-6 py-4 border-t shrink-0 flex flex-row gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1 sm:flex-none">
            {t("rule_editor.actions.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={saving} className="flex-1 sm:flex-none">
            {saving && <Loader2 className="size-4 animate-spin mr-2" aria-hidden="true" />}
            {t("rule_editor.actions.save")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
