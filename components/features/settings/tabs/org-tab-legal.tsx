"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Building2, MoreHorizontal, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ResponsiveDataTable } from "@/components/shared/responsive-data-table";

import {
  addLegalEntity,
  updateLegalEntity,
  removeLegalEntity,
} from "@/lib/api/organization";
import { MOCK_LEGAL_ENTITIES } from "@/lib/mock-data/legal-entities";
import type { LegalEntity } from "@/lib/types";
import { cn } from "@/lib/utils";

// ─── Schema ──────────────────────────────────────────────────────────────────

const entitySchema = z.object({
  name: z.string().min(2),
  inn: z
    .string()
    .min(10)
    .max(12)
    .regex(/^\d+$/, "Только цифры"),
  kpp: z
    .string()
    .max(9)
    .regex(/^\d*$/, "Только цифры")
    .optional()
    .or(z.literal("")),
  ogrn: z
    .string()
    .min(13)
    .max(15)
    .regex(/^\d+$/, "Только цифры"),
});

type EntityFormValues = z.infer<typeof entitySchema>;

// ─── Entity form dialog ───────────────────────────────────────────────────────

interface EntityDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: LegalEntity;
  onSave: (values: EntityFormValues) => Promise<void>;
}

function EntityDialog({ open, onOpenChange, initial, onSave }: EntityDialogProps) {
  const t = useTranslations("screen.organizationSettings");
  const [saving, setSaving] = React.useState(false);

  const form = useForm<EntityFormValues>({
    resolver: zodResolver(entitySchema),
    defaultValues: {
      name: initial?.name ?? "",
      inn: initial?.inn ?? "",
      kpp: initial?.kpp ?? "",
      ogrn: initial?.ogrn ?? "",
    },
  });

  React.useEffect(() => {
    if (open) {
      form.reset({
        name: initial?.name ?? "",
        inn: initial?.inn ?? "",
        kpp: initial?.kpp ?? "",
        ogrn: initial?.ogrn ?? "",
      });
    }
  }, [open, initial, form]);

  async function handleSubmit(values: EntityFormValues) {
    setSaving(true);
    try {
      await onSave(values);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  const title = initial
    ? t("legal.dialog_title_edit")
    : t("legal.dialog_title_add");

  const FormContent = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("legal.name_label")}</FormLabel>
              <FormControl>
                <Input placeholder='ООО «Пример»' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="inn"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("legal.inn_label")}</FormLabel>
                <FormControl>
                  <Input placeholder="7017123456" maxLength={12} inputMode="numeric" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="kpp"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("legal.kpp_label")}</FormLabel>
                <FormControl>
                  <Input placeholder="701701001" maxLength={9} inputMode="numeric" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="ogrn"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("legal.ogrn_label")}</FormLabel>
              <FormControl>
                <Input placeholder="1027000123456" maxLength={15} inputMode="numeric" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* Hidden submit for keyboard */}
        <button type="submit" className="hidden" />
      </form>
    </Form>
  );

  // Mobile: Sheet, Desktop: Dialog
  return (
    <>
      {/* Desktop */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="hidden sm:block max-w-md">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          {FormContent}
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button onClick={form.handleSubmit(handleSubmit)} disabled={saving}>
              {saving ? "Сохранение..." : "Сохранить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mobile */}
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="sm:hidden h-auto pb-0">
          <SheetHeader className="pb-4">
            <SheetTitle>{title}</SheetTitle>
          </SheetHeader>
          {FormContent}
          <SheetFooter className="sticky bottom-0 bg-background border-t h-14 flex items-center justify-end gap-2 px-4 mt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button onClick={form.handleSubmit(handleSubmit)} disabled={saving}>
              {saving ? "Сохранение..." : "Сохранить"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface OrgTabLegalProps {
  orgId: string;
  initialEntities: LegalEntity[];
}

export function OrgTabLegal({ orgId, initialEntities }: OrgTabLegalProps) {
  const t = useTranslations("screen.organizationSettings");
  const [entities, setEntities] = React.useState<LegalEntity[]>(initialEntities);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<LegalEntity | undefined>();
  const [archiveTarget, setArchiveTarget] = React.useState<LegalEntity | undefined>();
  const [archiveAlertOpen, setArchiveAlertOpen] = React.useState(false);

  async function handleSave(values: EntityFormValues) {
    if (editTarget) {
      await updateLegalEntity(orgId, editTarget.id, {
        ...values,
        tax_jurisdiction: "RU",
      });
      setEntities((prev) =>
        prev.map((e) => (e.id === editTarget.id ? { ...e, ...values } : e))
      );
      toast.success(t("toasts.legal_updated"));
    } else {
      const res = await addLegalEntity(orgId, {
        ...values,
        tax_jurisdiction: "RU",
      });
      const newEntity: LegalEntity = {
        id: parseInt(res.id ?? String(Date.now())),
        organization_id: orgId,
        tax_jurisdiction: "RU",
        ...values,
      };
      setEntities((prev) => [newEntity, ...prev]);
      toast.success(t("toasts.legal_added"));
    }
  }

  async function handleArchive() {
    if (!archiveTarget) return;
    await removeLegalEntity(orgId, archiveTarget.id);
    setEntities((prev) => prev.filter((e) => e.id !== archiveTarget.id));
    toast.success(t("toasts.legal_removed"));
    setArchiveTarget(undefined);
  }

  function openAdd() {
    setEditTarget(undefined);
    setDialogOpen(true);
  }

  function openEdit(entity: LegalEntity) {
    setEditTarget(entity);
    setDialogOpen(true);
  }

  function openArchive(entity: LegalEntity) {
    setArchiveTarget(entity);
    setArchiveAlertOpen(true);
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground max-w-prose">
          {t("legal.description")}
        </p>
        <Button size="sm" onClick={openAdd} className="shrink-0 ml-4">
          <Plus className="size-4 mr-1.5" />
          {t("legal.add_entity")}
        </Button>
      </div>

      {/* Table / empty state */}
      {entities.length === 0 ? (
        <EmptyState
          icon={Building2}
          title={t("legal.no_entities")}
          description={t("legal.no_entities_desc")}
          action={{ label: t("legal.add_entity"), onClick: openAdd }}
        />
      ) : (
        <ResponsiveDataTable
          data={entities}
          columns={[
            {
              accessorKey: "name",
              header: t("legal.col_name"),
              cell: ({ row }) => (
                <span className="font-medium text-sm">{row.original.name}</span>
              ),
            },
            {
              accessorKey: "inn",
              header: t("legal.col_inn"),
              cell: ({ row }) => (
                <span className="text-sm font-mono">{row.original.inn ?? "—"}</span>
              ),
            },
            {
              accessorKey: "kpp",
              header: t("legal.col_kpp"),
              cell: ({ row }) => (
                <span className="text-sm font-mono">{row.original.kpp ?? "—"}</span>
              ),
            },
            {
              accessorKey: "ogrn",
              header: t("legal.col_ogrn"),
              cell: ({ row }) => (
                <span className="text-sm font-mono">{row.original.ogrn ?? "—"}</span>
              ),
            },
            {
              id: "stores",
              header: t("legal.col_stores"),
              cell: () => (
                <Badge variant="secondary" className="text-xs">
                  {Math.floor(Math.random() * 10) + 1}
                </Badge>
              ),
            },
            {
              id: "actions",
              header: "",
              cell: ({ row }) => (
                <div className="flex justify-end">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8">
                        <MoreHorizontal className="size-4" />
                        <span className="sr-only">Действия</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(row.original)}>
                        {t("legal.edit")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => openArchive(row.original)}
                      >
                        {t("legal.archive")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ),
            },
          ]}
          mobileCardRender={(entity) => (
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-0.5">
                <p className="font-medium text-sm">{entity.name}</p>
                <p className="text-xs text-muted-foreground font-mono">
                  ИНН: {entity.inn ?? "—"}{entity.kpp ? ` · КПП: ${entity.kpp}` : ""}
                </p>
                <p className="text-xs text-muted-foreground font-mono">
                  ОГРН: {entity.ogrn ?? "—"}
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-8 shrink-0">
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => openEdit(entity)}>
                    {t("legal.edit")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => openArchive(entity)}
                  >
                    {t("legal.archive")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        />
      )}

      {/* Add / Edit dialog */}
      <EntityDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editTarget}
        onSave={handleSave}
      />

      {/* Archive confirm */}
      <AlertDialog open={archiveAlertOpen} onOpenChange={setArchiveAlertOpen}>
        <ConfirmDialog
          title={t("legal.archive_confirm_title")}
          message={t("legal.archive_confirm_message")}
          confirmLabel={t("legal.archive_confirm_action")}
          variant="destructive"
          onConfirm={handleArchive}
          onOpenChange={setArchiveAlertOpen}
        />
      </AlertDialog>
    </div>
  );
}
