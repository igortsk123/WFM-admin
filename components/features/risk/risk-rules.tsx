"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  Clock,
  Filter,
  AlertTriangle,
  Plus,
  MoreVertical,
  ShieldCheck,
  Loader2,
  Search,
  ChevronDown,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

import {
  getRiskRules,
  getRiskMetrics,
  updateRiskRule,
  deleteRiskRule,
  createRiskRule,
  simulateRisk,
  type RiskRuleConfig,
  type RiskMode,
  type RiskTriggerKey,
  type RiskMetrics,
  type RiskSimulationResult,
} from "@/lib/api/risk";

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

const MODE_VARIANT: Record<RiskMode, string> = {
  FULL_REVIEW: "bg-destructive/10 text-destructive border-destructive/20",
  SAMPLING: "bg-info/10 text-info border-info/20",
  PHOTO_REQUIRED: "bg-accent/15 text-accent-foreground border-accent/20",
  AUTO_ACCEPT: "bg-muted text-muted-foreground border-border",
};

const TRIGGER_KEYS_WITH_THRESHOLD: RiskTriggerKey[] = [
  "NEW_PERFORMER",
  "STORE_HIGH_DEFECT",
  "PERFORMER_RECENT_REJECTS",
];

const TRIGGER_DEFAULTS: Record<RiskTriggerKey, number | undefined> = {
  NEW_PERFORMER: 5,
  STORE_HIGH_DEFECT: 10,
  PERFORMER_RECENT_REJECTS: 3,
  TASK_ADDITIONAL: undefined,
};

