"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CalendarX2, History, MoreVertical, Pencil } from "lucide-react";

import type { BudgetLimit } from "@/lib/types";

import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";

interface RowActionsProps {
  limit: BudgetLimit;
  onEdit: (limit: BudgetLimit) => void;
  onTerminate: (limit: BudgetLimit) => void;
  onHistory: (limit: BudgetLimit) => void;
}

export function RowActions({
  limit,
  onEdit,
  onTerminate,
  onHistory,
}: RowActionsProps) {
  const t = useTranslations("freelanceBudgetLimits");
  const tCommon = useTranslations("common");
  const [terminateOpen, setTerminateOpen] = useState(false);

  return (
    <AlertDialog open={terminateOpen} onOpenChange={setTerminateOpen}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label={tCommon("actions")}
          >
            <MoreVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit(limit)}>
            <Pencil className="size-4 mr-2" />
            {t("menu.edit")}
          </DropdownMenuItem>
          <AlertDialogTrigger asChild>
            <DropdownMenuItem>
              <CalendarX2 className="size-4 mr-2" />
              {t("menu.terminate")}
            </DropdownMenuItem>
          </AlertDialogTrigger>
          <DropdownMenuItem onClick={() => onHistory(limit)}>
            <History className="size-4 mr-2" />
            {t("menu.history")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmDialog
        title={t("terminate_dialog.title")}
        message={t("terminate_dialog.message")}
        confirmLabel={t("terminate_dialog.confirm")}
        variant="destructive"
        onConfirm={() => onTerminate(limit)}
        onOpenChange={setTerminateOpen}
      />
    </AlertDialog>
  );
}
