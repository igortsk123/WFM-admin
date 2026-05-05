"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { type ColumnDef } from "@tanstack/react-table";
import {
  MoreHorizontal,
  Plus,
  Archive,
  Pencil,
  ClipboardList,
  BoxSelect,
} from "lucide-react";
import { useQueryState } from "nuqs";

import type { ServiceNorm, ServiceNormUnit, ObjectFormat } from "@/lib/types";
import {
  getServiceNorms,
  createServiceNorm,
  updateServiceNorm,
  archiveServiceNorm,
} from "@/lib/api/freelance-norms";
import { MOCK_WORK_TYPES } from "@/lib/mock-data/work-types";
import { MOCK_USERS } from "@/lib/mock-data/users";
import { useAuth } from "@/lib/contexts/auth-context";
import { cn } from "@/lib/utils";

import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { UserCell } from "@/components/shared/user-cell";
import { ResponsiveDataTable } from "@/components/shared/responsive-data-table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { RoleBadge } from "@/components/shared/role-badge";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";

// ═══════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════

const OBJECT_FORMATS: ObjectFormat[] = [
  "SUPERMARKET",
  "HYPERMARKET",
  "CONVENIENCE",
  "SMALL_SHOP",
  "SEWING_WORKSHOP",
  "PRODUCTION_LINE",
  "WAREHOUSE_HUB",
  "OFFICE",
];

const UNITS: ServiceNormUnit[] = [
  "SKU",
  "PCS",
  "KG",
  "PALLETS",
  "POSITIONS",
  "BOXES",
  "M2",
  "CHECKS",
];

const CURRENCIES = ["RUB", "GBP", "USD"] as const;

const WRITE_ROLES = ["SUPERVISOR", "REGIONAL", "NETWORK_OPS"] as const;
type WriteRole = (typeof WRITE_ROLES)[number];

function canWrite(role: string): role is WriteRole {
  return WRITE_ROLES.includes(role as WriteRole);
}

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "сегодня";
  if (days === 1) return "вчера";
  if (days < 7) return `${days} дн. назад`;
  if (days < 30) return `${Math.floor(days / 7)} нед. назад`;
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ═══════════════════════════════════════════════════════════════════
// BADGES
// ═══════════════════════════════════════════════════════════════════

const FORMAT_COLOR: Record<ObjectFormat, string> = {
  SUPERMARKET: "bg-blue-50 text-blue-700 border-blue-200",
  HYPERMARKET: "bg-violet-50 text-violet-700 border-violet-200",
  CONVENIENCE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  SMALL_SHOP: "bg-amber-50 text-amber-700 border-amber-200",
  SEWING_WORKSHOP: "bg-pink-50 text-pink-700 border-pink-200",
  PRODUCTION_LINE: "bg-orange-50 text-orange-700 border-orange-200",
  WAREHOUSE_HUB: "bg-slate-50 text-slate-700 border-slate-200",
  OFFICE: "bg-teal-50 text-teal-700 border-teal-200",
};

const UNIT_COLOR: Record<ServiceNormUnit, string> = {
  SKU: "bg-blue-50 text-blue-700 border-blue-200",
  PCS: "bg-slate-50 text-slate-700 border-slate-200",
  KG: "bg-amber-50 text-amber-700 border-amber-200",
  PALLETS: "bg-orange-50 text-orange-700 border-orange-200",
  POSITIONS: "bg-emerald-50 text-emerald-700 border-emerald-200",
  BOXES: "bg-pink-50 text-pink-700 border-pink-200",
  M2: "bg-teal-50 text-teal-700 border-teal-200",
  CHECKS: "bg-violet-50 text-violet-700 border-violet-200",
};

function ObjectFormatBadge({ format, tFreelance }: { format: ObjectFormat; tFreelance: (key: string) => string }) {
  const label = tFreelance(`object_format.${format}`);
  return (
    <Badge
      variant="outline"
      className={cn("text-xs font-medium whitespace-nowrap", FORMAT_COLOR[format])}
    >
      {label}
    </Badge>
  );
}

function NormativeUnitBadge({ unit, tFreelance }: { unit: ServiceNormUnit; tFreelance: (key: string) => string }) {
  const label = tFreelance(`normative.unit.${unit}`);
  return (
    <Badge
      variant="outline"
      className={cn("text-xs font-mono whitespace-nowrap", UNIT_COLOR[unit])}
    >
      {label}
    </Badge>
  );
}

