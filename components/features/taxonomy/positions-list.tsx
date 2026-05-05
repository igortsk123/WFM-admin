"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { type ColumnDef } from "@tanstack/react-table";
import {
  Briefcase,
  Download,
  MoreHorizontal,
  Plus,
  SearchX,
} from "lucide-react";

import type { FunctionalRole } from "@/lib/types";
import type { PositionWithCounts } from "@/lib/api/taxonomy";
import {
  getPositions,
  createPosition,
  updatePosition,
  deletePosition,
} from "@/lib/api/taxonomy";
import { ADMIN_ROUTES } from "@/lib/constants/routes";
import { useAuth } from "@/lib/contexts/auth-context";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ResponsiveDataTable } from "@/components/shared/responsive-data-table";
import { MobileFilterSheet } from "@/components/shared/mobile-filter-sheet";
import { RoleBadge } from "@/components/shared/role-badge";
import { Link } from "@/i18n/navigation";

// ─────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────

const FUNCTIONAL_ROLES: FunctionalRole[] = [
  "STORE_DIRECTOR",
  "SUPERVISOR",
  "REGIONAL",
  "NETWORK_OPS",
  "HR_MANAGER",
  "OPERATOR",
  "WORKER",
];

// ─────────────────────────────────────────────────────────────────
// FORM STATE
// ─────────────────────────────────────────────────────────────────

interface PositionFormState {
  code: string;
  name: string;
  description: string;
  role_id: "1" | "2";
  functional_role_default: string;
  default_rank: string;
  is_active: boolean;
}

const DEFAULT_FORM: PositionFormState = {
  code: "",
  name: "",
  description: "",
  role_id: "1",
  functional_role_default: "",
  default_rank: "1",
  is_active: true,
};

// ─────────────────────────────────────────────────────────────────
// POSITION FORM (shared by Dialog desktop + Sheet mobile)
// ─────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TFn = (key: string, values?: Record<string, any>) => string;

interface PositionFormBodyProps {
  form: PositionFormState;
  onChange: (next: PositionFormState) => void;
  editingEmployeesCount: number;
  roleChanged: boolean;
  roleChangeAcknowledged: boolean;
  onAckChange: (v: boolean) => void;
  t: TFn;
  tRole: TFn;
}

