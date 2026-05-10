"use client";

import * as React from "react";
import {
  Archive,
  Download,
  Eye,
  MoreHorizontal,
  RotateCcw,
  Tag,
  Upload,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import type { Regulation } from "@/lib/types";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AlertDialog } from "@/components/ui/alert-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

interface RowActionsMenuProps {
  regulation: Regulation;
  onView: (id: string) => void;
  onEditTags: (id: string) => void;
  onReplace: (id: string) => void;
  onArchive: (id: string) => void;
  onDownload: (id: string) => void;
}

export function RowActionsMenu({
  regulation,
  onView,
  onEditTags,
  onReplace,
  onArchive,
  onDownload,
}: RowActionsMenuProps) {
  const t = useTranslations("screen.regulations");
  const tCommon = useTranslations("common");
  const [archiveOpen, setArchiveOpen] = React.useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 data-[state=open]:bg-accent"
            aria-label={t("actions.more")}
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onClick={() => onView(regulation.id)}>
            <Eye className="size-4 mr-2 text-muted-foreground" />
            {t("row_actions.view")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onDownload(regulation.id)}>
            <Download className="size-4 mr-2 text-muted-foreground" />
            {t("row_actions.download")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onEditTags(regulation.id)}>
            <Tag className="size-4 mr-2 text-muted-foreground" />
            {t("row_actions.edit_tags")}
          </DropdownMenuItem>
          {!regulation.is_archived && (
            <DropdownMenuItem onClick={() => onReplace(regulation.id)}>
              <Upload className="size-4 mr-2 text-muted-foreground" />
              {t("row_actions.replace")}
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          {!regulation.is_archived ? (
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => setArchiveOpen(true)}
            >
              <Archive className="size-4 mr-2" />
              {t("row_actions.archive")}
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => toast.info(tCommon("toasts.restore_coming_soon"))}>
              <RotateCcw className="size-4 mr-2 text-muted-foreground" />
              {t("row_actions.restore")}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <ConfirmDialog
          title="Архивировать документ?"
          message="ИИ перестанет использовать этот документ в контексте для ответов работникам."
          confirmLabel="Архивировать"
          variant="destructive"
          onConfirm={() => onArchive(regulation.id)}
          onOpenChange={setArchiveOpen}
        />
      </AlertDialog>
    </>
  );
}