// ═══════════════════════════════════════════════════════════════════
// FORM STATE
// ═══════════════════════════════════════════════════════════════════

interface NormFormState {
  object_format: ObjectFormat | "";
  work_type_id: string;
  normative_per_hour: string;
  unit: ServiceNormUnit | "";
  hourly_rate: string;
  currency: "RUB" | "GBP" | "USD";
}

function makeDefaultForm(defaultCurrency: "RUB" | "GBP" | "USD"): NormFormState {
  return {
    object_format: "",
    work_type_id: "",
    normative_per_hour: "",
    unit: "",
    hourly_rate: "",
    currency: defaultCurrency,
  };
}

// ═══════════════════════════════════════════════════════════════════
// NORM FORM BODY
// ═══════════════════════════════════════════════════════════════════

interface NormFormBodyProps {
  form: NormFormState;
  onChange: (next: NormFormState) => void;
  tFreelance: (key: string) => string;
  t: (key: string) => string;
}

function NormFormBody({ form, onChange, tFreelance, t }: NormFormBodyProps) {
  const set = <K extends keyof NormFormState>(key: K, value: NormFormState[K]) =>
    onChange({ ...form, [key]: value });

  return (
    <div className="flex flex-col gap-5">
      {/* Object format */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="norm-format" className="text-sm font-medium">
          {t("form.object_format_label")}
          <span className="ml-1 text-destructive" aria-hidden="true">*</span>
        </Label>
        <Select
          value={form.object_format}
          onValueChange={(v) => set("object_format", v as ObjectFormat)}
        >
          <SelectTrigger id="norm-format" className="h-11">
            <SelectValue placeholder={t("filters.all_formats")} />
          </SelectTrigger>
          <SelectContent>
            {OBJECT_FORMATS.map((fmt) => (
              <SelectItem key={fmt} value={fmt}>
                {tFreelance(`object_format.${fmt}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Work type */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="norm-work-type" className="text-sm font-medium">
          {t("form.work_type_label")}
          <span className="ml-1 text-destructive" aria-hidden="true">*</span>
        </Label>
        <Select
          value={form.work_type_id}
          onValueChange={(v) => set("work_type_id", v)}
        >
          <SelectTrigger id="norm-work-type" className="h-11">
            <SelectValue placeholder={t("filters.all_work_types")} />
          </SelectTrigger>
          <SelectContent>
            {MOCK_WORK_TYPES.map((wt) => (
              <SelectItem key={wt.id} value={String(wt.id)}>
                {wt.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Normative per hour + unit (row) */}
      <div className="flex gap-3">
        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          <Label htmlFor="norm-value" className="text-sm font-medium">
            {t("form.normative_label")}
            <span className="ml-1 text-destructive" aria-hidden="true">*</span>
          </Label>
          <Input
            id="norm-value"
            type="number"
            min={1}
            step={1}
            className="h-11"
            value={form.normative_per_hour}
            onChange={(e) => set("normative_per_hour", e.target.value)}
            placeholder="200"
          />
        </div>
        <div className="flex flex-col gap-1.5 w-36 shrink-0">
          <Label htmlFor="norm-unit" className="text-sm font-medium">
            {t("form.unit_label")}
            <span className="ml-1 text-destructive" aria-hidden="true">*</span>
          </Label>
          <Select
            value={form.unit}
            onValueChange={(v) => set("unit", v as ServiceNormUnit)}
          >
            <SelectTrigger id="norm-unit" className="h-11">
              <SelectValue placeholder="SKU" />
            </SelectTrigger>
            <SelectContent>
              {UNITS.map((u) => (
                <SelectItem key={u} value={u}>
                  {tFreelance(`normative.unit.${u}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Rate + currency */}
      <div className="flex gap-3">
        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          <Label htmlFor="norm-rate" className="text-sm font-medium">
            {t("form.rate_label")}
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              ({t("form.rate_placeholder")})
            </span>
          </Label>
          <Input
            id="norm-rate"
            type="number"
            min={0}
            step={10}
            className="h-11"
            value={form.hourly_rate}
            onChange={(e) => set("hourly_rate", e.target.value)}
            placeholder="380"
          />
        </div>
        <div className="flex flex-col gap-1.5 w-28 shrink-0">
          <Label htmlFor="norm-currency" className="text-sm font-medium">
            {t("form.currency_label")}
          </Label>
          <Select
            value={form.currency}
            onValueChange={(v) => set("currency", v as typeof form.currency)}
          >
            <SelectTrigger id="norm-currency" className="h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// NORM SHEET (create / edit)
// ═══════════════════════════════════════════════════════════════════

interface NormSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: ServiceNorm | null;
  defaultCurrency: "RUB" | "GBP" | "USD";
  onSuccess: () => void;
  t: (key: string) => string;
  tFreelance: (key: string) => string;
}

function NormSheet({
  open,
  onOpenChange,
  editing,
  defaultCurrency,
  onSuccess,
  t,
  tFreelance,
}: NormSheetProps) {
  const [form, setForm] = React.useState<NormFormState>(() =>
    makeDefaultForm(defaultCurrency)
  );
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        object_format: editing.object_format,
        work_type_id: String(editing.work_type_id),
        normative_per_hour: String(editing.normative_per_hour),
        unit: editing.unit,
        hourly_rate: editing.hourly_rate != null ? String(editing.hourly_rate) : "",
        currency: editing.currency,
      });
    } else {
      setForm(makeDefaultForm(defaultCurrency));
    }
  }, [open, editing, defaultCurrency]);

  const isValid =
    !!form.object_format &&
    !!form.work_type_id &&
    !!form.normative_per_hour &&
    Number(form.normative_per_hour) > 0 &&
    !!form.unit &&
    (form.hourly_rate === "" || Number(form.hourly_rate) >= 0);

  async function handleSave() {
    if (!isValid || saving) return;
    setSaving(true);
    try {
      const wt = MOCK_WORK_TYPES.find((w) => w.id === Number(form.work_type_id));
      const payload: Partial<ServiceNorm> = {
        object_format: form.object_format as ObjectFormat,
        work_type_id: Number(form.work_type_id),
        work_type_name: wt?.name ?? `Тип #${form.work_type_id}`,
        normative_per_hour: Number(form.normative_per_hour),
        unit: form.unit as ServiceNormUnit,
        hourly_rate: form.hourly_rate !== "" ? Number(form.hourly_rate) : null,
        currency: form.currency,
      };

      const result = editing
        ? await updateServiceNorm(editing.id, payload)
        : await createServiceNorm(payload);

      if (result.success) {
        toast.success(editing ? t("toasts.updated") : t("toasts.created"));
        onSuccess();
        onOpenChange(false);
      } else if (result.error?.code === "DUPLICATE") {
        toast.error(t("toasts.duplicate"));
      } else {
        toast.error(t("toasts.error"));
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="border-b px-5 py-4 shrink-0">
          <SheetTitle>
            {editing ? t("form.edit_title") : t("form.create_title")}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <NormFormBody
            form={form}
            onChange={setForm}
            tFreelance={tFreelance}
            t={t}
          />
        </div>

        <SheetFooter className="border-t px-5 py-3 shrink-0 flex flex-row gap-2">
          <Button
            variant="outline"
            className="flex-1 h-11"
            onClick={() => onOpenChange(false)}
          >
            Отмена
          </Button>
          <Button
            className="flex-1 h-11"
            disabled={!isValid || saving}
            onClick={handleSave}
          >
            {saving ? "..." : t("actions.save")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ROW ACTIONS
// ═══════════════════════════════════════════════════════════════════

interface RowActionsProps {
  norm: ServiceNorm;
  canEdit: boolean;
  onEdit: (n: ServiceNorm) => void;
  onArchive: (id: string) => void;
  t: (key: string) => string;
}

function RowActions({ norm, canEdit, onEdit, onArchive, t }: RowActionsProps) {
  const [archiveOpen, setArchiveOpen] = React.useState(false);

  if (!canEdit) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-9 data-[state=open]:bg-accent"
            aria-label={t("columns.actions")}
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onClick={() => onEdit(norm)}>
            <Pencil className="size-4 mr-2 text-muted-foreground" />
            {t("row_actions.edit")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => setArchiveOpen(true)}
          >
            <Archive className="size-4 mr-2" />
            {t("row_actions.archive")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <ConfirmDialog
          title={t("archive_confirm.title")}
          message={t("archive_confirm.message")}
          confirmLabel={t("archive_confirm.confirm")}
          variant="destructive"
          onConfirm={() => onArchive(norm.id)}
          onOpenChange={setArchiveOpen}
        />
      </AlertDialog>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════
// LOADING SKELETON
// ═══════════════════════════════════════════════════════════════════

function ServiceNormsSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-9 w-44" />
        <Skeleton className="h-9 w-44" />
      </div>
      <Skeleton className="h-[360px] w-full rounded-lg" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

export function ServiceNorms() {
  const t = useTranslations("screen.serviceNorms");
  const tFreelance = useTranslations("freelance");
  const { user } = useAuth();

  const isWriter = canWrite(user.role);
  const defaultCurrency = user.organization.default_currency;

  // ── nuqs filter state ─────────────────────────────────────────
  const [tab, setTab] = useQueryState("tab", { defaultValue: "active" });
  const [filterFormat, setFilterFormat] = useQueryState("fmt", {
    defaultValue: "",
  });
  const [filterWorkType, setFilterWorkType] = useQueryState("wt", {
    defaultValue: "",
  });

  const isArchive = tab === "archive";

  // ── data ──────────────────────────────────────────────────────
  const [norms, setNorms] = React.useState<ServiceNorm[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);

  // ── sheet ─────────────────────────────────────────────────────
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ServiceNorm | null>(null);

  // ── fetch ─────────────────────────────────────────────────────
  const fetchData = React.useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await getServiceNorms({
        archived: isArchive,
        object_format: filterFormat || undefined,
        work_type_id: filterWorkType ? Number(filterWorkType) : undefined,
        page_size: 100,
      });
      setNorms(res.data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [isArchive, filterFormat, filterWorkType]);

  React.useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // ── handlers ──────────────────────────────────────────────────
  function openCreate() {
    setEditing(null);
    setSheetOpen(true);
  }

  function openEdit(norm: ServiceNorm) {
    setEditing(norm);
    setSheetOpen(true);
  }

  async function handleArchive(id: string) {
    try {
      const result = await archiveServiceNorm(id);
      if (result.success) {
        toast.success(t("toasts.archived"));
        void fetchData();
      } else {
        toast.error(t("toasts.error"));
      }
    } catch {
      toast.error(t("toasts.error"));
    }
  }

  // ── table columns ─────────────────────────────────────────────
  const columns = React.useMemo<ColumnDef<ServiceNorm>[]>(
    () => [
      {
        id: "object_format",
        header: t("columns.object_format"),
        cell: ({ row }) => (
          <ObjectFormatBadge
            format={row.original.object_format}
            tFreelance={tFreelance}
          />
        ),
      },
      {
        id: "work_type",
        header: t("columns.work_type"),
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">
              {row.original.work_type_name}
            </span>
          </div>
        ),
      },
      {
        id: "normative",
        header: t("columns.normative"),
        cell: ({ row }) => {
          const { normative_per_hour, unit } = row.original;
          return (
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="font-mono text-sm tabular-nums font-medium text-foreground">
                {normative_per_hour}
              </span>
              <NormativeUnitBadge unit={unit} tFreelance={tFreelance} />
              <span className="text-xs text-muted-foreground">
                {t("per_hour")}
              </span>
            </div>
          );
        },
      },
      {
        id: "rate",
        header: t("columns.rate"),
        cell: ({ row }) => {
          const { hourly_rate, currency } = row.original;
          if (hourly_rate == null)
            return (
              <span className="text-sm text-muted-foreground">
                {t("rate_empty")}
              </span>
            );
          return (
            <span className="font-mono text-sm tabular-nums whitespace-nowrap text-foreground">
              {hourly_rate.toLocaleString("ru-RU")}{" "}
              <span className="text-muted-foreground text-xs">{currency}/ч</span>
            </span>
          );
        },
      },
      {
        id: "approved_by",
        header: t("columns.approved_by"),
        cell: ({ row }) => {
          const { approved_by, approved_by_name } = row.original;
          const user = MOCK_USERS.find((u) => u.id === approved_by);
          if (!user)
            return (
              <span className="text-xs text-muted-foreground">
                {approved_by_name}
              </span>
            );
          return (
            <div className="flex flex-col gap-1">
              <UserCell
                user={{ ...user, position_name: undefined }}
                className="max-w-[160px]"
              />
              <RoleBadge role="SUPERVISOR" />
            </div>
          );
        },
      },
      {
        id: "approved_at",
        header: t("columns.approved_at"),
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatRelative(row.original.approved_at)}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        size: 44,
        cell: ({ row }) => (
          <RowActions
            norm={row.original}
            canEdit={isWriter && !isArchive}
            onEdit={openEdit}
            onArchive={handleArchive}
            t={t}
          />
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [norms, isArchive, isWriter],
  );

  // ── mobile card ───────────────────────────────────────────────
  function mobileCard(norm: ServiceNorm) {
    return (
      <div className="flex flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <ObjectFormatBadge format={norm.object_format} tFreelance={tFreelance} />
            <span className="text-sm font-medium text-foreground mt-1">
              {norm.work_type_name}
            </span>
          </div>
          {isWriter && !isArchive && (
            <RowActions
              norm={norm}
              canEdit={true}
              onEdit={openEdit}
              onArchive={handleArchive}
              t={t}
            />
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
            {norm.normative_per_hour}
          </span>
          <NormativeUnitBadge unit={norm.unit} tFreelance={tFreelance} />
          <span className="text-xs text-muted-foreground">{t("per_hour")}</span>
          {norm.hourly_rate != null && (
            <span className="text-xs text-muted-foreground ml-auto">
              {norm.hourly_rate.toLocaleString("ru-RU")} {norm.currency}/ч
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
          <span>{norm.approved_by_name}</span>
          <span>·</span>
          <span>{formatRelative(norm.approved_at)}</span>
        </div>
      </div>
    );
  }

  // ── empty states ──────────────────────────────────────────────
  const isEmpty = !loading && !error && norms.length === 0;

  // ── loading ───────────────────────────────────────────────────
  if (loading && norms.length === 0) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <ServiceNormsSkeleton />
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <PageHeader
          title={t("page_title")}
          subtitle={t("page_subtitle")}
          breadcrumbs={[
            { label: t("breadcrumbs.home"), href: "/dashboard" },
            { label: t("breadcrumbs.taxonomy") },
            { label: t("breadcrumbs.norms") },
          ]}
          actions={
            isWriter ? (
              <Button
                size="sm"
                className="h-9 min-w-[44px] gap-1.5"
                onClick={openCreate}
              >
                <Plus className="size-4" aria-hidden="true" />
                <span className="hidden sm:inline">{t("actions.create")}</span>
              </Button>
            ) : null
          }
        />

        {/* Tabs */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <Tabs
            value={tab ?? "active"}
            onValueChange={(v) => void setTab(v)}
            className="w-full sm:w-auto"
          >
            <TabsList className="h-9">
              <TabsTrigger value="active" className="text-sm px-4">
                {t("tabs.active")}
              </TabsTrigger>
              <TabsTrigger value="archive" className="text-sm px-4">
                {t("tabs.archive")}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <Select
              value={filterFormat ?? ""}
              onValueChange={(v) => void setFilterFormat(v === "__all__" ? "" : v)}
            >
              <SelectTrigger className="h-9 w-auto min-w-[160px] text-sm">
                <BoxSelect className="size-3.5 mr-1.5 text-muted-foreground shrink-0" />
                <SelectValue placeholder={t("filters.all_formats")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">{t("filters.all_formats")}</SelectItem>
                {OBJECT_FORMATS.map((fmt) => (
                  <SelectItem key={fmt} value={fmt}>
                    {tFreelance(`object_format.${fmt}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filterWorkType ?? ""}
              onValueChange={(v) => void setFilterWorkType(v === "__all__" ? "" : v)}
            >
              <SelectTrigger className="h-9 w-auto min-w-[160px] text-sm">
                <ClipboardList className="size-3.5 mr-1.5 text-muted-foreground shrink-0" />
                <SelectValue placeholder={t("filters.all_work_types")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">{t("filters.all_work_types")}</SelectItem>
                {MOCK_WORK_TYPES.map((wt) => (
                  <SelectItem key={wt.id} value={String(wt.id)}>
                    {wt.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Content */}
        {error ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-sm text-muted-foreground">
              Ошибка загрузки. Попробуйте ещё раз.
            </p>
          </div>
        ) : isEmpty ? (
          isArchive ? (
            <EmptyState
              icon={Archive}
              title={t("empty.archive_title")}
              description={t("empty.archive_description")}
            />
          ) : (
            <EmptyState
              icon={ClipboardList}
              title={t("empty.active_title")}
              description={t("empty.active_description")}
              action={
                isWriter
                  ? {
                      label: t("empty.active_cta"),
                      onClick: openCreate,
                      icon: Plus,
                    }
                  : undefined
              }
            />
          )
        ) : (
          <ResponsiveDataTable
            columns={columns}
            data={norms}
            mobileCardRender={mobileCard}
            isLoading={loading}
          />
        )}
      </div>

      {/* Sheet */}
      <NormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        editing={editing}
        defaultCurrency={defaultCurrency}
        onSuccess={fetchData}
        t={t}
        tFreelance={tFreelance}
      />
    </>
  );
}
