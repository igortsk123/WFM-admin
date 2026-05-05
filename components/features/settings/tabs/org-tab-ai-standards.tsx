"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Check, Info, Loader2 } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import type {
  OrganizationConfig,
  FmcgGroupThreshold,
  FmcgOpsThresholds,
  FashionSeasonRow,
} from "@/lib/api/organization";
import {
  updateFmcgGroupThreshold,
  updateFmcgOpsThresholds,
  updateFashionSeason,
} from "@/lib/api/organization";
import { cn } from "@/lib/utils";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  if (!iso) return "";
  const [, month, day] = iso.split("-");
  const date = new Date(iso);
  return `${day} ${date.toLocaleString("ru", { month: "short" })}`;
}

function parseDateInput(value: string): string {
  // Accept "dd.mm" or "dd.mm.yyyy" → normalize to "yyyy-MM-dd" (use 2026)
  const parts = value.trim().split(/[.\-/]/);
  if (parts.length >= 2) {
    const day = parts[0].padStart(2, "0");
    const month = parts[1].padStart(2, "0");
    const year = parts[2] ?? "2026";
    return `${year}-${month}-${day}`;
  }
  return value;
}

// ─── Inline number cell ───────────────────────────────────────────────────────

interface NumberCellProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  onSave: (v: number) => Promise<void>;
}

