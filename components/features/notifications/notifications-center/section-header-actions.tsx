import { useTranslations } from "next-intl";
import { CheckCheck, Settings } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";

import { NotificationsSettingsDialogContent } from "../notifications-settings-dialog-content";

interface SectionHeaderActionsProps {
  unreadCount: number;
  markAllOpen: boolean;
  onMarkAllOpenChange: (open: boolean) => void;
  onMarkAllRead: () => Promise<void> | void;
  settingsOpen: boolean;
  onSettingsOpenChange: (open: boolean) => void;
}

export function SectionHeaderActions({
  unreadCount,
  markAllOpen,
  onMarkAllOpenChange,
  onMarkAllRead,
  settingsOpen,
  onSettingsOpenChange,
}: SectionHeaderActionsProps) {
  const t = useTranslations("screen.notifications");

  return (
    <div className="flex items-center gap-2">
      {/* Mark all read */}
      <AlertDialog open={markAllOpen} onOpenChange={onMarkAllOpenChange}>
        <AlertDialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={unreadCount === 0}
            className="hidden sm:flex"
          >
            <CheckCheck className="size-4 mr-2" />
            {t("actions.mark_all_read")}
          </Button>
        </AlertDialogTrigger>
        {/* Icon-only on mobile */}
        <AlertDialogTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            disabled={unreadCount === 0}
            className="sm:hidden size-9"
            aria-label={t("actions.mark_all_read")}
          >
            <CheckCheck className="size-4" />
          </Button>
        </AlertDialogTrigger>
        <ConfirmDialog
          title="Прочитать все уведомления?"
          message={`Это отметит все ${unreadCount} непрочитанных уведомлений как прочитанные.`}
          confirmLabel="Прочитать все"
          onConfirm={onMarkAllRead}
          onOpenChange={onMarkAllOpenChange}
        />
      </AlertDialog>

      {/* Settings */}
      <Dialog open={settingsOpen} onOpenChange={onSettingsOpenChange}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="hidden sm:flex">
            <Settings className="size-4 mr-2" />
            {t("actions.preferences")}
          </Button>
        </DialogTrigger>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="sm:hidden size-9"
            aria-label={t("actions.preferences")}
          >
            <Settings className="size-4" />
          </Button>
        </DialogTrigger>
        {settingsOpen && (
          <NotificationsSettingsDialogContent
            onOpenChange={onSettingsOpenChange}
          />
        )}
      </Dialog>
    </div>
  );
}