function PositionFormBody({
  form,
  onChange,
  editingEmployeesCount,
  roleChanged,
  roleChangeAcknowledged,
  onAckChange,
  t,
  tRole,
}: PositionFormBodyProps) {
  const set = <K extends keyof PositionFormState>(
    key: K,
    value: PositionFormState[K]
  ) => onChange({ ...form, [key]: value });

  return (
    <div className="flex flex-col gap-4">
      {/* Code */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="pos-code" className="text-sm font-medium">
          {t("dialogs.fields.code")}
        </Label>
        <Input
          id="pos-code"
          value={form.code}
          onChange={(e) => set("code", e.target.value.toUpperCase())}
          placeholder={t("dialogs.fields.code_placeholder")}
          className="font-mono uppercase"
          maxLength={40}
        />
      </div>

      {/* Name */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="pos-name" className="text-sm font-medium">
          {t("dialogs.fields.name")}
          <span className="ml-1 text-destructive" aria-hidden="true">*</span>
        </Label>
        <Input
          id="pos-name"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder={t("dialogs.fields.name_placeholder")}
          maxLength={80}
          required
        />
      </div>

      {/* Description */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="pos-description" className="text-sm font-medium">
          {t("dialogs.fields.description")}
          <span className="ml-2 text-xs font-normal text-muted-foreground">(необязательно)</span>
        </Label>
        <Textarea
          id="pos-description"
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder={t("dialogs.fields.description_placeholder")}
          rows={2}
          className="resize-none"
        />
      </div>

      {/* DB Role */}
      <div className="flex flex-col gap-2">
        <Label className="text-sm font-medium">{t("dialogs.fields.role_id")}</Label>
        <RadioGroup
          value={form.role_id}
          onValueChange={(v) => set("role_id", v as "1" | "2")}
          className="flex flex-col gap-2"
        >
          <div className="flex items-center gap-2.5">
            <RadioGroupItem value="1" id="role-worker" />
            <Label htmlFor="role-worker" className="text-sm font-normal cursor-pointer">
              {t("dialogs.fields.role_id_worker")}
            </Label>
          </div>
          <div className="flex items-center gap-2.5">
            <RadioGroupItem value="2" id="role-manager" />
            <Label htmlFor="role-manager" className="text-sm font-normal cursor-pointer">
              {t("dialogs.fields.role_id_manager")}
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Role change warning */}
      {roleChanged && editingEmployeesCount > 0 && (
        <Alert className="border-warning/40 bg-warning/5">
          <AlertDescription className="flex flex-col gap-2 text-sm">
            <span>
              {t("dialogs.role_change_warning", { count: editingEmployeesCount })}
            </span>
            <div className="flex items-center gap-2 min-h-[44px]">
              <Checkbox
                id="role-change-ack"
                checked={roleChangeAcknowledged}
                onCheckedChange={(v) => onAckChange(!!v)}
                className="size-5"
              />
              <Label
                htmlFor="role-change-ack"
                className="text-sm font-normal cursor-pointer leading-relaxed"
              >
                {t("dialogs.role_change_ack")}
              </Label>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Functional role default */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="pos-functional-role" className="text-sm font-medium">
          {t("dialogs.fields.functional_role_default")}
        </Label>
        <Select
          value={form.functional_role_default}
          onValueChange={(v) => set("functional_role_default", v)}
        >
          <SelectTrigger id="pos-functional-role" className="h-9">
            <SelectValue placeholder={t("dialogs.fields.functional_role_default_placeholder")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">
              {t("dialogs.fields.functional_role_default_placeholder")}
            </SelectItem>
            {FUNCTIONAL_ROLES.map((role) => (
              <SelectItem key={role} value={role}>
                {tRole(
                  role === "STORE_DIRECTOR"
                    ? "store_director"
                    : role === "SUPERVISOR"
                    ? "supervisor"
                    : role === "REGIONAL"
                    ? "regional"
                    : role === "NETWORK_OPS"
                    ? "network_ops"
                    : role === "HR_MANAGER"
                    ? "hr_manager"
                    : role === "OPERATOR"
                    ? "operator"
                    : "worker"
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {t("dialogs.fields.functional_role_default_hint")}
        </p>
      </div>

      {/* Default rank */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="pos-rank" className="text-sm font-medium">
          {t("dialogs.fields.default_rank")}
        </Label>
        <Input
          id="pos-rank"
          type="number"
          min={1}
          max={6}
          value={form.default_rank}
          onChange={(e) => set("default_rank", e.target.value)}
          placeholder={t("dialogs.fields.default_rank_placeholder")}
          className="w-28"
        />
      </div>

      {/* Is active switch */}
      <div className="flex items-center gap-3 min-h-[44px]">
        <Switch
          id="pos-active"
          checked={form.is_active}
          onCheckedChange={(v) => set("is_active", v)}
        />
        <Label htmlFor="pos-active" className="text-sm font-normal cursor-pointer">
          {t("dialogs.fields.is_active")}
        </Label>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// POSITION DIALOG (Desktop)
// ─────────────────────────────────────────────────────────────────

interface PositionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: PositionWithCounts | null;
  onSuccess: () => void;
  t: TFn;
  tRole: TFn;
}

function PositionDialog({
  open,
  onOpenChange,
  editing,
  onSuccess,
  t,
  tRole,
}: PositionDialogProps) {
  const [form, setForm] = React.useState<PositionFormState>(DEFAULT_FORM);
  const [originalRoleId, setOriginalRoleId] = React.useState<"1" | "2">("1");
  const [roleChangeAck, setRoleChangeAck] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      if (editing) {
        const f: PositionFormState = {
          code: editing.code,
          name: editing.name,
          description: editing.description ?? "",
          role_id: String(editing.role_id) as "1" | "2",
          functional_role_default: editing.functional_role_default ?? "",
          default_rank: String(editing.default_rank ?? 1),
          is_active: editing.is_active ?? true,
        };
        setForm(f);
        setOriginalRoleId(String(editing.role_id) as "1" | "2");
      } else {
        setForm(DEFAULT_FORM);
        setOriginalRoleId("1");
      }
      setRoleChangeAck(false);
    }
  }, [open, editing]);

  const roleChanged = editing !== null && form.role_id !== originalRoleId;
  const needsAck = roleChanged && (editing?.employees_count ?? 0) > 0;
  const canSave =
    !!form.name.trim() &&
    !!form.code.trim() &&
    (!needsAck || roleChangeAck) &&
    !saving;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      const payload = {
        code: form.code,
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        role_id: Number(form.role_id) as 1 | 2,
        functional_role_default: form.functional_role_default || null,
        default_rank: Number(form.default_rank) || 1,
        is_active: form.is_active,
      };
      const result = editing
        ? await updatePosition(editing.id, payload)
        : await createPosition(payload);
      if (result.success) {
        toast.success(editing ? t("toasts.updated") : t("toasts.created"));
        onSuccess();
        onOpenChange(false);
      } else {
        toast.error(t("toasts.error"));
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editing
              ? t("dialogs.edit_title", { name: editing.name })
              : t("dialogs.create_title")}
          </DialogTitle>
        </DialogHeader>

        <PositionFormBody
          form={form}
          onChange={setForm}
          editingEmployeesCount={editing?.employees_count ?? 0}
          roleChanged={roleChanged}
          roleChangeAcknowledged={roleChangeAck}
          onAckChange={setRoleChangeAck}
          t={t}
          tRole={tRole}
        />

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("dialogs.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={!canSave}>
            {saving ? "..." : t("dialogs.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────
// POSITION SHEET (Mobile full-screen)
// ─────────────────────────────────────────────────────────────────

interface PositionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: PositionWithCounts | null;
  onSuccess: () => void;
  t: TFn;
  tRole: TFn;
}

function PositionSheet({
  open,
  onOpenChange,
  editing,
  onSuccess,
  t,
  tRole,
}: PositionSheetProps) {
  const [form, setForm] = React.useState<PositionFormState>(DEFAULT_FORM);
  const [originalRoleId, setOriginalRoleId] = React.useState<"1" | "2">("1");
  const [roleChangeAck, setRoleChangeAck] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      if (editing) {
        const f: PositionFormState = {
          code: editing.code,
          name: editing.name,
          description: editing.description ?? "",
          role_id: String(editing.role_id) as "1" | "2",
          functional_role_default: editing.functional_role_default ?? "",
          default_rank: String(editing.default_rank ?? 1),
          is_active: editing.is_active ?? true,
        };
        setForm(f);
        setOriginalRoleId(String(editing.role_id) as "1" | "2");
      } else {
        setForm(DEFAULT_FORM);
        setOriginalRoleId("1");
      }
      setRoleChangeAck(false);
    }
  }, [open, editing]);

  const roleChanged = editing !== null && form.role_id !== originalRoleId;
  const needsAck = roleChanged && (editing?.employees_count ?? 0) > 0;
  const canSave =
    !!form.name.trim() &&
    !!form.code.trim() &&
    (!needsAck || roleChangeAck) &&
    !saving;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      const payload = {
        code: form.code,
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        role_id: Number(form.role_id) as 1 | 2,
        functional_role_default: form.functional_role_default || null,
        default_rank: Number(form.default_rank) || 1,
        is_active: form.is_active,
      };
      const result = editing
        ? await updatePosition(editing.id, payload)
        : await createPosition(payload);
      if (result.success) {
        toast.success(editing ? t("toasts.updated") : t("toasts.created"));
        onSuccess();
        onOpenChange(false);
      } else {
        toast.error(t("toasts.error"));
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[95dvh] flex flex-col p-0 rounded-t-xl"
      >
        <SheetHeader className="border-b px-4 py-3 shrink-0">
          <SheetTitle>
            {editing
              ? t("dialogs.edit_title", { name: editing.name })
              : t("dialogs.create_title")}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <PositionFormBody
            form={form}
            onChange={setForm}
            editingEmployeesCount={editing?.employees_count ?? 0}
            roleChanged={roleChanged}
            roleChangeAcknowledged={roleChangeAck}
            onAckChange={setRoleChangeAck}
            t={t}
            tRole={tRole}
          />
        </div>

        <SheetFooter className="sticky bottom-0 h-14 border-t bg-background flex flex-row gap-2 px-4 py-2 shrink-0">
          <Button
            variant="outline"
            className="flex-1 h-10"
            onClick={() => onOpenChange(false)}
          >
            {t("dialogs.cancel")}
          </Button>
          <Button
            className="flex-1 h-10"
            onClick={handleSave}
            disabled={!canSave}
          >
            {saving ? "..." : t("dialogs.save")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// ─────────────────────────────────────────────────────────────────
// DELETE DIALOG
// ─────────────────────────────────────────────────────────────────

interface DeleteDialogProps {
  position: PositionWithCounts | null;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  t: TFn;
}

function DeleteDialog({
  position,
  onOpenChange,
  onSuccess,
  t,
}: DeleteDialogProps) {
  const [deleting, setDeleting] = React.useState(false);

  async function handleConfirm() {
    if (!position) return;
    setDeleting(true);
    try {
      const result = await deletePosition(position.id);
      if (result.success) {
        toast.success(t("toasts.deleted"));
        onSuccess();
        onOpenChange(false);
      } else if (
        result.error?.code === "HAS_DEPENDENCIES" ||
        (position.employees_count ?? 0) > 0
      ) {
        toast.warning(t("toasts.in_use_warning"));
        onOpenChange(false);
      } else {
        toast.error(t("toasts.error"));
      }
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AlertDialog open={!!position} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t("dialogs.delete_confirm_title", { name: position?.name ?? "" })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {position && (position.employees_count ?? 0) > 0
              ? t("dialogs.delete_in_use_error", {
                  count: position.employees_count,
                })
              : t("dialogs.delete_confirm_warning")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("dialogs.cancel")}
          </Button>
          <Button
            variant="destructive"
            disabled={
              deleting || (position?.employees_count ?? 0) > 0
            }
            onClick={handleConfirm}
          >
            {deleting ? "..." : t("dialogs.delete_action")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─────────────────────────────────────────────────────────────────
// STATS CARD
// ─────────────────────────────────────────────────────────────────

function StatsCard({
  label,
  value,
  loading,
}: {
  label: string;
  value: number;
  loading: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg border border-border bg-card p-3">
      <span className="text-xs text-muted-foreground font-medium">{label}</span>
      {loading ? (
        <Skeleton className="h-6 w-10 mt-0.5" />
      ) : (
        <span className="text-xl font-bold text-foreground tabular-nums">
          {value}
        </span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// ROLE LABEL BADGE (WORKER / MANAGER DB role, not functional role)
// ─────────────────────────────────────────────────────────────────

function DbRoleBadge({ roleId }: { roleId: 1 | 2 }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-xs font-medium",
        roleId === 1
          ? "bg-muted text-muted-foreground border-transparent"
          : "bg-info/10 text-info border-info/20"
      )}
    >
      {roleId === 1 ? "WORKER" : "MANAGER"}
    </Badge>
  );
}

// ─────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────

export function PositionsList() {
  const t = useTranslations("screen.positions");
  const tRole = useTranslations("role.functional");
  const { user } = useAuth();

  // Permission: STORE_DIRECTOR gets 403 equivalent (read-only/hidden)
  const canEdit =
    user.role === "NETWORK_OPS" || user.role === "HR_MANAGER";

  // ── Filter state ─────────────────────────────────────────────────
  const [search, setSearch] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState<"" | "1" | "2">("");

  // ── Data state ───────────────────────────────────────────────────
  const [data, setData] = React.useState<PositionWithCounts[]>([]);
  const [total, setTotal] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isError, setIsError] = React.useState(false);
  const [page, setPage] = React.useState(1);

  // ── Dialog state ─────────────────────────────────────────────────
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [editingPosition, setEditingPosition] =
    React.useState<PositionWithCounts | null>(null);
  const [deletingPosition, setDeletingPosition] =
    React.useState<PositionWithCounts | null>(null);

  // ── Fetch ────────────────────────────────────────────────────────
  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const result = await getPositions({
        search: search || undefined,
        role_id: roleFilter ? (Number(roleFilter) as 1 | 2) : undefined,
        page,
        page_size: 50,
      });
      setData(result.data);
      setTotal(result.total ?? 0);
    } catch {
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, [search, roleFilter, page]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Stats (unfiltered counts) ────────────────────────────────────
  const [statsTotal, setStatsTotal] = React.useState(0);
  const [statsWorker, setStatsWorker] = React.useState(0);
  const [statsManager, setStatsManager] = React.useState(0);
  const [statsLoading, setStatsLoading] = React.useState(true);

  React.useEffect(() => {
    setStatsLoading(true);
    Promise.all([
      getPositions({ page_size: 200 }),
      getPositions({ role_id: 1, page_size: 200 }),
      getPositions({ role_id: 2, page_size: 200 }),
    ]).then(([all, workers, managers]) => {
      setStatsTotal(all.total ?? 0);
      setStatsWorker(workers.total ?? 0);
      setStatsManager(managers.total ?? 0);
      setStatsLoading(false);
    });
  }, []);

  // ── Derived empty state ──────────────────────────────────────────
  const hasFilters = !!search || !!roleFilter;
  const isFiltered = hasFilters && !isLoading && data.length === 0;
  const isEmpty = !hasFilters && !isLoading && data.length === 0;

  // ── Open add/edit ────────────────────────────────────────────────
  function openCreate(isMobile: boolean) {
    setEditingPosition(null);
    if (isMobile) {
      setSheetOpen(true);
    } else {
      setDialogOpen(true);
    }
  }

  function openEdit(pos: PositionWithCounts, isMobile: boolean) {
    setEditingPosition(pos);
    if (isMobile) {
      setSheetOpen(true);
    } else {
      setDialogOpen(true);
    }
  }

  // ── Duplicate ────────────────────────────────────────────────────
  async function handleDuplicate(pos: PositionWithCounts) {
    const result = await createPosition({
      code: pos.code + "-COPY",
      name: pos.name + " (копия)",
      description: pos.description,
      role_id: pos.role_id,
      default_rank: pos.default_rank,
    });
    if (result.success) {
      toast.success(t("toasts.created"));
      fetchData();
    } else {
      toast.error(t("toasts.error"));
    }
  }

  // ── Table columns ─────────────────────────────────────────────────
  const columns: ColumnDef<PositionWithCounts>[] = [
    // Checkbox
    {
      id: "select",
      enableSorting: false,
      header: () => (
        <span className="sr-only">Выбрать</span>
      ),
      cell: () => (
        <div className="flex items-center justify-center min-w-[44px] min-h-[44px]">
          <Checkbox aria-label="Выбрать строку" />
        </div>
      ),
      size: 48,
    },
    // Code
    {
      accessorKey: "code",
      header: () => t("columns.code"),
      cell: ({ row }) => (
        <Badge variant="outline" className="font-mono text-xs">
          {row.original.code}
        </Badge>
      ),
    },
    // Name
    {
      accessorKey: "name",
      header: () => t("columns.name"),
      cell: ({ row }) => (
        <span className="font-medium text-sm">{row.original.name}</span>
      ),
      enableSorting: true,
    },
    // DB Role badge
    {
      accessorKey: "role_id",
      header: () => t("columns.role"),
      cell: ({ row }) => (
        <DbRoleBadge roleId={row.original.role_id} />
      ),
    },
    // Description
    {
      accessorKey: "description",
      header: () => t("columns.description"),
      enableSorting: false,
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]">
          {row.original.description || "—"}
        </span>
      ),
    },
    // Employees count — link to filtered employees
    {
      accessorKey: "employees_count",
      header: () => t("columns.employees_count"),
      cell: ({ row }) => {
        const count = row.original.employees_count;
        return count > 0 ? (
          <Link
            href={`${ADMIN_ROUTES.employees}?position_id=${row.original.id}`}
            className="text-sm text-primary hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {count}
          </Link>
        ) : (
          <span className="text-sm text-muted-foreground">0</span>
        );
      },
    },
    // Stores count
    {
      accessorKey: "stores_count",
      header: () => t("columns.stores_count"),
      cell: ({ row }) => (
        <span className="text-sm">{row.original.stores_count}</span>
      ),
    },
    // Actions
    {
      id: "actions",
      enableSorting: false,
      header: () => <span className="sr-only">{t("columns.actions")}</span>,
      cell: ({ row }) => {
        const pos = row.original;
        const hasEmployees = (pos.employees_count ?? 0) > 0;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-9 min-w-[44px] min-h-[44px]"
                aria-label={t("columns.actions")}
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  openEdit(pos, false);
                }}
                disabled={!canEdit}
              >
                {t("row_actions.edit")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleDuplicate(pos);
                }}
                disabled={!canEdit}
              >
                {t("row_actions.duplicate")}
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  href={`${ADMIN_ROUTES.employees}?position_id=${pos.id}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  {t("row_actions.view_employees")}
                </Link>
              </DropdownMenuItem>
              {canEdit && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    disabled={hasEmployees}
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeletingPosition(pos);
                    }}
                  >
                    {t("row_actions.delete")}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  // ── Mobile card render ────────────────────────────────────────────
  function mobileCardRender(pos: PositionWithCounts) {
    return (
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">{pos.name}</span>
            <Badge variant="outline" className="font-mono text-[11px]">
              {pos.code}
            </Badge>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <DbRoleBadge roleId={pos.role_id} />
            {pos.functional_role_default && (
              <RoleBadge
                role={pos.functional_role_default as FunctionalRole}
                size="sm"
              />
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            {t("columns.employees_count")}:{" "}
            <span className="font-medium text-foreground">
              {pos.employees_count}
            </span>
          </span>
        </div>
        {/* Mobile ⋮ menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-11 shrink-0"
              aria-label={t("columns.actions")}
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="size-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                openEdit(pos, true);
              }}
              disabled={!canEdit}
            >
              {t("row_actions.edit")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                handleDuplicate(pos);
              }}
              disabled={!canEdit}
            >
              {t("row_actions.duplicate")}
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link
                href={`${ADMIN_ROUTES.employees}?position_id=${pos.id}`}
                onClick={(e) => e.stopPropagation()}
              >
                {t("row_actions.view_employees")}
              </Link>
            </DropdownMenuItem>
            {canEdit && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  disabled={(pos.employees_count ?? 0) > 0}
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeletingPosition(pos);
                  }}
                >
                  {t("row_actions.delete")}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  // ── Active filter count for mobile sheet ─────────────────────────
  const activeFilterCount = (roleFilter ? 1 : 0);

  // ── Error state ───────────────────────────────────────────────────
  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={t("breadcrumbs.positions")}
          breadcrumbs={[
            { label: t("breadcrumbs.taxonomy"), href: ADMIN_ROUTES.taxonomyWorkTypes },
            { label: t("breadcrumbs.positions") },
          ]}
        />
        <Alert variant="destructive">
          <AlertDescription>
            Не удалось загрузить данные. Попробуйте обновить страницу.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <PageHeader
        title={t("breadcrumbs.positions")}
        breadcrumbs={[
          { label: t("breadcrumbs.taxonomy"), href: ADMIN_ROUTES.taxonomyWorkTypes },
          { label: t("breadcrumbs.positions") },
        ]}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              className="hidden sm:flex items-center gap-1.5"
            >
              <Download className="size-3.5" />
              {t("actions.export")}
            </Button>
            {canEdit && (
              <>
                {/* Desktop create */}
                <Button
                  size="sm"
                  className="hidden md:flex items-center gap-1.5"
                  onClick={() => openCreate(false)}
                >
                  <Plus className="size-3.5" />
                  {t("actions.create")}
                </Button>
                {/* Mobile create */}
                <Button
                  size="sm"
                  className="flex md:hidden items-center gap-1.5"
                  onClick={() => openCreate(true)}
                >
                  <Plus className="size-3.5" />
                  {t("actions.create")}
                </Button>
              </>
            )}
          </>
        }
      />

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatsCard
          label={t("stats.total")}
          value={statsTotal}
          loading={statsLoading}
        />
        <StatsCard
          label="WORKER"
          value={statsWorker}
          loading={statsLoading}
        />
        <StatsCard
          label="MANAGER"
          value={statsManager}
          loading={statsLoading}
        />
        <StatsCard
          label="HR / Merchandiser / Office"
          value={0}
          loading={statsLoading}
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={t("filters.search_placeholder")}
            className="h-9 pl-3 pr-3"
            aria-label={t("filters.search_placeholder")}
          />
        </div>

        {/* Role filter — desktop */}
        <Select
          value={roleFilter}
          onValueChange={(v) => {
            setRoleFilter(v as "" | "1" | "2");
            setPage(1);
          }}
        >
          <SelectTrigger className="h-9 w-full md:w-44 hidden md:flex">
            <SelectValue placeholder={t("filters.role")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">{t("filters.role_all")}</SelectItem>
            <SelectItem value="1">{t("filters.role_worker")}</SelectItem>
            <SelectItem value="2">{t("filters.role_manager")}</SelectItem>
          </SelectContent>
        </Select>

        {/* Role filter — mobile inside sheet */}
        <MobileFilterSheet
          activeCount={activeFilterCount}
          onClearAll={() => {
            setRoleFilter("");
            setPage(1);
          }}
          onApply={() => {}}
          className="md:hidden"
        >
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm font-medium">{t("filters.role")}</Label>
            <Select
              value={roleFilter}
              onValueChange={(v) => {
                setRoleFilter(v as "" | "1" | "2");
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder={t("filters.role_all")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{t("filters.role_all")}</SelectItem>
                <SelectItem value="1">{t("filters.role_worker")}</SelectItem>
                <SelectItem value="2">{t("filters.role_manager")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </MobileFilterSheet>
      </div>

      {/* Empty: no positions at all */}
      {isEmpty && (
        <EmptyState
          icon={Briefcase}
          title={t("empty.no_positions_title")}
          description={t("empty.no_positions_subtitle")}
          action={
            canEdit
              ? {
                  label: t("empty.no_positions_cta"),
                  icon: Plus,
                  onClick: () => openCreate(false),
                }
              : undefined
          }
        />
      )}

      {/* Empty: filtered no results */}
      {isFiltered && (
        <EmptyState
          icon={SearchX}
          title={t("empty.filtered_title")}
          description={t("empty.filtered_reset")}
          action={{
            label: t("empty.filtered_reset"),
            onClick: () => {
              setSearch("");
              setRoleFilter("");
              setPage(1);
            },
          }}
        />
      )}

      {/* Table */}
      {!isEmpty && !isFiltered && (
        <ResponsiveDataTable
          columns={columns}
          data={data}
          mobileCardRender={mobileCardRender}
          isLoading={isLoading}
          isEmpty={data.length === 0}
          emptyMessage={{
            title: t("empty.no_positions_title"),
            description: t("empty.no_positions_subtitle"),
          }}
          pagination={{
            page,
            pageSize: 50,
            total,
            onPageChange: setPage,
          }}
        />
      )}

      {/* Dialogs */}
      {/* Desktop dialog */}
      <PositionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editingPosition}
        onSuccess={fetchData}
        t={t}
        tRole={tRole}
      />

      {/* Mobile sheet */}
      <PositionSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        editing={editingPosition}
        onSuccess={fetchData}
        t={t}
        tRole={tRole}
      />

      {/* Delete confirm */}
      <DeleteDialog
        position={deletingPosition}
        onOpenChange={(open) => !open && setDeletingPosition(null)}
        onSuccess={fetchData}
        t={t}
      />
    </div>
  );
}