function NumberCell({ value, min, max, step = 1, suffix, onSave }: NumberCellProps) {
  const [editing, setEditing] = React.useState(false);
  const [localVal, setLocalVal] = React.useState(String(value));
  const [saving, setSaving] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function handleBlur() {
    const parsed = parseFloat(localVal);
    if (isNaN(parsed) || parsed === value) {
      setEditing(false);
      setLocalVal(String(value));
      return;
    }
    setSaving(true);
    try {
      await onSave(parsed);
    } finally {
      setSaving(false);
      setEditing(false);
    }
  }

  if (!editing) {
    return (
      <button
        className="w-full text-left text-sm px-1 py-0.5 rounded hover:bg-accent/60 transition-colors"
        onClick={() => {
          setLocalVal(String(value));
          setEditing(true);
          setTimeout(() => inputRef.current?.select(), 30);
        }}
      >
        {value}
        {suffix && <span className="text-muted-foreground ml-0.5 text-xs">{suffix}</span>}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Input
        ref={inputRef}
        type="number"
        min={min}
        max={max}
        step={step}
        value={localVal}
        onChange={(e) => setLocalVal(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={(e) => {
          if (e.key === "Enter") inputRef.current?.blur();
          if (e.key === "Escape") {
            setLocalVal(String(value));
            setEditing(false);
          }
        }}
        className="h-7 w-20 text-sm px-2"
        autoFocus
      />
      {saving && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
    </div>
  );
}

// ─── Inline date cell ─────────────────────────────────────────────────────────

interface DateCellProps {
  value: string;
  onSave: (v: string) => Promise<void>;
}

function DateCell({ value, onSave }: DateCellProps) {
  const [editing, setEditing] = React.useState(false);
  const [localVal, setLocalVal] = React.useState(value ? value.slice(5) : ""); // "MM-DD"
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function handleBlur() {
    const iso = parseDateInput(localVal);
    if (iso === value) {
      setEditing(false);
      return;
    }
    try {
      await onSave(iso);
    } finally {
      setEditing(false);
    }
  }

  if (!editing) {
    return (
      <button
        className="text-left text-sm px-1 py-0.5 rounded hover:bg-accent/60 transition-colors whitespace-nowrap"
        onClick={() => {
          setLocalVal(value ? value.slice(5).replace("-", ".") : "");
          setEditing(true);
          setTimeout(() => inputRef.current?.select(), 30);
        }}
      >
        {formatDate(value) || "—"}
      </button>
    );
  }

  return (
    <Input
      ref={inputRef}
      value={localVal}
      placeholder="дд.мм"
      onChange={(e) => setLocalVal(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={(e) => {
        if (e.key === "Enter") inputRef.current?.blur();
        if (e.key === "Escape") setEditing(false);
      }}
      className="h-7 w-24 text-sm px-2"
      autoFocus
    />
  );
}

// ─── FMCG Tab ────────────────────────────────────────────────────────────────

interface FmcgStandardsProps {
  orgId: string;
  thresholds: FmcgGroupThreshold[];
  opsThresholds: FmcgOpsThresholds;
}

function FmcgStandards({ orgId, thresholds: initThresholds, opsThresholds: initOps }: FmcgStandardsProps) {
  const t = useTranslations("screen.organizationSettings");
  const [rows, setRows] = React.useState<FmcgGroupThreshold[]>(initThresholds);
  const [ops, setOps] = React.useState<FmcgOpsThresholds>(initOps);

  async function saveRow(idx: number, updated: FmcgGroupThreshold) {
    const next = rows.map((r, i) => (i === idx ? updated : r));
    setRows(next);
    await updateFmcgGroupThreshold(orgId, updated);
    toast.success(t("toasts.threshold_updated"), { duration: 2000 });
  }

  async function saveOps(patch: Partial<FmcgOpsThresholds>) {
    const next = { ...ops, ...patch };
    setOps(next);
    await updateFmcgOpsThresholds(orgId, next);
    toast.success(t("toasts.threshold_updated"), { duration: 2000 });
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground leading-relaxed">
        {t("ai_standards.fmcg_description")}
      </p>

      {/* Product group thresholds */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">{t("ai_standards.thresholds_section")}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6 w-40">{t("ai_standards.col_group")}</TableHead>
                  <TableHead>{t("ai_standards.col_writeoff_norm")}</TableHead>
                  <TableHead>{t("ai_standards.col_oos_norm")}</TableHead>
                  <TableHead className="pr-6">{t("ai_standards.col_expiration_alert")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, idx) => (
                  <TableRow key={row.product_category_id}>
                    <TableCell className="pl-6 font-medium text-sm">{row.product_category_name}</TableCell>
                    <TableCell>
                      <NumberCell
                        value={row.writeoff_norm_pct}
                        min={0}
                        max={100}
                        step={0.5}
                        suffix="%"
                        onSave={(v) => saveRow(idx, { ...row, writeoff_norm_pct: v })}
                      />
                    </TableCell>
                    <TableCell>
                      <NumberCell
                        value={row.oos_norm_pct}
                        min={0}
                        max={100}
                        step={0.5}
                        suffix="%"
                        onSave={(v) => saveRow(idx, { ...row, oos_norm_pct: v })}
                      />
                    </TableCell>
                    <TableCell className="pr-6">
                      <NumberCell
                        value={row.expiration_alert_hours}
                        min={1}
                        suffix="ч"
                        onSave={(v) => saveRow(idx, { ...row, expiration_alert_hours: v })}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Ops thresholds */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">{t("ai_standards.ops_section")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">{t("ai_standards.ops_cashier_avg")}</p>
            <NumberCell
              value={ops.cashier_avg_minutes}
              min={1}
              suffix="мин"
              onSave={(v) => saveOps({ cashier_avg_minutes: v })}
            />
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">{t("ai_standards.ops_shift_variance")}</p>
            <NumberCell
              value={ops.shift_variance_pct}
              min={0}
              max={100}
              suffix="%"
              onSave={(v) => saveOps({ shift_variance_pct: v })}
            />
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">{t("ai_standards.ops_max_consecutive_rejections")}</p>
            <NumberCell
              value={ops.max_consecutive_rejections}
              min={1}
              onSave={(v) => saveOps({ max_consecutive_rejections: v })}
            />
          </div>
        </CardContent>
      </Card>

      <Alert>
        <Info className="size-4" />
        <AlertDescription className="text-sm">
          {t("ai_standards.fmcg_baseline_hint")}
        </AlertDescription>
      </Alert>
    </div>
  );
}

// ─── Fashion Tab ─────────────────────────────────────────────────────────────

interface FashionStandardsProps {
  orgId: string;
  seasons: FashionSeasonRow[];
}

function FashionStandards({ orgId, seasons: initSeasons }: FashionStandardsProps) {
  const t = useTranslations("screen.organizationSettings");
  const [rows, setRows] = React.useState<FashionSeasonRow[]>(initSeasons);

  async function saveRow(idx: number, updated: FashionSeasonRow) {
    setRows((prev) => prev.map((r, i) => (i === idx ? updated : r)));
    await updateFashionSeason(orgId, updated);
    toast.success(t("toasts.season_updated"), { duration: 2000 });
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground leading-relaxed">
        {t("ai_standards.fashion_description")}
      </p>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">{t("ai_standards.fashion_seasons_section")}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6 w-40">{t("ai_standards.col_product_type")}</TableHead>
                  <TableHead>{t("ai_standards.col_season_start")}</TableHead>
                  <TableHead>{t("ai_standards.col_season_peak")}</TableHead>
                  <TableHead>{t("ai_standards.col_season_end")}</TableHead>
                  <TableHead className="pr-6">{t("ai_standards.col_typical_sell_days")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, idx) => (
                  <TableRow key={row.product_type_id}>
                    <TableCell className="pl-6 font-medium text-sm">{row.product_type_name}</TableCell>
                    <TableCell>
                      <DateCell
                        value={row.season_start}
                        onSave={(v) => saveRow(idx, { ...row, season_start: v })}
                      />
                    </TableCell>
                    <TableCell>
                      <DateCell
                        value={row.season_peak}
                        onSave={(v) => saveRow(idx, { ...row, season_peak: v })}
                      />
                    </TableCell>
                    <TableCell>
                      <DateCell
                        value={row.season_end}
                        onSave={(v) => saveRow(idx, { ...row, season_end: v })}
                      />
                    </TableCell>
                    <TableCell className="pr-6">
                      <NumberCell
                        value={row.typical_sell_days}
                        min={1}
                        suffix="д"
                        onSave={(v) => saveRow(idx, { ...row, typical_sell_days: v })}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Alert>
        <Info className="size-4" />
        <AlertDescription className="text-sm">
          {t("ai_standards.fashion_baseline_hint")}
        </AlertDescription>
      </Alert>
    </div>
  );
}

// ─── Production Standards ─────────────────────────────────────────────────────

function ProductionStandards() {
  const t = useTranslations("screen.organizationSettings");
  const [defectNorm, setDefectNorm] = React.useState(2);
  const [opTime, setOpTime] = React.useState(45);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">{t("ai_standards.production_section")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">{t("ai_standards.col_defect_norm")}</p>
            <NumberCell value={defectNorm} min={0} max={100} step={0.5} suffix="%" onSave={async (v) => setDefectNorm(v)} />
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">{t("ai_standards.col_op_time")}</p>
            <NumberCell value={opTime} min={1} suffix="мин" onSave={async (v) => setOpTime(v)} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────

interface OrgTabAiStandardsProps {
  orgId: string;
  config: OrganizationConfig;
}

export function OrgTabAiStandards({ orgId, config }: OrgTabAiStandardsProps) {
  const t = useTranslations("screen.organizationSettings");

  if (!config.ai_module_enabled) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{t("ai_standards.ai_disabled_alert")}</AlertDescription>
      </Alert>
    );
  }

  const isFashion = config.business_vertical === "FASHION_RETAIL";
  const isProduction = config.type === "PRODUCTION";

  if (isFashion) {
    return (
      <FashionStandards
        orgId={orgId}
        seasons={config.fashion_seasons ?? []}
      />
    );
  }

  if (isProduction) {
    return <ProductionStandards />;
  }

  return (
    <FmcgStandards
      orgId={orgId}
      thresholds={config.fmcg_thresholds ?? []}
      opsThresholds={config.fmcg_ops_thresholds ?? {
        cashier_avg_minutes: 7,
        shift_variance_pct: 15,
        max_consecutive_rejections: 3,
      }}
    />
  );
}
