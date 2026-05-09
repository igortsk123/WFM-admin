"use client";

import * as React from "react";
import { Archive, MoreHorizontal, Pencil } from "lucide-react";

import type { ServiceNorm } from "@/lib/types";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";

import { AlertDialog } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import type { TFn } from "./_shared";

interface RowActionsProps {
  norm: ServiceNorm;
  canEdit: boolean;
  onEdit: (n: ServiceNorm) => void;
  onArchive: (id: string) => void;
  t: TFn;
}

export function RowActions({ norm, canEdit, onEdit, onArchive, t }: RowActionsProps) {
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
