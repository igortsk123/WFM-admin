"use client";

import { useTranslations } from "next-intl";
import { Check, Lock, Plus, XCircle } from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AlertDialog, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

import type { Permission } from "@/lib/types";

import type { RevokeTarget } from "./_shared";

interface MatrixCellProps {
  userId: number;
  userName: string;
  permission: Permission;
  granted: boolean;
  manager: boolean;
  rowPerms: Permission[];
  permLabel: Record<Permission, string>;
  revokeTarget: RevokeTarget | null;
  onSetRevokeTarget: (target: RevokeTarget | null) => void;
  onGrant: (
    userId: number,
    permission: Permission,
    currentPerms: Permission[]
  ) => Promise<void> | void;
  onRevoke: (
    userId: number,
    permission: Permission,
    currentPerms: Permission[]
  ) => Promise<void> | void;
}

export function MatrixCell({
  userId,
  userName,
  permission,
  granted,
  manager,
  rowPerms,
  permLabel,
  revokeTarget,
  onSetRevokeTarget,
  onGrant,
  onRevoke,
}: MatrixCellProps) {
  const t = useTranslations("screen.permissions");

  if (manager) {
    return (
      <div className="flex items-center justify-center">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex size-8 items-center justify-center rounded-full bg-muted/50 cursor-not-allowed">
              <Lock className="size-3.5 text-muted-foreground" />
            </div>
          </TooltipTrigger>
          <TooltipContent>{t("matrix.manager_no_privileges")}</TooltipContent>
        </Tooltip>
      </div>
    );
  }

  if (granted) {
    return (
      <div className="flex items-center justify-center">
        <AlertDialog
          open={
            revokeTarget?.userId === userId &&
            revokeTarget?.permission === permission
          }
          onOpenChange={(open) => {
            if (!open) onSetRevokeTarget(null);
          }}
        >
          <AlertDialogTrigger asChild>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSetRevokeTarget({
                      userId,
                      userName,
                      permission,
                    });
                  }}
                  className="group flex size-8 items-center justify-center rounded-full bg-success/10 transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={`Revoke ${permission}`}
                >
                  <Check className="size-4 text-success group-hover:hidden" />
                  <XCircle className="size-4 text-destructive hidden group-hover:block" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                {t("matrix.tooltip_granted", {
                  date: "—",
                  by: "—",
                })}
              </TooltipContent>
            </Tooltip>
          </AlertDialogTrigger>
          <ConfirmDialog
            title={t("dialogs.single_revoke_title", {
              name: userName,
            })}
            message={t("dialogs.single_revoke_description", {
              permission: permLabel[permission],
            })}
            confirmLabel={t("dialogs.single_revoke_confirm")}
            variant="destructive"
            onConfirm={() => onRevoke(userId, permission, rowPerms)}
            onOpenChange={(open) => {
              if (!open) onSetRevokeTarget(null);
            }}
          />
        </AlertDialog>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center">
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onGrant(userId, permission, rowPerms);
            }}
            className="group flex size-8 items-center justify-center rounded-full border-2 border-dashed border-border transition-colors hover:border-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`Grant ${permission}`}
          >
            <Plus className="size-3.5 text-muted-foreground group-hover:text-primary" />
          </button>
        </TooltipTrigger>
        <TooltipContent>{t("matrix.tooltip_grant_hint")}</TooltipContent>
      </Tooltip>
    </div>
  );
}