function formatDate(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

// ═══════════════════════════════════════════════════════════════════
// MOCK HISTORY DATA
// ═══════════════════════════════════════════════════════════════════

interface HistoryEntry {
  id: string;
  rule_name: string;
  work_type_name: string;
  changed_at: string;
  changed_by: string;
  before: Partial<RiskRuleConfig>;
  after: Partial<RiskRuleConfig>;
}

const MOCK_HISTORY: HistoryEntry[] = [
  {
    id: "hist-001",
    rule_name: "Контроль качества",
    work_type_name: "Контроль качества",
    changed_at: "2026-04-28T14:30:00+07:00",
    changed_by: "Романов А.В.",
    before: { mode: "FULL_REVIEW", sample_rate: undefined },
    after: { mode: "SAMPLING", sample_rate: 35 },
  },
  {
    id: "hist-002",
    rule_name: "Выкладка",
    work_type_name: "Выкладка",
    changed_at: "2026-04-25T09:15:00+07:00",
    changed_by: "Соколова И.Д.",
    before: { mode: "SAMPLING", sample_rate: 50 },
    after: { mode: "SAMPLING", sample_rate: 35 },
  },
  {
    id: "hist-003",
    rule_name: "Инвентаризация",
    work_type_name: "Инвентаризация",
    changed_at: "2026-04-20T11:00:00+07:00",
    changed_by: "Романов А.В.",
    before: { mode: "AUTO_ACCEPT" },
    after: { mode: "PHOTO_REQUIRED", photo_required: true },
  },
];

// ═══════════════════════════════════════════════════════════════════
// SUB-COMPONENT: StatCard
// ═══════════════════════════════════════════════════════════════════

interface StatCardProps {
  icon: React.ElementType;
  title: string;
  hero: React.ReactNode;
  sub?: React.ReactNode;
  hint?: React.ReactNode;
  diff?: React.ReactNode;
}

function StatCard({ icon: Icon, title, hero, sub, hint, diff }: StatCardProps) {
  return (
    <Card className="rounded-xl">
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-muted shrink-0">
            <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
          </span>
          <div className="flex flex-col gap-1 min-w-0 flex-1">
            <span className="text-sm font-medium text-muted-foreground">{title}</span>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-semibold tracking-tight text-foreground">{hero}</span>
              {diff && <span className="text-sm font-medium text-success mb-0.5">{diff}</span>}
            </div>
            {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
            {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SUB-COMPONENT: ModeBadge
// ═══════════════════════════════════════════════════════════════════

function ModeBadge({ mode, label }: { mode: RiskMode; label: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 h-6 text-xs font-medium ${MODE_VARIANT[mode]}`}
    >
      {label}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SUB-COMPONENT: RuleEditorDrawer
// ═══════════════════════════════════════════════════════════════════

interface RuleEditorDrawerProps {
  rule: RiskRuleConfig | null;
  open: boolean;
  onClose: () => void;
  onSaved: (updated: RiskRuleConfig) => void;
}

function RuleEditorDrawer({ rule, open, onClose, onSaved }: RuleEditorDrawerProps) {
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

// ═══════════════════════════════════════════════════════════════════
// SUB-COMPONENT: RulesTab
// ═══════════════════════════════════════════════════════════════════

interface RulesTabProps {
  rules: RiskRuleConfig[];
  loading: boolean;
  onEdit: (rule: RiskRuleConfig) => void;
  onDuplicate: (rule: RiskRuleConfig) => void;
  onDelete: (id: string) => void;
  onCreateNew: () => void;
}

function RulesTab({ rules, loading, onEdit, onDuplicate, onDelete, onCreateNew }: RulesTabProps) {
  const t = useTranslations("screen.riskRules");
  const [search, setSearch] = useState("");
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Categories derived from rules
  const categories = Array.from(new Set(rules.map((r) => r.work_type_name)));

  const filtered = rules.filter((r) => {
    const matchSearch =
      !search ||
      r.work_type_name.toLowerCase().includes(search.toLowerCase()) ||
      r.name.toLowerCase().includes(search.toLowerCase());
    const matchCategory = !categoryFilter || r.work_type_name === categoryFilter;
    return matchSearch && matchCategory;
  });

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    await onDelete(deleteTarget);
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex gap-2 flex-wrap">
          <Skeleton className="h-9 w-52" />
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-9 w-36 ml-auto" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
        <div className="relative flex-1 min-w-0 max-w-xs">
          <Search
            className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none"
            aria-hidden="true"
          />
          <Input
            placeholder={t("rules_tab.search_placeholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9"
            aria-label={t("rules_tab.search_placeholder")}
          />
        </div>

        <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={categoryOpen}
              className="h-9 gap-1.5 min-w-[140px] justify-between"
            >
              {categoryFilter || t("rules_tab.category_label")}
              {categoryFilter ? (
                <X
                  className="size-3.5 opacity-50 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCategoryFilter("");
                  }}
                  aria-label="Clear"
                />
              ) : (
                <ChevronDown className="size-3.5 opacity-50" aria-hidden="true" />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-52 p-0" align="start">
            <Command>
              <CommandInput placeholder={t("rules_tab.category_label")} />
              <CommandEmpty>—</CommandEmpty>
              <CommandGroup>
                {categories.map((cat) => (
                  <CommandItem
                    key={cat}
                    value={cat}
                    onSelect={() => {
                      setCategoryFilter(cat === categoryFilter ? "" : cat);
                      setCategoryOpen(false);
                    }}
                  >
                    {cat}
                  </CommandItem>
                ))}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>

        <Button onClick={onCreateNew} className="h-9 gap-1.5 shrink-0 ml-auto sm:ml-0">
          <Plus className="size-4" aria-hidden="true" />
          {t("rules_tab.create_rule")}
        </Button>
      </div>

      {/* Mobile cards */}
      <div className="flex flex-col gap-2 md:hidden">
        {filtered.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title={t("empty.no_rules_title")}
            description=""
            action={{ label: t("empty.no_rules_cta"), onClick: onCreateNew }}
          />
        ) : (
          filtered.map((rule) => (
            <Card key={rule.id} className="rounded-xl">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                    <span className="text-sm font-medium text-foreground">{rule.work_type_name}</span>
                    <div className="flex items-center gap-2 flex-wrap">
                      <ModeBadge
                        mode={rule.mode}
                        label={t(`rules_tab.mode_label.${rule.mode}` as Parameters<typeof t>[0])}
                      />
                      {rule.mode === "SAMPLING" && rule.sample_rate !== undefined && (
                        <span className="text-xs font-mono text-foreground">{rule.sample_rate}%</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap text-xs text-muted-foreground">
                      {rule.triggers_config.filter((tc) => tc.enabled).length > 0 && (
                        <span className="inline-flex items-center rounded-full border px-2 h-5 text-[10px] font-medium bg-muted text-muted-foreground border-border">
                          {t("rules_tab.triggers_count", {
                            count: rule.triggers_config.filter((tc) => tc.enabled).length,
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                  <RuleActionsMenu
                    rule={rule}
                    onEdit={onEdit}
                    onDuplicate={onDuplicate}
                    onDeleteRequest={(id) => {
                      setDeleteTarget(id);
                      setDeleteOpen(true);
                    }}
                    t={t}
                  />
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("rules_tab.columns.work_type")}</TableHead>
              <TableHead>{t("rules_tab.columns.mode")}</TableHead>
              <TableHead>{t("rules_tab.columns.sample_rate")}</TableHead>
              <TableHead>{t("rules_tab.columns.photo_required")}</TableHead>
              <TableHead>{t("rules_tab.columns.triggers")}</TableHead>
              <TableHead>{t("rules_tab.columns.updated_at")}</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center">
                  <EmptyState
                    icon={ShieldCheck}
                    title={t("empty.no_rules_title")}
                    description=""
                    action={{ label: t("empty.no_rules_cta"), onClick: onCreateNew }}
                  />
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((rule) => (
                <TableRow
                  key={rule.id}
                  className="cursor-pointer hover:bg-muted/40"
                  onClick={() => onEdit(rule)}
                >
                  <TableCell className="font-medium">{rule.work_type_name}</TableCell>
                  <TableCell>
                    <ModeBadge
                      mode={rule.mode}
                      label={t(`rules_tab.mode_label.${rule.mode}` as Parameters<typeof t>[0])}
                    />
                  </TableCell>
                  <TableCell>
                    {rule.mode === "SAMPLING" && rule.sample_rate !== undefined ? (
                      <span className="font-mono text-sm">{rule.sample_rate}%</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={rule.photo_required}
                      disabled
                      aria-label={t("rules_tab.columns.photo_required")}
                      className="pointer-events-none"
                    />
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    {rule.triggers_config.filter((tc) => tc.enabled).length > 0 ? (
                      <span className="inline-flex items-center rounded-full border px-2.5 h-6 text-xs font-medium bg-muted text-muted-foreground border-border">
                        {t("rules_tab.triggers_count", {
                          count: rule.triggers_config.filter((tc) => tc.enabled).length,
                        })}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">
                      {formatDate((rule as RiskRuleConfig & { updated_at?: string }).updated_at)}
                    </span>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <RuleActionsMenu
                      rule={rule}
                      onEdit={onEdit}
                      onDuplicate={onDuplicate}
                      onDeleteRequest={(id) => {
                        setDeleteTarget(id);
                        setDeleteOpen(true);
                      }}
                      t={t}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <ConfirmDialog
          title={t("rules_tab.delete_dialog.title")}
          message={t("rules_tab.delete_dialog.description")}
          confirmLabel={t("rules_tab.delete_dialog.confirm")}
          variant="destructive"
          onConfirm={handleDeleteConfirm}
          onOpenChange={setDeleteOpen}
        />
      </AlertDialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SUB-COMPONENT: RuleActionsMenu
// ═══════════════════════════════════════════════════════════════════

interface RuleActionsMenuProps {
  rule: RiskRuleConfig;
  onEdit: (rule: RiskRuleConfig) => void;
  onDuplicate: (rule: RiskRuleConfig) => void;
  onDeleteRequest: (id: string) => void;
  t: ReturnType<typeof useTranslations>;
}

function RuleActionsMenu({ rule, onEdit, onDuplicate, onDeleteRequest, t }: RuleActionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 shrink-0"
          aria-label={t("rules_tab.columns.actions")}
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical className="size-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            onEdit(rule);
          }}
        >
          {t("rules_tab.row_actions.edit")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate(rule);
          }}
        >
          {t("rules_tab.row_actions.duplicate")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={(e) => {
            e.stopPropagation();
            onDeleteRequest(rule.id);
          }}
        >
          {t("rules_tab.row_actions.delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SUB-COMPONENT: SimulationTab
// ═══════════════════════════════════════════════════════════════════

function SimulationTab() {
  const t = useTranslations("screen.riskRules");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RiskSimulationResult | null>(null);
  const [dateFrom, setDateFrom] = useState("2026-04-01");
  const [dateTo, setDateTo] = useState("2026-04-30");

  const handleRun = async () => {
    setRunning(true);
    setResult(null);
    const res = await simulateRisk({ date_from: dateFrom, date_to: dateTo });
    setRunning(false);
    if (res.data) {
      setResult(res.data);
      toast.success(t("toasts.simulation_done"));
    } else {
      toast.error(t("toasts.error"));
    }
  };

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="text-base">{t("simulation_tab.card_title")}</CardTitle>
          <CardDescription className="text-sm">
            {t("simulation_tab.card_description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="date-from" className="text-xs text-muted-foreground">
                {t("simulation_tab.date_range_label")} — от
              </Label>
              <Input
                id="date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="date-to" className="text-xs text-muted-foreground">
                {t("simulation_tab.date_range_label")} — до
              </Label>
              <Input
                id="date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-9"
              />
            </div>
          </div>

          <Button
            onClick={handleRun}
            disabled={running}
            className="w-full sm:w-auto gap-2"
          >
            {running && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            {running
              ? t("simulation_tab.running_hint")
              : t("simulation_tab.run_button")}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle className="text-base">{t("simulation_tab.result_title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                {
                  label: t("simulation_tab.result_columns.tasks_total"),
                  value: result.tasks_total.toLocaleString("ru-RU"),
                },
                {
                  label: t("simulation_tab.result_columns.would_review"),
                  value: `${result.would_review.toLocaleString("ru-RU")} (${Math.round((result.would_review / result.tasks_total) * 100)}%)`,
                },
                {
                  label: t("simulation_tab.result_columns.hours_saved"),
                  value: `${result.hours_saved} ч`,
                },
                {
                  label: t("simulation_tab.result_columns.forecast_defect"),
                  value: `${result.forecast_defect_rate_pct}%`,
                },
              ].map((item) => (
                <div key={item.label} className="flex flex-col gap-1 rounded-lg bg-muted/40 p-3">
                  <span className="text-xs text-muted-foreground leading-snug">{item.label}</span>
                  <span className="text-lg font-semibold text-foreground">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SUB-COMPONENT: HistoryTab
// ═══════════════════════════════════════════════════════════════════

function HistoryTab() {
  const t = useTranslations("screen.riskRules");
  const [diffEntry, setDiffEntry] = useState<HistoryEntry | null>(null);
  const [diffOpen, setDiffOpen] = useState(false);

  const entries = MOCK_HISTORY;

  if (entries.length === 0) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title={t("history_tab.title")}
        description={t("history_tab.empty")}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <h3 className="text-sm font-semibold text-foreground">{t("history_tab.title")}</h3>

      <div className="flex flex-col gap-0 rounded-lg border overflow-hidden">
        {entries.map((entry, idx) => (
          <button
            key={entry.id}
            onClick={() => {
              setDiffEntry(entry);
              setDiffOpen(true);
            }}
            className={`flex items-start gap-3 p-4 text-left hover:bg-muted/50 transition-colors ${idx > 0 ? "border-t" : ""}`}
          >
            <div className="flex size-8 items-center justify-center rounded-full bg-muted shrink-0 mt-0.5">
              <ShieldCheck className="size-4 text-muted-foreground" aria-hidden="true" />
            </div>
            <div className="flex flex-col gap-0.5 min-w-0 flex-1">
              <span className="text-sm font-medium text-foreground">
                {entry.work_type_name}
              </span>
              <span className="text-xs text-muted-foreground">
                {entry.changed_by} · {new Date(entry.changed_at).toLocaleString("ru-RU")}
              </span>
            </div>
            <span className="text-xs text-primary font-medium shrink-0">Детали →</span>
          </button>
        ))}
      </div>

      {/* Diff drawer */}
      <Sheet open={diffOpen} onOpenChange={setDiffOpen}>
        <SheetContent side="right" className="w-full max-w-lg flex flex-col gap-0 p-0">
          <SheetHeader className="px-6 py-4 border-b shrink-0">
            <SheetTitle>{t("history_tab.diff_drawer_title")}</SheetTitle>
          </SheetHeader>
          <ScrollArea className="flex-1">
            {diffEntry && (
              <div className="px-6 py-5 flex flex-col gap-4">
                <p className="text-sm text-muted-foreground">
                  {diffEntry.work_type_name} · {new Date(diffEntry.changed_at).toLocaleString("ru-RU")}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border bg-destructive/5 border-destructive/20 p-3 flex flex-col gap-2">
                    <span className="text-xs font-semibold text-destructive uppercase tracking-wide">
                      {t("history_tab.before")}
                    </span>
                    <pre className="text-xs text-foreground whitespace-pre-wrap font-mono">
                      {JSON.stringify(diffEntry.before, null, 2)}
                    </pre>
                  </div>
                  <div className="rounded-lg border bg-success/5 border-success/20 p-3 flex flex-col gap-2">
                    <span className="text-xs font-semibold text-success uppercase tracking-wide">
                      {t("history_tab.after")}
                    </span>
                    <pre className="text-xs text-foreground whitespace-pre-wrap font-mono">
                      {JSON.stringify(diffEntry.after, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SUB-COMPONENT: MetricsTab
// ═══════════════════════════════════════════════════════════════════

interface MetricsTabProps {
  metrics: RiskMetrics | null;
  loading: boolean;
}

function MetricsTab({ metrics, loading }: MetricsTabProps) {
  const t = useTranslations("screen.riskRules");

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!metrics) return null;

  const chartProps = {
    margin: { top: 8, right: 8, left: -20, bottom: 0 },
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Defect rate chart */}
      <Card className="rounded-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("metrics_tab.defect_rate_chart_title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-60 w-full" aria-label={t("metrics_tab.defect_rate_chart_title")}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metrics.trend_defect} {...chartProps}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickFormatter={(d: string) => d.slice(5)}
                  interval={14}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickFormatter={(v: number) => `${v}%`}
                />
                <Tooltip
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(v: any) => [`${v}%`, "Defect rate"]}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  labelFormatter={(l: any) => String(l)}
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="var(--destructive)"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Review time chart */}
      <Card className="rounded-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("metrics_tab.review_time_chart_title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-60 w-full" aria-label={t("metrics_tab.review_time_chart_title")}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metrics.trend_review_time} {...chartProps}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickFormatter={(d: string) => d.slice(5)}
                  interval={14}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickFormatter={(v: number) => `${v} мин`}
                />
                <Tooltip
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(v: any) => [`${v} мин`, "Время проверки"]}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  labelFormatter={(l: any) => String(l)}
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Top defective work types */}
      <Card className="rounded-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("metrics_tab.top_defective_card_title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("metrics_tab.top_defective_columns.work_type")}</TableHead>
                  <TableHead>{t("metrics_tab.top_defective_columns.defect_rate")}</TableHead>
                  <TableHead>{t("metrics_tab.top_defective_columns.tasks_count")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.top_defective_work_types.map((row) => (
                  <TableRow key={row.work_type_id}>
                    <TableCell className="font-medium">{row.work_type_name}</TableCell>
                    <TableCell>
                      <span className="font-mono text-destructive font-semibold">
                        {row.defect_rate_pct}%
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{row.tasks_count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT: RiskRules
// ═══════════════════════════════════════════════════════════════════

export function RiskRules() {
  const t = useTranslations("screen.riskRules");

  // Data state
  const [rules, setRules] = useState<RiskRuleConfig[]>([]);
  const [metrics, setMetrics] = useState<RiskMetrics | null>(null);
  const [loadingRules, setLoadingRules] = useState(true);
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [error, setError] = useState(false);

  // Drawer state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<RiskRuleConfig | null>(null);

  // Load data
  useEffect(() => {
    getRiskRules()
      .then((res) => {
        setRules(res.data);
        setLoadingRules(false);
      })
      .catch(() => {
        setError(true);
        setLoadingRules(false);
      });

    getRiskMetrics()
      .then((res) => {
        setMetrics(res.data);
        setLoadingMetrics(false);
      })
      .catch(() => {
        setLoadingMetrics(false);
      });
  }, []);

  const handleEdit = useCallback((rule: RiskRuleConfig) => {
    setEditingRule(rule);
    setEditorOpen(true);
  }, []);

  const handleDuplicate = useCallback(
    async (rule: RiskRuleConfig) => {
      const newRule = {
        ...rule,
        id: `rule-dup-${Date.now()}`,
        work_type_name: `${rule.work_type_name} (копия)`,
      };
      const { id, ...rest } = newRule;
      await createRiskRule(rest);
      toast.success(t("toasts.rule_created"));
      setRules((prev) => [...prev, newRule]);
    },
    [t]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteRiskRule(id);
      toast.success(t("toasts.rule_deleted"));
      setRules((prev) => prev.filter((r) => r.id !== id));
    },
    [t]
  );

  const handleSaved = useCallback((updated: RiskRuleConfig) => {
    setRules((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  }, []);

  const handleCreateNew = useCallback(() => {
    if (rules.length === 0) return;
    // Open editor with a clone of the first rule as template
    const template: RiskRuleConfig = {
      ...rules[0],
      id: `rule-new-${Date.now()}`,
      work_type_name: "Новый тип",
      mode: "FULL_REVIEW",
      sample_rate: undefined,
      photo_required: false,
      triggers_config: [
        { key: "NEW_PERFORMER", enabled: false, threshold: 5 },
        { key: "STORE_HIGH_DEFECT", enabled: false, threshold: 10 },
        { key: "PERFORMER_RECENT_REJECTS", enabled: false, threshold: 3 },
        { key: "TASK_ADDITIONAL", enabled: false },
      ],
    };
    setEditingRule(template);
    setEditorOpen(true);
  }, [rules]);

  // Stats derived from metrics
  const reviewTimeDiff = metrics
    ? Math.round(
        ((metrics.prev_avg_review_minutes - metrics.avg_review_minutes) /
          metrics.prev_avg_review_minutes) *
          100
      )
    : 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <PageHeader
        breadcrumbs={[
          { label: t("breadcrumbs.home"), href: "/" },
          { label: t("breadcrumbs.future") },
          { label: t("breadcrumbs.risk") },
        ]}
        title={t("page_title")}
        subtitle={t("page_subtitle")}
        actions={
          <Badge
            variant="outline"
            className="bg-purple-500/10 text-purple-600 border-purple-500/30 text-xs font-semibold"
          >
            {t("beta_badge")}
          </Badge>
        }
      />

      {/* Error state */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>{t("toasts.error")}</AlertTitle>
          <AlertDescription>
            <Button
              variant="link"
              size="sm"
              className="p-0 h-auto"
              onClick={() => {
                setError(false);
                setLoadingRules(true);
                getRiskRules()
                  .then((res) => {
                    setRules(res.data);
                    setLoadingRules(false);
                  })
                  .catch(() => {
                    setError(true);
                    setLoadingRules(false);
                  });
              }}
            >
              Повторить
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Stats cards */}
      {loadingMetrics ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : metrics ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard
            icon={Clock}
            title={t("stats.avg_review_title")}
            hero={t("stats.avg_review_value", { minutes: metrics.avg_review_minutes })}
            sub={t("stats.avg_review_prev", { minutes: metrics.prev_avg_review_minutes })}
            diff={t("stats.avg_review_diff", { percent: reviewTimeDiff })}
          />
          <StatCard
            icon={Filter}
            title={t("stats.reviewed_share_title")}
            hero={t("stats.reviewed_share_value", { percent: metrics.reviewed_share_pct })}
            sub={t("stats.reviewed_share_prev", { percent: metrics.prev_reviewed_share_pct })}
            hint={t("stats.reviewed_share_saved", { hours: metrics.hours_saved_per_month.toLocaleString("ru-RU") })}
          />
          <StatCard
            icon={AlertTriangle}
            title={t("stats.defect_rate_title")}
            hero={t("stats.defect_rate_value", { percent: metrics.defect_rate_pct })}
            hint={t("stats.defect_rate_hint")}
          />
        </div>
      ) : null}

      {/* Main tabs */}
      <Tabs defaultValue="rules">
        <TabsList className="w-full sm:w-auto overflow-x-auto">
          <TabsTrigger value="rules">{t("tabs.rules")}</TabsTrigger>
          <TabsTrigger value="simulation">{t("tabs.simulation")}</TabsTrigger>
          <TabsTrigger value="history">{t("tabs.history")}</TabsTrigger>
          <TabsTrigger value="metrics">{t("tabs.metrics")}</TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="mt-4">
          <RulesTab
            rules={rules}
            loading={loadingRules}
            onEdit={handleEdit}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
            onCreateNew={handleCreateNew}
          />
        </TabsContent>

        <TabsContent value="simulation" className="mt-4">
          <SimulationTab />
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <HistoryTab />
        </TabsContent>

        <TabsContent value="metrics" className="mt-4">
          <MetricsTab metrics={metrics} loading={loadingMetrics} />
        </TabsContent>
      </Tabs>

      {/* Rule editor drawer */}
      <RuleEditorDrawer
        rule={editingRule}
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        onSaved={handleSaved}
      />
    </div>
  );
}
