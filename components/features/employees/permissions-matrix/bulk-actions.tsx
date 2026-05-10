"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Check, CheckCheck, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BulkActionBar as SharedBulkActionBar } from "@/components/shared/bulk-action-bar";

import type { Permission } from "@/lib/types";

import { ALL_PERMISSIONS } from "./_shared";

// ─── BULK ASSIGN DIALOG ────────────────────────────────────────────────────

export function BulkAssignDialog({
  open,
  onOpenChange,
  selectedCount,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  selectedCount: number;
  onConfirm: (permission: Permission) => Promise<void>;
}) {
  const t = useTranslations("screen.permissions.dialogs");
  const tCommon = useTranslations("common");
  const tPerm = useTranslations("permission");

  const [selected, setSelected] = React.useState<Permission | "">("");
  const [comboOpen, setComboOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const permLabel = React.useMemo(
    (): Record<Permission, string> => ({
      CASHIER: tPerm("cashier"),
      SALES_FLOOR: tPerm("sales_floor"),
      SELF_CHECKOUT: tPerm("self_checkout"),
      WAREHOUSE: tPerm("warehouse"),
      PRODUCTION_LINE: tPerm("production_line"),
    }),
    [tPerm]
  );

  const handleConfirm = async () => {
    if (!selected) return;
    setLoading(true);
    await onConfirm(selected as Permission);
    setLoading(false);
    onOpenChange(false);
    setSelected("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("bulk_assign_title")}</DialogTitle>
          <DialogDescription>
            {t("bulk_assign_info", { count: selectedCount })}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <Popover open={comboOpen} onOpenChange={setComboOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start">
                {selected
                  ? permLabel[selected as Permission]
                  : t("bulk_assign_select")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0 w-56" align="start">
              <Command>
                <CommandInput placeholder={t("bulk_assign_select")} />
                <CommandList>
                  <CommandEmpty>{tCommon("noResults")}</CommandEmpty>
                  <CommandGroup>
                    {ALL_PERMISSIONS.map((p) => (
                      <CommandItem
                        key={p}
                        value={p}
                        onSelect={() => {
                          setSelected(p);
                          setComboOpen(false);
                        }}
                      >
                        {permLabel[p]}
                        {selected === p && (
                          <Check className="ml-auto size-4 text-primary" />
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tCommon("cancel")}
          </Button>
          <Button onClick={handleConfirm} disabled={!selected || loading}>
            {t("bulk_assign_confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── BULK REVOKE DIALOG ────────────────────────────────────────────────────

export function BulkRevokeDialog({
  open,
  onOpenChange,
  selectedCount,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  selectedCount: number;
  onConfirm: () => Promise<void>;
}) {
  const t = useTranslations("screen.permissions.dialogs");
  const tCommon = useTranslations("common");
  const [loading, setLoading] = React.useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    await onConfirm();
    setLoading(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("bulk_revoke_title")}</DialogTitle>
          <DialogDescription>
            {t("bulk_revoke_warning", { count: selectedCount })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tCommon("cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={loading}
          >
            {t("bulk_revoke_confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── BULK ACTION BAR ───────────────────────────────────────────────────────

export function BulkActionBar({
  selectedCount,
  onBulkAssign,
  onBulkRevoke,
  onClear,
}: {
  selectedCount: number;
  onBulkAssign: () => void;
  onBulkRevoke: () => void;
  onClear: () => void;
}) {
  const t = useTranslations("screen.permissions");

  return (
    <SharedBulkActionBar
      variant="inline"
      selectedCount={selectedCount}
      countLabel={t("bulk.selected", { count: selectedCount })}
      actions={
        <>
          <Button size="sm" variant="outline" className="h-9" onClick={onBulkAssign}>
            <CheckCheck className="size-4 mr-1.5" />
            <span className="hidden md:inline">{t("bulk.assign_permission")}</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-9 border-destructive text-destructive hover:bg-destructive/5"
            onClick={onBulkRevoke}
          >
            <XCircle className="size-4 mr-1.5" />
            <span className="hidden md:inline">{t("bulk.revoke_permission")}</span>
          </Button>
          <Button size="sm" variant="ghost" className="h-9" onClick={onClear}>
            {t("bulk.clear")}
          </Button>
        </>
      }
    />
  );
}
